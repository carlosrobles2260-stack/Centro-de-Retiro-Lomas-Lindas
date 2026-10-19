import { Router } from 'express';
import { crearCrud } from '../crud.js';
import { generarCodigo } from '../db.js';

const router = Router();

crearCrud(router, {
  tabla: 'empleados_propietario',
  campos: ['propietario_id', 'nombre', 'puesto', 'documento', 'telefono', 'activo'],
  orden: 'nombre',
  // Al crear, genera el código de la credencial de acceso.
  alCrear: (datos) => { datos.codigo = generarCodigo(); },
  listSql: (req) => {
    const base = `
      SELECT e.*, p.nombre AS propietario_nombre, p.propiedad
      FROM empleados_propietario e
      LEFT JOIN propietarios p ON p.id = e.propietario_id
    `;
    if (req.query.propietario_id) {
      return { sql: base + ' WHERE e.propietario_id = ? ORDER BY e.nombre', params: [req.query.propietario_id] };
    }
    return { sql: base + ' ORDER BY p.nombre, e.nombre', params: [] };
  },
});

export default router;
