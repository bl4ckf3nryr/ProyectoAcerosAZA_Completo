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
    let changed = false;

    const userTableInfo = database.exec('PRAGMA table_info(USUARIO);');
    if (userTableInfo.length > 0 && userTableInfo[0].values) {
      const userCols = userTableInfo[0].values.map((col) => col[1]);
      if (!userCols.includes('reset_token')) {
        console.log('[DB] Aplicando migración 002: agregando columna reset_token...');
        database.run('ALTER TABLE USUARIO ADD COLUMN reset_token TEXT;');
        changed = true;
      }
      if (!userCols.includes('reset_token_expira')) {
        console.log('[DB] Aplicando migración 002: agregando columna reset_token_expira...');
        database.run('ALTER TABLE USUARIO ADD COLUMN reset_token_expira TEXT;');
        changed = true;
      }
    }

    const obsTableInfo = database.exec('PRAGMA table_info(OBSERVACION);');
    if (obsTableInfo.length > 0 && obsTableInfo[0].values) {
      const obsCols = obsTableInfo[0].values.map((col) => col[1]);
      if (!obsCols.includes('estado')) {
        console.log('[DB] Aplicando migración 004: agregando columna estado a OBSERVACION...');
        database.run("ALTER TABLE OBSERVACION ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'aprobada', 'rechazada'));");
        database.run("UPDATE OBSERVACION SET estado = 'pendiente' WHERE estado IS NULL;");
        changed = true;
      }
    }

    const auditoriaTableExists = database.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='AUDITORIA';"
    );
    if (auditoriaTableExists.length === 0 || auditoriaTableExists[0].values.length === 0) {
      console.log('[DB] Aplicando migración 005: creando tabla AUDITORIA...');
      database.run(`
        CREATE TABLE IF NOT EXISTS AUDITORIA (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER,
          accion TEXT NOT NULL CHECK(accion IN ('CREAR', 'EDITAR', 'DESHABILITAR')),
          tabla_afectada TEXT NOT NULL CHECK(tabla_afectada IN ('USUARIO', 'RECETA')),
          registro_id INTEGER,
          detalles TEXT,
          fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES USUARIO(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL
        );
      `);
      database.run('CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON AUDITORIA (fecha_hora DESC);');
      database.run('CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON AUDITORIA (tabla_afectada, registro_id);');
      changed = true;
    }

    if (changed) {
      persistDb();
      console.log('[DB] Migraciones aplicadas y persistidas exitosamente.');
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
