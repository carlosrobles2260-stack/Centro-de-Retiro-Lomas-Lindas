// Rutas del control de acceso por QR dinámico.
import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { generarPaseQr, registrarAcceso, estadoSujeto, probarBarrera } from '../acceso.js';

const router = Router();

// POST /api/acceso/probar-barrera  -> envía una señal de apertura de prueba al relé.
router.post('/probar-barrera', requiereRol('administracion'), ah(async (req, res) => {
  res.json({ barrera: await probarBarrera() });
}));

// GET /api/acceso/mi-qr  -> pase (QR) rotativo del propietario que inició sesión.
router.get('/mi-qr', ah(async (req, res) => {
  if (req.usuario?.rol !== 'propietario' && req.usuario?.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo disponible para el propietario.' });
  }
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a un propietario.' });
  const prop = await db.get('SELECT nombre, codigo FROM propietarios WHERE id = ?', [propId]);
  if (!prop?.codigo) return res.status(404).json({ error: 'El propietario no tiene código de acceso.' });
  res.json({ titular: prop.nombre, ...(await generarPaseQr('propietario', prop.codigo)) });
}));

// POST /api/acceso/registrar  { token }  -> valida el pase y registra entrada/salida.
// Lo usa el escáner del portón (operador autenticado).
router.post('/registrar', ah(async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Falta el pase (token).' });
  try {
    const r = await registrarAcceso(token, req.usuario?.id ?? null);
    res.status(201).json({ ok: true, ...r });
  } catch (e) {
    // Nota: un pase inválido NO devuelve 401 (eso lo reserva la sesión del operador).
    const estado = e.code === 'pase' ? 400 : e.code === 'reuso' ? 409 : e.code === 'inactivo' ? 403 : 404;
    res.status(estado).json({ error: e.message, code: e.code || 'error' });
  }
}));

// GET /api/acceso/estado?tipo=&codigo=  -> dirección sugerida (dentro/fuera).
router.get('/estado', ah(async (req, res) => {
  const { tipo, codigo } = req.query;
  const r = await estadoSujeto(tipo, codigo);
  if (!r) return res.status(404).json({ error: 'Credencial no encontrada' });
  res.json(r);
}));

// GET /api/acceso/bitacora  -> accesos recientes (o por fecha).
router.get('/bitacora', ah(async (req, res) => {
  const where = req.query.fecha ? `WHERE ${SQL.dia('a.fecha')} = ?` : '';
  const params = req.query.fecha ? [req.query.fecha] : [];
  const filas = await db.all(
    `SELECT a.*, u.nombre AS registrado_por_nombre FROM accesos a
     LEFT JOIN usuarios u ON u.id = a.registrado_por
     ${where} ORDER BY a.fecha DESC LIMIT 200`,
    params
  );
  res.json(filas);
}));

export default router;
