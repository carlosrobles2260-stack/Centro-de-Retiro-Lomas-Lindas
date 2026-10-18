import CrudModule from '../components/CrudModule.jsx';
import { Badge, fechaHora } from '../lib/format.jsx';

export default function Rondas() {
  return (
    <CrudModule
      titulo="Rondas de vigilancia"
      descripcion="Registro de recorridos y puntos de control del personal de seguridad."
      endpoint="/rondas"
      columnas={[
        { key: 'fecha_hora', label: 'Fecha y hora', render: (f) => fechaHora(f.fecha_hora) },
        { key: 'punto_control', label: 'Punto de control' },
        { key: 'empleado_nombre', label: 'Guardia' },
        { key: 'estado', label: 'Estado', render: (f) => <Badge estado={f.estado} /> },
        { key: 'observaciones', label: 'Observaciones' },
      ]}
      campos={[
        { name: 'punto_control', label: 'Punto de control', requerido: true },
        { name: 'empleado_id', label: 'Guardia / empleado', type: 'select', fuente: '/empleados', labelKey: 'nombre' },
        {
          name: 'estado', label: 'Estado', type: 'select', defecto: 'normal',
          opciones: [
            { valor: 'normal', label: 'Normal (sin novedad)' },
            { valor: 'novedad', label: 'Con novedad' },
          ],
        },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      ]}
    />
  );
}
