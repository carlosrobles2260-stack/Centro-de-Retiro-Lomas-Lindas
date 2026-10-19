import { Router } from 'express';
import db from '../db.js';
import { ah } from '../async.js';
import { guardarImagenBase64 } from '../fotos.js';

const router = Router();

const CAMPOS = ['nombre', 'propiedad', 'tipo_propiedad', 'carnet', 'documento', 'telefono', 'email', 'direccion', 'activo'];

// Convierte el texto JSON de fotos en un arreglo para el cliente.
function conFotos(fila) {
  if (!fila) return fila;
  let fotos = [];
  try { fotos = fila.fotos_propiedad ? JSON.parse(fila.fotos_propiedad) : []; } catch { fotos = []; }
  return { ...fila, fotos };
}

// Arma la lista final de fotos: conserva las enviadas en `fotos` (URLs ya guardadas)
// y agrega las nuevas de `fotos_base64` (imágenes en base64).
function resolverFotos(body, actuales = []) {
  const conservar = Array.isArray(body.fotos) ? body.fotos.filter((f) => typeof f === 'string') : actuales;
  const nuevas = Array.isArray(body.fotos_base64) ? body.fotos_base64 : [];
  const guardadas = nuevas.map((b64) => guardarImagenBase64(b64, 'propiedades')).filter(Boolean);
  return [...conservar, ...guardadas];
}

function soloCampos(body) {
  const datos = {};
  for (const c of CAMPOS) if (body[c] !== undefined) datos[c] = body[c];
  return datos;
}

// Listar
router.get('/', ah(async (req, res) => {
  const filas = await db.all('SELECT * FROM propietarios ORDER BY nombre');
  res.json(filas.map(conFotos));
}));

// Obtener uno
router.get('/:id', ah(async (req, res) => {
  const fila = await db.get('SELECT * FROM propietarios WHERE id = ?', [req.params.id]);
  if (!fila) return res.status(404).json({ error: 'No encontrado' });
  res.json(conFotos(fila));
}));

// Crear
router.post('/', ah(async (req, res) => {
  const datos = soloCampos(req.body);
  if (!datos.nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  datos.fotos_propiedad = JSON.stringify(resolverFotos(req.body, []));

  const columnas = Object.keys(datos);
  const marcadores = columnas.map(() => '?').join(', ');
  const info = await db.run(
    `INSERT INTO propietarios (${columnas.join(', ')}) VALUES (${marcadores})`,
    columnas.map((c) => datos[c])
  );
  res.status(201).json(conFotos(await db.get('SELECT * FROM propietarios WHERE id = ?', [info.lastID])));
}));

// Actualizar
router.put('/:id', ah(async (req, res) => {
  const actual = await db.get('SELECT * FROM propietarios WHERE id = ?', [req.params.id]);
  if (!actual) return res.status(404).json({ error: 'No encontrado' });

  const datos = soloCampos(req.body);
  let actuales = [];
  try { actuales = actual.fotos_propiedad ? JSON.parse(actual.fotos_propiedad) : []; } catch { actuales = []; }
  datos.fotos_propiedad = JSON.stringify(resolverFotos(req.body, actuales));

  const columnas = Object.keys(datos);
  if (columnas.length === 0) return res.status(400).json({ error: 'No se enviaron datos válidos' });
  const asignaciones = columnas.map((c) => `${c} = ?`).join(', ');
  await db.run(`UPDATE propietarios SET ${asignaciones} WHERE id = ?`, [...columnas.map((c) => datos[c]), req.params.id]);
  res.json(conFotos(await db.get('SELECT * FROM propietarios WHERE id = ?', [req.params.id])));
}));

// Eliminar
router.delete('/:id', ah(async (req, res) => {
  const info = await db.run('DELETE FROM propietarios WHERE id = ?', [req.params.id]);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
}));

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
