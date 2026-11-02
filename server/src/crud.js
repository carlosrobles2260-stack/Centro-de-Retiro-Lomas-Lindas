import db from './db.js';
import { ah } from './async.js';

/**
 * Genera un conjunto de rutas CRUD estándar para una tabla.
 *
 * @param {object} opts
 * @param {string} opts.tabla        Nombre de la tabla.
 * @param {string[]} opts.campos     Columnas que el cliente puede escribir.
 * @param {string} [opts.orden]      Cláusula ORDER BY (sin la palabra ORDER BY).
 * @param {Function} [opts.listSql]  Función opcional que devuelve { sql, params } para el listado.
 * @param {Function} [opts.alCrear]  Hook para agregar campos generados antes de insertar.
 */
export function crearCrud(router, { tabla, campos, orden = 'id DESC', listSql, alCrear }) {
  // Listar.
  // - Sin ?pagina: devuelve todo (compatibilidad con selects, exportaciones, etc.).
  // - Con ?pagina: devuelve { datos, total, pagina, limite, paginas } (paginado).
  router.get('/', ah(async (req, res) => {
    let baseSql, baseParams;
    if (listSql) {
      const r = listSql(req);
      baseSql = r.sql;
      baseParams = r.params || [];
    } else {
      baseSql = `SELECT * FROM ${tabla} ORDER BY ${orden}`;
      baseParams = [];
    }

    if (req.query.pagina === undefined) {
      return res.json(await db.all(baseSql, baseParams));
    }

    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 20));
    const offset = (pagina - 1) * limite;
    const totalRow = await db.get(`SELECT COUNT(*) AS n FROM (${baseSql}) AS sub`, baseParams);
    const total = Number(totalRow?.n || 0);
    const datos = await db.all(`SELECT * FROM (${baseSql}) AS sub LIMIT ? OFFSET ?`, [...baseParams, limite, offset]);
    res.json({ datos, total, pagina, limite, paginas: Math.max(1, Math.ceil(total / limite)) });
  }));

  // Obtener uno
  router.get('/:id', ah(async (req, res) => {
    const fila = await db.get(`SELECT * FROM ${tabla} WHERE id = ?`, [req.params.id]);
    if (!fila) return res.status(404).json({ error: 'No encontrado' });
    res.json(fila);
  }));

  // Crear
  router.post('/', ah(async (req, res) => {
    const datos = filtrarCampos(req.body, campos);
    if (alCrear) alCrear(datos, req);
    const columnas = Object.keys(datos);
    if (columnas.length === 0) {
      return res.status(400).json({ error: 'No se enviaron datos válidos' });
    }
    const marcadores = columnas.map(() => '?').join(', ');
    const info = await db.run(
      `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores})`,
      columnas.map((c) => datos[c])
    );
    res.status(201).json(await db.get(`SELECT * FROM ${tabla} WHERE id = ?`, [info.lastID]));
  }));

  // Actualizar
  router.put('/:id', ah(async (req, res) => {
    const existe = await db.get(`SELECT id FROM ${tabla} WHERE id = ?`, [req.params.id]);
    if (!existe) return res.status(404).json({ error: 'No encontrado' });

    const datos = filtrarCampos(req.body, campos);
    const columnas = Object.keys(datos);
    if (columnas.length === 0) {
      return res.status(400).json({ error: 'No se enviaron datos válidos' });
    }
    const asignaciones = columnas.map((c) => `${c} = ?`).join(', ');
    await db.run(`UPDATE ${tabla} SET ${asignaciones} WHERE id = ?`, [
      ...columnas.map((c) => datos[c]),
      req.params.id,
    ]);
    res.json(await db.get(`SELECT * FROM ${tabla} WHERE id = ?`, [req.params.id]));
  }));

  // Eliminar
  router.delete('/:id', ah(async (req, res) => {
    const info = await db.run(`DELETE FROM ${tabla} WHERE id = ?`, [req.params.id]);
    if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  }));

  return router;
}

function filtrarCampos(body = {}, campos) {
  const datos = {};
  for (const campo of campos) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
}
