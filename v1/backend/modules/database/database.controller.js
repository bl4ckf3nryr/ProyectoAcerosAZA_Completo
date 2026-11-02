import { Router } from 'express';
import { query, queryOne, getDb } from '../../config/db.js';
import { authenticateJWT, requireRole } from '../../shared/middlewares/auth.middleware.js';

export const databaseRouter = Router();

databaseRouter.use(authenticateJWT, requireRole('Administrador'));

/**
 * GET /api/database/tables
 */
databaseRouter.get('/tables', async (_req, res) => {
  try {
    const rawTables = await query(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name ASC;
    `);

    const tablesWithStats = [];
    for (const t of rawTables) {
      const countRes = await queryOne(`SELECT COUNT(*) as total FROM "${t.name}";`);
      tablesWithStats.push({
        name: t.name,
        ddl: t.sql,
        row_count: countRes ? Number(countRes.total) : 0
      });
    }

    const pageCountRes = await queryOne('PRAGMA page_count;');
    const pageSizeRes = await queryOne('PRAGMA page_size;');
    const pageCount = pageCountRes ? Object.values(pageCountRes)[0] : 0;
    const pageSize = pageSizeRes ? Object.values(pageSizeRes)[0] : 4096;
    const approximateSizeBytes = Number(pageCount) * Number(pageSize);

    res.json({
      db_file: 'trefilado.db',
      tables_count: tablesWithStats.length,
      approx_size_bytes: approximateSizeBytes,
      tables: tablesWithStats
    });
  } catch (err) {
    console.error('[DB EXPLORER] Error al listar tablas:', err);
    res.status(500).json({ error: 'Error al consultar catálogo de tablas de SQLite' });
  }
});

/**
 * GET /api/database/schema/:table
 */
databaseRouter.get('/schema/:table', async (req, res) => {
  const tableName = req.params.table.trim();

  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    res.status(400).json({ error: 'Nombre de tabla inválido' });
    return;
  }

  try {
    const columns = await query(`PRAGMA table_info("${tableName}");`);
    const foreignKeys = await query(`PRAGMA foreign_key_list("${tableName}");`);
    const indexes = await query(`PRAGMA index_list("${tableName}");`);
    const countRes = await queryOne(`SELECT COUNT(*) as total FROM "${tableName}";`);

    const detailedIndexes = [];
    for (const idx of indexes) {
      const idxCols = await query(`PRAGMA index_info("${idx.name}");`);
      detailedIndexes.push({
        ...idx,
        columns: idxCols.map(c => c.name)
      });
    }

    res.json({
      table_name: tableName,
      row_count: countRes ? Number(countRes.total) : 0,
      columns: columns.map(c => ({
        cid: c.cid,
        name: c.name,
        type: c.type,
        notnull: Boolean(c.notnull),
        dflt_value: c.dflt_value,
        pk: Boolean(c.pk)
      })),
      foreign_keys: foreignKeys.map(fk => ({
        id: fk.id,
        table: fk.table,
        from: fk.from,
        to: fk.to,
        on_update: fk.on_update,
        on_delete: fk.on_delete
      })),
      indexes: detailedIndexes
    });
  } catch (err) {
    console.error(`[DB EXPLORER] Error al obtener esquema de ${tableName}:`, err);
    res.status(500).json({ error: `Error al obtener esquema de la tabla ${tableName}` });
  }
});

/**
 * GET /api/database/preview/:table
 */
databaseRouter.get('/preview/:table', async (req, res) => {
  const tableName = req.params.table.trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    res.status(400).json({ error: 'Nombre de tabla inválido' });
    return;
  }

  try {
    const countRes = await queryOne(`SELECT COUNT(*) as total FROM "${tableName}";`);
    const total = countRes ? Number(countRes.total) : 0;

    const rows = await query(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?;`, [limit, offset]);

    res.json({
      table_name: tableName,
      total,
      pagina: page,
      limite: limit,
      total_paginas: Math.ceil(total / limit),
      rows
    });
  } catch (err) {
    res.status(500).json({ error: `Error al obtener filas de la tabla ${tableName}` });
  }
});

/**
 * POST /api/database/query
 */
databaseRouter.post('/query', async (req, res) => {
  const { query: rawSql } = req.body;

  if (!rawSql || typeof rawSql !== 'string' || rawSql.trim().length === 0) {
    res.status(400).json({ error: 'Debe ingresar una consulta SQL' });
    return;
  }

  const cleanSql = rawSql.trim();
  const upper = cleanSql.toUpperCase();

  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH') && !upper.startsWith('EXPLAIN')) {
    res.status(403).json({ 
      error: 'Operación denegada por seguridad: Este explorador web solo permite consultas de lectura (SELECT).' 
    });
    return;
  }

  const forbiddenKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 
    'REPLACE', 'ATTACH', 'DETACH', 'VACUUM', 'REINDEX', 'PRAGMA WRITABLE_SCHEMA'
  ];

  for (const kw of forbiddenKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(cleanSql)) {
      res.status(403).json({ 
        error: `Operación prohibida: La consulta contiene la palabra clave restringida "${kw}".` 
      });
      return;
    }
  }

  const statements = cleanSql.split(';').filter(s => s.trim().length > 0);
  if (statements.length > 1) {
    res.status(400).json({ 
      error: 'Solo se permite ejecutar una única sentencia SELECT por solicitud.' 
    });
    return;
  }

  let safeSql = cleanSql.replace(/;+$/, '');
  if (!/LIMIT\s+\d+/i.test(safeSql)) {
    safeSql += ' LIMIT 100';
  }

  try {
    const startTime = performance.now();
    const dbInstance = await getDb();
    const stmt = dbInstance.prepare(safeSql);
    
    const columns = stmt.getColumnNames();
    const rows = [];
    
    let count = 0;
    while (stmt.step() && count < 100) {
      rows.push(stmt.getAsObject());
      count++;
    }
    stmt.free();

    const endTime = performance.now();
    const durationMs = parseFloat((endTime - startTime).toFixed(2));

    res.json({
      sql_ejecutado: safeSql,
      tiempo_ms: durationMs,
      filas_retornadas: rows.length,
      columnas: columns,
      filas: rows
    });
  } catch (err) {
    console.error('[DB EXPLORER] Error al ejecutar consulta:', err);
    res.status(400).json({ 
      error: 'Error de sintaxis o ejecución en SQLite: ' + (err.message || 'Error desconocido') 
    });
  }
});
