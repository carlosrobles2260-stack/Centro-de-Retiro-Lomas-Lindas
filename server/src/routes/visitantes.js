import { Router } from 'express';
import db, { generarCodigo, SQL } from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';
import { enviarEmail } from '../notificaciones.js';
import { generarQrBuffer, emailCredencialHTML } from '../credencial.js';

const router = Router();

const SELECT_VISITANTE = `
  SELECT v.*, p.nombre AS propietario_nombre, p.propiedad
  FROM visitantes v
  LEFT JOIN propietarios p ON p.id = v.propietario_id
`;

// Buscar un visitante por su código de credencial / QR.
// (Debe ir antes del CRUD para no chocar con GET /:id.)
router.get('/codigo/:codigo', ah(async (req, res) => {
  const v = await db.get(SELECT_VISITANTE + ' WHERE v.codigo = ?', [req.params.codigo]);
  if (!v) return res.status(404).json({ error: 'Credencial no encontrada' });
  res.json(v);
}));

// Enviar la credencial (QR) por correo al visitante.
router.post('/:id/enviar-credencial', ah(async (req, res) => {
  const v = await db.get(SELECT_VISITANTE + ' WHERE v.id = ?', [req.params.id]);
  if (!v) return res.status(404).json({ error: 'Visitante no encontrado' });
  // Permite indicar un correo puntual en el cuerpo; si no, usa el del visitante.
  const destino = (req.body?.email || v.email || '').trim();
  if (!destino) {
    return res.status(400).json({ error: 'El visitante no tiene correo registrado. Agrega uno o indícalo.' });
  }

  const urlPublica = `${process.env.PUBLIC_URL || 'http://localhost:4000'}/credencial/${v.codigo}`;
  const qr = await generarQrBuffer(v.codigo);

  const resultado = await enviarEmail({
    to: destino,
    subject: `Tu credencial de visitante · Centro de Retiro Lomas Lindas`,
    text: `Hola ${v.nombre}, tu código de acceso es ${v.codigo}. Preséntalo en la entrada. Credencial: ${urlPublica}`,
    html: emailCredencialHTML(v, urlPublica),
    attachments: [{ filename: 'credencial.png', content: qr, cid: 'qr' }],
  });

  // Registra el envío en la bandeja de notificaciones.
  await db.run(
    `INSERT INTO notificaciones (propietario_id, canal, destino, asunto, mensaje, estado, detalle, enviado_en)
     VALUES (?, 'email', ?, ?, ?, ?, ?, ${SQL.AHORA})`,
    [
      v.propietario_id ?? null,
      destino,
      'Credencial enviada',
      `Credencial QR enviada al visitante ${v.nombre}`,
      resultado.estado,
      resultado.detalle,
    ]
  ).catch(() => {});

  res.json({ ...resultado, destino, urlPublica });
}));

crearCrud(router, {
  tabla: 'visitantes',
  campos: ['nombre', 'documento', 'telefono', 'email', 'tipo', 'propietario_id', 'placa_vehiculo', 'notas'],
  orden: 'nombre',
  alCrear: (datos) => { datos.codigo = generarCodigo(); },
  listSql: (req) => {
    const base = `
      SELECT v.*, p.nombre AS propietario_nombre, p.propiedad
      FROM visitantes v
      LEFT JOIN propietarios p ON p.id = v.propietario_id
    `;
    if (req.query.buscar) {
      const q = `%${req.query.buscar}%`;
      return {
        sql: base + ' WHERE v.nombre LIKE ? OR v.documento LIKE ? OR v.codigo LIKE ? ORDER BY v.nombre',
        params: [q, q, q],
      };
    }
    return { sql: base + ' ORDER BY v.nombre', params: [] };
  },
});

export default router;
