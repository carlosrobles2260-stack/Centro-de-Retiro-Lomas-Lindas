import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import InstalarApp from './InstalarApp.jsx';

const ROLES = { admin: 'Administrador', seguridad: 'Seguridad', administracion: 'Administración', presidente: 'Presidencia' };

// Versión visible de la app (sirve para confirmar qué build está cargado).
const VERSION = 'v2026.11.02-18';

// Define qué roles ven cada enlace. 'admin' ve todo.
const MENU = [
  {
    grupo: 'General',
    items: [
      { a: '/', texto: 'Panel principal', roles: ['seguridad', 'administracion'] },
      { a: '/directiva', texto: 'Directiva', roles: ['seguridad', 'administracion', 'presidente'] },
    ],
  },
  {
    grupo: 'Propietarios y residentes',
    items: [
      { a: '/propietarios', texto: 'Propietarios', roles: ['seguridad', 'administracion'] },
      { a: '/empleados-propietario', texto: 'Empleados de propietarios', roles: ['administracion'] },
      { a: '/visitantes', texto: 'Visitantes', roles: ['seguridad', 'administracion'] },
    ],
  },
  {
    grupo: 'Seguridad y accesos',
    items: [
      { a: '/visitas', texto: 'Registro de visitas', roles: ['seguridad'] },
      { a: '/control-acceso', texto: 'Control de acceso (QR)', roles: ['administracion'] },
      { a: '/incidentes', texto: 'Incidentes', roles: ['seguridad'] },
      { a: '/tipos-incidencia', texto: 'Tipos de incidencia', roles: ['administracion'] },
      { a: '/rondas', texto: 'Rondas de vigilancia', roles: ['seguridad'] },
      { a: '/viajes-vertedero', texto: 'Viajes al vertedero', roles: ['seguridad', 'administracion'] },
      { a: '/notificaciones', texto: 'Notificaciones', roles: ['seguridad', 'administracion'] },
    ],
  },
  {
    grupo: 'Flota y GPS',
    items: [
      { a: '/mapa', texto: 'Mapa en tiempo real', roles: ['seguridad', 'administracion'] },
      { a: '/vehiculos', texto: 'Vehículos', roles: ['administracion'] },
      { a: '/geocercas', texto: 'Geocercas', roles: ['administracion'] },
    ],
  },
  {
    grupo: 'Administración y finanzas',
    items: [
      { a: '/panel-financiero', texto: 'Panel financiero', roles: ['administracion', 'presidente'] },
      { a: '/facturas', texto: 'Facturas y cuotas', roles: ['administracion', 'presidente'] },
      { a: '/cuentas-por-cobrar', texto: 'Cuentas por cobrar', roles: ['administracion', 'presidente'] },
      { a: '/gastos', texto: 'Gastos', roles: ['administracion'] },
      { a: '/activos', texto: 'Activos', roles: ['administracion'] },
      { a: '/reportes', texto: 'Reportes', roles: ['administracion'] },
    ],
  },
  {
    grupo: 'Normativa',
    items: [
      { a: '/documentos', texto: 'Normas y reglamentos', roles: ['administracion', 'presidente'] },
    ],
  },
  {
    grupo: 'Gobernanza',
    items: [
      { a: '/elecciones', texto: 'Elecciones de la Directiva', roles: ['administracion', 'presidente'] },
    ],
  },
  {
    grupo: 'Capacitación',
    items: [
      { a: '/capacitacion', texto: 'Capacitación', roles: ['seguridad', 'administracion', 'presidente'] },
    ],
  },
  {
    grupo: 'Personal',
    items: [
      { a: '/empleados', texto: 'Empleados', roles: ['administracion'] },
      { a: '/nomina', texto: 'Nómina', roles: ['administracion'] },
      { a: '/prestamos', texto: 'Préstamos a empleados', roles: ['administracion'] },
      { a: '/acciones-personal', texto: 'Acciones de personal', roles: ['administracion'] },
      { a: '/turnos', texto: 'Turnos', roles: ['seguridad', 'administracion'] },
    ],
  },
  {
    grupo: 'Sistema',
    items: [{ a: '/usuarios', texto: 'Usuarios', roles: [] }], // solo admin
  },
];

// Al ingresar, todos los grupos del menú arrancan plegados (recogidos). El
// usuario abre el que necesite; esa elección dura mientras no recargue la página.
const TODOS_LOS_GRUPOS = MENU.map((s) => s.grupo);

export default function Layout() {
  const { usuario, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [colapsados, setColapsados] = useState(() => new Set(TODOS_LOS_GRUPOS));
  const [lateralOculta, setLateralOculta] = useState(() => {
    try { return localStorage.getItem('lateral_oculta') === '1'; } catch { return false; }
  });
  const puedeVer = (roles) => usuario.rol === 'admin' || roles.includes(usuario.rol);
  const cerrarMenu = () => setMenuAbierto(false);

  const alternarLateral = () => setLateralOculta((v) => {
    const n = !v;
    try { localStorage.setItem('lateral_oculta', n ? '1' : '0'); } catch {}
    return n;
  });

  const alternarGrupo = (grupo) => {
    setColapsados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(grupo)) siguiente.delete(grupo);
      else siguiente.add(grupo);
      return siguiente;
    });
  };

  return (
    <div className={`app ${lateralOculta ? 'lateral-oculta' : ''}`}>
      {/* Barra superior: solo visible en móvil */}
      <header className="topbar-movil">
        <button className="hamburguesa" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>☰</button>
        <img src="/emblema.png" alt="" />
        <strong>Lomas Lindas</strong>
        <button className="salir-movil" onClick={logout}>Salir</button>
      </header>

      {menuAbierto && <div className="sidebar-overlay" onClick={cerrarMenu} />}

      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div className="marca">
          <img src="/emblema.png" alt="" className="marca-logo" />
          <div>
            <strong>Lomas Lindas</strong>
            <span>Centro de Retiro · ERP</span>
            <span className="marca-version">{VERSION}</span>
          </div>
        </div>
        <nav>
          {MENU.map((seccion) => {
            const visibles = seccion.items.filter((i) => puedeVer(i.roles));
            if (visibles.length === 0) return null;
            const colapsado = colapsados.has(seccion.grupo);
            return (
              <div key={seccion.grupo} className={`seccion ${colapsado ? 'colapsada' : ''}`}>
                <button
                  type="button"
                  className="grupo"
                  onClick={() => alternarGrupo(seccion.grupo)}
                  aria-expanded={!colapsado}
                >
                  <span>{seccion.grupo}</span>
                  <span className="chevron" aria-hidden="true">▾</span>
                </button>
                {!colapsado && visibles.map((i) => (
                  <NavLink
                    key={i.a}
                    to={i.a}
                    end={i.a === '/'}
                    onClick={cerrarMenu}
                    className={({ isActive }) => (isActive ? 'activo' : '')}
                  >
                    {i.texto}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="pie">
          <InstalarApp />
        </div>
      </aside>
      <main className="contenido">
        <header className="barra-superior">
          <button
            className="bs-toggle"
            onClick={alternarLateral}
            aria-label={lateralOculta ? 'Mostrar el menú' : 'Ocultar el menú'}
            title={lateralOculta ? 'Mostrar el menú' : 'Ocultar el menú'}
          >
            ☰
          </button>
          <div className="bs-derecha">
            <div className="bs-usuario">
              <strong>{usuario.nombre}</strong>
              <span>{ROLES[usuario.rol] || usuario.rol}</span>
            </div>
            <button className="bs-salir" onClick={logout}>Cerrar sesión</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
