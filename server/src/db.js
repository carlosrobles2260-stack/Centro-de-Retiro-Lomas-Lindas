// Inicializa el esquema de la base de datos para el motor activo
// (SQLite o PostgreSQL) y expone el acceso a datos.
import db, { client, SQL } from './database.js';

export { client, SQL };

// ----- Tipos según el dialecto -----
// Nota: los DEFAULT con funciones van entre paréntesis (obligatorio en SQLite).
const T = client === 'postgres'
  ? { id: 'SERIAL PRIMARY KEY', ts: 'TIMESTAMPTZ', date: 'DATE', num: 'NUMERIC', ahora: '(now())', hoy: '(CURRENT_DATE)' }
  : { id: 'INTEGER PRIMARY KEY AUTOINCREMENT', ts: 'TEXT', date: 'TEXT', num: 'REAL', ahora: "(datetime('now'))", hoy: "(date('now'))" };

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id          ${T.id},
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'administracion',
  activo      INTEGER NOT NULL DEFAULT 1,
  creado_en   ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS empleados (
  id            ${T.id},
  nombre        TEXT NOT NULL,
  documento     TEXT,
  puesto        TEXT,
  departamento  TEXT,
  telefono      TEXT,
  email         TEXT,
  fecha_ingreso ${T.date},
  salario       ${T.num} DEFAULT 0,
  activo        INTEGER NOT NULL DEFAULT 1,
  usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS turnos (
  id          ${T.id},
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha       ${T.date} NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin    TEXT NOT NULL,
  tipo        TEXT DEFAULT 'diurno',
  notas       TEXT,
  creado_en   ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS propietarios (
  id         ${T.id},
  nombre     TEXT NOT NULL,
  propiedad  TEXT,
  documento  TEXT,
  telefono   TEXT,
  email      TEXT,
  direccion  TEXT,
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS visitantes (
  id             ${T.id},
  nombre         TEXT NOT NULL,
  documento      TEXT,
  telefono       TEXT,
  tipo           TEXT DEFAULT 'invitado',
  propietario_id INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  placa_vehiculo TEXT,
  email          TEXT,
  notas          TEXT,
  codigo         TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS visitas (
  id              ${T.id},
  visitante_id    INTEGER NOT NULL REFERENCES visitantes(id) ON DELETE CASCADE,
  propietario_id  INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  motivo          TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente',
  autorizado_por  TEXT,
  fecha_entrada   ${T.ts},
  fecha_salida    ${T.ts},
  registrado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  notas           TEXT,
  creado_en       ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS incidentes (
  id             ${T.id},
  fecha          ${T.ts} NOT NULL DEFAULT ${T.ahora},
  tipo           TEXT,
  descripcion    TEXT NOT NULL,
  ubicacion      TEXT,
  gravedad       TEXT DEFAULT 'baja',
  estado         TEXT DEFAULT 'abierto',
  reportado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  responsable_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  propietario_id INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  foto           TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS rondas (
  id            ${T.id},
  empleado_id   INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  fecha_hora    ${T.ts} NOT NULL DEFAULT ${T.ahora},
  punto_control TEXT NOT NULL,
  estado        TEXT DEFAULT 'normal',
  observaciones TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id             ${T.id},
  propietario_id INTEGER REFERENCES propietarios(id) ON DELETE SET NULL,
  visita_id      INTEGER REFERENCES visitas(id) ON DELETE SET NULL,
  canal          TEXT DEFAULT 'email',
  destino        TEXT,
  asunto         TEXT,
  mensaje        TEXT NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'pendiente',
  detalle        TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora},
  enviado_en     ${T.ts}
);

CREATE TABLE IF NOT EXISTS facturas (
  id             ${T.id},
  propietario_id INTEGER NOT NULL REFERENCES propietarios(id) ON DELETE CASCADE,
  concepto       TEXT NOT NULL,
  monto          ${T.num} NOT NULL DEFAULT 0,
  fecha_emision  ${T.date} NOT NULL DEFAULT ${T.hoy},
  fecha_vencimiento ${T.date},
  estado         TEXT NOT NULL DEFAULT 'pendiente',
  notas          TEXT,
  creado_en      ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS pagos (
  id         ${T.id},
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  monto      ${T.num} NOT NULL DEFAULT 0,
  fecha      ${T.date} NOT NULL DEFAULT ${T.hoy},
  metodo     TEXT DEFAULT 'efectivo',
  referencia TEXT,
  creado_en  ${T.ts} NOT NULL DEFAULT ${T.ahora}
);

CREATE TABLE IF NOT EXISTS gastos (
  id            ${T.id},
  concepto      TEXT NOT NULL,
  categoria     TEXT DEFAULT 'operativo',
  monto         ${T.num} NOT NULL DEFAULT 0,
  fecha         ${T.date} NOT NULL DEFAULT ${T.hoy},
  proveedor     TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     ${T.ts} NOT NULL DEFAULT ${T.ahora}
);
`;

// Crea el esquema (idempotente).
for (const sentencia of ESQUEMA.split(';')) {
  const s = sentencia.trim();
  if (s) await db.exec(s);
}

// ----- Migración ligera: columna 'codigo' en visitantes (bases antiguas) -----
async function tieneColumna(tabla, columna) {
  if (client === 'postgres') {
    const r = await db.get(
      'SELECT 1 FROM information_schema.columns WHERE table_name = ? AND column_name = ?',
      [tabla, columna]
    );
    return !!r;
  }
  const cols = await db.all(`PRAGMA table_info(${tabla})`);
  return cols.some((c) => c.name === columna);
}

if (!(await tieneColumna('visitantes', 'codigo'))) {
  await db.exec('ALTER TABLE visitantes ADD COLUMN codigo TEXT');
}
if (!(await tieneColumna('visitantes', 'email'))) {
  await db.exec('ALTER TABLE visitantes ADD COLUMN email TEXT');
}
if (!(await tieneColumna('incidentes', 'responsable_id'))) {
  await db.exec('ALTER TABLE incidentes ADD COLUMN responsable_id INTEGER REFERENCES empleados(id)');
}
if (!(await tieneColumna('incidentes', 'foto'))) {
  await db.exec('ALTER TABLE incidentes ADD COLUMN foto TEXT');
}
if (!(await tieneColumna('incidentes', 'propietario_id'))) {
  await db.exec('ALTER TABLE incidentes ADD COLUMN propietario_id INTEGER REFERENCES propietarios(id)');
}
const sinCodigo = await db.all('SELECT id FROM visitantes WHERE codigo IS NULL');
for (const v of sinCodigo) {
  await db.run('UPDATE visitantes SET codigo = ? WHERE id = ?', [generarCodigo(), v.id]);
}

export function generarCodigo() {
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
  return `LL-${hex}`;
}

export default db;
