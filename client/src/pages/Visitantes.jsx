import CrudModule from '../components/CrudModule.jsx';

export default function Visitantes() {
  return (
    <CrudModule
      titulo="Visitantes"
      descripcion="Familiares, invitados y proveedores asociados a cada propietario."
      endpoint="/visitantes"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'documento', label: 'Documento' },
        { key: 'tipo', label: 'Tipo', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.tipo}</span> },
        { key: 'propietario_nombre', label: 'Propietario' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'placa_vehiculo', label: 'Placa' },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre completo', requerido: true },
        { name: 'documento', label: 'Documento de identidad' },
        { name: 'telefono', label: 'Teléfono' },
        {
          name: 'tipo', label: 'Tipo de visitante', type: 'select', defecto: 'invitado',
          opciones: [
            { valor: 'familiar', label: 'Familiar' },
            { valor: 'invitado', label: 'Invitado' },
            { valor: 'proveedor', label: 'Proveedor' },
          ],
        },
        { name: 'propietario_id', label: 'Propietario asociado', type: 'select', fuente: '/propietarios', labelKey: 'nombre' },
        { name: 'placa_vehiculo', label: 'Placa del vehículo' },
        { name: 'notas', label: 'Notas', type: 'textarea' },
      ]}
    />
  );
}
