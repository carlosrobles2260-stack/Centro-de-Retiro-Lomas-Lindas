import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'propietarios',
  campos: ['nombre', 'propiedad', 'documento', 'telefono', 'email', 'direccion', 'activo'],
  orden: 'nombre',
});

// Visitantes asociados a un propietario
router.get('/:id/visitantes', ah(async (req, res) => {
  const visitantes = await db.all(
    'SELECT * FROM visitantes WHERE propietario_id = ? ORDER BY nombre',
    [req.params.id]
  );
  res.json(visitantes);
}));

// Estado de cuenta de un propietario (facturas y saldo)
router.get('/:id/cuenta', ah(async (req, res) => {
  const facturas = await db.all(
    'SELECT * FROM facturas WHERE propietario_id = ? ORDER BY fecha_emision DESC',
    [req.params.id]
  );
  const saldo = facturas
    .filter((f) => f.estado === 'pendiente' || f.estado === 'vencida')
    .reduce((acc, f) => acc + Number(f.monto), 0);
  res.json({ facturas, saldo });
}));

export default router;
