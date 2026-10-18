import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'incidentes',
  campos: ['fecha', 'tipo', 'descripcion', 'ubicacion', 'gravedad', 'estado', 'reportado_por'],
  orden: 'fecha DESC',
  listSql: (req) => {
    const base = `
      SELECT i.*, u.nombre AS reportado_por_nombre
      FROM incidentes i
      LEFT JOIN usuarios u ON u.id = i.reportado_por
    `;
    const cond = [];
    const params = [];
    if (req.query.estado) {
      cond.push('i.estado = ?');
      params.push(req.query.estado);
    }
    if (req.query.gravedad) {
      cond.push('i.gravedad = ?');
      params.push(req.query.gravedad);
    }
    const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';
    return { sql: base + where + ' ORDER BY i.fecha DESC', params };
  },
});

export default router;
