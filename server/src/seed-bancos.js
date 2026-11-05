// Carga las cuentas bancarias de la asociación y sus saldos de cierre mensuales
// (tomados del Estado de Ingresos y Gastos ene–sep 2026). Idempotente.
//
// Uso: docker compose exec server node src/seed-bancos.js
import db from './db.js';

const CUENTAS = [
  { nombre: 'Banreservas', numero: '2460003514', orden: 1,
    // saldo al CIERRE de cada mes. 2025-12 es el efectivo inicial de ene-26.
    saldos: { '2025-12': 107163, '2026-01': 14847, '2026-02': 107861, '2026-03': 253375,
      '2026-04': 253045, '2026-05': 31669, '2026-06': 150275, '2026-07': 233346,
      '2026-08': 224768, '2026-09': 259701 } },
  { nombre: 'BHD', numero: '10418170018', orden: 2,
    saldos: { '2025-12': 587641, '2026-01': 620314, '2026-02': 651965, '2026-03': 836604,
      '2026-04': 652598, '2026-05': 647860, '2026-06': 622233, '2026-07': 384745,
      '2026-08': 346563, '2026-09': 481291 } },
];

let cuentasNuevas = 0;
let saldosGuardados = 0;
for (const c of CUENTAS) {
  let fila = await db.get('SELECT id FROM cuentas_bancarias WHERE nombre = ?', [c.nombre]);
  if (!fila) {
    const r = await db.run('INSERT INTO cuentas_bancarias (nombre, numero, orden, activo) VALUES (?, ?, ?, 1)', [c.nombre, c.numero, c.orden]);
    fila = { id: r.lastID };
    console.log('✓ cuenta creada:', c.nombre);
    cuentasNuevas++;
  } else {
    console.log('• ya existía:', c.nombre);
  }
  for (const [periodo, saldo] of Object.entries(c.saldos)) {
    await db.run(
      `INSERT INTO saldos_banco (cuenta_id, periodo, saldo) VALUES (?, ?, ?)
       ON CONFLICT(cuenta_id, periodo) DO UPDATE SET saldo = excluded.saldo`,
      [fila.id, periodo, saldo]
    );
    saldosGuardados++;
  }
}

console.log(`\nListo. Cuentas nuevas: ${cuentasNuevas}. Saldos guardados: ${saldosGuardados}.`);
process.exit(0);
