import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'vehiculos',
  campos: ['nombre', 'placa', 'tipo', 'gps_id', 'proveedor_gps', 'responsable_id', 'activo'],
  orden: 'nombre',
  listSql: () => ({
    sql: `
      SELECT v.*, e.nombre AS responsable_nombre
      FROM vehiculos v
      LEFT JOIN empleados e ON e.id = v.responsable_id
      ORDER BY v.activo DESC, v.nombre
    `,
    params: [],
  }),
});

export default router;
