import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

// Catálogo parametrizable de tipos de incidencia.
crearCrud(router, {
  tabla: 'tipos_incidencia',
  campos: ['nombre', 'activo'],
  orden: 'nombre',
  listSql: (req) => {
    if (req.query.activos) {
      return { sql: 'SELECT * FROM tipos_incidencia WHERE activo = 1 ORDER BY nombre', params: [] };
    }
    return { sql: 'SELECT * FROM tipos_incidencia ORDER BY nombre', params: [] };
  },
});

export default router;
