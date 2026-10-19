// Inicializa el esquema de la base de datos para el motor activo
// (SQLite o PostgreSQL) y expone el acceso a datos.
import db, { client, SQL } from './database.js';

export { client, SQL };

// ----- Tipos según el dialecto -----
// Nota: los DEFAULT con funciones van entre paréntesis (obligatorio en SQLite).
const T = client === 'postgres'
  ? { id: 'SERIAL PRIMARY KEY', ts: 'TIMESTAMPTZ', date: 'DATE', num: 'NUMERIC', ahora: '(now())', hoy: '(CURRENT_DATE)' }
  : { id: 'INTEGER PRIMARY KEY AUTOINCREMENT', ts: 'TEXT', date: 'TEXT', num: 'REAL', ahora: "(datetime('now'))", hoy: "(date('now'))" };

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id          ${T.id},
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'administracion',
  activo      INTEGER NOT NULL DEFAULT 1,
  creado_en   ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS empleados (
  id            ${T.id},
  nombre        TEXT NOT NULL,
  documento     TEXT,
  puesto        TEXT,
  departamento  TEXT,
  telefono      TEXT,
  email         TEXT,
  fecha_ingreso ${T.date},
  salario       ${T.num} DEFAULT 0,
  activo        INTEGER NOT NULL DEFAULT 1,
  usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS turnos (
  id          ${T.id},
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha       ${T.date} NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin    TEXT NOT NULL,
  tipo        TEXT DEFAULT 'diurno',
  notas       TEXT,
  creado_en   ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS propietarios (
  id         ${T.id},
  nombre     TEXT NOT NULL,
  propiedad  TEXT,
  documento  TEXT,
  telefono   TEXT,
  email      TEXT,
  direccion  TEXT,
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS visitantes (
  id             ${T.id},
  nombre         TEXT NOT NULL,
  documento      TEXT,
  telefono       TEXT,
  tipo           TEXT DEFAULT 'invitado',
  propietario_id INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  placa_vehiculo TEXT,
  email          TEXT,
  notas          TEXT,
  codigo         TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS visitas (
  id              ${T.id},
  visitante_id    INTEGER NOT NULL REFERENCES visitantes(id) ON DELETE CASCADE,
  propietario_id  INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  motivo          TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente',
  autorizado_por  TEXT,
  fecha_entrada   ${T.ts},
  fecha_salida    ${T.ts},
  registrado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  notas           TEXT,
  creado_en       ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS tipos_incidencia (
  id        ${T.id},
  nombre    TEXT NOT NULL UNIQUE,
  activo    INTEGER NOT NULL DEFAULT 1,
  creado_en ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS incidentes (
  id             ${T.id},
  fecha          ${T.ts} NOT NULL DEFAULT ${T.ahora},
  tipo           TEXT,
  descripcion    TEXT NOT NULL,
  ubicacion      TEXT,
  gravedad       TEXT DEFAULT 'baja',
  estado         TEXT DEFAULT 'abierto',
  reportado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  responsable_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  propietario_id INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  involucrado    TEXT,   -- visitante | propietario | empleado | seguridad | otro
  foto           TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS rondas (
  id            ${T.id},
  empleado_id   INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  fecha_hora    ${T.ts} NOT NULL DEFAULT ${T.ahora},
  punto_control TEXT NOT NULL,
  estado        TEXT DEFAULT 'normal',
  observaciones TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id             ${T.id},
  propietario_id INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  visita_id      INTEGER REFERENCES visitas(id) ON DELETE SET NULL,
  canal          TEXT DEFAULT 'email',
  destino        TEXT,
  asunto         TEXT,
  mensaje        TEXT NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'pendiente',
  detalle        TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora},
  enviado_en     ${T.ts}
);

CREATE TABLE IF NOT EXISTS facturas (
  id             ${T.id},
  propietario_id INTEGER NOT NULL REFERENCES propietarios(id) ON DELETE CASCADE,
  concepto       TEXT NOT NULL,
  monto          ${T.num} NOT NULL DEFAULT 0,
  fecha_emision  ${T.date} NOT NULL DEFAULT ${T.hoy},
  fecha_vencimiento ${T.date},
  estado         TEXT NOT NULL DEFAULT 'pendiente',
  notas          TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS pagos (
  id         ${T.id},
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  monto      ${T.num} NOT NULL DEFAULT 0,
  fecha      ${T.date} NOT NULL DEFAULT ${T.hoy},
  metodo     TEXT DEFAULT 'efectivo',
  referencia TEXT,
  creado_en  ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS gastos (
  id            ${T.id},
  concepto      TEXT NOT NULL,
  categoria     TEXT DEFAULT 'operativo',
  monto         ${T.num} NOT NULL DEFAULT 0,
  fecha         ${T.date} NOT NULL DEFAULT ${T.hoy},
  proveedor     TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

-- ===== Configuración (clave/valor) =====
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

-- ===== Viajes del camión de basura al vertedero =====
CREATE TABLE IF NOT EXISTS viajes_vertedero (
  id             ${T.id},
  fecha          ${T.date} NOT NULL DEFAULT ${T.hoy},
  hora_salida    TEXT,
  hora_regreso   TEXT,
  responsable_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  vehiculo       TEXT,
  notas          TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

-- ===== Vehículos de la asociación (con dispositivo GPS) =====
CREATE TABLE IF NOT EXISTS vehiculos (
  id             ${T.id},
  nombre         TEXT NOT NULL,
  placa          TEXT,
  tipo           TEXT DEFAULT 'camion',   -- camion | patrulla | moto | pickup | otro
  gps_id         TEXT,                    -- IMEI o identificador del dispositivo GPS
  proveedor_gps  TEXT,                    -- nombre del proveedor/plataforma de rastreo
  responsable_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  activo         INTEGER NOT NULL DEFAULT 1,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

-- ===== Geocercas (zonas: vertedero, puntos de control, etc.) =====
CREATE TABLE IF NOT EXISTS geocercas (
  id         ${T.id},
  nombre     TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'punto_control', -- vertedero | punto_control | otro
  lat        ${T.num} NOT NULL,
  lng        ${T.num} NOT NULL,
  radio_m    ${T.num} NOT NULL DEFAULT 80,  -- radio en metros
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

-- ===== Posiciones reportadas por el GPS de cada vehículo =====
CREATE TABLE IF NOT EXISTS posiciones_gps (
  id          ${T.id},
  vehiculo_id INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  lat         ${T.num} NOT NULL,
  lng         ${T.num} NOT NULL,
  velocidad   ${T.num},   -- km/h
  rumbo       ${T.num},   -- grados 0-359
  fecha_hora  ${T.ts} NOT NULL DEFAULT ${T.ahora},
  creado_en   ${T.ts} NOT NULL DEFAULT ${T.ahora}
);
`;

// Crea el esquema (idempotente).
for (const sentencia of ESQUEMA.split(';')) {
  const s = sentencia.trim();
  if (s) await db.exec(s);
}

// ----- Migración ligera: columna 'codigo' en visitantes (bases antiguas) -----
async function tieneColumna(tabla, columna) {
  if (client === 'postgres') {
    const r = await db.get(
      'SELECT 1 FROM information_schema.columns WHERE table_name = ? AND column_name = ?',
      [tabla, columna]
    );
    return !!r;
  }
  const cols = await db.all(`PRAGMA table_info(${tabla})`);
  return cols.some((c) => c.name === columna);
}

if (!(await tieneColumna('visitantes', 'codigo'))) {
  await db.exec('ALTER TABLE visitantes ADD COLUMN codigo TEXT');
}
if (!(await tieneColumna('visitantes', 'email'))) {
  await db.exec('ALTER TABLE visitantes ADD COLUMN email TEXT');
}
if (!(await tieneColumna('incidentes', 'responsable_id'))) {
  await db.exec('ALTER TABLE incidentes ADD COLUMN responsable_id INTEGER REFERENCES empleados(id)');
}
if (!(await tieneColumna('incidentes', 'foto'))) {
  await db.exec('ALTER TABLE incidentes ADD COLUMN foto TEXT');
}
if (!(await tieneColumna('incidentes', 'propietario_id'))) {
  await db.exec('ALTER TABLE incidentes ADD COLUMN propietario_id INTEGER REFERENCES propietarios(id)');
}
if (!(await tieneColumna('incidentes', 'involucrado'))) {
  await db.exec('ALTER TABLE incidentes ADD COLUMN involucrado TEXT');
}
// Columnas para enlazar los registros automáticos del GPS.
if (!(await tieneColumna('viajes_vertedero', 'vehiculo_id'))) {
  await db.exec('ALTER TABLE viajes_vertedero ADD COLUMN vehiculo_id INTEGER REFERENCES vehiculos(id)');
}
if (!(await tieneColumna('viajes_vertedero', 'origen'))) {
  await db.exec("ALTER TABLE viajes_vertedero ADD COLUMN origen TEXT DEFAULT 'manual'");
}
if (!(await tieneColumna('rondas', 'vehiculo_id'))) {
  await db.exec('ALTER TABLE rondas ADD COLUMN vehiculo_id INTEGER REFERENCES vehiculos(id)');
}
if (!(await tieneColumna('rondas', 'geocerca_id'))) {
  await db.exec('ALTER TABLE rondas ADD COLUMN geocerca_id INTEGER REFERENCES geocercas(id)');
}
if (!(await tieneColumna('rondas', 'origen'))) {
  await db.exec("ALTER TABLE rondas ADD COLUMN origen TEXT DEFAULT 'manual'");
}
const sinCodigo = await db.all('SELECT id FROM visitantes WHERE codigo IS NULL');
for (const v of sinCodigo) {
  await db.run('UPDATE visitantes SET codigo = ? WHERE id = ?', [generarCodigo(), v.id]);
}

// Catálogo base de tipos de incidencia (se crean solo si no existen).
const TIPOS_INCIDENCIA_BASE = [
  'Producción de ruidos',
  'Riñas',
  'Accidente',
  'Robo',
  'Violación de propiedad',
  'Verter residuos sólidos',
  'Quema de basura',
  'Otro',
];
for (const nombre of TIPOS_INCIDENCIA_BASE) {
  await db.run(
    'INSERT INTO tipos_incidencia (nombre) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM tipos_incidencia WHERE nombre = ?)',
    [nombre, nombre]
  );
}

// Valores de configuración por defecto.
// - meta_rondas_turno: meta de rondas por turno.
// - gps_token: clave que el proveedor de GPS usa para enviarnos las posiciones.
const CONFIG_DEFECTO = {
  meta_rondas_turno: '6',
  gps_token: process.env.GPS_TOKEN || generarCodigo() + generarCodigo().slice(3),
  // Sincronización por consulta (pull) con la plataforma del proveedor (p. ej. Systrack+).
  gps_sync_activo: '0',
  gps_sync_url: '',
  gps_sync_token: '',
  gps_sync_intervalo: '60', // segundos entre consultas
};
for (const [clave, valor] of Object.entries(CONFIG_DEFECTO)) {
  await db.run(
    'INSERT INTO configuracion (clave, valor) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave = ?)',
    [clave, valor, clave]
  );
}

export function generarCodigo() {
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
  return `LL-${hex}`;
}

export default db;
