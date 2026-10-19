// Estado de cuenta del propietario: datos (cuotas/facturas y saldo) y la
// página pública que se comparte por enlace privado.
import db from './db.js';
import { logoBuffer } from './credencial.js';

const money = (n) => new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

// Monto adeudado tras el descuento autorizado (máx. 20%).
const efectivo = (f) => Number(f.monto) * (1 - (Number(f.descuento_pct) || 0) / 100);

// Reúne las facturas (cuotas) del propietario y calcula el saldo pendiente
// (considera pagos parciales y descuentos autorizados).
export async function datosCuenta(propietarioId) {
  const facturas = await db.all(
    `SELECT f.*, COALESCE((SELECT SUM(monto) FROM pagos WHERE factura_id = f.id), 0) AS pagado
     FROM facturas f WHERE f.propietario_id = ? ORDER BY f.fecha_emision DESC, f.id DESC`,
    [propietarioId]
  );
  const abiertas = facturas.filter((f) => f.estado === 'pendiente' || f.estado === 'vencida');
  const saldo = abiertas.reduce((acc, f) => acc + Math.max(0, efectivo(f) - Number(f.pagado)), 0);
  const pagado = facturas.reduce((acc, f) => acc + Number(f.pagado), 0);
  return { facturas, saldo, pagado, pendientes: abiertas.length };
}

function logoDataUrl() {
  const buf = logoBuffer();
  return buf ? `data:image/png;base64,${buf.toString('base64')}` : null;
}

const ETIQUETA_ESTADO = { pendiente: 'Pendiente', vencida: 'Vencida', pagada: 'Pagada', anulada: 'Anulada' };
const COLOR_ESTADO = { pendiente: '#d98e04', vencida: '#c0392b', pagada: '#2f6e4f', anulada: '#5d6b63' };

// Página web pública del estado de cuenta (enlace privado por propietario).
export function paginaCuentaHTML(propietario, datos) {
  const logo = logoDataUrl();
  const { facturas, saldo, pagado } = datos;
  const filas = facturas.map((f) => `
      <tr>
        <td>${escape(f.concepto)}<div class="sub">${f.fecha_emision || ''}${f.fecha_vencimiento ? ' · vence ' + f.fecha_vencimiento : ''}</div></td>
        <td class="monto">${money(f.monto)}</td>
        <td><span class="badge" style="background:${COLOR_ESTADO[f.estado] || '#5d6b63'}">${ETIQUETA_ESTADO[f.estado] || f.estado}</span></td>
      </tr>`).join('');

  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Estado de cuenta · ${escape(propietario.nombre)}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f5f2eb; color: #1f2a24; margin: 0; padding: 18px; }
  .hoja { max-width: 560px; margin: 0 auto; }
  .cab { background: #2f6e4f; color: #fff; border-radius: 16px 16px 0 0; padding: 22px; text-align: center; }
  .cab img { width: 90px; background: #fff; border-radius: 12px; padding: 8px; }
  .cab h1 { font-size: 18px; margin: 10px 0 2px; }
  .cab .sub { color: rgba(255,255,255,.85); font-size: 13px; }
  .saldo { background: #fff; padding: 20px; text-align: center; border-bottom: 1px solid #e4e8e3; }
  .saldo .lbl { color: #5d6b63; font-size: 13px; }
  .saldo .val { font-size: 34px; font-weight: 800; color: ${saldo > 0 ? '#c0392b' : '#2f6e4f'}; margin-top: 4px; }
  .saldo .nota { color: #5d6b63; font-size: 12px; margin-top: 6px; }
  .cuerpo { background: #fff; border-radius: 0 0 16px 16px; padding: 8px 18px 22px; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
  h2 { font-size: 14px; color: #5d6b63; text-transform: uppercase; letter-spacing: .06em; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 0; border-bottom: 1px solid #eef1ee; font-size: 14px; vertical-align: top; }
  td.monto { text-align: right; font-weight: 600; white-space: nowrap; }
  .sub { color: #5d6b63; font-size: 12px; margin-top: 2px; }
  .badge { color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
  .vacio { color: #5d6b63; text-align: center; padding: 20px; }
  .pie { text-align: center; color: #5d6b63; font-size: 12px; margin: 16px 0; }
</style></head>
<body><div class="hoja">
  <div class="cab">
    ${logo ? `<img src="${logo}" alt="Lomas Lindas" />` : ''}
    <h1>${escape(propietario.nombre)}</h1>
    <div class="sub">${escape(propietario.propiedad || '')}${propietario.carnet ? ' · Carnet ' + escape(propietario.carnet) : ''}</div>
  </div>
  <div class="saldo">
    <div class="lbl">Saldo pendiente de cuotas de mantenimiento</div>
    <div class="val">${money(saldo)}</div>
    <div class="nota">${saldo > 0 ? 'Tienes cuotas por pagar.' : 'Estás al día. ¡Gracias!'} · Total pagado: ${money(pagado)}</div>
  </div>
  <div class="cuerpo">
    <h2>Detalle de cuotas</h2>
    ${facturas.length ? `<table><tbody>${filas}</tbody></table>` : '<div class="vacio">Aún no hay cuotas registradas.</div>'}
    <div class="pie">Centro de Retiro Lomas Lindas · Estado de cuenta en línea</div>
  </div>
</div></body></html>`;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
