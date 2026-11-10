// Elecciones de la Directiva. Voto SECRETO: el padrón (quién votó) y las
// boletas (qué plancha) se guardan por separado, así que el conteo no se puede
// vincular a nombres. Solo votan los propietarios al día (si la elección lo
// exige) y los resultados se publican únicamente cuando la elección se cierra.
import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { datosCuenta } from '../cuenta.js';

const router = Router();

// Resumen de una plancha para listar.
const PLANCHA_COLS = 'id, numero, nombre, lema, integrantes';

// Saldo del propietario (para la regla de solvencia).
async function saldoDe(propId) {
  const d = await datosCuenta(propId);
  return Number(d.saldo) || 0;
}

// ===== Propietario: elección abierta y mi estado =====
router.get('/abierta', ah(async (req, res) => {
  const e = await db.get("SELECT * FROM elecciones WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1");
  if (!e) return res.json({ eleccion: null });
  const planchas = await db.all(`SELECT ${PLANCHA_COLS} FROM planchas WHERE eleccion_id = ? AND activo = 1 ORDER BY numero, id`, [e.id]);

  let yaVoto = false, elegible = true, motivo = null, saldo = 0;
  const propId = req.usuario?.propietario_id;
  if (propId) {
    yaVoto = !!(await db.get('SELECT id FROM votantes WHERE eleccion_id = ? AND propietario_id = ?', [e.id, propId]));
    if (e.solo_solventes) {
      saldo = await saldoDe(propId);
      if (saldo > 0.001) { elegible = false; motivo = 'Debes estar al día con las cuotas de mantenimiento para votar.'; }
    }
  } else if (req.usuario?.rol !== 'administracion' && req.usuario?.rol !== 'admin') {
    elegible = false; motivo = 'Tu cuenta no está vinculada a un propietario.';
  }

  res.json({
    eleccion: { id: e.id, titulo: e.titulo, periodo: e.periodo, descripcion: e.descripcion, fecha_cierre: e.fecha_cierre, solo_solventes: !!e.solo_solventes },
    planchas, yaVoto, elegible, motivo, saldo,
  });
}));

// POST /:id/votar  { plancha_id }  -> emite el voto (secreto) del propietario.
router.post('/:id/votar', requiereRol('propietario'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Tu cuenta no está vinculada a un propietario.' });

  const e = await db.get('SELECT * FROM elecciones WHERE id = ?', [req.params.id]);
  if (!e || e.estado !== 'abierta') return res.status(409).json({ error: 'La elección no está abierta.' });

  const plancha = await db.get('SELECT id FROM planchas WHERE id = ? AND eleccion_id = ? AND activo = 1', [req.body?.plancha_id, e.id]);
  if (!plancha) return res.status(400).json({ error: 'Debes elegir una plancha válida.' });

  if (await db.get('SELECT id FROM votantes WHERE eleccion_id = ? AND propietario_id = ?', [e.id, propId])) {
    return res.status(409).json({ error: 'Ya emitiste tu voto en esta elección.' });
  }
  if (e.solo_solventes && (await saldoDe(propId)) > 0.001) {
    return res.status(403).json({ error: 'Debes estar al día con las cuotas de mantenimiento para votar.' });
  }

  try {
    await db.tx(async (q) => {
      await q.run('INSERT INTO votantes (eleccion_id, propietario_id) VALUES (?, ?)', [e.id, propId]);
      await q.run('INSERT INTO votos (eleccion_id, plancha_id) VALUES (?, ?)', [e.id, plancha.id]);
    });
  } catch (err) {
    return res.status(409).json({ error: 'Ya emitiste tu voto en esta elección.' });
  }
  res.status(201).json({ ok: true });
}));

// ===== Administración =====
// Listado de elecciones con conteo de planchas y participación.
router.get('/', requiereRol('administracion'), ah(async (req, res) => {
  res.json(await db.all(`
    SELECT e.*,
      (SELECT COUNT(*) FROM planchas p WHERE p.eleccion_id = e.id) AS planchas,
      (SELECT COUNT(*) FROM votantes v WHERE v.eleccion_id = e.id) AS votantes
    FROM elecciones e ORDER BY e.id DESC`));
}));

// Detalle de una elección con sus planchas.
router.get('/:id', requiereRol('administracion'), ah(async (req, res) => {
  const e = await db.get('SELECT * FROM elecciones WHERE id = ?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  e.planchas = await db.all(`SELECT * FROM planchas WHERE eleccion_id = ? ORDER BY numero, id`, [e.id]);
  e.votantes = (await db.get('SELECT COUNT(*) AS n FROM votantes WHERE eleccion_id = ?', [e.id])).n;
  res.json(e);
}));

router.post('/', requiereRol('administracion'), ah(async (req, res) => {
  const { titulo, periodo, descripcion, fecha_apertura, fecha_cierre, solo_solventes } = req.body || {};
  if (!titulo) return res.status(400).json({ error: 'El título es obligatorio.' });
  const info = await db.run(
    `INSERT INTO elecciones (titulo, periodo, descripcion, fecha_apertura, fecha_cierre, solo_solventes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [titulo, periodo || null, descripcion || null, fecha_apertura || null, fecha_cierre || null, solo_solventes === undefined ? 1 : (Number(solo_solventes) ? 1 : 0)]
  );
  res.status(201).json(await db.get('SELECT * FROM elecciones WHERE id = ?', [info.lastID]));
}));

router.put('/:id', requiereRol('administracion'), ah(async (req, res) => {
  const e = await db.get('SELECT * FROM elecciones WHERE id = ?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  if (e.estado !== 'borrador') return res.status(409).json({ error: 'Solo se puede editar una elección en borrador.' });
  const { titulo, periodo, descripcion, fecha_apertura, fecha_cierre, solo_solventes } = req.body || {};
  await db.run(
    `UPDATE elecciones SET titulo = ?, periodo = ?, descripcion = ?, fecha_apertura = ?, fecha_cierre = ?, solo_solventes = ? WHERE id = ?`,
    [titulo ?? e.titulo, periodo ?? e.periodo, descripcion ?? e.descripcion, fecha_apertura ?? e.fecha_apertura, fecha_cierre ?? e.fecha_cierre,
     solo_solventes === undefined ? e.solo_solventes : (Number(solo_solventes) ? 1 : 0), req.params.id]
  );
  res.json(await db.get('SELECT * FROM elecciones WHERE id = ?', [req.params.id]));
}));

// Abrir / cerrar la elección.
router.post('/:id/estado', requiereRol('administracion'), ah(async (req, res) => {
  const e = await db.get('SELECT * FROM elecciones WHERE id = ?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  const accion = req.body?.accion;
  if (accion === 'abrir') {
    if (e.estado !== 'borrador') return res.status(409).json({ error: 'Solo se abre una elección en borrador.' });
    const n = (await db.get('SELECT COUNT(*) AS n FROM planchas WHERE eleccion_id = ? AND activo = 1', [e.id])).n;
    if (n < 2) return res.status(400).json({ error: 'Agrega al menos 2 planchas antes de abrir la votación.' });
    await db.run("UPDATE elecciones SET estado = 'abierta' WHERE id = ?", [e.id]);
  } else if (accion === 'cerrar') {
    if (e.estado !== 'abierta') return res.status(409).json({ error: 'Solo se cierra una elección abierta.' });
    await db.run(`UPDATE elecciones SET estado = 'cerrada', cerrada_en = ${SQL.AHORA} WHERE id = ?`, [e.id]);
  } else {
    return res.status(400).json({ error: 'Acción no válida.' });
  }
  res.json(await db.get('SELECT * FROM elecciones WHERE id = ?', [req.params.id]));
}));

// Planchas: solo se modifican mientras la elección está en borrador.
async function exigirBorrador(req, res) {
  const e = await db.get('SELECT estado FROM elecciones WHERE id = ?', [req.params.id]);
  if (!e) { res.status(404).json({ error: 'Elección no encontrada' }); return null; }
  if (e.estado !== 'borrador') { res.status(409).json({ error: 'Las planchas solo se editan con la elección en borrador.' }); return null; }
  return e;
}

router.post('/:id/planchas', requiereRol('administracion'), ah(async (req, res) => {
  if (!(await exigirBorrador(req, res))) return;
  const { numero, nombre, lema, integrantes } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'El nombre de la plancha es obligatorio.' });
  const info = await db.run(
    'INSERT INTO planchas (eleccion_id, numero, nombre, lema, integrantes) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, Number(numero) || null, nombre, lema || null, integrantes || null]
  );
  res.status(201).json(await db.get('SELECT * FROM planchas WHERE id = ?', [info.lastID]));
}));

router.put('/:id/planchas/:pid', requiereRol('administracion'), ah(async (req, res) => {
  if (!(await exigirBorrador(req, res))) return;
  const p = await db.get('SELECT * FROM planchas WHERE id = ? AND eleccion_id = ?', [req.params.pid, req.params.id]);
  if (!p) return res.status(404).json({ error: 'Plancha no encontrada' });
  const { numero, nombre, lema, integrantes } = req.body || {};
  await db.run('UPDATE planchas SET numero = ?, nombre = ?, lema = ?, integrantes = ? WHERE id = ?',
    [numero === undefined ? p.numero : (Number(numero) || null), nombre ?? p.nombre, lema ?? p.lema, integrantes ?? p.integrantes, p.id]);
  res.json(await db.get('SELECT * FROM planchas WHERE id = ?', [p.id]));
}));

router.delete('/:id/planchas/:pid', requiereRol('administracion'), ah(async (req, res) => {
  if (!(await exigirBorrador(req, res))) return;
  const info = await db.run('DELETE FROM planchas WHERE id = ? AND eleccion_id = ?', [req.params.pid, req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'Plancha no encontrada' });
  res.json({ ok: true });
}));

// Resultados: SOLO cuando la elección está cerrada (resguarda el conteo durante la votación).
router.get('/:id/resultados', requiereRol('administracion'), ah(async (req, res) => {
  const e = await db.get('SELECT * FROM elecciones WHERE id = ?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  if (e.estado !== 'cerrada') return res.status(409).json({ error: 'Los resultados se publican al cerrar la elección.' });

  const planchas = await db.all(`
    SELECT p.id, p.numero, p.nombre, p.lema,
      (SELECT COUNT(*) FROM votos v WHERE v.plancha_id = p.id) AS votos
    FROM planchas p WHERE p.eleccion_id = ? ORDER BY votos DESC, p.numero`, [e.id]);
  const total = planchas.reduce((a, p) => a + Number(p.votos), 0);
  const padron = (await db.get('SELECT COUNT(*) AS n FROM propietarios WHERE activo = 1')).n;
  res.json({ eleccion: { id: e.id, titulo: e.titulo, periodo: e.periodo, cerrada_en: e.cerrada_en }, planchas, total, padron, ganadora: planchas[0]?.id ?? null });
}));

// Padrón de participación (quién votó). Es participación, no la opción elegida.
router.get('/:id/padron', requiereRol('administracion'), ah(async (req, res) => {
  const filas = await db.all(`
    SELECT v.fecha, pr.nombre, pr.propiedad FROM votantes v
    JOIN propietarios pr ON pr.id = v.propietario_id
    WHERE v.eleccion_id = ? ORDER BY v.fecha DESC`, [req.params.id]);
  res.json(filas);
}));

export default router;
