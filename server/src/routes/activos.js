import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

const SELECT_ACTIVO = `
  SELECT a.*, e.nombre AS responsable_nombre
  FROM activos a
  LEFT JOIN empleados e ON e.id = a.responsable_id
`;

// Calcula la depreciación lineal y el valor en libros de un activo.
// Los activos no depreciables (fijos, p. ej. terreno) conservan su valoración.
function conDepreciacion(a) {
  const adq = Number(a.valor_adquisicion) || 0;
  const residual = Number(a.valor_residual) || 0;
  const vida = Number(a.vida_util_anios) || 0;
  let depreciacion_anual = 0, depreciacion_acumulada = 0, valor_libros;

  if (Number(a.depreciable) && vida > 0 && a.fecha_adquisicion) {
    const base = Math.max(0, adq - residual);
    depreciacion_anual = base / vida;
    const inicio = new Date(String(a.fecha_adquisicion).slice(0, 10) + 'T00:00:00');
    const anios = Math.max(0, (Date.now() - inicio.getTime()) / (365.25 * 86400000));
    depreciacion_acumulada = Math.min(depreciacion_anual * anios, base);
    valor_libros = adq - depreciacion_acumulada;
  } else {
    // Activo fijo / no depreciable: su valor es la valoración actual registrada.
    valor_libros = a.valor_actual != null ? Number(a.valor_actual) : adq;
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  return { ...a, depreciacion_anual: r2(depreciacion_anual), depreciacion_acumulada: r2(depreciacion_acumulada), valor_libros: r2(valor_libros) };
}

// Resumen de inventario (antes del CRUD /:id).
router.get('/resumen', ah(async (req, res) => {
  const filas = (await db.all(SELECT_ACTIVO)).map(conDepreciacion);
  const vivos = filas.filter((f) => f.estado !== 'baja');
  res.json({
    total: filas.length,
    activos: vivos.length,
    depreciables: vivos.filter((f) => Number(f.depreciable)).length,
    valor_adquisicion: vivos.reduce((a, f) => a + Number(f.valor_adquisicion || 0), 0),
    valor_libros: vivos.reduce((a, f) => a + Number(f.valor_libros || 0), 0),
  });
}));

// Listar (con depreciación calculada).
router.get('/', ah(async (req, res) => {
  const where = req.query.responsable_id ? ' WHERE a.responsable_id = ?' : '';
  const params = req.query.responsable_id ? [req.query.responsable_id] : [];
  const filas = (await db.all(SELECT_ACTIVO + where + ' ORDER BY a.nombre', params)).map(conDepreciacion);
  res.json(filas);
}));

// Uno
router.get('/:id', ah(async (req, res) => {
  const a = await db.get(SELECT_ACTIVO + ' WHERE a.id = ?', [req.params.id]);
  if (!a) return res.status(404).json({ error: 'No encontrado' });
  res.json(conDepreciacion(a));
}));

crearCrud(router, {
  tabla: 'activos',
  campos: [
    'nombre', 'codigo', 'categoria', 'descripcion', 'fecha_adquisicion',
    'valor_adquisicion', 'valor_actual', 'estado', 'ubicacion', 'responsable_id', 'notas',
    'depreciable', 'vida_util_anios', 'valor_residual',
  ],
  orden: 'nombre',
});

export default router;
