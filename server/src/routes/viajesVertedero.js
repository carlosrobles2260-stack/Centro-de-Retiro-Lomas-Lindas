import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

// Resumen de conteos (hoy, semana, mes, total). Debe ir antes del CRUD /:id.
router.get('/resumen', ah(async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = hoy.slice(0, 7);
  const n = (x) => Number(x?.n) || 0;
  const total = n(await db.get('SELECT COUNT(*) AS n FROM viajes_vertedero'));
  const deHoy = n(await db.get(`SELECT COUNT(*) AS n FROM viajes_vertedero WHERE ${SQL.dia('fecha')} = ?`, [hoy]));
  const delMes = n(await db.get(`SELECT COUNT(*) AS n FROM viajes_vertedero WHERE ${SQL.anioMes('fecha')} = ?`, [mes]));
  res.json({ hoy: deHoy, mes: delMes, total });
}));

crearCrud(router, {
  tabla: 'viajes_vertedero',
  campos: ['fecha', 'hora_salida', 'hora_regreso', 'responsable_id', 'vehiculo', 'notas'],
  orden: 'fecha DESC, hora_salida DESC',
  listSql: (req) => {
    const base = `
      SELECT v.*, e.nombre AS responsable_nombre
      FROM viajes_vertedero v
      LEFT JOIN empleados e ON e.id = v.responsable_id
    `;
    if (req.query.fecha) {
      return { sql: base + ` WHERE ${SQL.dia('v.fecha')} = ? ORDER BY v.hora_salida DESC`, params: [req.query.fecha] };
    }
    return { sql: base + ' ORDER BY v.fecha DESC, v.hora_salida DESC', params: [] };
  },
});

export default router;
