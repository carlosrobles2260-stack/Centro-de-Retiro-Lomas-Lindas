// Normas y reglamentos de la asociación. La administración los gestiona y el
// propietario los consulta desde "Mi cuenta". Admite subir un archivo (PDF o
// imagen), enlazar un documento externo o escribir el texto de la norma.
import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { guardarArchivoBase64 } from '../fotos.js';

const router = Router();

// GET /api/documentos  (filtro opcional: categoria)
router.get('/', ah(async (req, res) => {
  const where = req.query.categoria ? ' WHERE categoria = ?' : '';
  const params = req.query.categoria ? [req.query.categoria] : [];
  res.json(await db.all(`SELECT * FROM documentos${where} ORDER BY orden ASC, titulo ASC`, params));
}));

// GET /api/documentos/:id
router.get('/:id', ah(async (req, res) => {
  const fila = await db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id]);
  if (!fila) return res.status(404).json({ error: 'No encontrado' });
  res.json(fila);
}));

// POST /api/documentos
router.post('/', ah(async (req, res) => {
  const { titulo, categoria, descripcion, contenido, enlace, fecha, publicado, orden, archivo_base64 } = req.body || {};
  if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });

  const archivo = archivo_base64 ? guardarArchivoBase64(archivo_base64) : null;
  if (archivo_base64 && !archivo) return res.status(400).json({ error: 'Archivo no válido (solo PDF o imagen, máx. 15 MB)' });

  const info = await db.run(
    `INSERT INTO documentos (titulo, categoria, descripcion, contenido, archivo, enlace, fecha, publicado, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      titulo, categoria || 'reglamento_interno', descripcion || null, contenido || null,
      archivo, enlace || null, fecha || null, publicado === undefined ? 1 : Number(publicado) ? 1 : 0, Number(orden) || 0,
    ]
  );
  res.status(201).json(await db.get('SELECT * FROM documentos WHERE id = ?', [info.lastID]));
}));

// PUT /api/documentos/:id
router.put('/:id', ah(async (req, res) => {
  const actual = await db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id]);
  if (!actual) return res.status(404).json({ error: 'No encontrado' });

  const { titulo, categoria, descripcion, contenido, enlace, fecha, publicado, orden, archivo_base64 } = req.body || {};
  let archivo = actual.archivo;
  if (archivo_base64) {
    archivo = guardarArchivoBase64(archivo_base64);
    if (!archivo) return res.status(400).json({ error: 'Archivo no válido (solo PDF o imagen, máx. 15 MB)' });
  }

  await db.run(
    `UPDATE documentos SET titulo = ?, categoria = ?, descripcion = ?, contenido = ?, archivo = ?, enlace = ?, fecha = ?, publicado = ?, orden = ?, actualizado_en = ${SQL.AHORA}
     WHERE id = ?`,
    [
      titulo ?? actual.titulo, categoria ?? actual.categoria,
      descripcion === undefined ? actual.descripcion : (descripcion || null),
      contenido === undefined ? actual.contenido : (contenido || null),
      archivo, enlace === undefined ? actual.enlace : (enlace || null),
      fecha === undefined ? actual.fecha : (fecha || null),
      publicado === undefined ? actual.publicado : (Number(publicado) ? 1 : 0),
      orden === undefined ? actual.orden : (Number(orden) || 0),
      req.params.id,
    ]
  );
  res.json(await db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id]));
}));

// DELETE /api/documentos/:id
router.delete('/:id', ah(async (req, res) => {
  const info = await db.run('DELETE FROM documentos WHERE id = ?', [req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
}));

export default router;
