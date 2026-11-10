import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';

const router = Router();

// GET /api/configuracion -> { clave: valor, ... }
router.get('/', ah(async (req, res) => {
  const filas = await db.all('SELECT clave, valor FROM configuracion');
  const obj = {};
  for (const f of filas) obj[f.clave] = f.valor;
  res.json(obj);
}));

// PUT /api/configuracion  body: { clave: valor, ... }  (crea o actualiza cada clave)
router.put('/', ah(async (req, res) => {
  const cambios = req.body || {};
  for (const [clave, valor] of Object.entries(cambios)) {
    const existe = await db.get('SELECT clave FROM configuracion WHERE clave = ?', [clave]);
    if (existe) await db.run('UPDATE configuracion SET valor = ? WHERE clave = ?', [String(valor), clave]);
    else await db.run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', [clave, String(valor)]);
  }
  const filas = await db.all('SELECT clave, valor FROM configuracion');
  const obj = {};
  for (const f of filas) obj[f.clave] = f.valor;
  res.json(obj);
}));

export default router;
