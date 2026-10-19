import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero } from '../lib/format.jsx';
import CrudModule from '../components/CrudModule.jsx';

const CATEGORIAS = [
  { valor: 'equipo', label: 'Equipo' },
  { valor: 'mobiliario', label: 'Mobiliario' },
  { valor: 'vehiculo', label: 'Vehículo' },
  { valor: 'herramienta', label: 'Herramienta' },
  { valor: 'tecnologia', label: 'Tecnología' },
  { valor: 'inmueble', label: 'Inmueble / terreno' },
  { valor: 'otro', label: 'Otro' },
];
const ESTADOS = [
  { valor: 'activo', label: 'En uso' },
  { valor: 'mantenimiento', label: 'En mantenimiento' },
  { valor: 'baja', label: 'Dado de baja' },
];
const DEPRECIA = [
  { valor: 0, label: 'Activo fijo (no se deprecia)' },
  { valor: 1, label: 'Se deprecia' },
];
const etq = (lista, v) => lista.find((x) => String(x.valor) === String(v))?.label || v || '—';

export default function Activos() {
  const [resumen, setResumen] = useState(null);
  const cargarResumen = useCallback(async () => {
    setResumen(await api.get('/activos/resumen').catch(() => null));
  }, []);
  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Stat etiqueta="Activos en inventario" valor={resumen?.activos ?? '…'} />
        <Stat etiqueta="Depreciables" valor={resumen?.depreciables ?? '…'} />
        <Stat etiqueta="Valor de adquisición" valor={dinero(resumen?.valor_adquisicion)} />
        <Stat etiqueta="Valor en libros" valor={dinero(resumen?.valor_libros)} clase="verde" />
      </div>

      <CrudModule
        titulo="Activos de la asociación"
        descripcion="Inventario y valoración de los bienes de la asociación. Los activos fijos (p. ej. terrenos) conservan su valor; los depreciables bajan su valor en libros con el tiempo (depreciación lineal)."
        endpoint="/activos"
        onCambio={cargarResumen}
        columnas={[
          { key: 'nombre', label: 'Activo', render: (f) => <><strong>{f.nombre}</strong>{f.codigo && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{f.codigo}</div>}</> },
          { key: 'categoria', label: 'Categoría', render: (f) => etq(CATEGORIAS, f.categoria) },
          { key: 'depreciable', label: 'Tipo', render: (f) => Number(f.depreciable) ? <span className="badge amarillo">Depreciable</span> : <span className="badge gris">Fijo</span> },
          { key: 'valor_adquisicion', label: 'Adquisición', render: (f) => dinero(f.valor_adquisicion) },
          { key: 'valor_libros', label: 'Valor en libros', render: (f) => <><strong>{dinero(f.valor_libros)}</strong>{Number(f.depreciable) && f.depreciacion_anual ? <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>−{dinero(f.depreciacion_anual)}/año</div> : null}</> },
          { key: 'estado', label: 'Estado', render: (f) => etq(ESTADOS, f.estado) },
          { key: 'responsable_nombre', label: 'Responsable' },
        ]}
        campos={[
          { name: 'nombre', label: 'Nombre del activo', requerido: true },
          { name: 'codigo', label: 'Código de inventario' },
          { name: 'categoria', label: 'Categoría', type: 'select', defecto: 'equipo', opciones: CATEGORIAS },
          { name: 'fecha_adquisicion', label: 'Fecha de adquisición', type: 'date' },
          { name: 'valor_adquisicion', label: 'Valor de adquisición', type: 'number' },
          { name: 'depreciable', label: '¿Se deprecia?', type: 'select', defecto: 0, opciones: DEPRECIA },
          { name: 'vida_util_anios', label: 'Vida útil (años) — si se deprecia', type: 'number' },
          { name: 'valor_residual', label: 'Valor residual — si se deprecia', type: 'number' },
          { name: 'valor_actual', label: 'Valoración actual — si NO se deprecia', type: 'number' },
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
