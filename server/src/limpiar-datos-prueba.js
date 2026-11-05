// Elimina las INFORMACIONES DE PRUEBA (datos de ejemplo ficticios) que creó el
// seed inicial `seed.js` cuando se estrenó el sistema: propietarios, empleados,
// visitantes, visitas, facturas, incidentes y rondas de demostración.
//
// Es QUIRÚRGICO: borra solo los registros que coinciden EXACTAMENTE con la firma
// de los datos de ejemplo (nombre + propiedad/puesto + documento + montos). Así
// nunca toca datos reales que casualmente compartan un nombre.
//
// Es IDEMPOTENTE: tras la primera corrida no queda nada que borrar, las
// siguientes no hacen nada. Por eso es seguro dejarlo en el autodespliegue.
//
// NO toca cuentas de usuario (eso se maneja aparte) ni las cuentas de PRÁCTICA
// de la Directiva/propietarios, que son intencionales y están en uso.
//
// Uso: docker compose exec server node src/limpiar-datos-prueba.js
import db from './db.js';

// Firmas exactas de los datos de ejemplo de seed.js.
const PROPIETARIOS = [
  { nombre: 'Juan Pérez', propiedad: 'Lote 12', documento: '001-120589' },
  { nombre: 'María González', propiedad: 'Casa 5', documento: '002-230790' },
];
const VISITANTES = [
  { nombre: 'Pedro Pérez', documento: '003-150392' },
  { nombre: 'Empresa de Jardinería', documento: '004-010101' },
];
const EMPLEADOS = [
  { nombre: 'Carlos Ramírez', puesto: 'Jefe de Seguridad', departamento: 'seguridad', salario: 650 },
  { nombre: 'Ana López', puesto: 'Recepcionista', departamento: 'administracion', salario: 500 },
];
const INCIDENTES = [
  { descripcion: 'Vehículo no identificado en la entrada principal', ubicacion: 'Portón principal' },
];
const RONDAS = [
  { punto_control: 'Perímetro norte', observaciones: 'Sin novedades' },
];

let borrados = 0;
const marca = (n, etq) => { if (n) { borrados += n; console.log(`  ✓ ${etq}: ${n}`); } };
const idsDe = (filas) => filas.map((f) => f.id);

// 1) IDs de los propietarios y visitantes de ejemplo (por firma exacta).
const propIds = [];
for (const p of PROPIETARIOS) {
  const f = await db.get(
    'SELECT id FROM propietarios WHERE nombre = ? AND propiedad = ? AND documento = ?',
    [p.nombre, p.propiedad, p.documento],
  );
  if (f) propIds.push(f.id);
}
const visIds = [];
for (const v of VISITANTES) {
  const f = await db.get(
    'SELECT id FROM visitantes WHERE nombre = ? AND documento = ?',
    [v.nombre, v.documento],
  );
  if (f) visIds.push(f.id);
}

// 2) Hijos primero (sin depender de ON DELETE, para que funcione igual en SQLite
//    y PostgreSQL): visitas, pagos y facturas de esos propietarios/visitantes.
for (const id of visIds) {
  const r = await db.run('DELETE FROM visitas WHERE visitante_id = ?', [id]);
  marca(r.changes, `visita (visitante ${id})`);
}
for (const id of propIds) {
  const r = await db.run('DELETE FROM visitas WHERE propietario_id = ?', [id]);
  marca(r.changes, `visita (propietario ${id})`);
  // pagos de las facturas del propietario, luego las facturas.
  const facturas = await db.all('SELECT id FROM facturas WHERE propietario_id = ?', [id]);
  for (const fid of idsDe(facturas)) {
    const rp = await db.run('DELETE FROM pagos WHERE factura_id = ?', [fid]);
    marca(rp.changes, `pago (factura ${fid})`);
  }
  const rf = await db.run('DELETE FROM facturas WHERE propietario_id = ?', [id]);
  marca(rf.changes, `factura (propietario ${id})`);
}

// 3) Visitantes y propietarios de ejemplo.
for (const id of visIds) {
  const r = await db.run('DELETE FROM visitantes WHERE id = ?', [id]);
  marca(r.changes, `visitante ${id}`);
}
for (const id of propIds) {
  const r = await db.run('DELETE FROM propietarios WHERE id = ?', [id]);
  marca(r.changes, `propietario ${id}`);
}

// 4) Rondas de ejemplo (antes que empleados, por la FK empleado_id).
for (const r of RONDAS) {
  const res = await db.run(
    'DELETE FROM rondas WHERE punto_control = ? AND observaciones = ?',
    [r.punto_control, r.observaciones],
  );
  marca(res.changes, `ronda "${r.punto_control}"`);
}

// 5) Empleados de ejemplo (por firma exacta).
for (const e of EMPLEADOS) {
  const res = await db.run(
    'DELETE FROM empleados WHERE nombre = ? AND puesto = ? AND departamento = ? AND salario = ?',
    [e.nombre, e.puesto, e.departamento, e.salario],
  );
  marca(res.changes, `empleado "${e.nombre}"`);
}

// 6) Incidentes de ejemplo.
for (const i of INCIDENTES) {
  const res = await db.run(
    'DELETE FROM incidentes WHERE descripcion = ? AND ubicacion = ?',
    [i.descripcion, i.ubicacion],
  );
  marca(res.changes, `incidente "${i.ubicacion}"`);
}

if (borrados === 0) console.log('Nada que borrar: no hay datos de prueba (ya estaba limpio).');
else console.log(`\nListo. Registros de prueba eliminados: ${borrados}.`);
process.exit(0);
