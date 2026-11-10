import CrudModule from '../components/CrudModule.jsx';
import { fecha } from '../lib/format.jsx';

export default function Turnos() {
  return (
    <CrudModule
      titulo="Turnos"
      descripcion="Programación de turnos del personal, en especial de seguridad."
      endpoint="/turnos"
      columnas={[
        { key: 'fecha', label: 'Fecha', render: (f) => fecha(f.fecha) },
        { key: 'empleado_nombre', label: 'Empleado' },
        { key: 'hora_inicio', label: 'Inicio' },
        { key: 'hora_fin', label: 'Fin' },
        { key: 'tipo', label: 'Tipo', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.tipo}</span> },
      ]}
      campos={[
        { name: 'empleado_id', label: 'Empleado', type: 'select', fuente: '/empleados', labelKey: 'nombre', requerido: true },
        { name: 'fecha', label: 'Fecha', type: 'date', requerido: true },
        { name: 'hora_inicio', label: 'Hora de inicio', type: 'time', requerido: true },
        { name: 'hora_fin', label: 'Hora de fin', type: 'time', requerido: true },
        {
          name: 'tipo', label: 'Tipo de turno', type: 'select', defecto: 'diurno',
          opciones: [
            { valor: 'diurno', label: 'Diurno' },
            { valor: 'nocturno', label: 'Nocturno' },
            { valor: 'mixto', label: 'Mixto' },
          ],
        },
        { name: 'notas', label: 'Notas', type: 'textarea' },
      ]}
    />
  );
}
