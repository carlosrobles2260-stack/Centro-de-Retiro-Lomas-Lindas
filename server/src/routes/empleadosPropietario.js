import { Router } from 'express';
import db, { generarCodigo, SQL } from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

const SELECT_EMP = `
  SELECT e.*, p.nombre AS propietario_nombre, p.propiedad
  FROM empleados_propietario e
  LEFT JOIN propietarios p ON p.id = e.propietario_id
`;

// Sugiere el siguiente movimiento según el último acceso de hoy del empleado.
async function sugerirTipo(empleadoId) {
  const hoy = new Date().toISOString().slice(0, 10);
  const ultimo = await db.get(
    `SELECT tipo FROM accesos_empleado WHERE empleado_id = ? AND ${SQL.dia('fecha_hora')} = ? ORDER BY fecha_hora DESC, id DESC LIMIT 1`,
    [empleadoId, hoy]
  );
  return ultimo?.tipo === 'entrada' ? 'salida' : 'entrada';
}

// ===== Resolver una credencial de empleado por su código (para el escáner) =====
// (Debe ir antes del CRUD para no chocar con GET /:id.)
router.get('/codigo/:codigo', ah(async (req, res) => {
  const e = await db.get(SELECT_EMP + ' WHERE e.codigo = ?', [req.params.codigo]);
  if (!e) return res.status(404).json({ error: 'Credencial de empleado no encontrada' });
  res.json({ ...e, sugerido: await sugerirTipo(e.id) });
}));

// ===== Registrar un acceso (entrada/salida) de un empleado del propietario =====
router.post('/acceso', ah(async (req, res) => {
  const { codigo, empleado_id, tipo } = req.body || {};
  const e = codigo
    ? await db.get(SELECT_EMP + ' WHERE e.codigo = ?', [codigo])
    : await db.get(SELECT_EMP + ' WHERE e.id = ?', [empleado_id]);
  if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
  if (!e.activo) return res.status(403).json({ error: 'Este empleado está inactivo' });

  const mov = tipo === 'salida' ? 'salida' : 'entrada';
  await db.run(
    `INSERT INTO accesos_empleado (empleado_id, propietario_id, tipo, registrado_por)
     VALUES (?, ?, ?, ?)`,
    [e.id, e.propietario_id ?? null, mov, req.usuario?.id ?? null]
  );
  res.status(201).json({
    ok: true, tipo: mov,
    empleado: { id: e.id, nombre: e.nombre, puesto: e.puesto, propietario_nombre: e.propietario_nombre, propiedad: e.propiedad },
  });
}));

// ===== Bitácora de accesos (recientes o por día) =====
router.get('/accesos', ah(async (req, res) => {
  const base = `
    SELECT a.*, e.nombre AS empleado_nombre, e.puesto, p.nombre AS propietario_nombre, u.nombre AS registrado_por_nombre
    FROM accesos_empleado a
    JOIN empleados_propietario e ON e.id = a.empleado_id
    LEFT JOIN propietarios p ON p.id = a.propietario_id
    LEFT JOIN usuarios u ON u.id = a.registrado_por
  `;
  if (req.query.fecha) {
    return res.json(await db.all(base + ` WHERE ${SQL.dia('a.fecha_hora')} = ? ORDER BY a.fecha_hora DESC`, [req.query.fecha]));
  }
  res.json(await db.all(base + ' ORDER BY a.fecha_hora DESC LIMIT 100'));
}));

crearCrud(router, {
  tabla: 'empleados_propietario',
  campos: ['propietario_id', 'nombre', 'puesto', 'carnet', 'documento', 'telefono', 'activo'],
  orden: 'nombre',
  // Al crear, genera el código de la credencial de acceso.
  alCrear: (datos) => { datos.codigo = generarCodigo(); },
  listSql: (req) => {
    if (req.query.propietario_id) {
      return { sql: SELECT_EMP + ' WHERE e.propietario_id = ? ORDER BY e.nombre', params: [req.query.propietario_id] };
    }
    return { sql: SELECT_EMP + ' ORDER BY p.nombre, e.nombre', params: [] };
  },
});

export default router;
