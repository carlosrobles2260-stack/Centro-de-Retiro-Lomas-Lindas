import { Router } from 'express';
import db from '../db.js';

const router = Router();

const SELECT_FACTURA = `
  SELECT f.*, p.nombre AS propietario_nombre, p.propiedad,
         COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.factura_id = f.id), 0) AS pagado
  FROM facturas f
  LEFT JOIN propietarios p ON p.id = f.propietario_id
`;

// GET /api/facturas  (filtros: estado, propietario_id)
router.get('/', (req, res) => {
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
  res.json(db.prepare(SELECT_FACTURA + where + ' ORDER BY f.fecha_emision DESC').all(...params));
});

// GET /api/facturas/:id  (incluye pagos)
router.get('/:id', (req, res) => {
  const factura = db.prepare(SELECT_FACTURA + ' WHERE f.id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'No encontrada' });
  factura.pagos = db.prepare('SELECT * FROM pagos WHERE factura_id = ? ORDER BY fecha DESC').all(req.params.id);
  res.json(factura);
});

// POST /api/facturas
router.post('/', (req, res) => {
  const { propietario_id, concepto, monto, fecha_emision, fecha_vencimiento, notas } = req.body || {};
  if (!propietario_id || !concepto) {
    return res.status(400).json({ error: 'Propietario y concepto son obligatorios' });
  }
  const info = db
    .prepare(
      `INSERT INTO facturas (propietario_id, concepto, monto, fecha_emision, fecha_vencimiento, notas)
       VALUES (?, ?, ?, COALESCE(?, date('now')), ?, ?)`
    )
    .run(propietario_id, concepto, Number(monto) || 0, fecha_emision || null, fecha_vencimiento || null, notas || null);
  res.status(201).json(db.prepare(SELECT_FACTURA + ' WHERE f.id = ?').get(info.lastInsertRowid));
});

// PUT /api/facturas/:id
router.put('/:id', (req, res) => {
  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'No encontrada' });
  const { concepto, monto, fecha_emision, fecha_vencimiento, estado, notas } = req.body || {};
  db.prepare(
    `UPDATE facturas SET concepto = ?, monto = ?, fecha_emision = ?, fecha_vencimiento = ?, estado = ?, notas = ?
     WHERE id = ?`
  ).run(
    concepto ?? factura.concepto,
    monto ?? factura.monto,
    fecha_emision ?? factura.fecha_emision,
    fecha_vencimiento ?? factura.fecha_vencimiento,
    estado ?? factura.estado,
    notas ?? factura.notas,
    req.params.id
  );
  res.json(db.prepare(SELECT_FACTURA + ' WHERE f.id = ?').get(req.params.id));
});

// DELETE /api/facturas/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM facturas WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ok: true });
});

// POST /api/facturas/:id/pagos  (registrar un pago y actualizar estado)
router.post('/:id/pagos', (req, res) => {
  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const { monto, fecha, metodo, referencia } = req.body || {};
  const montoNum = Number(monto) || 0;
  if (montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });

  const transaccion = db.transaction(() => {
    db.prepare(
      `INSERT INTO pagos (factura_id, monto, fecha, metodo, referencia)
       VALUES (?, ?, COALESCE(?, date('now')), ?, ?)`
    ).run(req.params.id, montoNum, fecha || null, metodo || 'efectivo', referencia || null);

    const pagado = db
      .prepare('SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE factura_id = ?')
      .get(req.params.id).total;

    const nuevoEstado = pagado >= factura.monto ? 'pagada' : 'pendiente';
    db.prepare('UPDATE facturas SET estado = ? WHERE id = ?').run(nuevoEstado, req.params.id);
  });
  transaccion();

  res.status(201).json(db.prepare(SELECT_FACTURA + ' WHERE f.id = ?').get(req.params.id));
});

export default router;
