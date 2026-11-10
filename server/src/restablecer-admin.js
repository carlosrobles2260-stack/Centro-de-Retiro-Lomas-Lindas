// Restablecimiento de un solo uso de la contraseña del ADMINISTRADOR.
// El administrador no pudo recuperar su clave; este script le deja una contraseña
// TEMPORAL y lo obliga a crear una nueva al iniciar sesión (debe_cambiar = 1).
//
// La clave temporal NO se guarda en texto en el código: se aplica su HASH bcrypt
// (irreversible, igual que lo almacenado en la BD). El administrador recibe la
// clave en texto por otro medio. Opcionalmente, si se define la variable de
// entorno ADMIN_RESET_PASSWORD, se usa esa en lugar del hash embebido.
//
// SE EJECUTA UNA SOLA VEZ (por valor de MARCA): tras aplicarse, deja una marca en
// `configuracion` y los despliegues siguientes lo omiten, para NO pisar la
// contraseña que el administrador defina. Para forzar otro restablecimiento,
// cambia MARCA.
//
// Alcance: la(s) cuenta(s) con rol 'admin' y, por si acaso, el correo del dueño.
//
// Uso: docker compose exec -T server node src/restablecer-admin.js
import db from './db.js';
import bcrypt from 'bcryptjs';

const MARCA = 'reset_admin_2026_11_03';     // identificador de este restablecimiento
const CORREO_DUENO = 'carlosrobles2260@gmail.com';

// Hash bcrypt de la clave temporal (no es reversible; no filtra la clave).
const HASH_EMBEBIDO = '$2a$10$s8IO2KKa5Zfu/9YPKUQUbuuOYw51ziPBVn9lmSWdj0rwcTlDzu9R2';

// Si hay ADMIN_RESET_PASSWORD en el entorno, se usa; si no, el hash embebido.
const envPass = String(process.env.ADMIN_RESET_PASSWORD || '').trim();
const hash = envPass.length >= 6 ? bcrypt.hashSync(envPass, 10) : HASH_EMBEBIDO;

const ya = await db.get('SELECT valor FROM configuracion WHERE clave = ?', [MARCA]);
if (ya) {
  console.log('• Restablecimiento ya aplicado antes (marca presente). No se hace nada.');
  process.exit(0);
}

// Cuentas destino: rol admin + (si existe) el correo del dueño. Sin duplicar.
const admins = await db.all("SELECT id, email FROM usuarios WHERE rol = 'admin'");
const porCorreo = await db.all('SELECT id, email FROM usuarios WHERE LOWER(email) = ?', [CORREO_DUENO.toLowerCase()]);
const porId = new Map();
for (const u of [...admins, ...porCorreo]) porId.set(u.id, u.email);

if (porId.size === 0) {
  console.log('⚠ No se encontró ninguna cuenta de administrador para restablecer.');
  process.exit(0); // no marca como hecho: reintenta si la cuenta aparece luego
}

for (const [id, email] of porId) {
  await db.run('UPDATE usuarios SET password = ?, debe_cambiar = 1, activo = 1 WHERE id = ?', [hash, id]);
  console.log('✓ contraseña temporal aplicada a:', email);
}

// Marca para que no se repita.
await db.run(
  'INSERT INTO configuracion (clave, valor) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave = ?)',
  [MARCA, new Date().toISOString(), MARCA],
);

console.log('\nListo. El administrador debe crear su propia contraseña al iniciar sesión.');
process.exit(0);
