import CrudModule from '../components/CrudModule.jsx';
import { dinero, Badge } from '../lib/format.jsx';

export default function Empleados() {
  return (
    <CrudModule
      titulo="Empleados"
      descripcion="Personal del centro de retiro: seguridad, administración, mantenimiento y más."
      endpoint="/empleados"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'puesto', label: 'Puesto' },
        { key: 'departamento', label: 'Departamento', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.departamento}</span> },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'salario', label: 'Salario', render: (f) => dinero(f.salario) },
        { key: 'activo', label: 'Estado', render: (f) => <Badge estado={f.activo ? 'normal' : 'gris'} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre completo', requerido: true },
        { name: 'documento', label: 'Documento de identidad' },
        { name: 'puesto', label: 'Puesto' },
        {
          name: 'departamento', label: 'Departamento', type: 'select', defecto: 'seguridad',
          opciones: [
            { valor: 'seguridad', label: 'Seguridad' },
            { valor: 'administracion', label: 'Administración' },
            { valor: 'mantenimiento', label: 'Mantenimiento' },
            { valor: 'cocina', label: 'Cocina' },
            { valor: 'otro', label: 'Otro' },
          ],
        },
        { name: 'telefono', label: 'Teléfono' },
        { name: 'email', label: 'Correo electrónico', type: 'email' },
        { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
        { name: 'salario', label: 'Salario', type: 'number' },
        { name: 'activo', label: 'Activo (1 = sí, 0 = no)', type: 'number', defecto: 1 },
      ]}
    />
  );
}
