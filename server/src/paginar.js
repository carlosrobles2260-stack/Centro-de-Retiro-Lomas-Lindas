import db from './db.js';

/**
 * Responde una lista con paginación opcional.
 * - Sin ?pagina: devuelve el arreglo completo (compatibilidad con selects, exportaciones, etc.).
 * - Con ?pagina: devuelve { datos, total, pagina, limite, paginas }.
 *
 * baseSql debe ser un SELECT sin punto y coma final; se envuelve en subconsulta
 * para contar y aplicar LIMIT/OFFSET (sirve con joins y ORDER BY internos).
 */
export async function responderLista(req, res, baseSql, params = []) {
  if (req.query.pagina === undefined) {
    return res.json(await db.all(baseSql, params));
  }
  const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 20));
  const offset = (pagina - 1) * limite;
  const totalRow = await db.get(`SELECT COUNT(*) AS n FROM (${baseSql}) AS sub`, params);
  const total = Number(totalRow?.n || 0);
  const datos = await db.all(`SELECT * FROM (${baseSql}) AS sub LIMIT ? OFFSET ?`, [...params, limite, offset]);
  res.json({ datos, total, pagina, limite, paginas: Math.max(1, Math.ceil(total / limite)) });
}
