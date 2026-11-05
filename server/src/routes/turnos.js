import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'turnos',
  campos: ['empleado_id', 'fecha', 'hora_inicio', 'hora_fin', 'tipo', 'notas'],
  orden: 'fecha DESC, hora_inicio',
  listSql: (req) => {
    const base = `
      SELECT t.*, e.nombre AS empleado_nombre, e.departamento
      FROM turnos t
      LEFT JOIN empleados e ON e.id = t.empleado_id
    `;
    if (req.query.fecha) {
      return { sql: base + ' WHERE t.fecha = ? ORDER BY t.hora_inicio', params: [req.query.fecha] };
    }
    return { sql: base + ' ORDER BY t.fecha DESC, t.hora_inicio', params: [] };
  },
});

export default router;
