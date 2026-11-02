import CrudModule from '../components/CrudModule.jsx';
import { Badge } from '../lib/format.jsx';

const ROLES = [
  { valor: 'admin', label: 'Administrador' },
  { valor: 'seguridad', label: 'Seguridad' },
  { valor: 'administracion', label: 'Administración' },
  { valor: 'presidente', label: 'Presidencia (directiva)' },
  { valor: 'propietario', label: 'Propietario' },
  { valor: 'inquilino', label: 'Inquilino' },
];

export default function Usuarios() {
  // Al crear un usuario, el sistema le envía por correo su acceso y una
  // contraseña temporal. Mostramos esa clave al admin por si el correo no llega.
  function avisarCreado(r) {
    if (!r) return;
    const estado = r.correo === 'enviada'
      ? 'Se envió por correo al usuario.'
      : r.correo === 'simulada'
        ? 'El correo NO se envió (falta configurar el correo del sistema). Comparte la clave tú mismo.'
        : 'No se pudo enviar el correo. Comparte la clave tú mismo.';
    alert(`Usuario creado.\n\nContraseña temporal: ${r.temporal}\n${estado}\n\nEl usuario deberá cambiarla al entrar por primera vez.`);
  }

  return (
    <CrudModule
      titulo="Usuarios del sistema"
      descripcion="Cuentas de acceso al ERP y sus roles. Al crear un usuario se le envía por correo su enlace, usuario y una contraseña temporal; deberá cambiarla al entrar."
      endpoint="/auth/usuarios"
      onCreado={avisarCreado}
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Correo' },
        { key: 'rol', label: 'Rol', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.rol}</span> },
        { key: 'activo', label: 'Estado', render: (f) => <Badge estado={f.activo ? 'normal' : 'gris'} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre completo', requerido: true },
        { name: 'email', label: 'Correo electrónico', type: 'email', requerido: true },
        { name: 'password', label: 'Contraseña (vacío = se genera una temporal y se envía por correo)', type: 'password' },
        { name: 'rol', label: 'Rol', type: 'select', defecto: 'administracion', opciones: ROLES },
        { name: 'propietario_id', label: 'Propiedad vinculada (obligatoria para Propietario e Inquilino)', type: 'select', fuente: '/propietarios', labelKey: 'nombre' },
        { name: 'activo', label: 'Activo (1 = sí, 0 = no)', type: 'number', defecto: 1 },
      ]}
    />
  );
}
