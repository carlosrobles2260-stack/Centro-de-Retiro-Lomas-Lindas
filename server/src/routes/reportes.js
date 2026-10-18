import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Rango de fechas por defecto: mes actual.
function rango(req) {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 8) + '01';
  return {
    desde: req.query.desde || inicioMes,
    hasta: req.query.hasta || hoy,
  };
}

// GET /api/reportes/visitas?desde&hasta&estado
router.get('/visitas', (req, res) => {
  const { desde, hasta } = rango(req);
  const cond = ['date(vi.creado_en) BETWEEN ? AND ?'];
  const params = [desde, hasta];
  if (req.query.estado) {
    cond.push('vi.estado = ?');
    params.push(req.query.estado);
  }
  const filas = db
    .prepare(
      `SELECT vi.id, vi.estado, vi.motivo, vi.autorizado_por,
              vi.fecha_entrada, vi.fecha_salida, vi.creado_en,
              v.nombre AS visitante, v.tipo AS visitante_tipo, v.placa_vehiculo,
              p.nombre AS propietario, p.propiedad
       FROM visitas vi
       LEFT JOIN visitantes v ON v.id = vi.visitante_id
       LEFT JOIN propietarios p ON p.id = vi.propietario_id
       WHERE ${cond.join(' AND ')}
       ORDER BY vi.creado_en DESC`
    )
    .all(...params);
  res.json({ desde, hasta, total: filas.length, filas });
});

// GET /api/reportes/incidentes?desde&hasta
router.get('/incidentes', (req, res) => {
  const { desde, hasta } = rango(req);
  const filas = db
    .prepare(
      `SELECT i.id, i.fecha, i.tipo, i.descripcion, i.ubicacion, i.gravedad, i.estado,
              u.nombre AS reportado_por
       FROM incidentes i
       LEFT JOIN usuarios u ON u.id = i.reportado_por
       WHERE date(i.fecha) BETWEEN ? AND ?
       ORDER BY i.fecha DESC`
    )
    .all(desde, hasta);
  res.json({ desde, hasta, total: filas.length, filas });
});

// GET /api/reportes/financiero?desde&hasta
router.get('/financiero', (req, res) => {
  const { desde, hasta } = rango(req);

  const pagos = db
    .prepare(
      `SELECT pg.id, pg.fecha, pg.monto, pg.metodo, pg.referencia,
              f.concepto, p.nombre AS propietario
       FROM pagos pg
       JOIN facturas f ON f.id = pg.factura_id
       LEFT JOIN propietarios p ON p.id = f.propietario_id
       WHERE date(pg.fecha) BETWEEN ? AND ?
       ORDER BY pg.fecha DESC`
    )
    .all(desde, hasta);

  const gastos = db
    .prepare(
      `SELECT id, fecha, concepto, categoria, monto, proveedor
       FROM gastos WHERE date(fecha) BETWEEN ? AND ? ORDER BY fecha DESC`
    )
    .all(desde, hasta);

  const totalIngresos = pagos.reduce((a, b) => a + b.monto, 0);
  const totalGastos = gastos.reduce((a, b) => a + b.monto, 0);

  res.json({
    desde,
    hasta,
    resumen: {
      ingresos: totalIngresos,
      gastos: totalGastos,
      balance: totalIngresos - totalGastos,
    },
    pagos,
    gastos,
  });
});

// GET /api/reportes/estado-cuenta  (saldo pendiente por propietario)
router.get('/estado-cuenta', (req, res) => {
  const filas = db
    .prepare(
      `SELECT p.id, p.nombre, p.propiedad, p.telefono,
              COALESCE(SUM(CASE WHEN f.estado IN ('pendiente','vencida') THEN f.monto ELSE 0 END), 0) AS saldo,
              COUNT(CASE WHEN f.estado IN ('pendiente','vencida') THEN 1 END) AS facturas_pendientes
       FROM propietarios p
       LEFT JOIN facturas f ON f.propietario_id = p.id
       WHERE p.activo = 1
       GROUP BY p.id
       ORDER BY saldo DESC, p.nombre`
    )
    .all();
  const totalPorCobrar = filas.reduce((a, b) => a + b.saldo, 0);
  res.json({ totalPorCobrar, total: filas.length, filas });
});

export default router;
