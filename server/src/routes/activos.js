import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

const SELECT_ACTIVO = `
  SELECT a.*, e.nombre AS responsable_nombre
  FROM activos a
  LEFT JOIN empleados e ON e.id = a.responsable_id
`;

// Resumen de inventario (debe ir antes del CRUD /:id).
router.get('/resumen', ah(async (req, res) => {
  const filas = await db.all('SELECT valor_adquisicion, valor_actual, estado FROM activos');
  const activos = filas.filter((f) => f.estado !== 'baja');
  res.json({
    total: filas.length,
    activos: activos.length,
    valor_adquisicion: activos.reduce((a, f) => a + Number(f.valor_adquisicion || 0), 0),
    valor_actual: activos.reduce((a, f) => a + Number(f.valor_actual || 0), 0),
  });
}));

crearCrud(router, {
  tabla: 'activos',
  campos: [
    'nombre', 'codigo', 'categoria', 'descripcion', 'fecha_adquisicion',
    'valor_adquisicion', 'valor_actual', 'estado', 'ubicacion', 'responsable_id', 'notas',
  ],
  orden: 'nombre',
  listSql: (req) => {
    if (req.query.responsable_id) {
      return { sql: SELECT_ACTIVO + ' WHERE a.responsable_id = ? ORDER BY a.nombre', params: [req.query.responsable_id] };
    }
    return { sql: SELECT_ACTIVO + ' ORDER BY a.nombre', params: [] };
  },
});

export default router;
