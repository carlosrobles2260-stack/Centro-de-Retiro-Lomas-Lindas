import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(__dirname, '..', 'data', 'lomas-lindas.db');

// Asegura que la carpeta de datos exista.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Esquema de la base de datos. Se crea solo si no existe.
db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'administracion', -- admin | seguridad | administracion
  activo      INTEGER NOT NULL DEFAULT 1,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Personal y empleados =====
CREATE TABLE IF NOT EXISTS empleados (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  documento     TEXT,
  puesto        TEXT,
  departamento  TEXT,            -- seguridad | administracion | mantenimiento | cocina | otro
  telefono      TEXT,
  email         TEXT,
  fecha_ingreso TEXT,
  salario       REAL DEFAULT 0,
  activo        INTEGER NOT NULL DEFAULT 1,
  usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS turnos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha       TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin    TEXT NOT NULL,
  tipo        TEXT DEFAULT 'diurno', -- diurno | nocturno | mixto
  notas       TEXT,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Propietarios y gestión de visitas =====
CREATE TABLE IF NOT EXISTS propietarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  propiedad  TEXT,            -- lote / casa / unidad
  documento  TEXT,
  telefono   TEXT,
  email      TEXT,
  direccion  TEXT,
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitantes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  documento      TEXT,
  telefono       TEXT,
  tipo           TEXT DEFAULT 'invitado', -- familiar | invitado | proveedor
  propietario_id INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  placa_vehiculo TEXT,
  notas          TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  visitante_id    INTEGER NOT NULL REFERENCES visitantes(id) ON DELETE CASCADE,
  propietario_id  INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  motivo          TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | autorizada | dentro | finalizada | rechazada
  autorizado_por  TEXT,          -- nombre de quien autoriza (propietario)
  fecha_entrada   TEXT,
  fecha_salida    TEXT,
  registrado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  notas           TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Seguridad: incidentes y rondas =====
CREATE TABLE IF NOT EXISTS incidentes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha          TEXT NOT NULL DEFAULT (datetime('now')),
  tipo           TEXT,           -- acceso | robo | emergencia | daño | otro
  descripcion    TEXT NOT NULL,
  ubicacion      TEXT,
  gravedad       TEXT DEFAULT 'baja', -- baja | media | alta | critica
  estado         TEXT DEFAULT 'abierto', -- abierto | en_proceso | cerrado
  reportado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rondas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id   INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  fecha_hora    TEXT NOT NULL DEFAULT (datetime('now')),
  punto_control TEXT NOT NULL,
  estado        TEXT DEFAULT 'normal', -- normal | novedad
  observaciones TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Administración y finanzas =====
CREATE TABLE IF NOT EXISTS facturas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  propietario_id INTEGER NOT NULL REFERENCES propietarios(id) ON DELETE CASCADE,
  concepto       TEXT NOT NULL,     -- cuota de mantenimiento, servicios, etc.
  monto          REAL NOT NULL DEFAULT 0,
  fecha_emision  TEXT NOT NULL DEFAULT (date('now')),
  fecha_vencimiento TEXT,
  estado         TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | pagada | vencida | anulada
  notas          TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pagos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  monto      REAL NOT NULL DEFAULT 0,
  fecha      TEXT NOT NULL DEFAULT (date('now')),
  metodo     TEXT DEFAULT 'efectivo', -- efectivo | transferencia | tarjeta | cheque
  referencia TEXT,
  creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gastos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  concepto      TEXT NOT NULL,
  categoria     TEXT DEFAULT 'operativo', -- operativo | nomina | mantenimiento | servicios | otro
  monto         REAL NOT NULL DEFAULT 0,
  fecha         TEXT NOT NULL DEFAULT (date('now')),
  proveedor     TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ===== Migraciones ligeras (para bases ya existentes) =====
function tieneColumna(tabla, columna) {
  return db.prepare(`PRAGMA table_info(${tabla})`).all().some((c) => c.name === columna);
}

// Código único por visitante para la credencial / QR.
if (!tieneColumna('visitantes', 'codigo')) {
  db.exec('ALTER TABLE visitantes ADD COLUMN codigo TEXT');
  const sinCodigo = db.prepare('SELECT id FROM visitantes WHERE codigo IS NULL').all();
  const set = db.prepare('UPDATE visitantes SET codigo = ? WHERE id = ?');
  for (const v of sinCodigo) set.run(generarCodigo(), v.id);
}

export function generarCodigo() {
  // Ej: LL-3F9A2C7E
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
  return `LL-${hex}`;
}

export default db;
