import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { guardarImagenBase64 } from '../fotos.js';

const router = Router();

const CAMPOS = ['tipo', 'cargo', 'nombre', 'periodo', 'anio_desde', 'anio_hasta', 'orden'];

// Pasa un nombre a tipo título ("CARLOS ROBLES" -> "Carlos Robles"), dejando en
// minúscula los conectores comunes (de, del, la, los…).
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'van', 'von']);
function tituloNombre(s) {
  if (!s) return s;
  return String(s).trim().replace(/\s+/g, ' ').toLowerCase().split(' ').map((w, i) => {
    if (i > 0 && CONECTORES.has(w)) return w;
    // Respeta guiones y apóstrofes internos (O'Brien, Jean-Paul).
    return w.replace(/(^|[-'’])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
  }).join(' ');
}

function soloCampos(body) {
  const datos = {};
  for (const c of CAMPOS) if (body[c] !== undefined) datos[c] = body[c];
  if (datos.nombre !== undefined) datos.nombre = tituloNombre(datos.nombre);
  // Los años vacíos van como null (no romper columnas INTEGER).
  for (const c of ['anio_desde', 'anio_hasta']) {
    if (datos[c] === '' || datos[c] === undefined) datos[c] = null;
    else if (datos[c] !== null) datos[c] = parseInt(datos[c], 10) || null;
  }
  return datos;
}

// Arma el texto del período a partir de los años (ej. "2026 - 2028" o "2026 - actual").
function armarPeriodo(datos) {
  if (datos.anio_desde == null) return datos.periodo ?? null;
  return datos.anio_hasta == null ? `${datos.anio_desde} - actual` : `${datos.anio_desde} - ${datos.anio_hasta}`;
}

// Si viene una foto nueva en base64, la guarda y devuelve su URL; si no, conserva la actual.
function resolverFoto(body, actual = null) {
  if (body.foto_base64) {
    const url = guardarImagenBase64(body.foto_base64, 'directiva');
    if (url) return url;
  }
  if (body.foto !== undefined) return body.foto; // puede venir vacía para quitarla
  return actual;
}

// Listar (público para usuarios autenticados). Filtro opcional ?tipo=directiva|presidente
router.get('/', ah(async (req, res) => {
  const cond = [];
  const params = [];
  if (req.query.tipo) { cond.push('tipo = ?'); params.push(req.query.tipo); }
  const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';
  // Directiva por 'orden'; presidentes por período (los más recientes primero).
  res.json(await db.all(`SELECT * FROM directiva${where} ORDER BY orden ASC, periodo DESC, id ASC`, params));
}));

// Las modificaciones solo para administración / presidencia.
router.post('/', requiereRol('admin', 'administracion', 'presidente'), ah(async (req, res) => {
  const datos = soloCampos(req.body);
  if (!datos.nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  datos.periodo = armarPeriodo(datos);
  datos.foto = resolverFoto(req.body, null);
  const columnas = Object.keys(datos);
  const marcadores = columnas.map(() => '?').join(', ');
  const info = await db.run(`INSERT INTO directiva (${columnas.join(', ')}) VALUES (${marcadores})`, columnas.map((c) => datos[c]));
  res.status(201).json(await db.get('SELECT * FROM directiva WHERE id = ?', [info.lastID]));
}));

router.put('/:id', requiereRol('admin', 'administracion', 'presidente'), ah(async (req, res) => {
  const actual = await db.get('SELECT * FROM directiva WHERE id = ?', [req.params.id]);
  if (!actual) return res.status(404).json({ error: 'No encontrado' });
  const datos = soloCampos(req.body);
  datos.periodo = armarPeriodo(datos);
  datos.foto = resolverFoto(req.body, actual.foto);
  const columnas = Object.keys(datos);
  const asignaciones = columnas.map((c) => `${c} = ?`).join(', ');
  await db.run(`UPDATE directiva SET ${asignaciones} WHERE id = ?`, [...columnas.map((c) => datos[c]), req.params.id]);
  res.json(await db.get('SELECT * FROM directiva WHERE id = ?', [req.params.id]));
}));

router.delete('/:id', requiereRol('admin', 'administracion', 'presidente'), ah(async (req, res) => {
  const info = await db.run('DELETE FROM directiva WHERE id = ?', [req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
}));

export default router;
