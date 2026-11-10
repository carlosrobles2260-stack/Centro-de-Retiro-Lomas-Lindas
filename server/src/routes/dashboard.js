import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';

const router = Router();

// GET /api/dashboard  (métricas generales para la pantalla principal)
router.get('/', ah(async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = hoy.slice(0, 7); // YYYY-MM

  const unico = async (sql, params = []) => (await db.get(sql, params)) || {};

  const visitasHoy = (await unico(`SELECT COUNT(*) AS n FROM visitas WHERE ${SQL.dia('creado_en')} = ?`, [hoy])).n;
  const visitasDentro = (await unico("SELECT COUNT(*) AS n FROM visitas WHERE estado = 'dentro'")).n;
  const visitasPendientes = (await unico("SELECT COUNT(*) AS n FROM visitas WHERE estado = 'pendiente'")).n;

  const incidentesAbiertos = (await unico("SELECT COUNT(*) AS n FROM incidentes WHERE estado != 'cerrado'")).n;
  const rondasHoy = (await unico(`SELECT COUNT(*) AS n FROM rondas WHERE ${SQL.dia('fecha_hora')} = ?`, [hoy])).n;

  const propietarios = (await unico('SELECT COUNT(*) AS n FROM propietarios WHERE activo = 1')).n;
  const empleados = (await unico('SELECT COUNT(*) AS n FROM empleados WHERE activo = 1')).n;

  const porCobrar = (await unico(
    "SELECT COALESCE(SUM(monto), 0) AS total FROM facturas WHERE estado IN ('pendiente','vencida')"
  )).total;
  const ingresosMes = (await unico(
    `SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE ${SQL.anioMes('fecha')} = ?`, [mes]
  )).total;
  const gastosMes = (await unico(
    `SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE ${SQL.anioMes('fecha')} = ?`, [mes]
  )).total;

  const visitasRecientes = await db.all(
    `SELECT vi.id, vi.estado, vi.creado_en, v.nombre AS visitante_nombre, p.nombre AS propietario_nombre
     FROM visitas vi
     LEFT JOIN visitantes v ON v.id = vi.visitante_id
     LEFT JOIN propietarios p ON p.id = vi.propietario_id
     ORDER BY vi.creado_en DESC LIMIT 8`
  );

  const incidentesRecientes = await db.all(
    `SELECT id, tipo, descripcion, gravedad, estado, fecha
     FROM incidentes ORDER BY fecha DESC LIMIT 5`
  );

  // Normaliza números (Postgres puede devolver NUMERIC como texto).
  const num = (x) => Number(x) || 0;

  res.json({
    seguridad: {
      visitasHoy: num(visitasHoy), visitasDentro: num(visitasDentro),
      visitasPendientes: num(visitasPendientes), incidentesAbiertos: num(incidentesAbiertos),
      rondasHoy: num(rondasHoy),
    },
    general: { propietarios: num(propietarios), empleados: num(empleados) },
    finanzas: {
      porCobrar: num(porCobrar), ingresosMes: num(ingresosMes),
      gastosMes: num(gastosMes), balanceMes: num(ingresosMes) - num(gastosMes),
    },
    visitasRecientes,
    incidentesRecientes,
  });
}));

export default router;
