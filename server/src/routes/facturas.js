import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';

const router = Router();

const SELECT_FACTURA = `
  SELECT f.*, p.nombre AS propietario_nombre, p.propiedad,
         ud.nombre AS descuento_por_nombre,
         COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.factura_id = f.id), 0) AS pagado
  FROM facturas f
  LEFT JOIN propietarios p ON p.id = f.propietario_id
  LEFT JOIN usuarios ud ON ud.id = f.descuento_por
`;

// Monto realmente adeudado tras aplicar el descuento autorizado (máx. 20%).
const efectivo = (f) => Number(f.monto) * (1 - (Number(f.descuento_pct) || 0) / 100);

// Cuotas abiertas de un propietario, con saldo, ordenadas de la más antigua a la más nueva.
async function abiertasOrdenadas(propietarioId) {
  const filas = await db.all(
    `SELECT f.*, COALESCE((SELECT SUM(monto) FROM pagos WHERE factura_id = f.id), 0) AS pagado
     FROM facturas f WHERE f.propietario_id = ? AND f.estado IN ('pendiente', 'vencida')`,
    [propietarioId]
  );
  return filas
    .map((f) => ({ ...f, saldo: efectivo(f) - Number(f.pagado), orden: String(f.fecha_vencimiento || f.fecha_emision || '') }))
    .filter((f) => f.saldo > 0.001)
    .sort((a, b) => a.orden.localeCompare(b.orden) || a.id - b.id);
}

// GET /api/facturas  (filtros: estado, propietario_id)
router.get('/', ah(async (req, res) => {
  const cond = [];
  const params = [];
  if (req.query.estado) {
    cond.push('f.estado = ?');
    params.push(req.query.estado);
  }
  if (req.query.propietario_id) {
    cond.push('f.propietario_id = ?');
    params.push(req.query.propietario_id);
  }
  const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';
  res.json(await db.all(SELECT_FACTURA + where + ' ORDER BY f.fecha_emision DESC', params));
}));

// GET /api/facturas/:id  (incluye pagos)
router.get('/:id', ah(async (req, res) => {
  const factura = await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]);
  if (!factura) return res.status(404).json({ error: 'No encontrada' });
  factura.pagos = await db.all('SELECT * FROM pagos WHERE factura_id = ? ORDER BY fecha DESC', [req.params.id]);
  res.json(factura);
}));

// POST /api/facturas
router.post('/', ah(async (req, res) => {
  const { propietario_id, concepto, monto, fecha_emision, fecha_vencimiento, notas } = req.body || {};
  if (!propietario_id || !concepto) {
    return res.status(400).json({ error: 'Propietario y concepto son obligatorios' });
  }
  const info = await db.run(
    `INSERT INTO facturas (propietario_id, concepto, monto, fecha_emision, fecha_vencimiento, notas)
     VALUES (?, ?, ?, COALESCE(?, ${SQL.HOY}), ?, ?)`,
    [propietario_id, concepto, Number(monto) || 0, fecha_emision || null, fecha_vencimiento || null, notas || null]
  );
  res.status(201).json(await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [info.lastID]));
}));

// POST /api/facturas/generar-mensuales  -> emite una cuota a cada propietario activo
// Body: { concepto, monto, fecha_vencimiento? }. Evita duplicar la misma cuota en el mes.
router.post('/generar-mensuales', ah(async (req, res) => {
  const { concepto, monto, fecha_vencimiento } = req.body || {};
  if (!concepto) return res.status(400).json({ error: 'El concepto es obligatorio' });
  const m = Number(monto) || 0;
  const mesActual = new Date().toISOString().slice(0, 7);

  const props = await db.all('SELECT id FROM propietarios WHERE activo = 1');
  let creadas = 0, omitidas = 0;
  for (const p of props) {
    const existe = await db.get(
      `SELECT id FROM facturas WHERE propietario_id = ? AND concepto = ? AND ${SQL.anioMes('fecha_emision')} = ?`,
      [p.id, concepto, mesActual]
    );
    if (existe) { omitidas += 1; continue; }
    await db.run(
      `INSERT INTO facturas (propietario_id, concepto, monto, fecha_emision, fecha_vencimiento)
       VALUES (?, ?, ?, ${SQL.HOY}, ?)`,
      [p.id, concepto, m, fecha_vencimiento || null]
    );
    creadas += 1;
  }
  res.status(201).json({ creadas, omitidas, total: props.length });
}));

// PUT /api/facturas/:id
router.put('/:id', ah(async (req, res) => {
  const factura = await db.get('SELECT * FROM facturas WHERE id = ?', [req.params.id]);
  if (!factura) return res.status(404).json({ error: 'No encontrada' });
  const { concepto, monto, fecha_emision, fecha_vencimiento, estado, notas } = req.body || {};

  // No se permite condonar: el estado 'anulada' no es válido y no se marca como
  // pagada manualmente (eso lo decide el pago). Solo se aceptan 'pendiente'/'vencida'.
  if (estado === 'anulada') {
    return res.status(403).json({ error: 'No se permite anular (condonar) una cuota.' });
  }
  const estadoFinal = (estado === 'pendiente' || estado === 'vencida') ? estado : factura.estado;

  // El monto no puede quedar por debajo de lo ya pagado (evita saldos negativos / condonación encubierta).
  const pagadoRow = await db.get('SELECT COALESCE(SUM(monto),0) AS pagado FROM pagos WHERE factura_id = ?', [req.params.id]);
  const montoFinal = monto !== undefined ? Number(monto) : Number(factura.monto);
  if (montoFinal < Number(pagadoRow.pagado) - 0.001) {
    return res.status(400).json({ error: 'El monto no puede ser menor a lo ya pagado.' });
  }

  await db.run(
    `UPDATE facturas SET concepto = ?, monto = ?, fecha_emision = ?, fecha_vencimiento = ?, estado = ?, notas = ?
     WHERE id = ?`,
    [
      concepto ?? factura.concepto,
      montoFinal,
      fecha_emision ?? factura.fecha_emision,
      fecha_vencimiento ?? factura.fecha_vencimiento,
      estadoFinal,
      notas ?? factura.notas,
      req.params.id,
    ]
  );
  res.json(await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]));
}));

// DELETE /api/facturas/:id  (no se puede eliminar una cuota con saldo pendiente: eso sería condonar)
router.delete('/:id', ah(async (req, res) => {
  const factura = await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]);
  if (!factura) return res.status(404).json({ error: 'No encontrada' });
  const saldo = efectivo(factura) - Number(factura.pagado);
  if (saldo > 0.001) {
    return res.status(403).json({ error: 'No se puede eliminar una cuota con saldo pendiente (no se permite condonar deudas).' });
  }
  await db.run('DELETE FROM facturas WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// POST /api/facturas/:id/pagos  (registrar un pago y actualizar estado)
router.post('/:id/pagos', ah(async (req, res) => {
  const factura = await db.get('SELECT * FROM facturas WHERE id = ?', [req.params.id]);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const { monto, fecha, metodo, referencia } = req.body || {};
  const montoNum = Number(monto) || 0;
  if (montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });

  // Regla: el abono siempre se aplica a la cuota más antigua con saldo.
  const abiertas = await abiertasOrdenadas(factura.propietario_id);
  const masAntigua = abiertas[0];
  if (masAntigua && masAntigua.id !== Number(req.params.id)) {
    return res.status(409).json({
      error: `Primero debe abonarse a la cuota más antigua ("${masAntigua.concepto}").`,
      factura_mas_antigua: masAntigua.id,
    });
  }

  await db.tx(async (q) => {
    await q.run(
      `INSERT INTO pagos (factura_id, monto, fecha, metodo, referencia)
       VALUES (?, ?, COALESCE(?, ${SQL.HOY}), ?, ?)`,
      [req.params.id, montoNum, fecha || null, metodo || 'efectivo', referencia || null]
    );
    const row = await q.get('SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE factura_id = ?', [req.params.id]);
    const nuevoEstado = Number(row.total) >= efectivo(factura) - 0.001 ? 'pagada' : factura.estado === 'vencida' ? 'vencida' : 'pendiente';
    await q.run('UPDATE facturas SET estado = ? WHERE id = ?', [nuevoEstado, req.params.id]);
  });

  res.status(201).json(await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]));
}));

// POST /api/facturas/:id/descuento  -> aplica un descuento (máx. 20%) a una cuota.
// Solo la presidencia (rol 'presidente'; 'admin' también por regla general).
router.post('/:id/descuento', requiereRol('presidente'), ah(async (req, res) => {
  const factura = await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const pct = Number(req.body?.porcentaje);
  if (!Number.isFinite(pct) || pct < 0 || pct > 20) {
    return res.status(400).json({ error: 'El descuento debe estar entre 0% y 20%.' });
  }
  const motivo = req.body?.motivo || null;

  // Recalcula el estado según el nuevo monto efectivo (no condona: el saldo restante sigue debiéndose).
  const efectivoNuevo = Number(factura.monto) * (1 - pct / 100);
  const pagado = Number(factura.pagado);
  const nuevoEstado = pagado >= efectivoNuevo - 0.001
    ? 'pagada'
    : (factura.estado === 'pagada' ? 'pendiente' : factura.estado);

  await db.run(
    `UPDATE facturas SET descuento_pct = ?, descuento_motivo = ?, descuento_por = ?, descuento_en = ${SQL.AHORA}, estado = ? WHERE id = ?`,
    [pct, motivo, req.usuario?.id ?? null, nuevoEstado, req.params.id]
  );
  res.json(await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]));
}));

export default router;
