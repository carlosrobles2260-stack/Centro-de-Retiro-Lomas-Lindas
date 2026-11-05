// Permisos dinámicos (RBAC configurable). Por cada (rol, módulo) se guarda si
// puede LEER (ver) y/o ESCRIBIR (crear/editar/eliminar). El rol 'admin' siempre
// tiene acceso total (llave maestra). Los permisos viven en la tabla 'permisos',
// se cargan en memoria al arrancar y se recargan cuando cambian desde la app.
import db from './db.js';

// Catálogo de módulos que se pueden permisar (clave estable + etiqueta visible).
export const MODULOS = [
  { clave: 'panel', etiqueta: 'Panel principal' },
  { clave: 'propietarios', etiqueta: 'Propietarios' },
  { clave: 'empleados_propietario', etiqueta: 'Empleados de propietarios' },
  { clave: 'visitantes', etiqueta: 'Visitantes' },
  { clave: 'visitas', etiqueta: 'Registro de visitas' },
  { clave: 'incidentes', etiqueta: 'Incidentes' },
  { clave: 'tipos_incidencia', etiqueta: 'Tipos de incidencia' },
  { clave: 'rondas', etiqueta: 'Rondas de vigilancia' },
  { clave: 'turnos', etiqueta: 'Turnos' },
  { clave: 'viajes_vertedero', etiqueta: 'Viajes al vertedero' },
  { clave: 'notificaciones', etiqueta: 'Notificaciones' },
  { clave: 'vehiculos', etiqueta: 'Vehículos' },
  { clave: 'geocercas', etiqueta: 'Geocercas' },
  { clave: 'facturas', etiqueta: 'Facturas y cuotas' },
  { clave: 'cuentas_por_cobrar', etiqueta: 'Cuentas por cobrar' },
  { clave: 'gastos', etiqueta: 'Gastos' },
  { clave: 'reportes', etiqueta: 'Reportes' },
  { clave: 'documentos', etiqueta: 'Normas y reglamentos' },
  { clave: 'elecciones', etiqueta: 'Elecciones de la Directiva' },
  { clave: 'empleados', etiqueta: 'Empleados' },
  { clave: 'nomina', etiqueta: 'Nómina' },
  { clave: 'prestamos', etiqueta: 'Préstamos a empleados' },
  { clave: 'acciones_personal', etiqueta: 'Acciones de personal' },
  { clave: 'activos', etiqueta: 'Activos' },
  { clave: 'bancos', etiqueta: 'Cuentas bancarias y saldos' },
  { clave: 'directiva', etiqueta: 'Galería de la Directiva' },
];
const CLAVES = new Set(MODULOS.map((m) => m.clave));

// Roles configurables (admin va aparte, siempre total). Se pueden ampliar.
export const ROLES = [
  { clave: 'administracion', etiqueta: 'Administración / Oficina' },
  { clave: 'presidente', etiqueta: 'Presidencia' },
  { clave: 'directiva', etiqueta: 'Directiva (consulta)' },
  { clave: 'seguridad', etiqueta: 'Seguridad' },
];

// Matriz inicial (semilla). rw = leer+escribir, r = solo leer. Lo no listado = sin acceso.
const TODOS = MODULOS.map((m) => m.clave);
const DEFECTO = {
  administracion: {
    rw: ['propietarios', 'empleados_propietario', 'visitantes', 'visitas', 'incidentes',
      'tipos_incidencia', 'rondas', 'turnos', 'viajes_vertedero', 'notificaciones',
      'vehiculos', 'geocercas', 'facturas', 'cuentas_por_cobrar', 'gastos', 'documentos',
      'elecciones', 'empleados', 'nomina', 'prestamos', 'acciones_personal', 'activos', 'bancos'],
    r: ['panel', 'reportes', 'directiva'],
  },
  presidente: { rw: [], r: TODOS },
  directiva: {
    rw: [],
    r: ['panel', 'propietarios', 'visitantes', 'facturas', 'cuentas_por_cobrar', 'gastos',
      'reportes', 'documentos', 'elecciones', 'activos', 'directiva'],
  },
  seguridad: {
    rw: ['visitas', 'incidentes', 'rondas', 'turnos', 'viajes_vertedero'],
    // Lecturas que necesitan sus formularios (listas relacionadas).
    r: ['panel', 'propietarios', 'visitantes', 'empleados', 'tipos_incidencia',
      'vehiculos', 'geocercas', 'notificaciones', 'directiva'],
  },
};

// Caché en memoria: cache[rol][modulo] = { leer, escribir }
let cache = {};

function filaDefecto(rol, modulo) {
  const d = DEFECTO[rol];
  if (!d) return { leer: 0, escribir: 0 };
  if (d.rw.includes(modulo)) return { leer: 1, escribir: 1 };
  if (d.r.includes(modulo)) return { leer: 1, escribir: 0 };
  return { leer: 0, escribir: 0 };
}

// Crea las filas que falten con los valores por defecto (idempotente) y carga la caché.
export async function inicializarPermisos() {
  for (const rol of Object.keys(DEFECTO)) {
    for (const m of MODULOS) {
      const existe = await db.get('SELECT 1 AS x FROM permisos WHERE rol = ? AND modulo = ?', [rol, m.clave]);
      if (!existe) {
        const f = filaDefecto(rol, m.clave);
        await db.run('INSERT INTO permisos (rol, modulo, leer, escribir) VALUES (?, ?, ?, ?)', [rol, m.clave, f.leer, f.escribir]);
      }
    }
  }
  await recargarPermisos();
}

export async function recargarPermisos() {
  const filas = await db.all('SELECT rol, modulo, leer, escribir FROM permisos');
  const nuevo = {};
  for (const f of filas) {
    (nuevo[f.rol] ||= {})[f.modulo] = { leer: !!f.leer, escribir: !!f.escribir };
  }
  cache = nuevo;
}

// ¿El rol puede hacer la acción ('leer' | 'escribir') en el módulo?
export function puede(rol, modulo, accion) {
  if (rol === 'admin') return true;
  return !!cache[rol]?.[modulo]?.[accion];
}

// Middleware: protege un módulo. GET => leer; POST/PUT/PATCH/DELETE => escribir.
export function permite(modulo) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
    const accion = req.method === 'GET' ? 'leer' : 'escribir';
    if (puede(req.usuario.rol, modulo, accion)) return next();
    return res.status(403).json({ error: 'No tienes permiso para esta acción' });
  };
}

// Permisos efectivos de un rol (para que el frontend arme el menú y los botones).
export function permisosDeRol(rol) {
  if (rol === 'admin') {
    return Object.fromEntries(MODULOS.map((m) => [m.clave, { leer: true, escribir: true }]));
  }
  const base = Object.fromEntries(MODULOS.map((m) => [m.clave, { leer: false, escribir: false }]));
  return { ...base, ...(cache[rol] || {}) };
}

// Matriz completa (para la pantalla de administración de permisos).
export function matrizPermisos() {
  return {
    modulos: MODULOS,
    roles: ROLES,
    permisos: Object.fromEntries(ROLES.map((r) => [r.clave, permisosDeRol(r.clave)])),
  };
}

// Actualiza una celda (rol, módulo) y recarga la caché. Devuelve true si aplicó.
export async function fijarPermiso(rol, modulo, leer, escribir) {
  if (rol === 'admin') return false;            // admin es intocable
  if (!CLAVES.has(modulo)) return false;
  const l = leer ? 1 : 0;
  const e = escribir ? 1 : 0;
  const esc = l ? e : 0;                          // sin leer no tiene sentido escribir
  await db.run(
    `INSERT INTO permisos (rol, modulo, leer, escribir) VALUES (?, ?, ?, ?)
     ON CONFLICT(rol, modulo) DO UPDATE SET leer = excluded.leer, escribir = excluded.escribir`,
    [rol, modulo, l, esc]
  );
  await recargarPermisos();
  return true;
}
