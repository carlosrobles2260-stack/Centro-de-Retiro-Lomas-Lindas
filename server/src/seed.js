import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './db.js';

// Datos de ejemplo para comenzar a usar el ERP.
// Ejecutar con: npm run seed

function crearUsuario(nombre, email, password, rol) {
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return existe.id;
  const hash = bcrypt.hashSync(password, 10);
  return db
    .prepare('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)')
    .run(nombre, email, hash, rol).lastInsertRowid;
}

console.log('Sembrando datos iniciales...');

const adminId = crearUsuario('Administrador', 'admin@lomaslindas.com', 'admin123', 'admin');
crearUsuario('Guardia de Seguridad', 'seguridad@lomaslindas.com', 'seguridad123', 'seguridad');
crearUsuario('Administración', 'oficina@lomaslindas.com', 'oficina123', 'administracion');

// Solo sembrar datos de ejemplo si la base está vacía.
const hayPropietarios = db.prepare('SELECT COUNT(*) AS n FROM propietarios').get().n;
if (hayPropietarios === 0) {
  const prop = db.prepare(
    'INSERT INTO propietarios (nombre, propiedad, documento, telefono, email) VALUES (?, ?, ?, ?, ?)'
  );
  const p1 = prop.run('Juan Pérez', 'Lote 12', '001-120589', '7000-1234', 'juan@correo.com').lastInsertRowid;
  const p2 = prop.run('María González', 'Casa 5', '002-230790', '7000-5678', 'maria@correo.com').lastInsertRowid;

  const emp = db.prepare(
    'INSERT INTO empleados (nombre, puesto, departamento, telefono, fecha_ingreso, salario) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const e1 = emp.run('Carlos Ramírez', 'Jefe de Seguridad', 'seguridad', '7111-2222', '2023-01-15', 650).lastInsertRowid;
  emp.run('Ana López', 'Recepcionista', 'administracion', '7333-4444', '2023-03-01', 500);

  const vis = db.prepare(
    'INSERT INTO visitantes (nombre, documento, telefono, tipo, propietario_id, placa_vehiculo) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const v1 = vis.run('Pedro Pérez', '003-150392', '7555-6666', 'familiar', p1, 'P123456').lastInsertRowid;
  vis.run('Empresa de Jardinería', '004-010101', '7777-8888', 'proveedor', p2, 'C987654');

  db.prepare(
    `INSERT INTO visitas (visitante_id, propietario_id, motivo, estado, autorizado_por, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(v1, p1, 'Visita familiar', 'dentro', 'Juan Pérez', adminId);

  db.prepare(
    `INSERT INTO facturas (propietario_id, concepto, monto, fecha_vencimiento)
     VALUES (?, ?, ?, date('now','+15 days'))`
  ).run(p1, 'Cuota de mantenimiento mensual', 75);

  db.prepare(
    `INSERT INTO incidentes (tipo, descripcion, ubicacion, gravedad, reportado_por)
     VALUES (?, ?, ?, ?, ?)`
  ).run('acceso', 'Vehículo no identificado en la entrada principal', 'Portón principal', 'media', adminId);

  db.prepare(
    `INSERT INTO rondas (empleado_id, punto_control, estado, observaciones, registrado_por)
     VALUES (?, ?, ?, ?, ?)`
  ).run(e1, 'Perímetro norte', 'normal', 'Sin novedades', adminId);

  console.log('Datos de ejemplo creados.');
}

console.log('\n✅ Listo. Usuarios disponibles:');
console.log('  Admin:       admin@lomaslindas.com / admin123');
console.log('  Seguridad:   seguridad@lomaslindas.com / seguridad123');
console.log('  Oficina:     oficina@lomaslindas.com / oficina123');
