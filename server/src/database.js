import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Selección del motor: PostgreSQL si hay DATABASE_URL o DB_CLIENT=postgres; si no, SQLite.
export const client =
  process.env.DB_CLIENT === 'postgres' || process.env.DATABASE_URL ? 'postgres' : 'sqlite';

// ===== Ayudantes de dialecto SQL (diferencias entre SQLite y Postgres) =====
export const SQL = {
  // Fecha/hora actual y fecha actual.
  AHORA: client === 'postgres' ? 'now()' : "datetime('now')",
  HOY: client === 'postgres' ? 'CURRENT_DATE' : "date('now')",
  // Extraer la parte de fecha de una columna.
  dia: (col) => (client === 'postgres' ? `(${col})::date` : `date(${col})`),
  // Año-mes 'YYYY-MM' de una columna.
  anioMes: (col) =>
    client === 'postgres' ? `to_char(${col}, 'YYYY-MM')` : `strftime('%Y-%m', ${col})`,
};

// ===== Implementación según el motor =====
let impl;

if (client === 'postgres') {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.PGHOST || 'localhost',
          port: Number(process.env.PGPORT) || 5432,
          user: process.env.PGUSER || 'lomas',
          password: process.env.PGPASSWORD || 'lomas',
          database: process.env.PGDATABASE || 'lomaslindas',
        }
  );

  // Convierte los marcadores '?' al formato $1, $2... de Postgres.
  const aPg = (sql) => {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  };
  // Añade RETURNING * a los INSERT para obtener el id generado cuando exista.
  // Usamos * (no "id") porque algunas tablas (p. ej. configuracion) se
  // identifican por otra clave y no tienen columna id; con "id" fallaría.
  const conReturning = (sql) =>
    /^\s*insert/i.test(sql) && !/returning/i.test(sql) ? `${sql} RETURNING *` : sql;

  async function ejecutar(ejecutor, sql, params) {
    const esInsert = /^\s*insert/i.test(sql);
    const res = await ejecutor.query(aPg(conReturning(sql)), params);
    return {
      rows: res.rows,
      lastID: esInsert && res.rows[0] ? res.rows[0].id : undefined,
      changes: res.rowCount,
    };
  }

  impl = {
    all: async (sql, params = []) => (await ejecutar(pool, sql, params)).rows,
    get: async (sql, params = []) => (await ejecutar(pool, sql, params)).rows[0] || undefined,
    run: async (sql, params = []) => {
      const r = await ejecutar(pool, sql, params);
      return { lastID: r.lastID, changes: r.changes };
    },
    tx: async (fn) => {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        const q = {
          all: async (sql, params = []) => (await ejecutar(cliente, sql, params)).rows,
          get: async (sql, params = []) => (await ejecutar(cliente, sql, params)).rows[0] || undefined,
          run: async (sql, params = []) => {
            const r = await ejecutar(cliente, sql, params);
            return { lastID: r.lastID, changes: r.changes };
          },
        };
        const resultado = await fn(q);
        await cliente.query('COMMIT');
        return resultado;
      } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
      } finally {
        cliente.release();
      }
    },
    exec: async (sql) => { await pool.query(sql); },
  };
} else {
  const { default: Database } = await import('better-sqlite3');
  const dbPath = process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(__dirname, '..', 'data', 'lomas-lindas.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const q = {
    all: async (sql, params = []) => sqlite.prepare(sql).all(...params),
    get: async (sql, params = []) => sqlite.prepare(sql).get(...params),
    run: async (sql, params = []) => {
      const info = sqlite.prepare(sql).run(...params);
      return { lastID: info.lastInsertRowid, changes: info.changes };
    },
  };
  impl = {
    ...q,
    // Transacción manual: better-sqlite3 es síncrono, así que los await
    // entre sentencias se resuelven de inmediato (proceso de un solo hilo).
    tx: async (fn) => {
      sqlite.prepare('BEGIN').run();
      try {
        const resultado = await fn(q);
        sqlite.prepare('COMMIT').run();
        return resultado;
      } catch (e) {
        sqlite.prepare('ROLLBACK').run();
        throw e;
      }
    },
    exec: async (sql) => sqlite.exec(sql),
  };
}

export const db = impl;
export default db;
