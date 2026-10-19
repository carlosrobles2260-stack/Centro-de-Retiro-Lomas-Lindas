import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { datosCuenta } from '../cuenta.js';

const router = Router();

// GET /api/mi-cuenta  -> estado de cuenta del propietario que inició sesión.
router.get('/', requiereRol('propietario'), ah(async (req, res) => {
  const propId = req.usuario?.propietario_id;
  if (!propId) return res.status(403).json({ error: 'Esta cuenta no está vinculada a un propietario' });

  const propietario = await db.get('SELECT id, nombre, propiedad, tipo_propiedad, carnet, telefono, email, token_cuenta FROM propietarios WHERE id = ?', [propId]);
  if (!propietario) return res.status(404).json({ error: 'Propietario no encontrado' });

  const datos = await datosCuenta(propId);
  const empleados = await db.all(
    'SELECT id, nombre, puesto, carnet, telefono, codigo, activo FROM empleados_propietario WHERE propietario_id = ? ORDER BY nombre',
    [propId]
  );
  res.json({ propietario, ...datos, empleados });
}));

export default router;
