import CrudModule from '../components/CrudModule.jsx';
import { Badge } from '../lib/format.jsx';

const ROLES = [
  { valor: 'admin', label: 'Administrador' },
  { valor: 'seguridad', label: 'Seguridad' },
  { valor: 'administracion', label: 'Administración' },
];

export default function Usuarios() {
  return (
    <CrudModule
      titulo="Usuarios del sistema"
      descripcion="Cuentas de acceso al ERP y sus roles."
      endpoint="/auth/usuarios"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Correo' },
        { key: 'rol', label: 'Rol', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.rol}</span> },
        { key: 'activo', label: 'Estado', render: (f) => <Badge estado={f.activo ? 'normal' : 'gris'} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre completo', requerido: true },
        { name: 'email', label: 'Correo electrónico', type: 'email', requerido: true },
        { name: 'password', label: 'Contraseña (dejar vacío para no cambiar)', type: 'password' },
        { name: 'rol', label: 'Rol', type: 'select', defecto: 'administracion', opciones: ROLES },
        { name: 'activo', label: 'Activo (1 = sí, 0 = no)', type: 'number', defecto: 1 },
      ]}
    />
  );
}
