import CrudModule from '../components/CrudModule.jsx';
import { Badge } from '../lib/format.jsx';

export default function TiposIncidencia() {
  return (
    <CrudModule
      titulo="Tipos de incidencia"
      descripcion="Catálogo de los tipos de incidencia que aparecen al reportar. Puedes agregar, editar o desactivar los que necesites."
      endpoint="/tipos-incidencia"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Estado', render: (f) => <Badge estado={f.activo ? 'normal' : 'gris'} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del tipo', requerido: true },
        { name: 'activo', label: 'Activo (1 = sí, 0 = no)', type: 'number', defecto: 1 },
      ]}
    />
  );
}
