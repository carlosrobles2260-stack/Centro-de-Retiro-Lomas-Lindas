// Lógica de rastreo GPS: distancia entre coordenadas, detección de entrada/salida
// de geocercas y registro automático de viajes al vertedero y rondas de vigilancia.
import db, { SQL } from './db.js';
import { client } from './database.js';

// Distancia en metros entre dos coordenadas (fórmula de Haversine).
export function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000; // radio de la Tierra en metros
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Conjunto de ids de geocercas que contienen el punto dado.
function dentroDe(geocercas, lat, lng) {
  const ids = new Set();
  for (const g of geocercas) {
    if (distanciaMetros(lat, lng, Number(g.lat), Number(g.lng)) <= Number(g.radio_m)) {
      ids.add(g.id);
    }
  }
  return ids;
}

const HHMM = () => new Date().toTimeString().slice(0, 5);
const HOY = () => new Date().toISOString().slice(0, 10);

/**
 * Procesa una nueva posición de un vehículo: la guarda y, comparándola con la
 * posición anterior, detecta cuándo entra o sale de una geocerca para registrar
 * automáticamente viajes al vertedero y rondas de vigilancia.
 *
 * @returns {object} resumen de los eventos generados (para depuración/respuesta).
 */
export async function procesarPosicion(vehiculo, { lat, lng, velocidad, rumbo }) {
  const eventos = [];

  // Posición anterior (antes de insertar la nueva) para detectar transiciones.
  const previa = await db.get(
    'SELECT lat, lng FROM posiciones_gps WHERE vehiculo_id = ? ORDER BY fecha_hora DESC, id DESC LIMIT 1',
    [vehiculo.id]
  );

  const geocercas = await db.all('SELECT * FROM geocercas WHERE activo = 1');
  const antes = previa ? dentroDe(geocercas, Number(previa.lat), Number(previa.lng)) : new Set();
  const ahora = dentroDe(geocercas, lat, lng);

  // Guarda la posición.
  await db.run(
    'INSERT INTO posiciones_gps (vehiculo_id, lat, lng, velocidad, rumbo) VALUES (?, ?, ?, ?, ?)',
    [vehiculo.id, lat, lng, velocidad ?? null, rumbo ?? null]
  );

  for (const g of geocercas) {
    const entro = ahora.has(g.id) && !antes.has(g.id);
    const salio = !ahora.has(g.id) && antes.has(g.id);

    if (g.tipo === 'vertedero') {
      if (entro) {
        const evento = await registrarLlegadaVertedero(vehiculo);
        if (evento) eventos.push(evento);
      } else if (salio) {
        const evento = await registrarSalidaVertedero(vehiculo);
        if (evento) eventos.push(evento);
      }
    } else if (g.tipo === 'punto_control' && entro) {
      const evento = await registrarRonda(vehiculo, g);
      if (evento) eventos.push(evento);
    }
  }

  return { vehiculo: vehiculo.nombre, dentro: [...ahora], eventos };
}

// Abre un viaje al vertedero al llegar (evita duplicar si ya hay uno abierto hoy).
async function registrarLlegadaVertedero(vehiculo) {
  const abierto = await db.get(
    `SELECT id FROM viajes_vertedero
     WHERE vehiculo_id = ? AND hora_regreso IS NULL AND ${SQL.dia('fecha')} = ?`,
    [vehiculo.id, HOY()]
  );
  if (abierto) return null; // ya hay un viaje en curso
  await db.run(
    `INSERT INTO viajes_vertedero (hora_salida, vehiculo, vehiculo_id, responsable_id, origen, notas)
     VALUES (?, ?, ?, ?, 'gps', ?)`,
    [HHMM(), vehiculo.nombre, vehiculo.id, vehiculo.responsable_id ?? null, 'Registrado automáticamente por GPS']
  );
  return { tipo: 'viaje_vertedero_inicio', vehiculo: vehiculo.nombre, hora: HHMM() };
}

// Cierra el viaje abierto al salir del vertedero (anota la hora de regreso).
async function registrarSalidaVertedero(vehiculo) {
  const abierto = await db.get(
    `SELECT id FROM viajes_vertedero
     WHERE vehiculo_id = ? AND hora_regreso IS NULL AND ${SQL.dia('fecha')} = ?
     ORDER BY id DESC LIMIT 1`,
    [vehiculo.id, HOY()]
  );
  if (!abierto) return null;
  await db.run('UPDATE viajes_vertedero SET hora_regreso = ? WHERE id = ?', [HHMM(), abierto.id]);
  return { tipo: 'viaje_vertedero_fin', vehiculo: vehiculo.nombre, hora: HHMM() };
}

// Registra una ronda al pasar por un punto de control (con enfriamiento de 10 min).
async function registrarRonda(vehiculo, geocerca) {
  const reciente = await db.get(
    `SELECT id FROM rondas
     WHERE vehiculo_id = ? AND geocerca_id = ?
       AND fecha_hora >= ${client10min()}
     ORDER BY id DESC LIMIT 1`,
    [vehiculo.id, geocerca.id]
  );
  if (reciente) return null; // ya se registró hace poco en este punto
  await db.run(
    `INSERT INTO rondas (empleado_id, punto_control, estado, observaciones, vehiculo_id, geocerca_id, origen)
     VALUES (?, ?, 'normal', ?, ?, ?, 'gps')`,
    [vehiculo.responsable_id ?? null, geocerca.nombre, 'Registrada automáticamente por GPS', vehiculo.id, geocerca.id]
  );
  return { tipo: 'ronda', vehiculo: vehiculo.nombre, punto: geocerca.nombre };
}

// Expresión SQL para "hace 10 minutos" según el motor.
function client10min() {
  return client === 'postgres' ? "(now() - interval '10 minutes')" : "datetime('now','-10 minutes')";
}
