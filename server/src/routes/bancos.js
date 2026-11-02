import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

// Saldos de cierre por cuenta en un rango de meses (YYYY-MM).
// GET /api/bancos/saldos?desde=2026-01&hasta=2026-09
router.get('/saldos', ah(async (req, res) => {
  const { desde, hasta } = req.query;
  const cond = [];
  const params = [];
  if (desde) { cond.push('periodo >= ?'); params.push(desde); }
  if (hasta) { cond.push('periodo <= ?'); params.push(hasta); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const filas = await db.all(`SELECT cuenta_id, periodo, saldo FROM saldos_banco ${where}`, params);
  res.json(filas);
}));

// Guardar/actualizar el saldo de cierre de una cuenta en un mes.
// PUT /api/bancos/saldos  { cuenta_id, periodo, saldo }
router.put('/saldos', ah(async (req, res) => {
  const { cuenta_id, periodo } = req.body || {};
  const saldo = Number(req.body?.saldo) || 0;
  if (!cuenta_id || !/^\d{4}-\d{2}$/.test(periodo || '')) {
    return res.status(400).json({ error: 'Falta cuenta o período (YYYY-MM) válido' });
  }
  await db.run(
    `INSERT INTO saldos_banco (cuenta_id, periodo, saldo) VALUES (?, ?, ?)
     ON CONFLICT(cuenta_id, periodo) DO UPDATE SET saldo = excluded.saldo`,
    [cuenta_id, periodo, saldo]
  );
  res.json({ ok: true, cuenta_id, periodo, saldo });
}));

// CRUD de cuentas bancarias (nombre, número, orden, activo).
crearCrud(router, {
  tabla: 'cuentas_bancarias',
  campos: ['nombre', 'numero', 'orden', 'activo'],
  orden: 'orden ASC, id ASC',
});

export default router;
