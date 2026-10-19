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
    <CrudModule
      titulo="Empleados de propietarios"
      descripcion="Trabajadores particulares de cada propietario (empleada doméstica, jardinero, cuidador, motorista). Cada uno recibe una credencial de acceso."
      endpoint="/empleados-propietario"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
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
        { name: 'documento', label: 'Documento de identidad' },
        { name: 'telefono', label: 'Teléfono' },
      ]}
    />
  );
}
