import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'empleados',
  campos: [
    'nombre', 'documento', 'puesto', 'departamento', 'telefono',
    'email', 'fecha_ingreso', 'salario', 'activo', 'usuario_id',
  ],
  orden: 'nombre',
});

// Turnos de un empleado
router.get('/:id/turnos', ah(async (req, res) => {
  const turnos = await db.all(
    'SELECT * FROM turnos WHERE empleado_id = ? ORDER BY fecha DESC, hora_inicio',
    [req.params.id]
  );
  res.json(turnos);
}));

export default router;
