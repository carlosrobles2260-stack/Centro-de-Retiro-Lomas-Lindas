import CrudModule from '../components/CrudModule.jsx';
import { Badge, fecha } from '../lib/format.jsx';

export default function Incidentes() {
  return (
    <CrudModule
      titulo="Incidentes de seguridad"
      descripcion="Bitácora de novedades, emergencias y eventos de seguridad."
      endpoint="/incidentes"
      filtros={[
        { name: 'estado', label: 'Estado', opciones: [
          { valor: 'abierto', label: 'Abierto' },
          { valor: 'en_proceso', label: 'En proceso' },
          { valor: 'cerrado', label: 'Cerrado' },
        ]},
        { name: 'gravedad', label: 'Gravedad', opciones: [
          { valor: 'baja', label: 'Baja' },
          { valor: 'media', label: 'Media' },
          { valor: 'alta', label: 'Alta' },
          { valor: 'critica', label: 'Crítica' },
        ]},
      ]}
      columnas={[
        { key: 'fecha', label: 'Fecha', render: (f) => fecha(f.fecha) },
        { key: 'tipo', label: 'Tipo', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.tipo}</span> },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'ubicacion', label: 'Ubicación' },
        { key: 'gravedad', label: 'Gravedad', render: (f) => <Badge estado={f.gravedad} /> },
        { key: 'estado', label: 'Estado', render: (f) => <Badge estado={f.estado} /> },
      ]}
      campos={[
        {
          name: 'tipo', label: 'Tipo de incidente', type: 'select', defecto: 'otro',
          opciones: [
            { valor: 'acceso', label: 'Control de acceso' },
            { valor: 'robo', label: 'Robo / hurto' },
            { valor: 'emergencia', label: 'Emergencia' },
            { valor: 'daño', label: 'Daño a la propiedad' },
            { valor: 'otro', label: 'Otro' },
          ],
        },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', requerido: true },
        { name: 'ubicacion', label: 'Ubicación' },
        {
          name: 'gravedad', label: 'Gravedad', type: 'select', defecto: 'baja',
          opciones: [
            { valor: 'baja', label: 'Baja' },
            { valor: 'media', label: 'Media' },
            { valor: 'alta', label: 'Alta' },
            { valor: 'critica', label: 'Crítica' },
          ],
        },
        {
          name: 'estado', label: 'Estado', type: 'select', defecto: 'abierto',
          opciones: [
            { valor: 'abierto', label: 'Abierto' },
            { valor: 'en_proceso', label: 'En proceso' },
            { valor: 'cerrado', label: 'Cerrado' },
          ],
        },
      ]}
    />
  );
}
