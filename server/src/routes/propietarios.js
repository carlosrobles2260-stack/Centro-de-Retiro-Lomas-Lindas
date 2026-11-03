import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { generarCodigo } from '../db.js';
import { ah } from '../async.js';
import { requiereRol } from '../auth.js';
import { guardarImagenBase64 } from '../fotos.js';

const router = Router();

const nuevoToken = () => generarCodigo() + generarCodigo().slice(3);

const CAMPOS = [
  'nombre', 'propiedad', 'tipo_propiedad', 'carnet',
  'tipo_documento', 'documento', 'fecha_nacimiento', 'nacionalidad',
  'telefono', 'movil', 'email', 'direccion',
  'vive_fuera', 'pais_residencia',
  'representante', 'representante_telefono', 'representante_documento',
  'localizable',
  'activo',
];

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

// Listar propietarios.
// - Sin parámetros: devuelve todo (compatibilidad con los menús desplegables).
// - Con ?pagina: devuelve { datos, total, pagina, limite, paginas } y admite
//   ?q para buscar por nombre, propiedad, carnet, documento o correo.
router.get('/', ah(async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const cond = [];
  const params = [];
  if (q) {
    cond.push('(LOWER(p.nombre) LIKE ? OR LOWER(p.propiedad) LIKE ? OR LOWER(p.carnet) LIKE ? OR LOWER(p.documento) LIKE ? OR LOWER(p.email) LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  // Filtro opcional por localizable (?localizable=1 | 0).
  if (req.query.localizable === '1' || req.query.localizable === '0') {
    cond.push('COALESCE(p.localizable, 1) = ?');
    params.push(Number(req.query.localizable));
  }
  // Saldo pendiente del propietario (facturas pendientes/vencidas).
  const SALDO = `(SELECT COALESCE(SUM(f.monto), 0) FROM facturas f WHERE f.propietario_id = p.id AND f.estado IN ('pendiente','vencida'))`;
  // Filtros extra: deuda (con/sin), con teléfono, con correo.
  if (req.query.deuda === 'con') cond.push(`${SALDO} > 0`);
  else if (req.query.deuda === 'sin') cond.push(`${SALDO} = 0`);
  if (req.query.con_tel === '1') cond.push("(p.telefono IS NOT NULL AND p.telefono <> '')");
  if (req.query.con_correo === '1') cond.push("(p.email IS NOT NULL AND p.email <> '')");

  const whereSql = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  // Orden (indexado) por una columna de la lista blanca.
  const ORDENES = {
    nombre: 'p.nombre',
    carnet: "CAST(NULLIF(p.carnet, '') AS INTEGER)",
    saldo: SALDO,
    cedula: 'p.documento',
  };
  const col = ORDENES[req.query.orden] || 'p.nombre';
  const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';
  const orderSql = req.query.orden === 'nombre' || !req.query.orden
    ? `ORDER BY p.nombre ${dir}`
    : `ORDER BY ${col} ${dir}, p.nombre ASC`;

  const selectBase = `
    SELECT p.*, ${SALDO} AS saldo,
           (SELECT email FROM usuarios u WHERE u.propietario_id = p.id AND u.rol = 'propietario' AND u.activo = 1 LIMIT 1) AS acceso_email
    FROM propietarios p ${whereSql} ${orderSql}`;

  if (req.query.pagina !== undefined) {
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 20));
    const offset = (pagina - 1) * limite;
    const totalRow = await db.get(`SELECT COUNT(*) AS n FROM propietarios p ${whereSql}`, params);
    const total = Number(totalRow?.n || 0);
    const filas = await db.all(`${selectBase} LIMIT ? OFFSET ?`, [...params, limite, offset]);
    return res.json({
      datos: filas.map(conFotos),
      total, pagina, limite,
      paginas: Math.max(1, Math.ceil(total / limite)),
    });
  }

  const filas = await db.all(selectBase, params);
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
  if (!['solar', 'edificado'].includes(datos.tipo_propiedad)) {
    return res.status(400).json({ error: 'Debes indicar si la propiedad es solar o edificado' });
  }
  datos.fotos_propiedad = JSON.stringify(resolverFotos(req.body, []));
  datos.token_cuenta = nuevoToken(); // enlace privado del estado de cuenta

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

// Crear o restablecer el acceso con contraseña del propietario (admin/administración).
router.post('/:id/acceso', requiereRol('admin', 'administracion'), ah(async (req, res) => {
  const prop = await db.get('SELECT * FROM propietarios WHERE id = ?', [req.params.id]);
  if (!prop) return res.status(404).json({ error: 'Propietario no encontrado' });

  const email = String(req.body?.email || prop.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Se requiere un correo para crear el acceso' });

  const password = 'LL' + Math.random().toString(36).slice(2, 8); // contraseña temporal
  const hash = bcrypt.hashSync(password, 10);

  const existente = await db.get("SELECT * FROM usuarios WHERE propietario_id = ? AND rol = 'propietario' LIMIT 1", [prop.id]);
  if (existente) {
    const dup = await db.get('SELECT id FROM usuarios WHERE email = ? AND id <> ?', [email, existente.id]);
    if (dup) return res.status(409).json({ error: 'Ya existe otro usuario con ese correo' });
    await db.run('UPDATE usuarios SET nombre = ?, email = ?, password = ?, activo = 1 WHERE id = ?', [prop.nombre, email, hash, existente.id]);
  } else {
    const dup = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (dup) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    await db.run("INSERT INTO usuarios (nombre, email, password, rol, propietario_id) VALUES (?, ?, ?, 'propietario', ?)", [prop.nombre, email, hash, prop.id]);
  }
  res.json({ ok: true, email, password });
}));

// Regenerar el enlace privado del estado de cuenta (invalida el anterior).
router.post('/:id/regenerar-enlace', requiereRol('admin', 'administracion'), ah(async (req, res) => {
  const prop = await db.get('SELECT id FROM propietarios WHERE id = ?', [req.params.id]);
  if (!prop) return res.status(404).json({ error: 'Propietario no encontrado' });
  const token = nuevoToken();
  await db.run('UPDATE propietarios SET token_cuenta = ? WHERE id = ?', [token, prop.id]);
  res.json({ token_cuenta: token });
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
