import { Router } from 'express';
import db from '../db.js';
import { notificarPropietario } from '../notificaciones.js';

const router = Router();

// Construye y envía la notificación al propietario para una visita.
function notificarVisita(visitaId, tipo) {
  const v = db.prepare(SELECT_VISITA + ' WHERE vi.id = ?').get(visitaId);
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

// GET /api/visitas  (filtros: estado, fecha, buscar)
router.get('/', (req, res) => {
  const cond = [];
  const params = [];
  if (req.query.estado) {
    cond.push('vi.estado = ?');
    params.push(req.query.estado);
  }
  if (req.query.fecha) {
    cond.push("date(vi.creado_en) = ?");
    params.push(req.query.fecha);
  }
  if (req.query.buscar) {
    cond.push('(v.nombre LIKE ? OR v.documento LIKE ? OR p.nombre LIKE ?)');
    const q = `%${req.query.buscar}%`;
    params.push(q, q, q);
  }
  const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';
  const filas = db.prepare(SELECT_VISITA + where + ' ORDER BY vi.creado_en DESC').all(...params);
  res.json(filas);
});

// GET /api/visitas/:id
router.get('/:id', (req, res) => {
  const fila = db.prepare(SELECT_VISITA + ' WHERE vi.id = ?').get(req.params.id);
  if (!fila) return res.status(404).json({ error: 'No encontrada' });
  res.json(fila);
});

// POST /api/visitas  (registrar una nueva visita)
router.post('/', (req, res) => {
  const { visitante_id, propietario_id, motivo, autorizado_por, notas, estado } = req.body || {};
  if (!visitante_id) return res.status(400).json({ error: 'El visitante es obligatorio' });

  const info = db
    .prepare(
      `INSERT INTO visitas (visitante_id, propietario_id, motivo, autorizado_por, notas, estado, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      visitante_id,
      propietario_id ?? null,
      motivo ?? null,
      autorizado_por ?? null,
      notas ?? null,
      estado ?? 'pendiente',
      req.usuario?.id ?? null
    );
  notificarVisita(info.lastInsertRowid, 'registrada');
  res.status(201).json(db.prepare(SELECT_VISITA + ' WHERE vi.id = ?').get(info.lastInsertRowid));
});

// PATCH /api/visitas/:id/estado  (cambiar estado del flujo de acceso)
router.patch('/:id/estado', (req, res) => {
  const { estado, autorizado_por, notas } = req.body || {};
  const permitidos = ['pendiente', 'autorizada', 'dentro', 'finalizada', 'rechazada'];
  if (!permitidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  const visita = db.prepare('SELECT * FROM visitas WHERE id = ?').get(req.params.id);
  if (!visita) return res.status(404).json({ error: 'No encontrada' });

  // Sellos de tiempo automáticos según el estado.
  let fecha_entrada = visita.fecha_entrada;
  let fecha_salida = visita.fecha_salida;
  if (estado === 'dentro' && !fecha_entrada) fecha_entrada = new Date().toISOString();
  if (estado === 'finalizada' && !fecha_salida) fecha_salida = new Date().toISOString();

  db.prepare(
    `UPDATE visitas SET estado = ?, autorizado_por = ?, notas = ?, fecha_entrada = ?, fecha_salida = ?
     WHERE id = ?`
  ).run(
    estado,
    autorizado_por ?? visita.autorizado_por,
    notas ?? visita.notas,
    fecha_entrada,
    fecha_salida,
    req.params.id
  );
  // Notifica al propietario cuando el visitante ingresa (primera vez).
  if (estado === 'dentro' && visita.estado !== 'dentro') {
    notificarVisita(Number(req.params.id), 'ingreso');
  }
  res.json(db.prepare(SELECT_VISITA + ' WHERE vi.id = ?').get(req.params.id));
});

// DELETE /api/visitas/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM visitas WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ok: true });
});

export default router;
