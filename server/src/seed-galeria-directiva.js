// Precarga la Directiva electa en la galería (menú General > Directiva).
// Sin fotos: se suben luego desde la app. Idempotente por nombre.
//
// Uso: docker compose exec server node src/seed-galeria-directiva.js
import db from './db.js';

// Período de la Directiva (ajústalo en la app si difiere).
const PERIODO = process.env.DIRECTIVA_PERIODO || '2026 - 2028';

const MIEMBROS = [
  ['Presidenta', 'María Isabel Núñez', 1],
  ['Vicepresidente', 'Gustavo Ortiz', 2],
  ['Secretario', 'Joel Lantigua', 3],
  ['Tesorero', 'Frank Abreu', 4],
  ['Vocal', 'Ernesto Hansen', 5],
  ['Vocal', 'Alejandro Meneses', 6],
  ['Vocal', 'Orlando Núñez', 7],
];

let creados = 0;
for (const [cargo, nombre, orden] of MIEMBROS) {
  const existe = await db.get("SELECT id FROM directiva WHERE nombre = ? AND tipo = 'directiva'", [nombre]);
  if (existe) { console.log('• ya existía:', nombre); continue; }
  await db.run(
    "INSERT INTO directiva (tipo, cargo, nombre, periodo, orden) VALUES ('directiva', ?, ?, ?, ?)",
    [cargo, nombre, PERIODO, orden]
  );
  console.log('✓ agregado:', cargo, '-', nombre);
  creados++;
}

console.log(`\nListo. Miembros nuevos: ${creados}. Período: ${PERIODO}`);
process.exit(0);
