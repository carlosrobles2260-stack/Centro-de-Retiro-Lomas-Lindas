import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { requiereAuth, requiereRol } from '../auth.js';
import { procesarPosicion } from '../gps.js';
import { sincronizar, iniciarSincronizacionAutomatica } from '../gpsSync.js';

const router = Router();

const CLAVES_SYNC = ['gps_sync_activo', 'gps_sync_url', 'gps_sync_token', 'gps_sync_intervalo'];

async function upsertConfig(clave, valor) {
  const existe = await db.get('SELECT clave FROM configuracion WHERE clave = ?', [clave]);
  if (existe) await db.run('UPDATE configuracion SET valor = ? WHERE clave = ?', [String(valor), clave]);
  else await db.run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', [clave, String(valor)]);
}

// Lee la clave de ingesta configurada (env GPS_TOKEN tiene prioridad).
async function tokenConfigurado() {
  if (process.env.GPS_TOKEN) return process.env.GPS_TOKEN;
  const fila = await db.get("SELECT valor FROM configuracion WHERE clave = 'gps_token'");
  return fila?.valor || null;
}

// Toma el primer valor definido entre varios nombres de campo posibles.
function campo(obj, ...nombres) {
  for (const n of nombres) {
    if (obj[n] !== undefined && obj[n] !== null && obj[n] !== '') return obj[n];
  }
  return undefined;
}

// ===== Ingesta pública (la llama el proveedor de GPS) =====
// POST /api/gps/ingesta?token=XXX  (o encabezado x-gps-token)
// Acepta una posición o un arreglo de posiciones con nombres de campo flexibles.
router.post('/ingesta', ah(async (req, res) => {
  const token = req.query.token || req.headers['x-gps-token'];
  const esperado = await tokenConfigurado();
  if (!esperado || token !== esperado) {
    return res.status(401).json({ error: 'Token de GPS inválido' });
  }

  const lote = Array.isArray(req.body) ? req.body : [req.body];
  const resultados = [];
  for (const p of lote) {
    const gpsId = campo(p, 'gps_id', 'imei', 'id', 'device', 'deviceId', 'unit');
    const lat = Number(campo(p, 'lat', 'latitude', 'latitud'));
    const lng = Number(campo(p, 'lng', 'lon', 'long', 'longitude', 'longitud'));
    if (gpsId === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
      resultados.push({ ok: false, error: 'Faltan gps_id, lat o lng', gps_id: gpsId });
      continue;
    }
    const vehiculo = await db.get('SELECT * FROM vehiculos WHERE gps_id = ?', [String(gpsId)]);
    if (!vehiculo) {
      resultados.push({ ok: false, error: 'Vehículo no encontrado para ese GPS', gps_id: gpsId });
      continue;
    }
    const velocidad = Number(campo(p, 'velocidad', 'speed')) || null;
    const rumbo = Number(campo(p, 'rumbo', 'heading', 'course')) || null;
    const info = await procesarPosicion(vehiculo, { lat, lng, velocidad, rumbo });
    resultados.push({ ok: true, ...info });
  }
  res.json({ procesadas: resultados.length, resultados });
}));

// ===== Endpoints protegidos (consola del ERP) =====

// Última posición conocida de cada vehículo (para el mapa en tiempo real).
router.get('/posiciones', requiereAuth, ah(async (req, res) => {
  const vehiculos = await db.all('SELECT * FROM vehiculos WHERE activo = 1 ORDER BY nombre');
  const salida = [];
  for (const v of vehiculos) {
    const pos = await db.get(
      'SELECT lat, lng, velocidad, rumbo, fecha_hora FROM posiciones_gps WHERE vehiculo_id = ? ORDER BY fecha_hora DESC, id DESC LIMIT 1',
      [v.id]
    );
    salida.push({
      id: v.id, nombre: v.nombre, placa: v.placa, tipo: v.tipo, gps_id: v.gps_id,
      lat: pos ? Number(pos.lat) : null,
      lng: pos ? Number(pos.lng) : null,
      velocidad: pos?.velocidad ?? null,
      rumbo: pos?.rumbo ?? null,
      fecha_hora: pos?.fecha_hora ?? null,
    });
  }
  const geocercas = await db.all('SELECT * FROM geocercas WHERE activo = 1 ORDER BY tipo, nombre');
  res.json({ vehiculos: salida, geocercas });
}));

// Datos para configurar el webhook del proveedor (solo administración).
router.get('/instrucciones', requiereAuth, requiereRol('administracion'), ah(async (req, res) => {
  const token = await tokenConfigurado();
  res.json({
    token,
    metodo: 'POST',
    ruta: '/api/gps/ingesta',
    ejemplo: '/api/gps/ingesta?token=' + token,
    cuerpo: { gps_id: 'IMEI-del-dispositivo', lat: 13.7, lng: -89.2, velocidad: 24 },
  });
}));

// ===== Sincronización por consulta con el proveedor (solo administración) =====

// Configuración actual del sincronizador.
router.get('/sync', requiereAuth, requiereRol('administracion'), ah(async (req, res) => {
  const filas = await db.all("SELECT clave, valor FROM configuracion WHERE clave LIKE 'gps_sync_%'");
  const c = {};
  for (const f of filas) c[f.clave] = f.valor;
  res.json({
    activo: c.gps_sync_activo === '1',
    url: c.gps_sync_url || '',
    token: c.gps_sync_token || '',
    intervalo: Number(c.gps_sync_intervalo) || 60,
  });
}));

// Guardar configuración del sincronizador y reprogramar el bucle automático.
router.put('/sync', requiereAuth, requiereRol('administracion'), ah(async (req, res) => {
  const b = req.body || {};
  const mapa = {
    gps_sync_activo: b.activo ? '1' : '0',
    gps_sync_url: b.url ?? '',
    gps_sync_token: b.token ?? '',
    gps_sync_intervalo: String(Math.max(15, Number(b.intervalo) || 60)),
  };
  for (const clave of CLAVES_SYNC) await upsertConfig(clave, mapa[clave]);
  iniciarSincronizacionAutomatica(); // aplica los cambios en caliente
  res.json({ ok: true });
}));

// Ejecutar una sincronización ahora mismo (prueba manual).
router.post('/sync/ahora', requiereAuth, requiereRol('administracion'), ah(async (req, res) => {
  res.json(await sincronizar());
}));

// Simular una posición (para pruebas/demostración; admin o seguridad).
router.post('/simular', requiereAuth, requiereRol('seguridad', 'administracion'), ah(async (req, res) => {
  const { vehiculo_id, lat, lng, velocidad, rumbo } = req.body || {};
  const vehiculo = await db.get('SELECT * FROM vehiculos WHERE id = ?', [vehiculo_id]);
  if (!vehiculo) return res.status(404).json({ error: 'Vehículo no encontrado' });
  if (lat === undefined || lng === undefined) return res.status(400).json({ error: 'Faltan lat o lng' });
  const info = await procesarPosicion(vehiculo, {
    lat: Number(lat), lng: Number(lng),
    velocidad: velocidad != null ? Number(velocidad) : null,
    rumbo: rumbo != null ? Number(rumbo) : null,
  });
  res.json({ ok: true, ...info });
}));

export default router;
