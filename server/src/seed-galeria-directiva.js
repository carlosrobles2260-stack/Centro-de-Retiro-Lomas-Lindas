// Precarga la Directiva electa en la galería (menú General > Directiva).
// Sin fotos: se suben luego desde la app. Idempotente por nombre; si el miembro
// ya existe pero le faltan los años del período, los completa.
//
// Uso: docker compose exec server node src/seed-galeria-directiva.js
import db from './db.js';

const DESDE = Number(process.env.DIRECTIVA_DESDE || 2026);
const HASTA = Number(process.env.DIRECTIVA_HASTA || 2028);
const PERIODO = `${DESDE} - ${HASTA}`;

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
  const existe = await db.get("SELECT id, anio_desde FROM directiva WHERE nombre = ? AND tipo = 'directiva'", [nombre]);
  if (existe) {
    if (existe.anio_desde == null) {
      await db.run('UPDATE directiva SET anio_desde = ?, anio_hasta = ?, periodo = ? WHERE id = ?', [DESDE, HASTA, PERIODO, existe.id]);
      console.log('↻ actualizado (años):', nombre);
    } else {
      console.log('• ya existía:', nombre);
    }
    continue;
  }
  await db.run(
    "INSERT INTO directiva (tipo, cargo, nombre, periodo, anio_desde, anio_hasta, orden) VALUES ('directiva', ?, ?, ?, ?, ?, ?)",
    [cargo, nombre, PERIODO, DESDE, HASTA, orden]
  );
  console.log('✓ agregado:', cargo, '-', nombre);
  creados++;
}

console.log(`\nListo. Miembros nuevos: ${creados}. Período: ${PERIODO}`);
process.exit(0);
