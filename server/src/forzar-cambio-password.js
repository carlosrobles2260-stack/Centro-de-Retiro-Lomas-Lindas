// Fuerza el cambio de contraseña en las cuentas de ejemplo que todavía usan la
// contraseña débil por defecto (admin123 / seguridad123 / oficina123).
//
// Marca `debe_cambiar = 1`: al iniciar sesión, la app obliga a crear una
// contraseña propia antes de poder usar el sistema (y al cambiarla, el propio
// backend pone `debe_cambiar = 0`).
//
// Es SEGURO e IDEMPOTENTE: solo actúa si la contraseña actual SIGUE siendo la
// de ejemplo. Una vez que el usuario la cambia, el hash deja de coincidir y este
// script no vuelve a forzar nada. Por eso es seguro dejarlo en el autodespliegue.
//
// Uso: docker compose exec server node src/forzar-cambio-password.js
import db from './db.js';
import bcrypt from 'bcryptjs';

// Contraseñas compartidas por defecto de las cuentas de práctica (mismos valores
// y variables de entorno que usan los seeds, para que la comparación coincida).
const PASS_DIRECTIVA = process.env.DIRECTIVA_PASSWORD || 'Directiva2026';
const PASS_PRACTICA = process.env.PRACTICA_PASSWORD || 'Propietario2026';

// Cuentas con contraseña por defecto conocida. Al entrar, cada quien crea la suya.
const CUENTAS = [
  // Cuentas base del sistema.
  { email: 'admin@lomaslindas.com', password: 'admin123' },
  { email: 'seguridad@lomaslindas.com', password: 'seguridad123' },
  { email: 'oficina@lomaslindas.com', password: 'oficina123' },
  // Cuentas de práctica de la Directiva (rol administración).
  { email: 'presidencia@lomaslindas.com', password: PASS_DIRECTIVA },
  { email: 'vicepresidencia@lomaslindas.com', password: PASS_DIRECTIVA },
  { email: 'secretaria@lomaslindas.com', password: PASS_DIRECTIVA },
  { email: 'tesoreria@lomaslindas.com', password: PASS_DIRECTIVA },
  { email: 'vocal1@lomaslindas.com', password: PASS_DIRECTIVA },
  { email: 'vocal2@lomaslindas.com', password: PASS_DIRECTIVA },
  { email: 'vocal3@lomaslindas.com', password: PASS_DIRECTIVA },
  // Cuentas de práctica con rol propietario.
  { email: 'prop.presidencia@lomaslindas.com', password: PASS_PRACTICA },
  { email: 'prop.vicepresidencia@lomaslindas.com', password: PASS_PRACTICA },
  { email: 'prop.secretaria@lomaslindas.com', password: PASS_PRACTICA },
  { email: 'prop.tesoreria@lomaslindas.com', password: PASS_PRACTICA },
  { email: 'prop.vocal1@lomaslindas.com', password: PASS_PRACTICA },
  { email: 'prop.vocal2@lomaslindas.com', password: PASS_PRACTICA },
  { email: 'prop.vocal3@lomaslindas.com', password: PASS_PRACTICA },
];

let forzados = 0;
for (const c of CUENTAS) {
  const u = await db.get('SELECT id, password, debe_cambiar FROM usuarios WHERE email = ?', [c.email]);
  if (!u) { console.log('• no existe (se omite):', c.email); continue; }

  // Solo si todavía tiene la contraseña de ejemplo.
  if (!bcrypt.compareSync(c.password, u.password)) {
    console.log('• ya cambió su contraseña (se omite):', c.email);
    continue;
  }
  if (Number(u.debe_cambiar) === 1) {
    console.log('• ya estaba marcada para cambio:', c.email);
    continue;
  }
  await db.run('UPDATE usuarios SET debe_cambiar = 1 WHERE id = ?', [u.id]);
  console.log('✓ cambio de contraseña forzado:', c.email);
  forzados++;
}

if (forzados === 0) console.log('Nada que forzar: ninguna cuenta usa la contraseña de ejemplo.');
else console.log(`\nListo. Cuentas marcadas para cambio obligatorio: ${forzados}.`);
process.exit(0);
