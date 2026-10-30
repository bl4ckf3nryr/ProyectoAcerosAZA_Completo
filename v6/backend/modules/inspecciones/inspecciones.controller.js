import { Router } from 'express';
import { query, queryOne, run } from '../../config/db.js';
import { authenticateServiceOrUser, authenticateJWT } from '../../shared/middlewares/auth.middleware.js';

export const inspeccionesRouter = Router();

/**
 * GET /api/inspecciones/ultimo
 * CU3: Vista Operador - Consultar último resultado de inspección
 */
inspeccionesRouter.get('/ultimo', async (_req, res) => {
  try {
    const ultimo = await queryOne(`
      SELECT 
        i.id_inspeccion,
        i.angulo,
        i.estado,
        i.fecha_hora,
        i.id_lote,
        l.correlativo AS lote_correlativo,
        i.id_batch,
        b.correlativo AS batch_correlativo,
        i.id_receta,
        r.nombre_receta,
        r.limite_minimo,
        r.limite_maximo,
        t.nombre AS turno_nombre,
        t.hora_inicio AS turno_inicio,
        t.hora_fin AS turno_fin,
        (SELECT COUNT(*) FROM OBSERVACION o WHERE o.id_inspeccion = i.id_inspeccion) AS total_observaciones
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      JOIN BATCH b ON i.id_batch = b.id_batch
      JOIN TURNO t ON l.id_turno = t.id_turno
      LEFT JOIN RECETA r ON i.id_receta = r.id_receta
      ORDER BY i.id_inspeccion DESC
      LIMIT 1;
    `);

    if (!ultimo) {
      res.json({
        existe: false,
        mensaje: 'Aún no se han registrado inspecciones en la línea de trefilado.',
        inspeccion: null
      });
      return;
    }

    res.json({
      existe: true,
      inspeccion: ultimo
    });
  } catch (err) {
    console.error('[INSPECCIONES] Error al obtener último resultado:', err);
    res.status(500).json({ error: 'Error al consultar el último resultado de inspección' });
  }
});

/**
 * GET /api/inspecciones/meta/filtros
 * Retorna opciones para los filtros de la vista Supervisor
 */
inspeccionesRouter.get('/meta/filtros', async (_req, res) => {
  try {
    const lotes = await query(`SELECT id_lote, correlativo FROM LOTE ORDER BY id_lote DESC;`);
    const recetas = await query(`SELECT id_receta, nombre_receta, limite_minimo, limite_maximo, vigente_hasta FROM RECETA ORDER BY id_receta ASC;`);
    const turnos = await query(`SELECT id_turno, nombre FROM TURNO ORDER BY id_turno ASC;`);
    
    res.json({
      lotes,
      recetas,
      turnos,
      estados: ['aprobado', 'rechazado', 'sin receta']
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener metadatos de filtros' });
  }
});

/**
 * GET /api/inspecciones
 * CU4: Consultar histórico de inspecciones con filtros combinables y paginación
 */
inspeccionesRouter.get('/', authenticateJWT, async (req, res) => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      id_lote,
      id_receta,
      estado,
      id_turno,
      page = '1',
      limit = '20',
      sort_by = 'fecha_hora',
      order = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (fecha_desde) {
      conditions.push(`datetime(i.fecha_hora) >= datetime(?)`);
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      conditions.push(`datetime(i.fecha_hora) <= datetime(?)`);
      params.push(fecha_hasta);
    }
    if (id_lote) {
      conditions.push(`i.id_lote = ?`);
      params.push(Number(id_lote));
    }
    if (id_receta) {
      if (id_receta === 'null' || id_receta === '0') {
        conditions.push(`i.id_receta IS NULL`);
      } else {
        conditions.push(`i.id_receta = ?`);
        params.push(Number(id_receta));
      }
    }
    if (estado) {
      conditions.push(`i.estado = ?`);
      params.push(estado);
    }
    if (id_turno) {
      conditions.push(`l.id_turno = ?`);
      params.push(Number(id_turno));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortFields = {
      fecha_hora: 'datetime(i.fecha_hora)',
      id_inspeccion: 'i.id_inspeccion',
      angulo: 'i.angulo',
      estado: 'i.estado'
    };
    const sortField = allowedSortFields[sort_by] || 'datetime(i.fecha_hora)';
    const sortDir = (order || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countSql = `
      SELECT COUNT(*) as total
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      ${whereClause};
    `;
    const countRes = await queryOne(countSql, params);
    const total = countRes ? countRes.total : 0;

    const dataSql = `
      SELECT 
        i.id_inspeccion,
        i.angulo,
        i.estado,
        i.fecha_hora,
        i.id_lote,
        l.correlativo AS lote_correlativo,
        i.id_batch,
        b.correlativo AS batch_correlativo,
        i.id_receta,
        r.nombre_receta,
        r.limite_minimo,
        r.limite_maximo,
        t.id_turno,
        t.nombre AS turno_nombre,
        (SELECT COUNT(*) FROM OBSERVACION o WHERE o.id_inspeccion = i.id_inspeccion) AS total_observaciones
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      JOIN BATCH b ON i.id_batch = b.id_batch
      JOIN TURNO t ON l.id_turno = t.id_turno
      LEFT JOIN RECETA r ON i.id_receta = r.id_receta
      ${whereClause}
      ORDER BY ${sortField} ${sortDir}, i.id_inspeccion DESC
      LIMIT ? OFFSET ?;
    `;

    const records = await query(dataSql, [...params, limitNum, offset]);

    res.json({
      total,
      pagina: pageNum,
      limite: limitNum,
      total_paginas: Math.ceil(total / limitNum),
      inspecciones: records
    });
  } catch (err) {
    console.error('[INSPECCIONES] Error al listar histórico:', err);
    res.status(500).json({ error: 'Error al consultar histórico de inspecciones' });
  }
});

/**
 * GET /api/inspecciones/:id
 * Detalle de inspección individual con lista de observaciones
 */
inspeccionesRouter.get('/:id', authenticateJWT, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID de inspección inválido' });
    return;
  }

  try {
    const inspeccion = await queryOne(`
      SELECT 
        i.id_inspeccion,
        i.angulo,
        i.estado,
        i.fecha_hora,
        i.id_lote,
        l.correlativo AS lote_correlativo,
        i.id_batch,
        b.correlativo AS batch_correlativo,
        i.id_receta,
        r.nombre_receta,
        r.limite_minimo,
        r.limite_maximo,
        t.nombre AS turno_nombre
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      JOIN BATCH b ON i.id_batch = b.id_batch
      JOIN TURNO t ON l.id_turno = t.id_turno
      LEFT JOIN RECETA r ON i.id_receta = r.id_receta
      WHERE i.id_inspeccion = ?;
    `, [id]);

    if (!inspeccion) {
      res.status(404).json({ error: 'Inspección no encontrada' });
      return;
    }

    const observaciones = await query(`
      SELECT 
        o.id_observacion,
        o.texto,
        o.fecha_hora,
        o.id_usuario,
        u.nombre_usuario,
        u.apellido,
        r.nombre AS usuario_rol
      FROM OBSERVACION o
      JOIN USUARIO u ON o.id_usuario = u.id_usuario
      JOIN ROL r ON u.id_rol = r.id_rol
      WHERE o.id_inspeccion = ?
      ORDER BY datetime(o.fecha_hora) DESC;
    `, [id]);

    res.json({
      inspeccion,
      observaciones
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener detalle de la inspección' });
  }
});

/**
 * POST /api/inspecciones
 * CU2 / RNF05: Registrar inspección vía API (Simulador o máquina con Service Token)
 */
inspeccionesRouter.post('/', authenticateServiceOrUser, async (req, res) => {
  const { angulo, id_lote, id_batch, id_receta, fecha_hora } = req.body;

  if (angulo === undefined || id_lote === undefined || id_batch === undefined) {
    res.status(400).json({ 
      error: 'Parámetros obligatorios faltantes: angulo, id_lote, id_batch son requeridos' 
    });
    return;
  }

  const numAngulo = Number(angulo);
  if (isNaN(numAngulo)) {
    res.status(400).json({ error: 'El valor de ángulo debe ser un número real válido' });
    return;
  }

  const fechaInspeccion = fecha_hora ? new Date(fecha_hora).toISOString() : new Date().toISOString();

  try {
    const lote = await queryOne('SELECT id_lote FROM LOTE WHERE id_lote = ?;', [Number(id_lote)]);
    if (!lote) {
      res.status(400).json({ error: `El lote con ID ${id_lote} no existe en el sistema` });
      return;
    }

    const batch = await queryOne('SELECT id_batch FROM BATCH WHERE id_batch = ? AND id_lote = ?;', [Number(id_batch), Number(id_lote)]);
    if (!batch) {
      res.status(400).json({ error: `El batch con ID ${id_batch} no pertenece al lote ${id_lote}` });
      return;
    }

    let estado = 'sin receta';
    let recetaAplicada = null;

    if (id_receta !== undefined && id_receta !== null) {
      recetaAplicada = await queryOne(`
        SELECT id_receta, nombre_receta, limite_minimo, limite_maximo, vigente_desde, vigente_hasta
        FROM RECETA 
        WHERE id_receta = ?;
      `, [Number(id_receta)]);
    }

    if (!recetaAplicada && id_receta !== null && id_receta !== 0) {
      recetaAplicada = await queryOne(`
        SELECT id_receta, nombre_receta, limite_minimo, limite_maximo, vigente_desde, vigente_hasta
        FROM RECETA
        WHERE datetime(?) >= datetime(vigente_desde)
          AND (vigente_hasta IS NULL OR datetime(?) <= datetime(vigente_hasta))
        ORDER BY id_receta DESC
        LIMIT 1;
      `, [fechaInspeccion, fechaInspeccion]);
    }

    let recetaIdToStore = null;
    if (recetaAplicada) {
      recetaIdToStore = recetaAplicada.id_receta;
      if (numAngulo >= recetaAplicada.limite_minimo && numAngulo <= recetaAplicada.limite_maximo) {
        estado = 'aprobado';
      } else {
        estado = 'rechazado';
      }
    } else {
      estado = 'sin receta';
      recetaIdToStore = null;
    }

    const insertSql = `
      INSERT INTO INSPECCION (angulo, estado, id_lote, id_batch, id_receta, fecha_hora)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const result = await run(insertSql, [
      numAngulo,
      estado,
      Number(id_lote),
      Number(id_batch),
      recetaIdToStore,
      fechaInspeccion
    ]);

    res.status(201).json({
      message: 'Inspección registrada exitosamente',
      inspeccion: {
        id_inspeccion: result.lastInsertRowid,
        angulo: numAngulo,
        estado,
        id_lote: Number(id_lote),
        id_batch: Number(id_batch),
        id_receta: recetaIdToStore,
        fecha_hora: fechaInspeccion,
        receta: recetaAplicada
      }
    });
  } catch (err) {
    console.error('[INSPECCIONES] Error al registrar inspección:', err);
    res.status(500).json({ error: 'Error al registrar la inspección en la base de datos' });
  }
});
