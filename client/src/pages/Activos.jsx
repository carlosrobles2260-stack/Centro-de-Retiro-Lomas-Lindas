import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero, fecha } from '../lib/format.jsx';
import CrudModule from '../components/CrudModule.jsx';

const CATEGORIAS = [
  { valor: 'equipo', label: 'Equipo' },
  { valor: 'mobiliario', label: 'Mobiliario' },
  { valor: 'vehiculo', label: 'Vehículo' },
  { valor: 'herramienta', label: 'Herramienta' },
  { valor: 'tecnologia', label: 'Tecnología' },
  { valor: 'inmueble', label: 'Inmueble' },
  { valor: 'otro', label: 'Otro' },
];
const ESTADOS = [
  { valor: 'activo', label: 'En uso' },
  { valor: 'mantenimiento', label: 'En mantenimiento' },
  { valor: 'baja', label: 'Dado de baja' },
];
const etq = (lista, v) => lista.find((x) => x.valor === v)?.label || v || '—';

export default function Activos() {
  const [resumen, setResumen] = useState(null);
  const cargarResumen = useCallback(async () => {
    setResumen(await api.get('/activos/resumen').catch(() => null));
  }, []);
  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Stat etiqueta="Activos registrados" valor={resumen?.total ?? '…'} />
        <Stat etiqueta="En inventario" valor={resumen?.activos ?? '…'} />
        <Stat etiqueta="Valor de adquisición" valor={dinero(resumen?.valor_adquisicion)} />
        <Stat etiqueta="Valoración actual" valor={dinero(resumen?.valor_actual)} clase="verde" />
      </div>

      <CrudModule
        titulo="Activos de la asociación"
        descripcion="Inventario y valoración de los bienes de la asociación, con el responsable asignado a cada uno."
        endpoint="/activos"
        onCambio={cargarResumen}
        columnas={[
          { key: 'nombre', label: 'Activo', render: (f) => <><strong>{f.nombre}</strong>{f.codigo && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{f.codigo}</div>}</> },
          { key: 'categoria', label: 'Categoría', render: (f) => etq(CATEGORIAS, f.categoria) },
          { key: 'valor_actual', label: 'Valor actual', render: (f) => dinero(f.valor_actual) },
          { key: 'estado', label: 'Estado', render: (f) => etq(ESTADOS, f.estado) },
          { key: 'ubicacion', label: 'Ubicación' },
          { key: 'responsable_nombre', label: 'Responsable' },
        ]}
        campos={[
          { name: 'nombre', label: 'Nombre del activo', requerido: true },
          { name: 'codigo', label: 'Código de inventario' },
          { name: 'categoria', label: 'Categoría', type: 'select', defecto: 'equipo', opciones: CATEGORIAS },
          { name: 'fecha_adquisicion', label: 'Fecha de adquisición', type: 'date' },
          { name: 'valor_adquisicion', label: 'Valor de adquisición', type: 'number' },
          { name: 'valor_actual', label: 'Valoración actual', type: 'number' },
          { name: 'estado', label: 'Estado', type: 'select', defecto: 'activo', opciones: ESTADOS },
          { name: 'ubicacion', label: 'Ubicación' },
          { name: 'responsable_id', label: 'Responsable (empleado)', type: 'select', fuente: '/empleados', labelKey: 'nombre' },
          { name: 'descripcion', label: 'Descripción', type: 'textarea' },
          { name: 'notas', label: 'Notas', type: 'textarea' },
        ]}
      />
    </div>
  );
}

function Stat({ etiqueta, valor, clase }) {
  return <div className="card stat"><div className="etiqueta">{etiqueta}</div><div className={`valor ${clase || ''}`}>{valor}</div></div>;
}
