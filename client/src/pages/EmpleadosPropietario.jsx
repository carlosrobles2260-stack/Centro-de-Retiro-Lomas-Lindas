import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { fechaHora } from '../lib/format.jsx';
import CrudModule from '../components/CrudModule.jsx';

const PUESTOS = [
  { valor: 'domestica', label: 'Empleada doméstica' },
  { valor: 'jardinero', label: 'Jardinero' },
  { valor: 'cuidador', label: 'Cuidador' },
  { valor: 'motorista', label: 'Motorista' },
  { valor: 'otro', label: 'Otro' },
];
const etiquetaPuesto = (v) => PUESTOS.find((p) => p.valor === v)?.label || v || '—';

export default function EmpleadosPropietario() {
  return (
    <div>
    <CrudModule
      titulo="Empleados de propietarios"
      descripcion="Trabajadores particulares de cada propietario (empleada doméstica, jardinero, cuidador, motorista). Cada uno recibe una credencial de acceso."
      endpoint="/empleados-propietario"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'carnet', label: 'Carné' },
        { key: 'puesto', label: 'Puesto', render: (f) => etiquetaPuesto(f.puesto) },
        { key: 'propietario_nombre', label: 'Propietario' },
        { key: 'telefono', label: 'Teléfono' },
        {
          key: 'codigo', label: 'Credencial',
          render: (f) => f.codigo
            ? <a href={`/credencial/${f.codigo}`} target="_blank" rel="noreferrer">Ver credencial</a>
            : '—',
        },
      ]}
      campos={[
        { name: 'propietario_id', label: 'Propietario', type: 'select', fuente: '/propietarios', labelKey: 'nombre', requerido: true },
        { name: 'nombre', label: 'Nombre completo', requerido: true },
        { name: 'puesto', label: 'Puesto', type: 'select', opciones: PUESTOS },
        { name: 'carnet', label: 'Número de carné' },
        { name: 'documento', label: 'Documento de identidad' },
        { name: 'telefono', label: 'Teléfono' },
      ]}
    />
    <BitacoraAccesos />
    </div>
  );
}

// Bitácora de entradas y salidas de empleados registradas en el portón.
function BitacoraAccesos() {
  const [accesos, setAccesos] = useState([]);
  useEffect(() => { api.get('/empleados-propietario/accesos').then(setAccesos).catch(() => {}); }, []);
  if (accesos.length === 0) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <h2>Accesos recientes</h2>
      <p className="descripcion">Entradas y salidas de empleados registradas al escanear su credencial en el portón.</p>
      <div className="tabla-wrap">
        <table>
          <thead>
            <tr><th>Fecha y hora</th><th>Empleado</th><th>Propietario</th><th>Movimiento</th><th>Registró</th></tr>
          </thead>
          <tbody>
            {accesos.map((a) => (
              <tr key={a.id}>
                <td>{fechaHora(a.fecha_hora)}</td>
                <td>{a.empleado_nombre}</td>
                <td>{a.propietario_nombre || '—'}</td>
                <td><span className={`badge ${a.tipo === 'entrada' ? 'verde' : 'amarillo'}`}>{a.tipo}</span></td>
                <td>{a.registrado_por_nombre || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
