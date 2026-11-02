import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { DB_PATH as CONFIG_DB_PATH } from './env.js';

let SQL = null;
let db = null;

const DB_PATH = CONFIG_DB_PATH || path.resolve(process.cwd(), 'db', 'trefilado.db');
const DB_DIR = path.dirname(DB_PATH);
const MIGRATION_PATH = path.resolve(process.cwd(), 'db', 'migrations', '001_init.sql');

export async function getDb() {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('[DB] Error al cargar trefilado.db existente, creando nueva instancia:', err);
      db = new SQL.Database();
      initSchema(db);
      persistDb();
    }
  } else {
    console.log('[DB] Creando nueva base de datos trefilado.db...');
    db = new SQL.Database();
    initSchema(db);
    persistDb();
  }

  // Activar foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Aplicar migraciones adicionales si faltan columnas
  applyMigrations(db);

  return db;
}

function initSchema(database) {
  if (fs.existsSync(MIGRATION_PATH)) {
    const ddl = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    database.run(ddl);
    console.log('[DB] Esquema inicial 001_init.sql ejecutado exitosamente.');
  } else {
    console.warn('[DB] No se encontró el archivo de migración en:', MIGRATION_PATH);
  }
}

function applyMigrations(database) {
  try {
    const tableInfo = database.exec('PRAGMA table_info(USUARIO);');
    if (tableInfo.length > 0 && tableInfo[0].values) {
      const columnNames = tableInfo[0].values.map((col) => col[1]);
      let changed = false;
      if (!columnNames.includes('reset_token')) {
        console.log('[DB] Aplicando migración 002: agregando columna reset_token...');
        database.run('ALTER TABLE USUARIO ADD COLUMN reset_token TEXT;');
        changed = true;
      }
      if (!columnNames.includes('reset_token_expira')) {
        console.log('[DB] Aplicando migración 002: agregando columna reset_token_expira...');
        database.run('ALTER TABLE USUARIO ADD COLUMN reset_token_expira TEXT;');
        changed = true;
      }
      if (changed) {
        persistDb();
        console.log('[DB] Migraciones aplicadas y persistidas exitosamente.');
      }
    }
  } catch (err) {
    console.error('[DB] Error verificando o aplicando migraciones:', err);
  }
}

export function persistDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[DB] Error al persistir trefilado.db en disco:', err);
  }
}

/**
 * Ejecuta una consulta SELECT y retorna un arreglo de objetos.
 */
export async function query(sqlStr, params = []) {
  const database = await getDb();
  const stmt = database.prepare(sqlStr);
  if (params && params.length > 0) {
    stmt.bind(params);
  }

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Ejecuta una consulta SELECT esperando un único resultado (o null).
 */
export async function queryOne(sqlStr, params = []) {
  const results = await query(sqlStr, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Ejecuta una sentencia de modificación (INSERT, UPDATE, DELETE) y persiste automáticamente los cambios.
 */
export async function run(sqlStr, params = []) {
  const database = await getDb();
  
  if (params && params.length > 0) {
    const stmt = database.prepare(sqlStr);
    stmt.run(params);
    stmt.free();
  } else {
    database.run(sqlStr);
  }

  const lastIdRes = database.exec('SELECT last_insert_rowid() as id, changes() as ch');
  let lastInsertRowid = 0;
  let changes = 0;
  if (lastIdRes.length > 0 && lastIdRes[0].values.length > 0) {
    lastInsertRowid = Number(lastIdRes[0].values[0][0]) || 0;
    changes = Number(lastIdRes[0].values[0][1]) || 0;
  }

  persistDb();
  return { lastInsertRowid, changes };
}

/**
 * Ejecuta un bloque completo de sentencias SQL directas.
 */
export async function exec(sqlStr) {
  const database = await getDb();
  database.run(sqlStr);
  persistDb();
}
