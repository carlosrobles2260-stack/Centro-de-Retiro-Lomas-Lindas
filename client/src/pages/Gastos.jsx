import CrudModule from '../components/CrudModule.jsx';
import { dinero, fecha } from '../lib/format.jsx';

export default function Gastos() {
  return (
    <CrudModule
      titulo="Gastos"
      descripcion="Egresos y gastos operativos del centro de retiro."
      endpoint="/gastos"
      filtros={[
        { name: 'categoria', label: 'Categoría', opciones: [
          { valor: 'mantenimiento', label: 'Mantenimiento' },
          { valor: 'personal', label: 'Personal' },
          { valor: 'financieros', label: 'Financieros' },
          { valor: 'generales', label: 'Generales' },
        ]},
      ]}
      columnas={[
        { key: 'fecha', label: 'Fecha', render: (f) => fecha(f.fecha) },
        { key: 'concepto', label: 'Concepto' },
        { key: 'categoria', label: 'Categoría', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.categoria}</span> },
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'monto', label: 'Monto', render: (f) => dinero(f.monto) },
      ]}
      campos={[
        { name: 'concepto', label: 'Concepto', requerido: true },
        {
          name: 'categoria', label: 'Categoría', type: 'select', defecto: 'mantenimiento',
          opciones: [
            { valor: 'mantenimiento', label: 'Mantenimiento' },
            { valor: 'personal', label: 'Personal' },
            { valor: 'financieros', label: 'Financieros' },
            { valor: 'generales', label: 'Generales' },
          ],
        },
        { name: 'monto', label: 'Monto', type: 'number', requerido: true },
        { name: 'fecha', label: 'Fecha', type: 'date' },
        { name: 'proveedor', label: 'Proveedor' },
      ]}
    />
  );
}
