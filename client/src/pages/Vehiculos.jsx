import CrudModule from '../components/CrudModule.jsx';

const TIPOS = [
  { valor: 'camion', label: 'Camión' },
  { valor: 'pickup', label: 'Pick-up' },
  { valor: 'patrulla', label: 'Patrulla' },
  { valor: 'moto', label: 'Motocicleta' },
  { valor: 'otro', label: 'Otro' },
];
const ETIQUETA_TIPO = Object.fromEntries(TIPOS.map((t) => [t.valor, t.label]));

export default function Vehiculos() {
  return (
    <CrudModule
      titulo="Vehículos"
      descripcion="Flota de la asociación y su dispositivo GPS. El identificador del GPS (IMEI) es el que vincula las posiciones que envía el rastreador."
      endpoint="/vehiculos"
      columnas={[
        { key: 'nombre', label: 'Vehículo' },
        { key: 'placa', label: 'Placa' },
        { key: 'tipo', label: 'Tipo', render: (f) => ETIQUETA_TIPO[f.tipo] || f.tipo },
        { key: 'gps_id', label: 'GPS (IMEI)' },
        { key: 'proveedor_gps', label: 'Proveedor' },
        { key: 'responsable_nombre', label: 'Responsable' },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre o identificación', requerido: true },
        { name: 'placa', label: 'Placa' },
        { name: 'tipo', label: 'Tipo', type: 'select', opciones: TIPOS },
        { name: 'gps_id', label: 'Identificador del GPS (IMEI)' },
        { name: 'proveedor_gps', label: 'Proveedor / plataforma de rastreo' },
        { name: 'responsable_id', label: 'Responsable / conductor', type: 'select', fuente: '/empleados', labelKey: 'nombre' },
      ]}
    />
  );
}
