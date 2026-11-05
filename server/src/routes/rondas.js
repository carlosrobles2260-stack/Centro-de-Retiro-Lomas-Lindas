import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'rondas',
  campos: ['empleado_id', 'fecha_hora', 'punto_control', 'estado', 'observaciones', 'registrado_por'],
  orden: 'fecha_hora DESC',
  listSql: (req) => {
    const base = `
      SELECT r.*, e.nombre AS empleado_nombre, u.nombre AS registrado_por_nombre
      FROM rondas r
      LEFT JOIN empleados e ON e.id = r.empleado_id
      LEFT JOIN usuarios u  ON u.id = r.registrado_por
    `;
    if (req.query.fecha) {
      return {
        sql: base + " WHERE date(r.fecha_hora) = ? ORDER BY r.fecha_hora DESC",
        params: [req.query.fecha],
      };
    }
    return { sql: base + ' ORDER BY r.fecha_hora DESC', params: [] };
  },
});

export default router;
