import { Router } from 'express';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { matrizPermisos, permisosDeRol, fijarPermiso } from '../permisos.js';

const router = Router();

// Permisos efectivos del usuario actual (cualquier usuario autenticado).
// El frontend los usa para armar el menú y habilitar botones.
router.get('/mios', ah(async (req, res) => {
  res.json({
    rol: req.usuario.rol,
    es_admin: req.usuario.rol === 'admin',
    permisos: permisosDeRol(req.usuario.rol),
  });
}));

// Matriz completa (solo admin) para la pantalla de administración.
router.get('/', requiereRol('admin'), ah(async (req, res) => {
  res.json(matrizPermisos());
}));

// Actualiza una celda (rol, módulo) -> leer/escribir. Solo admin.
router.put('/', requiereRol('admin'), ah(async (req, res) => {
  const { rol, modulo, leer, escribir } = req.body || {};
  if (!rol || !modulo) return res.status(400).json({ error: 'Faltan rol y módulo' });
  const ok = await fijarPermiso(rol, modulo, !!leer, !!escribir);
  if (!ok) return res.status(400).json({ error: 'No se puede modificar ese permiso' });
  res.json(matrizPermisos());
}));

export default router;
