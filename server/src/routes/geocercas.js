import { Router } from 'express';
import { crearCrud } from '../crud.js';

const router = Router();

crearCrud(router, {
  tabla: 'geocercas',
  campos: ['nombre', 'tipo', 'lat', 'lng', 'radio_m', 'activo'],
  orden: 'tipo, nombre',
});

export default router;
