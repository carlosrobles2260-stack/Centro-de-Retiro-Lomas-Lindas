import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';

const router = Router();

const SELECT_PRESTAMO = `
  SELECT p.*, e.nombre AS empleado_nombre, e.departamento,
         COALESCE((SELECT SUM(d.monto) FROM descuentos_nomina d WHERE d.prestamo_id = p.id), 0) AS pagado
  FROM prestamos_empleado p
  LEFT JOIN empleados e ON e.id = p.empleado_id
`;

// Agrega saldo y períodos restantes a una fila de préstamo.
function conSaldo(p) {
  const saldo = Number(p.monto) - Number(p.pagado);
  const periodos = Number(p.cuota) > 0 ? Math.ceil(Math.max(0, saldo) / Number(p.cuota)) : null;
  return { ...p, saldo, periodos_restantes: periodos };
}

// Resumen global (debe ir antes del CRUD /:id).
router.get('/resumen', ah(async (req, res) => {
  const filas = (await db.all(SELECT_PRESTAMO)).map(conSaldo);
  const activos = filas.filter((p) => p.estado === 'activo');
  res.json({
    total_prestado: activos.reduce((a, p) => a + Number(p.monto), 0),
    saldo_pendiente: activos.reduce((a, p) => a + Math.max(0, p.saldo), 0),
    activos: activos.length,
  });
}));

// Listar
router.get('/', ah(async (req, res) => {
  const where = req.query.empleado_id ? ' WHERE p.empleado_id = ?' : '';
  const params = req.query.empleado_id ? [req.query.empleado_id] : [];
  const filas = (await db.all(SELECT_PRESTAMO + where + ' ORDER BY p.estado, p.fecha DESC', params)).map(conSaldo);
  res.json(filas);
}));

// Obtener uno con su historial de descuentos
router.get('/:id', ah(async (req, res) => {
  const p = await db.get(SELECT_PRESTAMO + ' WHERE p.id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Préstamo no encontrado' });
  const descuentos = await db.all(
    `SELECT d.*, u.nombre AS registrado_por_nombre FROM descuentos_nomina d
     LEFT JOIN usuarios u ON u.id = d.registrado_por WHERE d.prestamo_id = ? ORDER BY d.fecha DESC, d.id DESC`,
    [req.params.id]
  );
  res.json({ ...conSaldo(p), descuentos });
}));

// Crear préstamo
router.post('/', ah(async (req, res) => {
  const { empleado_id, monto, cuota, periodicidad, fecha, motivo } = req.body || {};
  if (!empleado_id) return res.status(400).json({ error: 'El empleado es obligatorio' });
  const m = Number(monto) || 0;
  const c = Number(cuota) || 0;
  if (m <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
  if (c <= 0) return res.status(400).json({ error: 'La cuota de descuento debe ser mayor a cero' });
  if (c > m) return res.status(400).json({ error: 'La cuota no puede ser mayor al monto del préstamo' });
  const per = ['semanal', 'quincenal', 'mensual'].includes(periodicidad) ? periodicidad : 'quincenal';

  const info = await db.run(
    `INSERT INTO prestamos_empleado (empleado_id, monto, cuota, periodicidad, fecha, motivo, registrado_por)
     VALUES (?, ?, ?, ?, COALESCE(?, ${SQL.HOY}), ?, ?)`,
    [empleado_id, m, c, per, fecha || null, motivo || null, req.usuario?.id ?? null]
  );
  res.status(201).json(conSaldo(await db.get(SELECT_PRESTAMO + ' WHERE p.id = ?', [info.lastID])));
}));

// Registrar un descuento de nómina sobre el préstamo
router.post('/:id/descuento', ah(async (req, res) => {
  const p = conSaldo(await db.get(SELECT_PRESTAMO + ' WHERE p.id = ?', [req.params.id]) || {});
  if (!p.id) return res.status(404).json({ error: 'Préstamo no encontrado' });
  if (p.estado !== 'activo') return res.status(400).json({ error: 'El préstamo no está activo' });

  let monto = req.body?.monto != null ? Number(req.body.monto) : Number(p.cuota);
  if (!(monto > 0)) return res.status(400).json({ error: 'El monto del descuento debe ser mayor a cero' });
  monto = Math.min(monto, p.saldo); // no descontar más que el saldo

  await db.tx(async (q) => {
    await q.run(
      `INSERT INTO descuentos_nomina (prestamo_id, empleado_id, monto, fecha, periodo, nota, registrado_por)
       VALUES (?, ?, ?, COALESCE(?, ${SQL.HOY}), ?, ?, ?)`,
      [p.id, p.empleado_id, monto, req.body?.fecha || null, req.body?.periodo || null, req.body?.nota || null, req.usuario?.id ?? null]
    );
    const row = await q.get('SELECT COALESCE(SUM(monto),0) AS total FROM descuentos_nomina WHERE prestamo_id = ?', [p.id]);
    if (Number(row.total) >= Number(p.monto) - 0.001) {
      await q.run("UPDATE prestamos_empleado SET estado = 'pagado' WHERE id = ?", [p.id]);
    }
  });
  res.status(201).json(conSaldo(await db.get(SELECT_PRESTAMO + ' WHERE p.id = ?', [p.id])));
}));

// Eliminar (solo si no tiene descuentos aplicados)
router.delete('/:id', ah(async (req, res) => {
  const tiene = await db.get('SELECT 1 AS x FROM descuentos_nomina WHERE prestamo_id = ? LIMIT 1', [req.params.id]);
  if (tiene) return res.status(403).json({ error: 'No se puede eliminar un préstamo con descuentos registrados.' });
  const info = await db.run('DELETE FROM prestamos_empleado WHERE id = ?', [req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
}));

export default router;
