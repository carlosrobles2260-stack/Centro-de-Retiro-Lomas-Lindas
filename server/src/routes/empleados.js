import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';
import { calcularPrestaciones } from '../prestaciones.js';

const router = Router();

// Cálculo de prestaciones laborales (RD). Debe ir antes del CRUD /:id.
router.get('/:id/prestaciones', ah(async (req, res) => {
  const emp = await db.get('SELECT * FROM empleados WHERE id = ?', [req.params.id]);
  if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
  if (!emp.fecha_ingreso) return res.status(400).json({ error: 'El empleado no tiene fecha de ingreso registrada' });
  const calculo = calcularPrestaciones({
    salarioMensual: emp.salario,
    fechaIngreso: emp.fecha_ingreso,
    hasta: req.query.hasta || undefined,
    tipo: req.query.tipo || 'desahucio',
  });
  res.json({ empleado: { id: emp.id, nombre: emp.nombre, puesto: emp.puesto, departamento: emp.departamento }, ...calculo });
}));

crearCrud(router, {
  tabla: 'empleados',
  campos: [
    'nombre', 'documento', 'puesto', 'departamento', 'telefono',
    'email', 'fecha_ingreso', 'salario', 'activo', 'usuario_id',
    'fecha_nacimiento', 'nacionalidad', 'estado_civil', 'genero', 'direccion',
    'tipo_contrato', 'nss', 'contacto_emergencia', 'telefono_emergencia',
    'banco', 'cuenta_banco', 'notas',
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
