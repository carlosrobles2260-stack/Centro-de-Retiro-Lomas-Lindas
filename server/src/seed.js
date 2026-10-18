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

const adminId = await crearUsuario('Administrador', 'admin@lomaslindas.com', 'admin123', 'admin');
await crearUsuario('Guardia de Seguridad', 'seguridad@lomaslindas.com', 'seguridad123', 'seguridad');
await crearUsuario('Administración', 'oficina@lomaslindas.com', 'oficina123', 'administracion');

const hayPropietarios = (await db.get('SELECT COUNT(*) AS n FROM propietarios')).n;
if (Number(hayPropietarios) === 0) {
  const prop = (nombre, propiedad, documento, telefono, email) =>
    db.run('INSERT INTO propietarios (nombre, propiedad, documento, telefono, email) VALUES (?, ?, ?, ?, ?)',
      [nombre, propiedad, documento, telefono, email]).then((i) => i.lastID);
  const p1 = await prop('Juan Pérez', 'Lote 12', '001-120589', '7000-1234', 'juan@correo.com');
  const p2 = await prop('María González', 'Casa 5', '002-230790', '7000-5678', 'maria@correo.com');

  const emp = (nombre, puesto, depto, tel, ingreso, salario) =>
    db.run('INSERT INTO empleados (nombre, puesto, departamento, telefono, fecha_ingreso, salario) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, puesto, depto, tel, ingreso, salario]).then((i) => i.lastID);
  const e1 = await emp('Carlos Ramírez', 'Jefe de Seguridad', 'seguridad', '7111-2222', '2023-01-15', 650);
  await emp('Ana López', 'Recepcionista', 'administracion', '7333-4444', '2023-03-01', 500);

  const vis = (nombre, documento, tel, tipo, propId, placa) =>
    db.run('INSERT INTO visitantes (nombre, documento, telefono, tipo, propietario_id, placa_vehiculo, codigo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, documento, tel, tipo, propId, placa, codigo()]).then((i) => i.lastID);
  const v1 = await vis('Pedro Pérez', '003-150392', '7555-6666', 'familiar', p1, 'P123456');
  await vis('Empresa de Jardinería', '004-010101', '7777-8888', 'proveedor', p2, 'C987654');

  await db.run(
    `INSERT INTO visitas (visitante_id, propietario_id, motivo, estado, autorizado_por, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [v1, p1, 'Visita familiar', 'dentro', 'Juan Pérez', adminId]
  );

  await db.run(
    `INSERT INTO facturas (propietario_id, concepto, monto) VALUES (?, ?, ?)`,
    [p1, 'Cuota de mantenimiento mensual', 75]
  );

  await db.run(
    `INSERT INTO incidentes (tipo, descripcion, ubicacion, gravedad, reportado_por) VALUES (?, ?, ?, ?, ?)`,
    ['acceso', 'Vehículo no identificado en la entrada principal', 'Portón principal', 'media', adminId]
  );

  await db.run(
    `INSERT INTO rondas (empleado_id, punto_control, estado, observaciones, registrado_por) VALUES (?, ?, ?, ?, ?)`,
    [e1, 'Perímetro norte', 'normal', 'Sin novedades', adminId]
  );

  console.log('Datos de ejemplo creados.');
}

function codigo() {
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
  return `LL-${hex}`;
}

console.log('\n✅ Listo. Usuarios disponibles:');
console.log('  Admin:       admin@lomaslindas.com / admin123');
console.log('  Seguridad:   seguridad@lomaslindas.com / seguridad123');
console.log('  Oficina:     oficina@lomaslindas.com / oficina123');

process.exit(0);
