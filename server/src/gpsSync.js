// Sincronización por consulta (pull) con la plataforma del proveedor de GPS
// (por ejemplo Systrack+). Consulta periódicamente la API del proveedor, toma la
// última posición de cada unidad y la pasa por la misma lógica de geocercas.
import db from './db.js';
import { procesarPosicion } from './gps.js';

// Lee la configuración de sincronización desde la tabla configuracion.
async function leerConfig() {
  const filas = await db.all(
    "SELECT clave, valor FROM configuracion WHERE clave LIKE 'gps_sync_%'"
  );
  const c = {};
  for (const f of filas) c[f.clave] = f.valor;
  return {
    activo: c.gps_sync_activo === '1',
    url: c.gps_sync_url || '',
    token: c.gps_sync_token || '',
    intervalo: Math.max(15, Number(c.gps_sync_intervalo) || 60),
  };
}

// Toma el primer valor definido entre varios nombres de campo posibles.
function campo(obj, ...nombres) {
  for (const n of nombres) {
    if (obj && obj[n] !== undefined && obj[n] !== null && obj[n] !== '') return obj[n];
  }
  return undefined;
}

// Normaliza la respuesta del proveedor a un arreglo de unidades.
function extraerUnidades(data) {
  if (Array.isArray(data)) return data;
  for (const clave of ['data', 'positions', 'posiciones', 'units', 'unidades', 'items', 'result', 'results', 'devices', 'dispositivos']) {
    if (Array.isArray(data?.[clave])) return data[clave];
  }
  return [];
}

/**
 * Ejecuta una sincronización: consulta la API del proveedor y registra las
 * posiciones de los vehículos conocidos (los que tienen gps_id).
 * @returns {object} resumen { ok, consultadas, registradas, eventos, error? }
 */
export async function sincronizar() {
  const cfg = await leerConfig();
  if (!cfg.url) return { ok: false, error: 'No hay URL de sincronización configurada' };

  let data;
  try {
    const headers = { Accept: 'application/json' };
    if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
    const resp = await fetch(cfg.url, { headers });
    if (!resp.ok) return { ok: false, error: `El proveedor respondió ${resp.status}` };
    data = await resp.json();
  } catch (e) {
    return { ok: false, error: 'No se pudo consultar al proveedor: ' + e.message };
  }

  const unidades = extraerUnidades(data);
  let registradas = 0;
  const eventos = [];
  for (const u of unidades) {
    const gpsId = campo(u, 'gps_id', 'imei', 'id', 'device', 'deviceId', 'unit', 'unitId', 'uniqueId', 'placa', 'plate');
    const lat = Number(campo(u, 'lat', 'latitude', 'latitud', 'y'));
    const lng = Number(campo(u, 'lng', 'lon', 'long', 'longitude', 'longitud', 'x'));
    if (gpsId === undefined || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const vehiculo = await db.get('SELECT * FROM vehiculos WHERE gps_id = ?', [String(gpsId)]);
    if (!vehiculo) continue;
    const velocidad = Number(campo(u, 'velocidad', 'speed', 'spd')) || null;
    const rumbo = Number(campo(u, 'rumbo', 'heading', 'course', 'bearing')) || null;
    const info = await procesarPosicion(vehiculo, { lat, lng, velocidad, rumbo });
    registradas += 1;
    if (info.eventos.length) eventos.push(...info.eventos);
  }
  return { ok: true, consultadas: unidades.length, registradas, eventos };
}

// ----- Bucle automático según el intervalo configurado -----
let temporizador = null;

export async function iniciarSincronizacionAutomatica() {
  if (temporizador) clearTimeout(temporizador);
  const cfg = await leerConfig();
  const proximo = cfg.intervalo * 1000;
  if (cfg.activo && cfg.url) {
    try {
      const r = await sincronizar();
      if (!r.ok) console.warn('⚠️  Sincronización GPS:', r.error);
    } catch (e) {
      console.warn('⚠️  Sincronización GPS falló:', e.message);
    }
  }
  // Reprograma siempre, releyendo la config en cada ciclo (permite activar/desactivar en caliente).
  temporizador = setTimeout(iniciarSincronizacionAutomatica, proximo);
  if (temporizador.unref) temporizador.unref();
}
