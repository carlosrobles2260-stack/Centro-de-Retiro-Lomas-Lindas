import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'gastos',
  campos: ['concepto', 'categoria', 'monto', 'fecha', 'proveedor', 'registrado_por'],
  orden: 'fecha DESC',
  listSql: (req) => {
    const base = `
      SELECT g.*, u.nombre AS registrado_por_nombre
      FROM gastos g
      LEFT JOIN usuarios u ON u.id = g.registrado_por
    `;
    if (req.query.categoria) {
      return { sql: base + ' WHERE g.categoria = ? ORDER BY g.fecha DESC', params: [req.query.categoria] };
    }
    return { sql: base + ' ORDER BY g.fecha DESC', params: [] };
  },
});

export default router;
