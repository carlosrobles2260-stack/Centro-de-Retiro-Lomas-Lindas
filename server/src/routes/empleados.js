import { Router } from 'express';
import db from '../db.js';
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
router.get('/:id/turnos', (req, res) => {
  const turnos = db
    .prepare('SELECT * FROM turnos WHERE empleado_id = ? ORDER BY fecha DESC, hora_inicio')
    .all(req.params.id);
  res.json(turnos);
});

export default router;
