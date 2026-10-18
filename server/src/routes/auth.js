import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { ah } from '../async.js';
import { firmarToken, requiereAuth, requiereRol } from '../auth.js';

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
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
}));

// GET /api/auth/me
router.get('/me', requiereAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

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
