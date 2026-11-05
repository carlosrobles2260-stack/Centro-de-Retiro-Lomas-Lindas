// Deja creado el acceso de PROPIETARIO de Carlos Robles para que pueda registrar
// su núcleo familiar, invitados, etc. desde el portal "Mi cuenta".
//   1) Crea (si falta) su ficha de propietario.
//   2) Crea su usuario con rol 'propietario', enlazado a esa ficha, con una
//      contraseña temporal (hash, no en texto) y cambio obligatorio al entrar.
//
// SEGURO: si el correo ya pertenece a una cuenta de rol 'admin', NO la toca
// (para no degradar al administrador). Un solo uso (marca en configuracion).
//
// Uso: docker compose exec -T server node src/seed-acceso-carlos.js
import db, { generarCodigo } from './db.js';

const MARCA = 'acceso_carlos_robles';
const EMAIL = 'carlosrobles2260@gmail.com';
const NOMBRE = 'Carlos Robles';
// Hash bcrypt de la clave temporal (irreversible; la clave se entrega aparte).
const HASH = '$2a$10$3uMXzC/ghJLXHPtSV11f3.3A5XYa.8Vxt.dziwqbW/Ft9ukNkCVX2';
const nuevoToken = () => generarCodigo() + generarCodigo().slice(3);

const ya = await db.get('SELECT valor FROM configuracion WHERE clave = ?', [MARCA]);
if (ya) { console.log('• acceso ya creado antes (marca presente). No se hace nada.'); process.exit(0); }

// Protección: no degradar una cuenta admin que use ese correo.
const existente = await db.get('SELECT id, rol FROM usuarios WHERE LOWER(email) = ?', [EMAIL.toLowerCase()]);
if (existente && existente.rol === 'admin') {
  console.log('⚠ El correo pertenece a una cuenta admin; no se modifica. Usa otro correo para el propietario.');
  process.exit(0);
}

// 1) Ficha de propietario (reutiliza si ya existe por nombre exacto).
let prop = await db.get('SELECT id FROM propietarios WHERE nombre = ?', [NOMBRE]);
if (!prop) {
  const r = await db.run(
    'INSERT INTO propietarios (nombre, activo, codigo, token_cuenta) VALUES (?, 1, ?, ?)',
    [NOMBRE, generarCodigo(), nuevoToken()],
  );
  prop = { id: r.lastID };
  console.log('✓ ficha de propietario creada:', NOMBRE, '(id', prop.id + ')');
} else {
  console.log('• la ficha de propietario ya existía:', NOMBRE);
}

// 2) Usuario con rol propietario enlazado a la ficha.
if (existente) {
  await db.run(
    "UPDATE usuarios SET nombre = ?, password = ?, rol = 'propietario', propietario_id = ?, debe_cambiar = 1, activo = 1 WHERE id = ?",
    [NOMBRE, HASH, prop.id, existente.id],
  );
  console.log('↻ acceso de propietario actualizado para', EMAIL);
} else {
  await db.run(
    "INSERT INTO usuarios (nombre, email, password, rol, propietario_id, debe_cambiar, activo) VALUES (?, ?, ?, 'propietario', ?, 1, 1)",
    [NOMBRE, EMAIL, HASH, prop.id],
  );
  console.log('✓ acceso de propietario creado para', EMAIL);
}

await db.run(
  'INSERT INTO configuracion (clave, valor) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave = ?)',
  [MARCA, new Date().toISOString(), MARCA],
);
console.log('\nListo. Entra con', EMAIL, 'y la clave temporal; el sistema te pedirá crear tu propia contraseña.');
process.exit(0);
