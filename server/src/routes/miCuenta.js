import { Router } from 'express';
import db, { generarCodigo } from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { datosCuenta } from '../cuenta.js';

const router = Router();

// GET /api/mi-cuenta  -> estado de cuenta del propietario que inició sesión.
router.get('/', requiereRol('propietario'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a un propietario' });

  const propietario = await db.get('SELECT id, nombre, propiedad, tipo_propiedad, carnet, telefono, email, token_cuenta FROM propietarios WHERE id = ?', [propId]);
  if (!propietario) return res.status(404).json({ error: 'Propietario no encontrado' });

  const datos = await datosCuenta(propId);
  const empleados = await db.all(
    'SELECT id, nombre, puesto, carnet, telefono, codigo, activo FROM empleados_propietario WHERE propietario_id = ? ORDER BY nombre',
    [propId]
  );
  res.json({ propietario, ...datos, empleados });
}));

// ===== Invitados: el propietario genera la autorización (credencial QR) =====

// GET /api/mi-cuenta/invitados -> invitados que el propietario ha autorizado.
router.get('/invitados', requiereRol('propietario'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a un propietario' });
  const invitados = await db.all(
    `SELECT id, nombre, documento, telefono, placa_vehiculo, codigo, creado_en
       FROM visitantes
      WHERE propietario_id = ? AND tipo = 'invitado'
      ORDER BY id DESC`,
    [propId]
  );
  res.json(invitados);
}));

// POST /api/mi-cuenta/invitados -> crea la credencial de acceso de un invitado.
router.post('/invitados', requiereRol('propietario'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a un propietario' });
  const { nombre, documento, telefono, placa_vehiculo, notas } = req.body || {};
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'El nombre del invitado es obligatorio.' });
  }
  const codigo = generarCodigo();
  const info = await db.run(
    `INSERT INTO visitantes (nombre, documento, telefono, tipo, propietario_id, placa_vehiculo, notas, codigo)
     VALUES (?, ?, ?, 'invitado', ?, ?, ?, ?)`,
    [String(nombre).trim(), documento || null, telefono || null, propId, placa_vehiculo || null, notas || null, codigo]
  );
  res.status(201).json({ id: info.lastID, codigo });
}));

// DELETE /api/mi-cuenta/invitados/:id -> el propietario revoca una credencial suya.
router.delete('/invitados/:id', requiereRol('propietario'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a un propietario' });
  const info = await db.run(
    "DELETE FROM visitantes WHERE id = ? AND propietario_id = ? AND tipo = 'invitado'",
    [req.params.id, propId]
  );
  if (info.changes === 0) return res.status(404).json({ error: 'Invitado no encontrado' });
  res.json({ ok: true });
}));

export default router;
