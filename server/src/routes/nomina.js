import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';

const router = Router();

// Tasas de deducción del empleado (República Dominicana, TSS): AFP y SFS.
const AFP = 0.0287; // pensión
const SFS = 0.0304; // salud
// Proporción del salario mensual según la periodicidad del pago.
const FACTOR = { mensual: 1, quincenal: 0.5, semanal: 12 / 52 };

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Préstamos activos del período (misma periodicidad), con su saldo.
async function prestamosDelPeriodo(periodicidad) {
  const filas = await db.all(`
    SELECT p.*, COALESCE((SELECT SUM(monto) FROM descuentos_nomina d WHERE d.prestamo_id = p.id), 0) AS pagado
    FROM prestamos_empleado p WHERE p.estado = 'activo' AND p.periodicidad = ?
  `, [periodicidad]);
  return filas.map((p) => ({ ...p, saldo: Number(p.monto) - Number(p.pagado), cuotaAplicable: Math.min(Number(p.cuota), Number(p.monto) - Number(p.pagado)) }))
    .filter((p) => p.saldo > 0.001);
}

// Calcula la nómina de un período para todos los empleados activos.
async function calcularNomina(periodicidad) {
  const per = FACTOR[periodicidad] ? periodicidad : 'mensual';
  const factor = FACTOR[per];
  const empleados = await db.all("SELECT id, nombre, puesto, departamento, salario FROM empleados WHERE activo = 1 ORDER BY nombre");
  const prestamos = await prestamosDelPeriodo(per);
  const porEmpleado = new Map();
  for (const pr of prestamos) {
    porEmpleado.set(pr.empleado_id, (porEmpleado.get(pr.empleado_id) || 0) + pr.cuotaAplicable);
  }

  const filas = empleados.map((e) => {
    const bruto = (Number(e.salario) || 0) * factor;
    const afp = bruto * AFP;
    const sfs = bruto * SFS;
    const prestamo = porEmpleado.get(e.id) || 0;
    const deducciones = afp + sfs + prestamo;
    return {
      empleado_id: e.id, nombre: e.nombre, puesto: e.puesto, departamento: e.departamento,
      salario_mensual: r2(e.salario), bruto: r2(bruto), afp: r2(afp), sfs: r2(sfs),
      prestamo: r2(prestamo), deducciones: r2(deducciones), neto: r2(bruto - deducciones),
    };
  });

  const sum = (k) => r2(filas.reduce((a, f) => a + f[k], 0));
  return {
    periodicidad: per, tasas: { afp: AFP, sfs: SFS },
    empleados: filas,
    totales: { bruto: sum('bruto'), afp: sum('afp'), sfs: sum('sfs'), prestamo: sum('prestamo'), deducciones: sum('deducciones'), neto: sum('neto') },
  };
}

// GET /api/nomina?periodicidad=mensual
router.get('/', ah(async (req, res) => {
  res.json(await calcularNomina(req.query.periodicidad || 'mensual'));
}));

// POST /api/nomina/descontar-prestamos  body: { periodicidad, periodo, fecha }
// Registra en cada préstamo activo del período su cuota como descuento de nómina.
router.post('/descontar-prestamos', ah(async (req, res) => {
  const periodicidad = FACTOR[req.body?.periodicidad] ? req.body.periodicidad : 'mensual';
  const periodo = req.body?.periodo || null;
  const prestamos = await prestamosDelPeriodo(periodicidad);

  let total = 0;
  await db.tx(async (q) => {
    for (const p of prestamos) {
      const monto = p.cuotaAplicable;
      if (monto <= 0) continue;
      await q.run(
        `INSERT INTO descuentos_nomina (prestamo_id, empleado_id, monto, fecha, periodo, nota, registrado_por)
         VALUES (?, ?, ?, COALESCE(?, ${SQL.HOY}), ?, 'Descuento de nómina', ?)`,
        [p.id, p.empleado_id, monto, req.body?.fecha || null, periodo, req.usuario?.id ?? null]
      );
      const row = await q.get('SELECT COALESCE(SUM(monto),0) AS t FROM descuentos_nomina WHERE prestamo_id = ?', [p.id]);
      if (Number(row.t) >= Number(p.monto) - 0.001) {
        await q.run("UPDATE prestamos_empleado SET estado = 'pagado' WHERE id = ?", [p.id]);
      }
      total += monto;
    }
  });
  res.json({ ok: true, aplicados: prestamos.length, total: r2(total) });
}));

export default router;
