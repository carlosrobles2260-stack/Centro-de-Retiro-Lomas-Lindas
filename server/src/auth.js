import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion';

export function firmarToken(usuario, { recordar = false } = {}) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, propietario_id: usuario.propietario_id ?? null },
    JWT_SECRET,
    // "Mantener sesión iniciada": sesión larga (90 días) para no re-escribir la
    // contraseña cada vez (pensado en propietarios mayores). Si no, 12 horas.
    { expiresIn: recordar ? '90d' : '12h' }
  );
}

// ===== Recuperación de contraseña =====
// Huella corta de la contraseña actual: permite invalidar el enlace de
// recuperación en cuanto la contraseña cambie (uso efectivo de una sola vez).
export function huellaPassword(hash) {
  return crypto.createHash('sha256').update(String(hash)).digest('hex').slice(0, 16);
}

// Token de restablecimiento, válido 1 hora, ligado a la contraseña actual.
export function firmarReset(usuario) {
  return jwt.sign({ id: usuario.id, prop: 'reset', h: huellaPassword(usuario.password) }, JWT_SECRET, { expiresIn: '1h' });
}

export function verificarReset(token) {
  const d = jwt.verify(token, JWT_SECRET);
  if (d.prop !== 'reset') throw new Error('Token no válido');
  return d; // { id, h }
}

// Verifica el token JWT del encabezado Authorization: Bearer <token>.
export function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Restringe el acceso a los roles indicados. 'admin' siempre tiene acceso.
export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
    if (req.usuario.rol === 'admin' || roles.includes(req.usuario.rol)) {
      return next();
    }
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  };
}
