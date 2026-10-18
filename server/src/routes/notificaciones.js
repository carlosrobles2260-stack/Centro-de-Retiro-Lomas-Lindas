import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { enviar } from '../notificaciones.js';

const router = Router();

// GET /api/notificaciones  (filtro opcional: estado)
router.get('/', ah(async (req, res) => {
  const base = `
    SELECT n.*, p.nombre AS propietario_nombre
    FROM notificaciones n
    LEFT JOIN propietarios p ON p.id = n.propietario_id
  `;
  if (req.query.estado) {
    return res.json(await db.all(base + ' WHERE n.estado = ? ORDER BY n.creado_en DESC', [req.query.estado]));
  }
  res.json(await db.all(base + ' ORDER BY n.creado_en DESC'));
}));

// POST /api/notificaciones/:id/reenviar  (reintenta el envío)
router.post('/:id/reenviar', ah(async (req, res) => {
  const existe = await db.get('SELECT id FROM notificaciones WHERE id = ?', [req.params.id]);
  if (!existe) return res.status(404).json({ error: 'No encontrada' });
  await enviar(Number(req.params.id));
  res.json(await db.get('SELECT * FROM notificaciones WHERE id = ?', [req.params.id]));
}));

export default router;
