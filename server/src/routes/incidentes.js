import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { guardarImagenBase64 } from '../fotos.js';
import { enviarEmail } from '../notificaciones.js';

const router = Router();

const SELECT_INCIDENTE = `
  SELECT i.*,
         u.nombre AS reportado_por_nombre,
         e.nombre AS responsable_nombre,
         p.nombre AS propietario_nombre, p.propiedad
  FROM incidentes i
  LEFT JOIN usuarios u      ON u.id = i.reportado_por
  LEFT JOIN empleados e     ON e.id = i.responsable_id
  LEFT JOIN propietarios p  ON p.id = i.propietario_id
`;

// Avisa a la Directiva cuando un incidente es de gravedad alta o crítica.
async function avisarDirectiva(incidente) {
  if (!['alta', 'critica'].includes(incidente.gravedad)) return;
  const correos = (process.env.DIRECTIVA_EMAILS || '')
    .split(',').map((c) => c.trim()).filter(Boolean);
  const mensaje =
    `Se registró un incidente de gravedad ${incidente.gravedad.toUpperCase()} en el Centro de Retiro Lomas Lindas.\n\n` +
    `Tipo: ${incidente.tipo || '—'}\n` +
    `Ubicación: ${incidente.ubicacion || '—'}\n` +
    `Descripción: ${incidente.descripcion}\n` +
    `Fecha: ${new Date().toLocaleString('es-ES')}`;
  const asunto = `⚠️ Incidente ${incidente.gravedad} · Lomas Lindas`;

  for (const destino of correos) {
    const r = await enviarEmail({ to: destino, subject: asunto, text: mensaje }).catch(() => ({ estado: 'error', detalle: 'fallo' }));
    await db.run(
      `INSERT INTO notificaciones (canal, destino, asunto, mensaje, estado, detalle, enviado_en)
       VALUES ('email', ?, ?, ?, ?, ?, ${SQL.AHORA})`,
      [destino, asunto, mensaje, r.estado, r.detalle]
    ).catch(() => {});
  }
  // Si no hay correos configurados, deja constancia de que hay un incidente grave pendiente de avisar.
  if (correos.length === 0) {
    await db.run(
      `INSERT INTO notificaciones (canal, destino, asunto, mensaje, estado, detalle)
       VALUES ('email', NULL, ?, ?, 'pendiente', 'No hay correos de la Directiva configurados (DIRECTIVA_EMAILS)')`,
      [asunto, mensaje]
    ).catch(() => {});
  }
}

// GET /api/incidentes  (filtros: estado, gravedad)
router.get('/', ah(async (req, res) => {
  const cond = [];
  const params = [];
  if (req.query.estado) { cond.push('i.estado = ?'); params.push(req.query.estado); }
  if (req.query.gravedad) { cond.push('i.gravedad = ?'); params.push(req.query.gravedad); }
  const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';
  res.json(await db.all(SELECT_INCIDENTE + where + ' ORDER BY i.fecha DESC', params));
}));

// GET /api/incidentes/:id
router.get('/:id', ah(async (req, res) => {
  const fila = await db.get(SELECT_INCIDENTE + ' WHERE i.id = ?', [req.params.id]);
  if (!fila) return res.status(404).json({ error: 'No encontrado' });
  res.json(fila);
}));

// POST /api/incidentes
router.post('/', ah(async (req, res) => {
  const { tipo, descripcion, ubicacion, gravedad, estado, responsable_id, propietario_id, involucrado, foto_base64 } = req.body || {};
  if (!descripcion) return res.status(400).json({ error: 'La descripción es obligatoria' });

  const foto = foto_base64 ? guardarImagenBase64(foto_base64) : null;
  const info = await db.run(
    `INSERT INTO incidentes (tipo, descripcion, ubicacion, gravedad, estado, reportado_por, responsable_id, propietario_id, involucrado, foto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tipo ?? 'otro', descripcion, ubicacion ?? null,
      gravedad ?? 'baja', estado ?? 'abierto',
      req.usuario?.id ?? null, responsable_id || null, propietario_id || null, involucrado || null, foto,
    ]
  );
  const creado = await db.get(SELECT_INCIDENTE + ' WHERE i.id = ?', [info.lastID]);
  avisarDirectiva(creado); // no bloquea la respuesta
  res.status(201).json(creado);
}));

// PUT /api/incidentes/:id
router.put('/:id', ah(async (req, res) => {
  const actual = await db.get('SELECT * FROM incidentes WHERE id = ?', [req.params.id]);
  if (!actual) return res.status(404).json({ error: 'No encontrado' });

  const { tipo, descripcion, ubicacion, gravedad, estado, responsable_id, propietario_id, involucrado, foto_base64 } = req.body || {};
  const foto = foto_base64 ? guardarImagenBase64(foto_base64) : actual.foto;

  await db.run(
    `UPDATE incidentes SET tipo = ?, descripcion = ?, ubicacion = ?, gravedad = ?, estado = ?, responsable_id = ?, propietario_id = ?, involucrado = ?, foto = ?
     WHERE id = ?`,
    [
      tipo ?? actual.tipo, descripcion ?? actual.descripcion, ubicacion ?? actual.ubicacion,
      gravedad ?? actual.gravedad, estado ?? actual.estado,
      responsable_id === undefined ? actual.responsable_id : (responsable_id || null),
      propietario_id === undefined ? actual.propietario_id : (propietario_id || null),
      involucrado === undefined ? actual.involucrado : (involucrado || null),
      foto, req.params.id,
    ]
  );
  res.json(await db.get(SELECT_INCIDENTE + ' WHERE i.id = ?', [req.params.id]));
}));

// DELETE /api/incidentes/:id
router.delete('/:id', ah(async (req, res) => {
  const info = await db.run('DELETE FROM incidentes WHERE id = ?', [req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
}));

export default router;
