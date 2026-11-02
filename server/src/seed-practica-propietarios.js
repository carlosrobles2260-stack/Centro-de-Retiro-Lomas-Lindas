// Crea cuentas de PRÁCTICA con rol de PROPIETARIO para que la Directiva pueda
// probar realmente la experiencia del propietario: autorizar invitados, registrar
// su núcleo familiar (cónyuge e hijos), ver su carnet/QR y la ficha completa.
//
// Se identifican por FUNCIÓN (no por persona). Para cada función se crea:
//   1) una ficha en "propietarios" (con una propiedad de práctica), y
//   2) un usuario con rol 'propietario' enlazado a esa ficha (propietario_id).
//
// Es idempotente: si el correo ya existe, no lo duplica.
//
// Uso (dentro del contenedor del servidor):
//   docker compose exec server node src/seed-practica-propietarios.js
import db, { generarCodigo } from './db.js';
import bcrypt from 'bcryptjs';

// Contraseña temporal común para la práctica.
const PASSWORD = process.env.PRACTICA_PASSWORD || 'Propietario2026';

// Correos de práctica dedicados (distintos de las cuentas de Directiva, que son
// de rol administración). Cambia la propiedad por una real cuando gusten.
const CUENTAS = [
  { nombre: 'Presidencia · Propietario (práctica)',    email: 'prop.presidencia@lomaslindas.com',    propiedad: 'Lote A-01' },
  { nombre: 'Vicepresidencia · Propietario (práctica)', email: 'prop.vicepresidencia@lomaslindas.com', propiedad: 'Lote A-02' },
  { nombre: 'Secretaría · Propietario (práctica)',     email: 'prop.secretaria@lomaslindas.com',     propiedad: 'Lote A-03' },
  { nombre: 'Tesorería · Propietario (práctica)',      email: 'prop.tesoreria@lomaslindas.com',      propiedad: 'Lote A-04' },
  { nombre: 'Vocal 1 · Propietario (práctica)',        email: 'prop.vocal1@lomaslindas.com',         propiedad: 'Lote A-05' },
  { nombre: 'Vocal 2 · Propietario (práctica)',        email: 'prop.vocal2@lomaslindas.com',         propiedad: 'Lote A-06' },
  { nombre: 'Vocal 3 · Propietario (práctica)',        email: 'prop.vocal3@lomaslindas.com',         propiedad: 'Lote A-07' },
];

let creados = 0;
for (const c of CUENTAS) {
  const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [c.email]);
  if (existe) {
    console.log('• ya existía:', c.email);
    continue;
  }

  // 1) Ficha de propietario (con carnet/código para el QR).
  const carnet = generarCodigo();
  const resProp = await db.run(
    `INSERT INTO propietarios (nombre, propiedad, tipo_propiedad, carnet, email, activo)
     VALUES (?, ?, 'edificado', ?, ?, 1)`,
    [c.nombre, c.propiedad, carnet, c.email],
  );
  const propietarioId = resProp.lastID;

  // 2) Usuario con rol propietario enlazado a la ficha.
  const hash = bcrypt.hashSync(PASSWORD, 10);
  await db.run(
    'INSERT INTO usuarios (nombre, email, password, rol, propietario_id) VALUES (?, ?, ?, ?, ?)',
    [c.nombre, c.email, hash, 'propietario', propietarioId],
  );
  console.log('✓ creado:', c.email, '→ propietario_id', propietarioId, '· carnet', carnet);
  creados++;
}

console.log(`\nListo. Cuentas de propietario nuevas: ${creados}. Contraseña temporal: ${PASSWORD}`);
process.exit(0);
