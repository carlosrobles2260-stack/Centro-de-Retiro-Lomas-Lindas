import db from './db.js';

/**
 * Genera un conjunto de rutas CRUD estándar para una tabla.
 *
 * @param {object} opts
 * @param {string} opts.tabla        Nombre de la tabla.
 * @param {string[]} opts.campos     Columnas que el cliente puede escribir.
 * @param {string} [opts.orden]      Cláusula ORDER BY (sin la palabra ORDER BY).
 * @param {Function} [opts.listSql]  Función opcional que devuelve { sql, params } para el listado.
 */
export function crearCrud(router, { tabla, campos, orden = 'id DESC', listSql }) {
  // Listar
  router.get('/', (req, res) => {
    if (listSql) {
      const { sql, params } = listSql(req);
      return res.json(db.prepare(sql).all(...params));
    }
    const filas = db.prepare(`SELECT * FROM ${tabla} ORDER BY ${orden}`).all();
    res.json(filas);
  });

  // Obtener uno
  router.get('/:id', (req, res) => {
    const fila = db.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).get(req.params.id);
    if (!fila) return res.status(404).json({ error: 'No encontrado' });
    res.json(fila);
  });

  // Crear
  router.post('/', (req, res) => {
    const datos = filtrarCampos(req.body, campos);
    const columnas = Object.keys(datos);
    if (columnas.length === 0) {
      return res.status(400).json({ error: 'No se enviaron datos válidos' });
    }
    const marcadores = columnas.map(() => '?').join(', ');
    const info = db
      .prepare(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores})`)
      .run(...columnas.map((c) => datos[c]));
    const creado = db.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(creado);
  });

  // Actualizar
  router.put('/:id', (req, res) => {
    const existe = db.prepare(`SELECT id FROM ${tabla} WHERE id = ?`).get(req.params.id);
    if (!existe) return res.status(404).json({ error: 'No encontrado' });

    const datos = filtrarCampos(req.body, campos);
    const columnas = Object.keys(datos);
    if (columnas.length === 0) {
      return res.status(400).json({ error: 'No se enviaron datos válidos' });
    }
    const asignaciones = columnas.map((c) => `${c} = ?`).join(', ');
    db.prepare(`UPDATE ${tabla} SET ${asignaciones} WHERE id = ?`).run(
      ...columnas.map((c) => datos[c]),
      req.params.id
    );
    const actualizado = db.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).get(req.params.id);
    res.json(actualizado);
  });

  // Eliminar
  router.delete('/:id', (req, res) => {
    const info = db.prepare(`DELETE FROM ${tabla} WHERE id = ?`).run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  });

  return router;
}

function filtrarCampos(body = {}, campos) {
  const datos = {};
  for (const campo of campos) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
}
