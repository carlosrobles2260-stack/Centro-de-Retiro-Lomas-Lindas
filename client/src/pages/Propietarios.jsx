import CrudModule from '../components/CrudModule.jsx';
import { Badge } from '../lib/format.jsx';

export default function Propietarios() {
  return (
    <CrudModule
      titulo="Propietarios"
      descripcion="Registro de propietarios del centro de retiro."
      endpoint="/propietarios"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'propiedad', label: 'Propiedad' },
        { key: 'documento', label: 'Documento' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'email', label: 'Correo' },
        { key: 'activo', label: 'Estado', render: (f) => <Badge estado={f.activo ? 'normal' : 'gris'} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre completo', requerido: true },
        { name: 'propiedad', label: 'Propiedad (lote / casa / unidad)' },
        { name: 'documento', label: 'Documento de identidad' },
        { name: 'telefono', label: 'Teléfono' },
        { name: 'email', label: 'Correo electrónico', type: 'email' },
        { name: 'direccion', label: 'Dirección' },
        { name: 'activo', label: 'Activo (1 = sí, 0 = no)', type: 'number', defecto: 1 },
      ]}
    />
  );
}
