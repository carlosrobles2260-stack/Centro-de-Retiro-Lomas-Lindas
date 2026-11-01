// Crea usuarios de PRÁCTICA para la Directiva, identificados por FUNCIÓN
// (no por persona), para que los miembros prueben el sistema y den su opinión.
// Es idempotente: si la cuenta ya existe, no la duplica.
//
// Uso (dentro del contenedor del servidor):
//   docker compose exec server node src/seed-directiva.js
import db from './db.js';
import bcrypt from 'bcryptjs';

// Contraseña temporal común para la práctica (cámbiala/recréalas antes del uso real).
const PASSWORD = process.env.DIRECTIVA_PASSWORD || 'Directiva2026';

// Rol de acceso para la práctica: 'administracion' permite explorar todos los
// módulos operativos (no incluye la gestión de usuarios del sistema, que es solo
// del administrador). Así la Directiva puede evaluar el sistema completo.
const ROL = 'administracion';

const CUENTAS = [
  ['Presidencia · Directiva', 'presidencia@lomaslindas.com'],
  ['Vicepresidencia · Directiva', 'vicepresidencia@lomaslindas.com'],
  ['Secretaría · Directiva', 'secretaria@lomaslindas.com'],
  ['Tesorería · Directiva', 'tesoreria@lomaslindas.com'],
  ['Vocal 1 · Directiva', 'vocal1@lomaslindas.com'],
  ['Vocal 2 · Directiva', 'vocal2@lomaslindas.com'],
  ['Vocal 3 · Directiva', 'vocal3@lomaslindas.com'],
];

let creados = 0;
for (const [nombre, email] of CUENTAS) {
  const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe) {
    console.log('• ya existía:', email);
    continue;
  }
  const hash = bcrypt.hashSync(PASSWORD, 10);
  await db.run('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', [nombre, email, hash, ROL]);
  console.log('✓ creado:', email);
  creados++;
}

console.log(`\nListo. Cuentas nuevas: ${creados}. Contraseña temporal para todas: ${PASSWORD}`);
process.exit(0);
