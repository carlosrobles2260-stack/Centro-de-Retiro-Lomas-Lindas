import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';

const router = Router();

// Proporción del salario mensual según la periodicidad del pago.
const FACTOR = { mensual: 1, quincenal: 0.5, semanal: 12 / 52 };
const PERIODOS_ANIO = { mensual: 12, quincenal: 24, semanal: 52 };

// Valores por defecto de las tasas (se usan si falta la configuración).
const TASAS_DEFECTO = {
  nomina_afp: 2.87, nomina_sfs: 3.04,
  isr_exento: 416220, isr_tramo2: 624329, isr_tasa2: 15,
  isr_tramo3: 867123, isr_tasa3: 20, isr_tasa4: 25,
};

// Lee las tasas de nómina desde la configuración.
async function leerTasas() {
  const filas = await db.all("SELECT clave, valor FROM configuracion WHERE clave LIKE 'nomina_%' OR clave LIKE 'isr_%'");
  const c = { ...TASAS_DEFECTO };
  for (const f of filas) if (Number.isFinite(Number(f.valor))) c[f.clave] = Number(f.valor);
  return {
    afp: c.nomina_afp / 100, sfs: c.nomina_sfs / 100,
    isr: { exento: c.isr_exento, tramo2: c.isr_tramo2, tasa2: c.isr_tasa2 / 100, tramo3: c.isr_tramo3, tasa3: c.isr_tasa3 / 100, tasa4: c.isr_tasa4 / 100 },
  };
}

// Impuesto sobre la Renta anual (escala DGII, República Dominicana).
// La mayoría del personal queda exento (ingreso anual bajo el primer tramo).
function isrAnual(rentaAnual, isr) {
  if (rentaAnual <= isr.exento) return 0;
  if (rentaAnual <= isr.tramo2) return (rentaAnual - isr.exento) * isr.tasa2;
  const base3 = (isr.tramo2 - isr.exento) * isr.tasa2;
  if (rentaAnual <= isr.tramo3) return base3 + (rentaAnual - isr.tramo2) * isr.tasa3;
  const base4 = base3 + (isr.tramo3 - isr.tramo2) * isr.tasa3;
  return base4 + (rentaAnual - isr.tramo3) * isr.tasa4;
}

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
  const { afp: AFP, sfs: SFS, isr: ISR } = await leerTasas();
  const empleados = await db.all("SELECT id, nombre, puesto, departamento, salario FROM empleados WHERE activo = 1 ORDER BY nombre");
  const prestamos = await prestamosDelPeriodo(per);
  const porEmpleado = new Map();
  for (const pr of prestamos) {
    porEmpleado.set(pr.empleado_id, (porEmpleado.get(pr.empleado_id) || 0) + pr.cuotaAplicable);
  }

  const periodosAnio = PERIODOS_ANIO[per];
  const filas = empleados.map((e) => {
    const salarioMensual = Number(e.salario) || 0;
    const bruto = salarioMensual * factor;
    const afp = bruto * AFP;
    const sfs = bruto * SFS;
    // ISR: se anualiza la renta neta de TSS, se aplica la escala y se prorratea al período.
    const rentaAnual = salarioMensual * 12 * (1 - AFP - SFS);
    const isr = isrAnual(rentaAnual, ISR) / periodosAnio;
    const prestamo = porEmpleado.get(e.id) || 0;
    const deducciones = afp + sfs + isr + prestamo;
    return {
      empleado_id: e.id, nombre: e.nombre, puesto: e.puesto, departamento: e.departamento,
      salario_mensual: r2(salarioMensual), bruto: r2(bruto), afp: r2(afp), sfs: r2(sfs), isr: r2(isr),
      prestamo: r2(prestamo), deducciones: r2(deducciones), neto: r2(bruto - deducciones),
    };
  });

  const sum = (k) => r2(filas.reduce((a, f) => a + f[k], 0));
  return {
    periodicidad: per, tasas: { afp: AFP, sfs: SFS, isr_exento: ISR.exento },
    empleados: filas,
    totales: { bruto: sum('bruto'), afp: sum('afp'), sfs: sum('sfs'), isr: sum('isr'), prestamo: sum('prestamo'), deducciones: sum('deducciones'), neto: sum('neto') },
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
