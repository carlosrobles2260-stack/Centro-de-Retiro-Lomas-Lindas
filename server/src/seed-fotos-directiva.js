// Restaura/fija las fotos de la Directiva y de la Galería de Presidentes.
// Copia las imágenes de server/seed-fotos/ al volumen de uploads y asigna su
// ruta en la tabla `directiva`.
//
// RESPETA una foto que el usuario haya subido luego: solo asigna la foto del
// seed si el registro NO tiene una foto usable (vacía o cuyo archivo ya no
// existe en el disco). Así restaura las que se perdieron, sin pisar nuevas.
//
// Idempotente. Uso: docker compose exec server node src/seed-fotos-directiva.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { UPLOADS_DIR } from './fotos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORIGEN = path.join(__dirname, '..', 'seed-fotos');
const DESTINO = path.join(UPLOADS_DIR, 'directiva');

// Directiva: por nombre exacto. Presidentes: por apellido (LIKE), según se hayan
// registrado en la galería.
const FOTOS = [
  { archivo: 'maria-isabel-nunez.png', tipo: 'directiva', nombre: 'María Isabel Núñez' },
  { archivo: 'gustavo-ortiz.png', tipo: 'directiva', nombre: 'Gustavo Ortiz' },
  { archivo: 'joel-lantigua.png', tipo: 'directiva', nombre: 'Joel Lantigua' },
  { archivo: 'orlando-nunez.png', tipo: 'directiva', nombre: 'Orlando Núñez' },
  { archivo: 'jean-paul-giudicelli.png', tipo: 'presidente', like: '%Giudicelli%' },
  { archivo: 'carlos-robles-diaz.png', tipo: 'presidente', like: '%Robles%' },
];

fs.mkdirSync(DESTINO, { recursive: true });

// ¿La foto actual del registro apunta a un archivo que existe? (para no pisarla).
function fotoUsable(foto) {
  if (!foto || typeof foto !== 'string' || !foto.startsWith('/uploads/')) return false;
  return fs.existsSync(path.join(UPLOADS_DIR, foto.replace(/^\/uploads\//, '')));
}

let asignadas = 0, conservadas = 0, sinRegistro = 0, sinArchivo = 0;
for (const f of FOTOS) {
  const origen = path.join(ORIGEN, f.archivo);
  if (!fs.existsSync(origen)) { console.log('⚠ falta el archivo en el repo:', f.archivo); sinArchivo++; continue; }

  const fila = f.nombre
    ? await db.get('SELECT id, foto FROM directiva WHERE nombre = ? AND tipo = ?', [f.nombre, f.tipo])
    : await db.get('SELECT id, foto FROM directiva WHERE tipo = ? AND nombre LIKE ? ORDER BY id LIMIT 1', [f.tipo, f.like]);

  if (!fila) { console.log('• sin registro:', f.nombre || f.like); sinRegistro++; continue; }

  const rutaPublica = `/uploads/directiva/${f.archivo}`;
  // Copiar siempre el archivo al volumen (por si se perdió), sin duplicar.
  fs.copyFileSync(origen, path.join(DESTINO, f.archivo));

  // Respetar una foto propia ya subida (archivo existente y distinta a la del seed).
  if (fotoUsable(fila.foto) && fila.foto !== rutaPublica) {
    console.log('• conserva su foto actual:', f.nombre || f.like);
    conservadas++;
    continue;
  }
  await db.run('UPDATE directiva SET foto = ? WHERE id = ?', [rutaPublica, fila.id]);
  console.log('✓ foto asignada:', f.nombre || f.like, '->', rutaPublica);
  asignadas++;
}

console.log(`\nListo. Asignadas: ${asignadas}, conservadas: ${conservadas}, sin registro: ${sinRegistro}, sin archivo: ${sinArchivo}.`);
process.exit(0);
