import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Visitas from './pages/Visitas.jsx';
import Propietarios from './pages/Propietarios.jsx';
import Visitantes from './pages/Visitantes.jsx';
import Incidentes from './pages/Incidentes.jsx';
import TiposIncidencia from './pages/TiposIncidencia.jsx';
import Rondas from './pages/Rondas.jsx';
import ViajesVertedero from './pages/ViajesVertedero.jsx';
import Mapa from './pages/Mapa.jsx';
import Vehiculos from './pages/Vehiculos.jsx';
import Geocercas from './pages/Geocercas.jsx';
import MiCuenta from './pages/MiCuenta.jsx';
import EmpleadosPropietario from './pages/EmpleadosPropietario.jsx';
import Facturas from './pages/Facturas.jsx';
import CuentasPorCobrar from './pages/CuentasPorCobrar.jsx';
import Gastos from './pages/Gastos.jsx';
import Reportes from './pages/Reportes.jsx';
import Notificaciones from './pages/Notificaciones.jsx';
import Empleados from './pages/Empleados.jsx';
import Turnos from './pages/Turnos.jsx';
import Usuarios from './pages/Usuarios.jsx';

export default function App() {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div className="cargando" style={{ marginTop: 80 }}>Cargando...</div>;
  if (!usuario) return <Login />;

  // El propietario solo ve su estado de cuenta.
  if (usuario.rol === 'propietario') return <MiCuenta />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/visitas" element={<Visitas />} />
        <Route path="/propietarios" element={<Propietarios />} />
        <Route path="/empleados-propietario" element={<EmpleadosPropietario />} />
        <Route path="/visitantes" element={<Visitantes />} />
        <Route path="/incidentes" element={<Incidentes />} />
        <Route path="/tipos-incidencia" element={<TiposIncidencia />} />
        <Route path="/rondas" element={<Rondas />} />
        <Route path="/viajes-vertedero" element={<ViajesVertedero />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/vehiculos" element={<Vehiculos />} />
        <Route path="/geocercas" element={<Geocercas />} />
        <Route path="/facturas" element={<Facturas />} />
        <Route path="/cuentas-por-cobrar" element={<CuentasPorCobrar />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="/empleados" element={<Empleados />} />
        <Route path="/turnos" element={<Turnos />} />
        {usuario.rol === 'admin' && <Route path="/usuarios" element={<Usuarios />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
