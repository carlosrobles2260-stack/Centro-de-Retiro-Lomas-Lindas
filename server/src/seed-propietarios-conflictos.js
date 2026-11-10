// Corrige los carnets donde el archivo del contador se contradecía (cédula vs
// cobro): adopta el nombre de la hoja de COBRO (la que se usa para cobrar) y
// LIMPIA la cédula/teléfono/correo, porque esos datos venían de la hoja de cédula
// y pertenecían a la OTRA persona.
//
// SEGURO E IDEMPOTENTE: solo corrige un carnet si su nombre actual sigue siendo
// el de cédula ('anterior'). Si el contador ya lo cambió a mano, no lo toca.
//
// Uso: docker compose exec -T server node src/seed-propietarios-conflictos.js
import db from './db.js';
import { CONFLICTOS } from './datos-conflictos-cobro.js';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

let corregidos = 0, omitidos = 0, sinFicha = 0;
for (const x of CONFLICTOS) {
  const fila = await db.get('SELECT id, nombre FROM propietarios WHERE carnet = ?', [String(x.carnet)]);
  if (!fila) { sinFicha++; continue; }
  if (norm(fila.nombre) !== norm(x.anterior)) { omitidos++; continue; } // ya cambiado: respetar
  await db.run(
    'UPDATE propietarios SET nombre = ?, documento = NULL, tipo_documento = NULL, telefono = NULL, movil = NULL, email = NULL WHERE id = ?',
    [x.nombre, fila.id],
  );
  console.log(`✓ carnet ${x.carnet}: "${fila.nombre}" -> "${x.nombre}" (cédula/tel/correo limpiados)`);
  corregidos++;
}

console.log(`\nListo. Conflictos corregidos: ${corregidos}. Omitidos (ya cambiados): ${omitidos}. Sin ficha: ${sinFicha}.`);
process.exit(0);
