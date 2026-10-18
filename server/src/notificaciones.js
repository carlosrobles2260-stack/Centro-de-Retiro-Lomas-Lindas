import db, { SQL } from './db.js';

let transporterPromesa = null;

// Crea (una sola vez) el transporte SMTP si está configurado en el entorno.
async function obtenerTransporter() {
  if (!process.env.SMTP_HOST) return null; // sin SMTP → modo simulado
  if (!transporterPromesa) {
    transporterPromesa = import('nodemailer').then((nm) =>
      nm.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      })
    );
  }
  return transporterPromesa;
}

/**
 * Registra una notificación para el propietario y la intenta enviar.
 * Si no hay SMTP configurado, queda en estado 'simulada'.
 */
export async function notificarPropietario({ propietario_id, visita_id, asunto, mensaje }) {
  const propietario = propietario_id
    ? await db.get('SELECT * FROM propietarios WHERE id = ?', [propietario_id])
    : null;
  const destino = propietario?.email || null;

  const info = await db.run(
    `INSERT INTO notificaciones (propietario_id, visita_id, canal, destino, asunto, mensaje, estado)
     VALUES (?, ?, 'email', ?, ?, ?, 'pendiente')`,
    [propietario_id ?? null, visita_id ?? null, destino, asunto, mensaje]
  );

  await enviar(info.lastID);
  return info.lastID;
}

// Intenta enviar una notificación por su id y actualiza su estado.
export async function enviar(id) {
  const n = await db.get('SELECT * FROM notificaciones WHERE id = ?', [id]);
  if (!n) return;

  if (!n.destino) {
    await marcar(id, 'error', 'El propietario no tiene correo registrado');
    return;
  }

  try {
    const transporter = await obtenerTransporter();
    if (!transporter) {
      await marcar(id, 'simulada', 'SMTP no configurado; notificación registrada sin enviar');
      console.log(`📨 [simulada] Para ${n.destino}: ${n.asunto}`);
      return;
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@lomaslindas.com',
      to: n.destino,
      subject: n.asunto || 'Notificación · Lomas Lindas',
      text: n.mensaje,
    });
    await marcar(id, 'enviada', null);
  } catch (e) {
    await marcar(id, 'error', String(e.message || e));
  }
}

async function marcar(id, estado, detalle) {
  await db.run(
    `UPDATE notificaciones SET estado = ?, detalle = ?, enviado_en = ${SQL.AHORA} WHERE id = ?`,
    [estado, detalle, id]
  );
}
