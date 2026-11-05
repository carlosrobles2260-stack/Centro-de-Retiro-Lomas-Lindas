import CrudModule from '../components/CrudModule.jsx';

const TIPOS = [
  { valor: 'vertedero', label: 'Vertedero (detecta viajes de basura)' },
  { valor: 'punto_control', label: 'Punto de control (valida rondas)' },
  { valor: 'otro', label: 'Otra zona' },
];
const ETIQUETA_TIPO = {
  vertedero: 'Vertedero',
  punto_control: 'Punto de control',
  otro: 'Otra zona',
};

export default function Geocercas() {
  return (
    <CrudModule
      titulo="Geocercas"
      descripcion="Zonas en el mapa definidas por un punto y un radio. Cuando un vehículo con GPS entra a una geocerca, el sistema registra automáticamente el viaje al vertedero o la ronda del punto de control."
      endpoint="/geocercas"
      columnas={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'tipo', label: 'Tipo', render: (f) => ETIQUETA_TIPO[f.tipo] || f.tipo },
        { key: 'lat', label: 'Latitud' },
        { key: 'lng', label: 'Longitud' },
        { key: 'radio_m', label: 'Radio (m)' },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre de la zona', requerido: true },
        { name: 'tipo', label: 'Tipo de geocerca', type: 'select', opciones: TIPOS, requerido: true },
        { name: 'lat', label: 'Latitud', type: 'number', requerido: true },
        { name: 'lng', label: 'Longitud', type: 'number', requerido: true },
        { name: 'radio_m', label: 'Radio en metros', type: 'number', defecto: 80 },
      ]}
    />
  );
}
