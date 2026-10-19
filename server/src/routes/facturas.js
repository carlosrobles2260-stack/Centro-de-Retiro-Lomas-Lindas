import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';

const router = Router();

const SELECT_FACTURA = `
  SELECT f.*, p.nombre AS propietario_nombre, p.propiedad,
         COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.factura_id = f.id), 0) AS pagado
  FROM facturas f
  LEFT JOIN propietarios p ON p.id = f.propietario_id
`;

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
  await db.run(
    `UPDATE facturas SET concepto = ?, monto = ?, fecha_emision = ?, fecha_vencimiento = ?, estado = ?, notas = ?
     WHERE id = ?`,
    [
      concepto ?? factura.concepto,
      monto ?? factura.monto,
      fecha_emision ?? factura.fecha_emision,
      fecha_vencimiento ?? factura.fecha_vencimiento,
      estado ?? factura.estado,
      notas ?? factura.notas,
      req.params.id,
    ]
  );
  res.json(await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]));
}));

// DELETE /api/facturas/:id
router.delete('/:id', ah(async (req, res) => {
  const info = await db.run('DELETE FROM facturas WHERE id = ?', [req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ok: true });
}));

// POST /api/facturas/:id/pagos  (registrar un pago y actualizar estado)
router.post('/:id/pagos', ah(async (req, res) => {
  const factura = await db.get('SELECT * FROM facturas WHERE id = ?', [req.params.id]);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const { monto, fecha, metodo, referencia } = req.body || {};
  const montoNum = Number(monto) || 0;
  if (montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });

  await db.tx(async (q) => {
    await q.run(
      `INSERT INTO pagos (factura_id, monto, fecha, metodo, referencia)
       VALUES (?, ?, COALESCE(?, ${SQL.HOY}), ?, ?)`,
      [req.params.id, montoNum, fecha || null, metodo || 'efectivo', referencia || null]
    );
    const row = await q.get('SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE factura_id = ?', [req.params.id]);
    const nuevoEstado = Number(row.total) >= Number(factura.monto) ? 'pagada' : 'pendiente';
    await q.run('UPDATE facturas SET estado = ? WHERE id = ?', [nuevoEstado, req.params.id]);
  });

  res.status(201).json(await db.get(SELECT_FACTURA + ' WHERE f.id = ?', [req.params.id]));
}));

export default router;
