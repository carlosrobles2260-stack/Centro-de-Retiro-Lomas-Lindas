// Importa el padrón real de propietarios morosos (archivos del contador) con su
// balance al 31 de mayo de 2026:
//   1) Crea/actualiza la ficha del propietario (por CARNET), con su nombre y si
//      es localizable (aparece en la lista de contactables).
//   2) Registra el balance adeudado como UNA factura 'vencida' por propietario,
//      con concepto fijo, para que se vea en Cuentas por cobrar / Estado de cuenta.
//
// Es IDEMPOTENTE:
//   - El propietario se identifica por carnet: si ya existe, se actualiza; si no,
//     se crea. No duplica.
//   - La factura del balance usa un concepto único por período; si ya existe para
//     ese propietario, se actualiza su monto en vez de crear otra.
//
// Uso: docker compose exec server node src/seed-propietarios-morosos.js
import db, { generarCodigo } from './db.js';
import { MOROSOS, PERIODO_BALANCE } from './datos-morosos-2026-05.js';

const nuevoToken = () => generarCodigo() + generarCodigo().slice(3);
// dd de mm de aaaa -> texto para el concepto de la factura.
const CONCEPTO = `Balance pendiente al ${PERIODO_BALANCE.split('-').reverse().join('/')}`;

let creados = 0, actualizados = 0, facturasNuevas = 0, facturasActualizadas = 0;

for (const m of MOROSOS) {
  const carnet = String(m.carnet);
  let prop = await db.get('SELECT id FROM propietarios WHERE carnet = ?', [carnet]);

  if (prop) {
    await db.run(
      'UPDATE propietarios SET nombre = ?, localizable = ?, activo = 1 WHERE id = ?',
      [m.nombre, m.localizable, prop.id],
    );
    actualizados++;
  } else {
    const r = await db.run(
      `INSERT INTO propietarios (nombre, carnet, localizable, activo, codigo, token_cuenta)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [m.nombre, carnet, m.localizable, generarCodigo(), nuevoToken()],
    );
    prop = { id: r.lastID };
    creados++;
  }

  // Factura del balance (una sola por propietario y período).
  const fac = await db.get(
    'SELECT id FROM facturas WHERE propietario_id = ? AND concepto = ?',
    [prop.id, CONCEPTO],
  );
  if (fac) {
    await db.run('UPDATE facturas SET monto = ?, estado = ? WHERE id = ?', [m.balance, 'vencida', fac.id]);
    facturasActualizadas++;
  } else {
    await db.run(
      `INSERT INTO facturas (propietario_id, concepto, monto, fecha_emision, estado)
       VALUES (?, ?, ?, ?, 'vencida')`,
      [prop.id, CONCEPTO, m.balance, PERIODO_BALANCE],
    );
    facturasNuevas++;
  }
}

const total = MOROSOS.reduce((a, b) => a + b.balance, 0);
const noLoc = MOROSOS.filter((m) => !m.localizable).length;
console.log(`\nListo. Propietarios: ${creados} nuevos, ${actualizados} actualizados.`);
console.log(`Facturas de balance: ${facturasNuevas} nuevas, ${facturasActualizadas} actualizadas.`);
console.log(`Total adeudado: RD$${total.toLocaleString('es-DO')} · no localizables: ${noLoc}.`);
process.exit(0);
