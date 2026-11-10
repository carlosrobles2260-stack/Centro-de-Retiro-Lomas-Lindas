// Control de acceso por QR dinámico con antipassback (dentro/fuera) y señal a
// la barrera del portón. El pase (QR) es un token firmado y de corta vida: la
// app lo renueva cada pocos segundos, de modo que una captura de pantalla
// caduca y no se puede reutilizar. El reingreso se bloquea si el titular ya
// figura dentro.
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db from './db.js';
import { generarQrDataUrl } from './credencial.js';

// Secreto propio del subsistema de acceso (independiente del login).
const SECRET = process.env.ACCESO_SECRET || 'acceso-' + (process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion');

const TIPOS = {
  propietario: { tabla: 'propietarios', nombre: 'nombre' },
  visitante: { tabla: 'visitantes', nombre: 'nombre' },
  empleado: { tabla: 'empleados_propietario', nombre: 'nombre' },
};

async function config(clave, defecto) {
  const r = await db.get('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return r?.valor ?? defecto;
}

async function ttlSegundos() {
  const n = Number(await config('acceso_token_ttl', '45'));
  return Number.isFinite(n) && n >= 10 && n <= 300 ? n : 45;
}

// Genera un pase (QR) firmado y de corta vida para un sujeto (por su código).
export async function generarPase(tipo, codigo) {
  if (!TIPOS[tipo]) throw new Error('Tipo de sujeto no válido');
  const ttl = await ttlSegundos();
  const token = jwt.sign(
    { k: 'acc', t: tipo, c: codigo },
    SECRET,
    { expiresIn: ttl, jwtid: crypto.randomBytes(9).toString('hex') }
  );
  return { token, ttl };
}

// Pase + imagen QR (data URL) lista para mostrar.
export async function generarPaseQr(tipo, codigo) {
  const pase = await generarPase(tipo, codigo);
  return { ...pase, qr: await generarQrDataUrl(pase.token) };
}

// Verifica el pase. Devuelve { tipo, codigo, jti } o lanza error.
export function verificarPase(token) {
  const p = jwt.verify(token, SECRET); // lanza si está expirado o alterado
  if (p.k !== 'acc' || !TIPOS[p.t] || !p.c) throw new Error('Pase no válido');
  return { tipo: p.t, codigo: String(p.c), jti: p.jti };
}

// Resuelve el sujeto por su código.
async function resolverSujeto(tipo, codigo) {
  const t = TIPOS[tipo];
  return db.get(`SELECT * FROM ${t.tabla} WHERE codigo = ?`, [codigo]);
}

// ¿El sujeto está dentro? Lo dice la dirección de su último acceso.
export async function estaDentro(tipo, sujetoId) {
  const r = await db.get(
    'SELECT direccion FROM accesos WHERE tipo_sujeto = ? AND sujeto_id = ? ORDER BY fecha DESC, id DESC LIMIT 1',
    [tipo, sujetoId]
  );
  return r?.direccion === 'entrada';
}

// Prueba manual de la barrera (para verificar el cableado del relé).
export async function probarBarrera() {
  return abrirBarrera();
}

// Señal de apertura según la dirección del movimiento. En entrada siempre abre;
// en salida solo si está configurado. Es best-effort: si no hay relé configurado
// devuelve 'no_configurada' y no interrumpe el registro del acceso.
export async function abrirBarreraPara(direccion = 'entrada') {
  const abrirSalida = (await config('acceso_abrir_en_salida', '1')) === '1';
  if (direccion === 'salida' && !abrirSalida) return 'omitida';
  return abrirBarrera();
}

// Envía la señal de apertura a la barrera (si está configurada). Best-effort.
async function abrirBarrera() {
  const url = (await config('acceso_rele_url', '')).trim();
  if (!url) return 'no_configurada';
  try {
    const ctrl = AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined;
    const r = await fetch(url, { method: 'POST', signal: ctrl });
    return r.ok ? 'abierta' : `error_${r.status}`;
  } catch (e) {
    return 'error';
  }
}

/**
 * Registra un acceso a partir de un pase QR, aplicando el antipassback.
 * - Pase inválido/expirado -> error 'pase'.
 * - Pase ya usado (mismo jti) -> error 'reuso'.
 * - Sujeto inexistente/inactivo -> error 'sujeto'/'inactivo'.
 * - Si está dentro -> registra SALIDA; si está fuera -> registra ENTRADA.
 *   (Nunca dos entradas seguidas: no se puede reingresar sin salir.)
 * Devuelve { direccion, barrera, sujeto }.
 */
export async function registrarAcceso(token, registradoPor = null) {
  let pase;
  try { pase = verificarPase(token); }
  catch { const e = new Error('Pase no válido o expirado'); e.code = 'pase'; throw e; }

  // Antirreuso: el mismo pase (jti) no se acepta dos veces.
  if (pase.jti) {
    const usado = await db.get('SELECT id FROM accesos WHERE jti = ?', [pase.jti]);
    if (usado) { const e = new Error('Este pase ya fue utilizado'); e.code = 'reuso'; throw e; }
  }

  const sujeto = await resolverSujeto(pase.tipo, pase.codigo);
  if (!sujeto) { const e = new Error('Credencial no encontrada'); e.code = 'sujeto'; throw e; }
  if (sujeto.activo === 0) { const e = new Error('Esta credencial está inactiva'); e.code = 'inactivo'; throw e; }

  const dentro = await estaDentro(pase.tipo, sujeto.id);
  const direccion = dentro ? 'salida' : 'entrada';

  // La barrera abre en entrada; en salida solo si está configurado.
  const abrirSalida = (await config('acceso_abrir_en_salida', '1')) === '1';
  const barrera = (direccion === 'entrada' || abrirSalida) ? await abrirBarrera() : 'omitida';

  await db.run(
    `INSERT INTO accesos (tipo_sujeto, sujeto_id, codigo, direccion, jti, barrera, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [pase.tipo, sujeto.id, pase.codigo, direccion, pase.jti || null, barrera, registradoPor]
  );

  return {
    direccion, barrera,
    sujeto: { tipo: pase.tipo, id: sujeto.id, nombre: sujeto.nombre, propiedad: sujeto.propiedad || null },
  };
}

// Dirección sugerida (para mostrar en el escáner antes de confirmar).
export async function estadoSujeto(tipo, codigo) {
  const sujeto = await resolverSujeto(tipo, codigo);
  if (!sujeto) return null;
  const dentro = await estaDentro(tipo, sujeto.id);
  return { tipo, id: sujeto.id, nombre: sujeto.nombre, dentro, sugerido: dentro ? 'salida' : 'entrada' };
}

// Dado un código suelto, determina de qué tipo de sujeto es (para la página pública de credencial).
export async function tipoDeCodigo(codigo) {
  for (const [tipo, t] of Object.entries(TIPOS)) {
    const r = await db.get(`SELECT id FROM ${t.tabla} WHERE codigo = ?`, [codigo]);
    if (r) return tipo;
  }
  return null;
}
