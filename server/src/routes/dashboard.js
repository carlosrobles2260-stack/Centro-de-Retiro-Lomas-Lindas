import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/dashboard  (métricas generales para la pantalla principal)
router.get('/', (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = hoy.slice(0, 7); // YYYY-MM

  const unico = (sql, ...p) => db.prepare(sql).get(...p);

  const visitasHoy = unico(
    "SELECT COUNT(*) AS n FROM visitas WHERE date(creado_en) = ?",
    hoy
  ).n;
  const visitasDentro = unico("SELECT COUNT(*) AS n FROM visitas WHERE estado = 'dentro'").n;
  const visitasPendientes = unico("SELECT COUNT(*) AS n FROM visitas WHERE estado = 'pendiente'").n;

  const incidentesAbiertos = unico(
    "SELECT COUNT(*) AS n FROM incidentes WHERE estado != 'cerrado'"
  ).n;
  const rondasHoy = unico("SELECT COUNT(*) AS n FROM rondas WHERE date(fecha_hora) = ?", hoy).n;

  const propietarios = unico('SELECT COUNT(*) AS n FROM propietarios WHERE activo = 1').n;
  const empleados = unico('SELECT COUNT(*) AS n FROM empleados WHERE activo = 1').n;

  const porCobrar = unico(
    "SELECT COALESCE(SUM(monto), 0) AS total FROM facturas WHERE estado IN ('pendiente','vencida')"
  ).total;
  const ingresosMes = unico(
    "SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE strftime('%Y-%m', fecha) = ?",
    mes
  ).total;
  const gastosMes = unico(
    "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE strftime('%Y-%m', fecha) = ?",
    mes
  ).total;

  const visitasRecientes = db
    .prepare(
      `SELECT vi.id, vi.estado, vi.creado_en, v.nombre AS visitante_nombre, p.nombre AS propietario_nombre
       FROM visitas vi
       LEFT JOIN visitantes v ON v.id = vi.visitante_id
       LEFT JOIN propietarios p ON p.id = vi.propietario_id
       ORDER BY vi.creado_en DESC LIMIT 8`
    )
    .all();

  const incidentesRecientes = db
    .prepare(
      `SELECT id, tipo, descripcion, gravedad, estado, fecha
       FROM incidentes ORDER BY fecha DESC LIMIT 5`
    )
    .all();

  res.json({
    seguridad: { visitasHoy, visitasDentro, visitasPendientes, incidentesAbiertos, rondasHoy },
    general: { propietarios, empleados },
    finanzas: { porCobrar, ingresosMes, gastosMes, balanceMes: ingresosMes - gastosMes },
    visitasRecientes,
    incidentesRecientes,
  });
});

export default router;
