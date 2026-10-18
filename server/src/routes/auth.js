import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { firmarToken, requiereAuth, requiereRol } from '../auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);
  if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = firmarToken(usuario);
  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
});

// GET /api/auth/me
router.get('/me', requiereAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

// ===== Gestión de usuarios (solo admin) =====

// GET /api/auth/usuarios
router.get('/usuarios', requiereAuth, requiereRol('admin'), (req, res) => {
  const usuarios = db
    .prepare('SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY nombre')
    .all();
  res.json(usuarios);
});

// POST /api/auth/usuarios
router.post('/usuarios', requiereAuth, requiereRol('admin'), (req, res) => {
  const { nombre, email, password, rol } = req.body || {};
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)')
    .run(nombre, email, hash, rol || 'administracion');
  res.status(201).json({ id: info.lastInsertRowid });
});

// PUT /api/auth/usuarios/:id
router.put('/usuarios/:id', requiereAuth, requiereRol('admin'), (req, res) => {
  const { nombre, email, rol, activo, password } = req.body || {};
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const hash = password ? bcrypt.hashSync(password, 10) : usuario.password;
  db.prepare(
    'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ?, password = ? WHERE id = ?'
  ).run(
    nombre ?? usuario.nombre,
    email ?? usuario.email,
    rol ?? usuario.rol,
    activo ?? usuario.activo,
    hash,
    req.params.id
  );
  res.json({ ok: true });
});

export default router;
