import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Carpeta donde se guardan las imágenes subidas.
export const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Guarda una imagen enviada como data URL (base64) en /uploads/<subcarpeta>.
 * Devuelve la ruta pública (ej. /uploads/incidentes/inc-xxxx.jpg) o null.
 */
export function guardarImagenBase64(dataUrl, subcarpeta = 'incidentes') {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!m) return null;
  const ext = TIPOS[m[1]] || 'jpg';
  const datos = Buffer.from(m[2], 'base64');
  if (datos.length > 6 * 1024 * 1024) return null; // límite 6 MB

  const dir = path.join(UPLOADS_DIR, subcarpeta);
  fs.mkdirSync(dir, { recursive: true });
  const nombre = `inc-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, nombre), datos);
  return `/uploads/${subcarpeta}/${nombre}`;
}
