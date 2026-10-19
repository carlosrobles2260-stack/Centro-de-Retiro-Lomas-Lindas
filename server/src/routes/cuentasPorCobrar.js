import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { notificarPropietario } from '../notificaciones.js';

const router = Router();

const money = (n) => new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const hoyISO = () => new Date().toISOString().slice(0, 10);

// Días de atraso de una fecha de vencimiento respecto a hoy (0 si no ha vencido).
function diasVencido(fechaVenc) {
  if (!fechaVenc) return 0;
  const venc = new Date(String(fechaVenc).slice(0, 10) + 'T00:00:00');
  const hoy = new Date(hoyISO() + 'T00:00:00');
  const d = Math.floor((hoy - venc) / 86400000);
  return d > 0 ? d : 0;
}

// Trae las facturas abiertas (pendientes o vencidas) con su saldo.
async function facturasAbiertas() {
  const filas = await db.all(`
    SELECT f.id, f.propietario_id, f.concepto, f.monto, f.estado, f.fecha_emision, f.fecha_vencimiento,
           p.nombre AS propietario_nombre, p.propiedad, p.telefono, p.email,
           COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.factura_id = f.id), 0) AS pagado
    FROM facturas f
    LEFT JOIN propietarios p ON p.id = f.propietario_id
    WHERE f.estado IN ('pendiente', 'vencida')
    ORDER BY f.fecha_vencimiento
  `);
  return filas
    .map((f) => ({ ...f, saldo: Number(f.monto) - Number(f.pagado), dias: diasVencido(f.fecha_vencimiento) }))
    .filter((f) => f.saldo > 0.001);
}

// GET /api/cuentas-por-cobrar  -> resumen + detalle por propietario
router.get('/', ah(async (req, res) => {
  const abiertas = await facturasAbiertas();
  const antiguedad = { vigente: 0, d1_30: 0, d31_60: 0, d61: 0 };
  const porProp = new Map();

  for (const f of abiertas) {
    const vencido = f.dias > 0;
    if (!vencido) antiguedad.vigente += f.saldo;
    else if (f.dias <= 30) antiguedad.d1_30 += f.saldo;
    else if (f.dias <= 60) antiguedad.d31_60 += f.saldo;
    else antiguedad.d61 += f.saldo;

    let p = porProp.get(f.propietario_id);
    if (!p) {
      p = {
        propietario_id: f.propietario_id, nombre: f.propietario_nombre, propiedad: f.propiedad,
        telefono: f.telefono, email: f.email,
        saldo: 0, saldo_vencido: 0, cuotas: 0, cuotas_vencidas: 0, dias_max: 0,
      };
      porProp.set(f.propietario_id, p);
    }
    p.saldo += f.saldo;
    p.cuotas += 1;
    if (vencido) { p.saldo_vencido += f.saldo; p.cuotas_vencidas += 1; p.dias_max = Math.max(p.dias_max, f.dias); }
  }

  const total = antiguedad.vigente + antiguedad.d1_30 + antiguedad.d31_60 + antiguedad.d61;
  const propietarios = [...porProp.values()].sort((a, b) => b.saldo_vencido - a.saldo_vencido || b.saldo - a.saldo);

  res.json({
    resumen: {
      total,
      por_vencer: antiguedad.vigente,
      vencido: antiguedad.d1_30 + antiguedad.d31_60 + antiguedad.d61,
      propietarios_con_saldo: propietarios.length,
      antiguedad,
    },
    propietarios,
  });
}));

// POST /api/cuentas-por-cobrar/marcar-vencidas  -> marca como vencidas las pendientes ya vencidas
router.post('/marcar-vencidas', ah(async (req, res) => {
  const r = await db.run(
    `UPDATE facturas SET estado = 'vencida'
     WHERE estado = 'pendiente' AND fecha_vencimiento IS NOT NULL AND ${SQL.dia('fecha_vencimiento')} < ?`,
    [hoyISO()]
  );
  res.json({ actualizadas: r.changes || 0 });
}));

// POST /api/cuentas-por-cobrar/recordatorio  body: { propietario_id }
router.post('/recordatorio', ah(async (req, res) => {
  const { propietario_id } = req.body || {};
  if (!propietario_id) return res.status(400).json({ error: 'Falta el propietario' });
  const prop = await db.get('SELECT * FROM propietarios WHERE id = ?', [propietario_id]);
  if (!prop) return res.status(404).json({ error: 'Propietario no encontrado' });

  const abiertas = (await facturasAbiertas()).filter((f) => f.propietario_id === Number(propietario_id));
  const saldo = abiertas.reduce((a, f) => a + f.saldo, 0);
  if (saldo <= 0) return res.status(400).json({ error: 'El propietario no tiene saldo pendiente' });

  const asunto = `Recordatorio de cuotas de mantenimiento · Lomas Lindas`;
  const mensaje =
    `Estimado(a) ${prop.nombre}, le recordamos que su saldo pendiente de cuotas de mantenimiento ` +
    `es de ${money(saldo)} (${abiertas.length} cuota(s)). Agradecemos su pronto pago para seguir ` +
    `manteniendo el Centro de Retiro Lomas Lindas. Puede consultar el detalle en su estado de cuenta.`;

  const id = await notificarPropietario({ propietario_id: Number(propietario_id), asunto, mensaje });
  const n = await db.get('SELECT estado, detalle FROM notificaciones WHERE id = ?', [id]);
  res.json({ ok: true, saldo, estado: n?.estado, detalle: n?.detalle });
}));

export default router;
