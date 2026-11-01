import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { ah } from '../async.js';
import { firmarToken, requiereAuth, requiereRol, firmarReset, verificarReset, huellaPassword } from '../auth.js';
import { enviarEmail } from '../notificaciones.js';

const router = Router();

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
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, propietario_id: usuario.propietario_id ?? null },
  });
}));

// GET /api/auth/me
router.get('/me', requiereAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

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
router.post('/usuarios', requiereAuth, requiereRol('admin'), ah(async (req, res) => {
  const { nombre, email, password, rol } = req.body || {};
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }
  const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, hash, rol || 'administracion']
  );
  res.status(201).json({ id: info.lastID });
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
