// Agrega los propietarios que faltaban en el sistema respecto al archivo del
// contador (carnets nuevos, sin conflicto con los existentes). Solo inserta los
// carnets que aún no están; no toca ninguno existente. Idempotente.
//
// Uso: docker compose exec -T server node src/seed-propietarios-faltantes.js
import db, { generarCodigo } from './db.js';
import { FALTANTES } from './datos-propietarios-faltantes.js';

const nuevoToken = () => generarCodigo() + generarCodigo().slice(3);

let creados = 0, existentes = 0;
for (const p of FALTANTES) {
  const carnet = String(p.carnet);
  const fila = await db.get('SELECT id FROM propietarios WHERE carnet = ?', [carnet]);
  if (fila) { existentes++; continue; }
  await db.run(
    `INSERT INTO propietarios (nombre, carnet, activo, codigo, token_cuenta) VALUES (?, ?, 1, ?, ?)`,
    [p.nombre, carnet, generarCodigo(), nuevoToken()],
  );
  creados++;
}

console.log(`\nListo. Faltantes: ${creados} creados, ${existentes} ya existían. (Total en archivo: ${FALTANTES.length}.)`);
process.exit(0);
