import { Router } from 'express';
import db, { generarCodigo } from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { datosCuenta } from '../cuenta.js';

const router = Router();

// GET /api/mi-cuenta  -> portal del residente (propietario o inquilino).
router.get('/', requiereRol('propietario', 'inquilino'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a una propiedad' });

  const propietario = await db.get('SELECT id, nombre, propiedad, tipo_propiedad, carnet, telefono, email, token_cuenta FROM propietarios WHERE id = ?', [propId]);
  if (!propietario) return res.status(404).json({ error: 'Propiedad no encontrada' });

  const esInquilino = req.usuario.rol === 'inquilino';
  const datos = await datosCuenta(propId);
  // El inquilino no ve las cuotas ni los empleados del propietario (son del dueño).
  if (esInquilino) { datos.facturas = []; datos.saldo = 0; datos.pagado = 0; datos.pendientes = 0; }
  const empleados = esInquilino ? [] : await db.all(
    'SELECT id, nombre, puesto, carnet, telefono, codigo, activo FROM empleados_propietario WHERE propietario_id = ? ORDER BY nombre',
    [propId]
  );
  res.json({ propietario, ...datos, empleados, es_inquilino: esInquilino });
}));

// ===== Invitados: el propietario genera la autorización (credencial QR) =====

// GET /api/mi-cuenta/invitados -> invitados que el propietario ha autorizado.
router.get('/invitados', requiereRol('propietario', 'inquilino'), ah(async (req, res) => {
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
router.post('/invitados', requiereRol('propietario', 'inquilino'), ah(async (req, res) => {
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
router.delete('/invitados/:id', requiereRol('propietario', 'inquilino'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a un propietario' });
  const info = await db.run(
    "DELETE FROM visitantes WHERE id = ? AND propietario_id = ? AND tipo = 'invitado'",
    [req.params.id, propId]
  );
  if (info.changes === 0) return res.status(404).json({ error: 'Invitado no encontrado' });
  res.json({ ok: true });
}));

// ===== Núcleo familiar: cónyuge e hijos del residente (con credencial de acceso) =====

// GET /api/mi-cuenta/familia -> miembros del núcleo familiar.
router.get('/familia', requiereRol('propietario', 'inquilino'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a una propiedad' });
  const familia = await db.all(
    `SELECT id, nombre, parentesco, documento, telefono, codigo, creado_en
       FROM visitantes
      WHERE propietario_id = ? AND tipo = 'familiar'
      ORDER BY id DESC`,
    [propId]
  );
  res.json(familia);
}));

// POST /api/mi-cuenta/familia -> agrega un familiar y genera su credencial.
router.post('/familia', requiereRol('propietario', 'inquilino'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a una propiedad' });
  const { nombre, parentesco, documento, telefono } = req.body || {};
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'El nombre del familiar es obligatorio.' });
  }
  const codigo = generarCodigo();
  const info = await db.run(
    `INSERT INTO visitantes (nombre, documento, telefono, tipo, propietario_id, parentesco, codigo)
     VALUES (?, ?, ?, 'familiar', ?, ?, ?)`,
    [String(nombre).trim(), documento || null, telefono || null, propId, parentesco || null, codigo]
  );
  res.status(201).json({ id: info.lastID, codigo });
}));

// DELETE /api/mi-cuenta/familia/:id -> quita un familiar.
router.delete('/familia/:id', requiereRol('propietario', 'inquilino'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a una propiedad' });
  const info = await db.run(
    "DELETE FROM visitantes WHERE id = ? AND propietario_id = ? AND tipo = 'familiar'",
    [req.params.id, propId]
  );
  if (info.changes === 0) return res.status(404).json({ error: 'Familiar no encontrado' });
  res.json({ ok: true });
}));

export default router;
