import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db, { client } from './db.js';

// Datos de ejemplo para comenzar a usar el ERP.
// Ejecutar con: npm run seed

async function crearUsuario(nombre, email, password, rol) {
  const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe) return existe.id;
  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, hash, rol]
  );
  return info.lastID;
}

console.log(`Sembrando datos iniciales (motor: ${client})...`);

await crearUsuario('Administrador', 'admin@lomaslindas.com', 'admin123', 'admin');
await crearUsuario('Guardia de Seguridad', 'seguridad@lomaslindas.com', 'seguridad123', 'seguridad');
await crearUsuario('Administración', 'oficina@lomaslindas.com', 'oficina123', 'administracion');

// NOTA: Antes este seed creaba datos de EJEMPLO ficticios (propietarios,
// empleados, visitantes, facturas, etc.). Se eliminaron porque el sistema ya
// está en uso con datos reales. Para borrarlos de una base existente:
//   docker compose exec server node src/limpiar-datos-prueba.js

console.log('\n✅ Listo. Usuarios disponibles:');
console.log('  Admin:       admin@lomaslindas.com / admin123');
console.log('  Seguridad:   seguridad@lomaslindas.com / seguridad123');
console.log('  Oficina:     oficina@lomaslindas.com / oficina123');

process.exit(0);
