import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

const SELECT_ACCION = `
  SELECT ap.*, e.nombre AS empleado_nombre, e.departamento, u.nombre AS registrado_por_nombre
  FROM acciones_personal ap
  LEFT JOIN empleados e ON e.id = ap.empleado_id
  LEFT JOIN usuarios u  ON u.id = ap.registrado_por
`;

crearCrud(router, {
  tabla: 'acciones_personal',
  campos: ['empleado_id', 'tipo', 'fecha_inicio', 'fecha_fin', 'dias', 'descripcion'],
  orden: 'fecha_inicio DESC',
  alCrear: (datos, req) => { datos.registrado_por = req.usuario?.id ?? null; },
  listSql: (req) => {
    const cond = [];
    const params = [];
    if (req.query.empleado_id) { cond.push('ap.empleado_id = ?'); params.push(req.query.empleado_id); }
    if (req.query.tipo) { cond.push('ap.tipo = ?'); params.push(req.query.tipo); }
    const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';
    return { sql: SELECT_ACCION + where + ' ORDER BY ap.fecha_inicio DESC, ap.id DESC', params };
  },
});

export default router;
