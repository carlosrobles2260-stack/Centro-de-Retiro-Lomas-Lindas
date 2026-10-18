import { Router } from 'express';
import db from '../db.js';
import { enviar } from '../notificaciones.js';

const router = Router();

// GET /api/notificaciones  (filtro opcional: estado)
router.get('/', (req, res) => {
  const base = `
    SELECT n.*, p.nombre AS propietario_nombre
    FROM notificaciones n
    LEFT JOIN propietarios p ON p.id = n.propietario_id
  `;
  if (req.query.estado) {
    return res.json(
      db.prepare(base + ' WHERE n.estado = ? ORDER BY n.creado_en DESC').all(req.query.estado)
    );
  }
  res.json(db.prepare(base + ' ORDER BY n.creado_en DESC').all());
});

// POST /api/notificaciones/:id/reenviar  (reintenta el envío)
router.post('/:id/reenviar', async (req, res) => {
  const existe = db.prepare('SELECT id FROM notificaciones WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ error: 'No encontrada' });
  await enviar(Number(req.params.id));
  res.json(db.prepare('SELECT * FROM notificaciones WHERE id = ?').get(req.params.id));
});

export default router;
