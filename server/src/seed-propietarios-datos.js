// Enriquece/crea el padrón de propietarios con los datos del contador
// (DATOS_PROPIETARIOS.xlsx): cédula, teléfono y correo, cruzando por CARNET.
//
// - Si el carnet ya existe: actualiza el nombre y rellena cédula/teléfono/correo
//   SOLO cuando el archivo trae ese dato (no borra lo que ya haya).
// - Si el carnet no existe: crea la ficha (con carnet, nombre y los datos que haya,
//   más su código QR y enlace de estado de cuenta).
//
// Idempotente. Uso: docker compose exec -T server node src/seed-propietarios-datos.js
import db, { generarCodigo } from './db.js';
import { PROPIETARIOS } from './datos-propietarios.js';

const nuevoToken = () => generarCodigo() + generarCodigo().slice(3);

let creados = 0, actualizados = 0;
for (const p of PROPIETARIOS) {
  const carnet = String(p.carnet);
  const fila = await db.get('SELECT id FROM propietarios WHERE carnet = ?', [carnet]);

  if (fila) {
    // Actualiza nombre siempre; los demás solo si el archivo los trae.
    const sets = ['nombre = ?'];
    const vals = [p.nombre];
    if (p.cedula) { sets.push('documento = ?', "tipo_documento = 'cedula'"); vals.push(p.cedula); }
    if (p.telefono) { sets.push('telefono = ?'); vals.push(p.telefono); }
    if (p.email) { sets.push('email = ?'); vals.push(p.email); }
    vals.push(fila.id);
    await db.run(`UPDATE propietarios SET ${sets.join(', ')} WHERE id = ?`, vals);
    actualizados++;
  } else {
    await db.run(
      `INSERT INTO propietarios (nombre, carnet, documento, tipo_documento, telefono, email, activo, codigo, token_cuenta)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [p.nombre, carnet, p.cedula || null, p.cedula ? 'cedula' : null, p.telefono || null, p.email || null, generarCodigo(), nuevoToken()],
    );
    creados++;
  }
}

const conCed = PROPIETARIOS.filter((p) => p.cedula).length;
const conTel = PROPIETARIOS.filter((p) => p.telefono).length;
const conMail = PROPIETARIOS.filter((p) => p.email).length;
console.log(`\nListo. Propietarios: ${creados} nuevos, ${actualizados} actualizados.`);
console.log(`Datos en el archivo: cédula ${conCed}, teléfono ${conTel}, correo ${conMail} (de ${PROPIETARIOS.length}).`);
process.exit(0);
