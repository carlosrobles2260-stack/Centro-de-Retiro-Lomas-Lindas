import { Router } from 'express';
import db, { SQL } from '../db.js';
import { ah } from '../async.js';
import { notificarPropietario } from '../notificaciones.js';

const router = Router();

const SELECT_VISITA = `
  SELECT vi.*,
         v.nombre AS visitante_nombre, v.documento AS visitante_documento,
         v.tipo AS visitante_tipo, v.placa_vehiculo,
         p.nombre AS propietario_nombre, p.propiedad,
         u.nombre AS registrado_por_nombre
  FROM visitas vi
  LEFT JOIN visitantes v   ON v.id = vi.visitante_id
  LEFT JOIN propietarios p ON p.id = vi.propietario_id
  LEFT JOIN usuarios u     ON u.id = vi.registrado_por
`;

// Construye y envía la notificación al propietario para una visita.
async function notificarVisita(visitaId, tipo) {
  const v = await db.get(SELECT_VISITA + ' WHERE vi.id = ?', [visitaId]);
  if (!v || !v.propietario_id) return;
  const mensajes = {
    registrada: {
      asunto: `Solicitud de acceso: ${v.visitante_nombre}`,
      mensaje: `Estimado(a) ${v.propietario_nombre}, el visitante ${v.visitante_nombre}` +
        `${v.placa_vehiculo ? ` (vehículo ${v.placa_vehiculo})` : ''} ha sido registrado en la entrada` +
        `${v.motivo ? ` por "${v.motivo}"` : ''}. Por favor confirme la autorización de acceso.`,
    },
    ingreso: {
      asunto: `Su visitante ingresó: ${v.visitante_nombre}`,
      mensaje: `Estimado(a) ${v.propietario_nombre}, le informamos que ${v.visitante_nombre} ingresó al Centro de Retiro Lomas Lindas.`,
    },
  };
  const m = mensajes[tipo];
  if (!m) return;
  // No se espera (no bloquea la respuesta HTTP).
  notificarPropietario({ propietario_id: v.propietario_id, visita_id: visitaId, ...m }).catch((e) =>
    console.error('Error notificando:', e)
  );
}

// GET /api/visitas  (filtros: estado, fecha, buscar)
router.get('/', ah(async (req, res) => {
  const cond = [];
  const params = [];
  if (req.query.estado) {
    cond.push('vi.estado = ?');
    params.push(req.query.estado);
  }
  if (req.query.fecha) {
    cond.push(`${SQL.dia('vi.creado_en')} = ?`);
    params.push(req.query.fecha);
  }
  if (req.query.buscar) {
    cond.push('(v.nombre LIKE ? OR v.documento LIKE ? OR p.nombre LIKE ?)');
    const q = `%${req.query.buscar}%`;
    params.push(q, q, q);
  }
  const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';
  res.json(await db.all(SELECT_VISITA + where + ' ORDER BY vi.creado_en DESC', params));
}));

// GET /api/visitas/:id
router.get('/:id', ah(async (req, res) => {
  const fila = await db.get(SELECT_VISITA + ' WHERE vi.id = ?', [req.params.id]);
  if (!fila) return res.status(404).json({ error: 'No encontrada' });
  res.json(fila);
}));

// POST /api/visitas  (registrar una nueva visita)
router.post('/', ah(async (req, res) => {
  const { visitante_id, propietario_id, motivo, autorizado_por, notas, estado } = req.body || {};
  if (!visitante_id) return res.status(400).json({ error: 'El visitante es obligatorio' });

  const info = await db.run(
    `INSERT INTO visitas (visitante_id, propietario_id, motivo, autorizado_por, notas, estado, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      visitante_id,
      propietario_id ?? null,
      motivo ?? null,
      autorizado_por ?? null,
      notas ?? null,
      estado ?? 'pendiente',
      req.usuario?.id ?? null,
    ]
  );
  notificarVisita(info.lastID, 'registrada');
  res.status(201).json(await db.get(SELECT_VISITA + ' WHERE vi.id = ?', [info.lastID]));
}));

// PATCH /api/visitas/:id/estado  (cambiar estado del flujo de acceso)
router.patch('/:id/estado', ah(async (req, res) => {
  const { estado, autorizado_por, notas } = req.body || {};
  const permitidos = ['pendiente', 'autorizada', 'dentro', 'finalizada', 'rechazada'];
  if (!permitidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  const visita = await db.get('SELECT * FROM visitas WHERE id = ?', [req.params.id]);
  if (!visita) return res.status(404).json({ error: 'No encontrada' });

  // Sellos de tiempo automáticos según el estado.
  let fecha_entrada = visita.fecha_entrada;
  let fecha_salida = visita.fecha_salida;
  if (estado === 'dentro' && !fecha_entrada) fecha_entrada = new Date().toISOString();
  if (estado === 'finalizada' && !fecha_salida) fecha_salida = new Date().toISOString();

  await db.run(
    `UPDATE visitas SET estado = ?, autorizado_por = ?, notas = ?, fecha_entrada = ?, fecha_salida = ?
     WHERE id = ?`,
    [
      estado,
      autorizado_por ?? visita.autorizado_por,
      notas ?? visita.notas,
      fecha_entrada,
      fecha_salida,
      req.params.id,
    ]
  );
  if (estado === 'dentro' && visita.estado !== 'dentro') {
    notificarVisita(Number(req.params.id), 'ingreso');
  }
  res.json(await db.get(SELECT_VISITA + ' WHERE vi.id = ?', [req.params.id]));
}));

// DELETE /api/visitas/:id
router.delete('/:id', ah(async (req, res) => {
  const info = await db.run('DELETE FROM visitas WHERE id = ?', [req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ok: true });
}));

export default router;
