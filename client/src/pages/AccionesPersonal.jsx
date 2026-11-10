import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { fecha } from '../lib/format.jsx';
import CrudModule from '../components/CrudModule.jsx';

export const TIPOS_ACCION = [
  { valor: 'vacaciones', label: 'Vacaciones', color: 'var(--azul)' },
  { valor: 'permiso', label: 'Permiso', color: 'var(--amarillo)' },
  { valor: 'licencia', label: 'Licencia', color: 'var(--verde-claro)' },
  { valor: 'amonestacion', label: 'Amonestación', color: 'var(--rojo)' },
  { valor: 'reconocimiento', label: 'Reconocimiento', color: 'var(--verde)' },
];
export const etqAccion = (v) => TIPOS_ACCION.find((t) => t.valor === v)?.label || v;
const colorAccion = (v) => TIPOS_ACCION.find((t) => t.valor === v)?.color || 'var(--texto-suave)';

export default function AccionesPersonal() {
  const [empleados, setEmpleados] = useState([]);
  useEffect(() => { api.get('/empleados').then(setEmpleados).catch(() => {}); }, []);

  return (
    <CrudModule
      titulo="Acciones de personal"
      descripcion="Vacaciones, permisos, licencias, amonestaciones y reconocimientos del personal de la asociación."
      endpoint="/acciones-personal"
      filtros={[
        { name: 'empleado_id', label: 'Empleado', opciones: empleados.map((e) => ({ valor: e.id, label: e.nombre })) },
        { name: 'tipo', label: 'Tipo', opciones: TIPOS_ACCION.map((t) => ({ valor: t.valor, label: t.label })) },
      ]}
      columnas={[
        { key: 'empleado_nombre', label: 'Empleado' },
        { key: 'tipo', label: 'Tipo', render: (f) => <span className="badge" style={{ background: colorAccion(f.tipo), color: '#fff' }}>{etqAccion(f.tipo)}</span> },
        { key: 'fecha_inicio', label: 'Desde', render: (f) => fecha(f.fecha_inicio) },
        { key: 'fecha_fin', label: 'Hasta', render: (f) => (f.fecha_fin ? fecha(f.fecha_fin) : '—') },
        { key: 'dias', label: 'Días' },
        { key: 'descripcion', label: 'Descripción / motivo' },
      ]}
      campos={[
        { name: 'empleado_id', label: 'Empleado', type: 'select', fuente: '/empleados', labelKey: 'nombre', requerido: true },
        { name: 'tipo', label: 'Tipo de acción', type: 'select', defecto: 'vacaciones', opciones: TIPOS_ACCION },
        { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date' },
        { name: 'fecha_fin', label: 'Fecha de fin (opcional)', type: 'date' },
        { name: 'dias', label: 'Días', type: 'number' },
        { name: 'descripcion', label: 'Descripción / motivo', type: 'textarea' },
      ]}
    />
  );
}
