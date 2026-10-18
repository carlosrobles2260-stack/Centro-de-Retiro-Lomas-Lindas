import { Router } from 'express';
import db, { generarCodigo } from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

// Buscar un visitante por su código de credencial / QR.
// (Debe ir antes del CRUD para no chocar con GET /:id.)
router.get('/codigo/:codigo', ah(async (req, res) => {
  const v = await db.get(
    `SELECT v.*, p.nombre AS propietario_nombre, p.propiedad
     FROM visitantes v
     LEFT JOIN propietarios p ON p.id = v.propietario_id
     WHERE v.codigo = ?`,
    [req.params.codigo]
  );
  if (!v) return res.status(404).json({ error: 'Credencial no encontrada' });
  res.json(v);
}));

crearCrud(router, {
  tabla: 'visitantes',
  campos: ['nombre', 'documento', 'telefono', 'tipo', 'propietario_id', 'placa_vehiculo', 'notas'],
  orden: 'nombre',
  alCrear: (datos) => { datos.codigo = generarCodigo(); },
  listSql: (req) => {
    const base = `
      SELECT v.*, p.nombre AS propietario_nombre, p.propiedad
      FROM visitantes v
      LEFT JOIN propietarios p ON p.id = v.propietario_id
    `;
    if (req.query.buscar) {
      const q = `%${req.query.buscar}%`;
      return {
        sql: base + ' WHERE v.nombre LIKE ? OR v.documento LIKE ? OR v.codigo LIKE ? ORDER BY v.nombre',
        params: [q, q, q],
      };
    }
    return { sql: base + ' ORDER BY v.nombre', params: [] };
  },
});

export default router;
