export function dinero(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Number(n) || 0);
}

export function fecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') || iso.includes(' ') ? iso.replace(' ', 'T') : iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d)) return iso;
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Devuelve la clase de badge según el estado.
const COLORES = {
  pendiente: 'amarillo', autorizada: 'azul', dentro: 'verde', finalizada: 'gris', rechazada: 'rojo',
  pagada: 'verde', vencida: 'rojo', anulada: 'gris',
  abierto: 'rojo', en_proceso: 'amarillo', cerrado: 'verde',
  baja: 'gris', media: 'amarillo', alta: 'rojo', critica: 'rojo',
  normal: 'verde', novedad: 'amarillo',
  enviada: 'verde', simulada: 'azul', error: 'rojo',
};
export function colorEstado(estado) {
  return COLORES[estado] || 'gris';
}
export function Badge({ estado }) {
  if (!estado) return <span>—</span>;
  return <span className={`badge ${colorEstado(estado)}`}>{String(estado).replace('_', ' ')}</span>;
}
