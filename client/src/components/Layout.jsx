import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import InstalarApp from './InstalarApp.jsx';

const ROLES = { admin: 'Administrador', seguridad: 'Seguridad', administracion: 'Administración' };

// Define qué roles ven cada enlace. 'admin' ve todo.
const MENU = [
  {
    grupo: 'General',
    items: [{ a: '/', texto: 'Panel principal', roles: ['seguridad', 'administracion'] }],
  },
  {
    grupo: 'Seguridad y accesos',
    items: [
      { a: '/visitas', texto: 'Registro de visitas', roles: ['seguridad'] },
      { a: '/propietarios', texto: 'Propietarios', roles: ['seguridad', 'administracion'] },
      { a: '/visitantes', texto: 'Visitantes', roles: ['seguridad', 'administracion'] },
      { a: '/empleados-propietario', texto: 'Empleados de propietarios', roles: ['administracion'] },
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
      { a: '/facturas', texto: 'Facturas y cuotas', roles: ['administracion'] },
      { a: '/gastos', texto: 'Gastos', roles: ['administracion'] },
      { a: '/reportes', texto: 'Reportes', roles: ['administracion'] },
    ],
  },
  {
    grupo: 'Personal',
    items: [
      { a: '/empleados', texto: 'Empleados', roles: ['administracion'] },
      { a: '/turnos', texto: 'Turnos', roles: ['seguridad', 'administracion'] },
    ],
  },
  {
    grupo: 'Sistema',
    items: [{ a: '/usuarios', texto: 'Usuarios', roles: [] }], // solo admin
  },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const puedeVer = (roles) => usuario.rol === 'admin' || roles.includes(usuario.rol);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="marca">
          <img src="/emblema.png" alt="" className="marca-logo" />
          <div>
            <strong>Lomas Lindas</strong>
            <span>Centro de Retiro · ERP</span>
          </div>
        </div>
        <nav>
          {MENU.map((seccion) => {
            const visibles = seccion.items.filter((i) => puedeVer(i.roles));
            if (visibles.length === 0) return null;
            return (
              <div key={seccion.grupo}>
                <div className="grupo">{seccion.grupo}</div>
                {visibles.map((i) => (
                  <NavLink
                    key={i.a}
                    to={i.a}
                    end={i.a === '/'}
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
          <div><strong>{usuario.nombre}</strong></div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>{ROLES[usuario.rol] || usuario.rol}</div>
          <InstalarApp />
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
