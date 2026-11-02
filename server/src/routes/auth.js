import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { ah } from '../async.js';
import { firmarToken, requiereAuth, requiereRol, firmarReset, verificarReset, huellaPassword } from '../auth.js';
import { enviarEmail } from '../notificaciones.js';

const router = Router();

// Genera una contraseña temporal legible (sin caracteres ambiguos como O/0, I/1).
function generarTempPassword() {
  const may = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const min = 'abcdefghijkmnpqrstuvwxyz';
  const num = '23456789';
  const elegir = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
  return elegir(may, 2) + elegir(min, 3) + elegir(num, 3); // ej. "KPabc482"
}

// Correo de bienvenida con el enlace, el usuario y la contraseña temporal.
async function enviarBienvenida({ nombre, email, clave }) {
  const base = String(process.env.CLIENT_ORIGIN || '').replace(/\/$/, '');
  const texto = `Hola ${nombre}:\n\nSe creó tu cuenta en el sistema del Centro de Retiro Lomas Lindas.\n\nEnlace: ${base}\nUsuario: ${email}\nContraseña temporal: ${clave}\n\nAl ingresar por primera vez, el sistema te pedirá crear tu propia contraseña.`;
  const html = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;color:#1f2a24">
    <h2 style="color:#2f6e4f">Tu acceso al sistema</h2>
    <p>Hola <strong>${nombre}</strong>:</p>
    <p>Se creó tu cuenta en el sistema del <strong>Centro de Retiro Lomas Lindas</strong>. Estos son tus datos de acceso:</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 8px;color:#5d6b63">Usuario</td><td style="padding:4px 8px"><strong>${email}</strong></td></tr>
      <tr><td style="padding:4px 8px;color:#5d6b63">Contraseña temporal</td><td style="padding:4px 8px"><strong>${clave}</strong></td></tr>
    </table>
    <p><a href="${base}" style="display:inline-block;background:#2f6e4f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Entrar al sistema</a></p>
    <p style="color:#5d6b63;font-size:13px">Al ingresar por primera vez, el sistema te pedirá <strong>crear tu propia contraseña</strong>.</p>
  </div>`;
  return enviarEmail({ to: email, subject: 'Tu acceso al sistema · Lomas Lindas', text: texto, html });
}

// POST /api/auth/login
router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }
  const usuario = await db.get('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]);
  if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = firmarToken(usuario);
  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, propietario_id: usuario.propietario_id ?? null, debe_cambiar: usuario.debe_cambiar ? 1 : 0 },
  });
}));

// GET /api/auth/me
router.get('/me', requiereAuth, ah(async (req, res) => {
  const u = await db.get('SELECT debe_cambiar FROM usuarios WHERE id = ?', [req.usuario.id]);
  res.json({ usuario: { ...req.usuario, debe_cambiar: u?.debe_cambiar ? 1 : 0 } });
}));

// POST /api/auth/cambiar-password  { actual, nueva } -> el usuario cambia su propia contraseña.
router.post('/cambiar-password', requiereAuth, ah(async (req, res) => {
  const { actual, nueva } = req.body || {};
  if (!nueva || String(nueva).length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  const usuario = await db.get('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [req.usuario.id]);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (!actual || !bcrypt.compareSync(String(actual), usuario.password)) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
  }
  const hash = bcrypt.hashSync(String(nueva), 10);
  await db.run('UPDATE usuarios SET password = ?, debe_cambiar = 0 WHERE id = ?', [hash, usuario.id]);
  res.json({ ok: true });
}));

// ===== Recuperación de contraseña =====

// POST /api/auth/recuperar  { email }
// Envía (si el correo existe) un enlace para restablecer la contraseña.
// Siempre responde igual, para no revelar qué correos están registrados.
router.post('/recuperar', ah(async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (email) {
    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]);
    if (usuario) {
      const token = firmarReset(usuario);
      const base = String(process.env.CLIENT_ORIGIN || '').replace(/\/$/, '');
      const enlace = `${base}/restablecer?token=${encodeURIComponent(token)}`;
      const texto = `Hola ${usuario.nombre}:\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta en el sistema del Centro de Retiro Lomas Lindas.\n\nAbre este enlace para crear una nueva contraseña (válido por 1 hora):\n${enlace}\n\nSi no solicitaste esto, ignora este correo; tu contraseña no cambiará.`;
      const html = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;color:#1f2a24">
        <h2 style="color:#2f6e4f">Restablecer tu contraseña</h2>
        <p>Hola <strong>${usuario.nombre}</strong>:</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en el sistema del <strong>Centro de Retiro Lomas Lindas</strong>.</p>
        <p><a href="${enlace}" style="display:inline-block;background:#2f6e4f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Crear nueva contraseña</a></p>
        <p style="color:#5d6b63;font-size:13px">Este enlace es válido por 1 hora. Si no solicitaste esto, ignora este correo; tu contraseña no cambiará.</p>
      </div>`;
      await enviarEmail({ to: usuario.email, subject: 'Restablecer tu contraseña · Lomas Lindas', text: texto, html });
    }
  }
  res.json({ ok: true, mensaje: 'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.' });
}));

// POST /api/auth/restablecer  { token, password }
router.post('/restablecer', ah(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Faltan datos.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  let datos;
  try { datos = verificarReset(token); }
  catch { return res.status(400).json({ error: 'El enlace no es válido o ya caducó. Solicita uno nuevo.' }); }

  const usuario = await db.get('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [datos.id]);
  if (!usuario || datos.h !== huellaPassword(usuario.password)) {
    return res.status(400).json({ error: 'El enlace no es válido o ya fue utilizado. Solicita uno nuevo.' });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  await db.run('UPDATE usuarios SET password = ? WHERE id = ?', [hash, usuario.id]);
  res.json({ ok: true });
}));

// ===== Gestión de usuarios (solo admin) =====

// GET /api/auth/usuarios
router.get('/usuarios', requiereAuth, requiereRol('admin'), ah(async (req, res) => {
  const usuarios = await db.all(
    'SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY nombre'
  );
  res.json(usuarios);
}));

// POST /api/auth/usuarios
// Crea el usuario con una contraseña temporal (si no se indica una), le envía
// por correo el enlace + usuario + contraseña, y lo obliga a cambiarla al entrar.
router.post('/usuarios', requiereAuth, requiereRol('admin'), ah(async (req, res) => {
  const { nombre, email, password, rol } = req.body || {};
  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios' });
  }
  const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const clave = password && String(password).trim() ? String(password).trim() : generarTempPassword();
  const hash = bcrypt.hashSync(clave, 10);
  const info = await db.run(
    'INSERT INTO usuarios (nombre, email, password, rol, debe_cambiar) VALUES (?, ?, ?, ?, 1)',
    [nombre, email, hash, rol || 'administracion']
  );

  const envio = await enviarBienvenida({ nombre, email, clave });
  res.status(201).json({
    id: info.lastID,
    // Devolvemos la clave temporal al admin por si el correo no se entrega.
    temporal: clave,
    correo: envio.estado, // 'enviada' | 'simulada' | 'error'
  });
}));

// PUT /api/auth/usuarios/:id
router.put('/usuarios/:id', requiereAuth, requiereRol('admin'), ah(async (req, res) => {
  const { nombre, email, rol, activo, password } = req.body || {};
  const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const hash = password ? bcrypt.hashSync(password, 10) : usuario.password;
  await db.run(
    'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ?, password = ? WHERE id = ?',
    [
      nombre ?? usuario.nombre,
      email ?? usuario.email,
      rol ?? usuario.rol,
      activo ?? usuario.activo,
      hash,
      req.params.id,
    ]
  );
  res.json({ ok: true });
}));

export default router;
