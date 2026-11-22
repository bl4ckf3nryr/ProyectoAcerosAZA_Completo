import { Router } from 'express';
import { query, queryOne } from '../../config/db.js';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware.js';

export const dashboardRouter = Router();

function buildFilterClause(req) {
  const { fecha_desde, fecha_hasta, id_receta, estado, id_turno, id_lote } = req.query;
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
  if (id_lote) {
    conditions.push(`i.id_lote = ?`);
    params.push(Number(id_lote));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

/**
 * GET /api/dashboard/summary
 */
dashboardRouter.get('/summary', authenticateJWT, async (req, res) => {
  try {
    const { where, params } = buildFilterClause(req);

    const statsSql = `
      SELECT 
        COUNT(i.id_inspeccion) AS total,
        SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS total_aprobadas,
        SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS total_rechazadas,
        SUM(CASE WHEN i.estado = 'sin receta' THEN 1 ELSE 0 END) AS total_sin_receta,
        AVG(i.angulo) AS angulo_promedio,
        MIN(i.angulo) AS angulo_minimo,
        MAX(i.angulo) AS angulo_maximo
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      ${where};
    `;

    const stats = await queryOne(statsSql, params);

    const total = stats ? Number(stats.total) : 0;
    const aprobadas = stats ? Number(stats.total_aprobadas || 0) : 0;
    const rechazadas = stats ? Number(stats.total_rechazadas || 0) : 0;
    const sinReceta = stats ? Number(stats.total_sin_receta || 0) : 0;
    const tasaAprobacion = total > 0 ? parseFloat(((aprobadas / total) * 100).toFixed(2)) : 0;
    const tasaRechazo = total > 0 ? parseFloat(((rechazadas / total) * 100).toFixed(2)) : 0;

    const obsSql = `
      SELECT COUNT(o.id_observacion) AS total_observaciones
      FROM OBSERVACION o
      JOIN INSPECCION i ON o.id_inspeccion = i.id_inspeccion
      JOIN LOTE l ON i.id_lote = l.id_lote
      ${where};
    `;
    const obsStats = await queryOne(obsSql, params);

    res.json({
      kpis: {
        total_inspecciones: total,
        total_aprobadas: aprobadas,
        total_rechazadas: rechazadas,
        total_sin_receta: sinReceta,
        tasa_aprobacion: tasaAprobacion,
        tasa_rechazo: tasaRechazo,
        angulo_promedio: stats?.angulo_promedio ? parseFloat(Number(stats.angulo_promedio).toFixed(2)) : 0,
        angulo_minimo: stats?.angulo_minimo ? parseFloat(Number(stats.angulo_minimo).toFixed(2)) : 0,
        angulo_maximo: stats?.angulo_maximo ? parseFloat(Number(stats.angulo_maximo).toFixed(2)) : 0,
        total_observaciones: obsStats ? Number(obsStats.total_observaciones || 0) : 0
      }
    });
  } catch (err) {
    console.error('[DASHBOARD] Error en summary:', err);
    res.status(500).json({ error: 'Error al calcular indicadores del dashboard' });
  }
});

/**
 * GET /api/dashboard/trend
 */
dashboardRouter.get('/trend', authenticateJWT, async (req, res) => {
  try {
    const { where, params } = buildFilterClause(req);

    const sql = `
      SELECT 
        substr(i.fecha_hora, 1, 10) AS fecha,
        COUNT(i.id_inspeccion) AS total,
        ROUND(AVG(i.angulo), 2) AS angulo_promedio,
        ROUND(MIN(i.angulo), 2) AS angulo_min,
        ROUND(MAX(i.angulo), 2) AS angulo_max,
        SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobadas,
        SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazadas,
        SUM(CASE WHEN i.estado = 'sin receta' THEN 1 ELSE 0 END) AS sin_receta
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      ${where}
      GROUP BY substr(i.fecha_hora, 1, 10)
      ORDER BY fecha ASC;
    `;

    const trend = await query(sql, params);
    res.json({ trend });
  } catch (err) {
    console.error('[DASHBOARD] Error en trend:', err);
    res.status(500).json({ error: 'Error al consultar tendencia del dashboard' });
  }
});

/**
 * GET /api/dashboard/by-recipe
 */
dashboardRouter.get('/by-recipe', authenticateJWT, async (req, res) => {
  try {
    const { where, params } = buildFilterClause(req);

    const sql = `
      SELECT 
        COALESCE(r.nombre_receta, 'Sin Receta Asignada') AS receta,
        COALESCE(r.id_receta, 0) AS id_receta,
        r.limite_minimo,
        r.limite_maximo,
        COUNT(i.id_inspeccion) AS total,
        SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobadas,
        SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazadas,
        SUM(CASE WHEN i.estado = 'sin receta' THEN 1 ELSE 0 END) AS sin_receta,
        ROUND(AVG(i.angulo), 2) AS angulo_promedio
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      LEFT JOIN RECETA r ON i.id_receta = r.id_receta
      ${where}
      GROUP BY COALESCE(r.id_receta, 0), r.nombre_receta
      ORDER BY total DESC;
    `;

    const byRecipe = await query(sql, params);
    res.json({ by_recipe: byRecipe });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar distribución por receta' });
  }
});

/**
 * GET /api/dashboard/by-shift
 */
dashboardRouter.get('/by-shift', authenticateJWT, async (req, res) => {
  try {
    const { where, params } = buildFilterClause(req);

    const sql = `
      SELECT 
        t.id_turno,
        t.nombre AS turno,
        COUNT(i.id_inspeccion) AS total,
        SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobadas,
        SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazadas,
        SUM(CASE WHEN i.estado = 'sin receta' THEN 1 ELSE 0 END) AS sin_receta,
        ROUND(AVG(i.angulo), 2) AS angulo_promedio
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      JOIN TURNO t ON l.id_turno = t.id_turno
      ${where}
      GROUP BY t.id_turno, t.nombre
      ORDER BY t.id_turno ASC;
    `;

    const byShift = await query(sql, params);
    res.json({ by_shift: byShift });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar distribución por turno' });
  }
});

/**
 * GET /api/dashboard/histogram
 */
dashboardRouter.get('/histogram', authenticateJWT, async (req, res) => {
  try {
    const { where, params } = buildFilterClause(req);

    const sql = `
      SELECT 
        CAST(round(i.angulo) AS INTEGER) AS rango_angulo,
        COUNT(i.id_inspeccion) AS cantidad,
        SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobadas,
        SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazadas
      FROM INSPECCION i
      JOIN LOTE l ON i.id_lote = l.id_lote
      ${where}
      GROUP BY CAST(round(i.angulo) AS INTEGER)
      ORDER BY rango_angulo ASC;
    `;

    const histogram = await query(sql, params);
    res.json({ histogram });
  } catch (err) {
    res.status(500).json({ error: 'Error al calcular histograma' });
  }
});

/**
 * GET /api/dashboard/drilldown
 */
dashboardRouter.get('/drilldown', authenticateJWT, async (req, res) => {
  const { nivel = 'month', mes, dia } = req.query;
  const { where, params } = buildFilterClause(req);

  try {
    if (nivel === 'month') {
      const sql = `
        SELECT 
          substr(i.fecha_hora, 1, 7) AS periodo,
          COUNT(i.id_inspeccion) AS total,
          SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobadas,
          SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazadas,
          ROUND(AVG(i.angulo), 2) AS angulo_promedio
        FROM INSPECCION i
        JOIN LOTE l ON i.id_lote = l.id_lote
        ${where}
        GROUP BY substr(i.fecha_hora, 1, 7)
        ORDER BY periodo ASC;
      `;
      const data = await query(sql, params);
      res.json({ nivel: 'month', data });
      return;
    }

    if (nivel === 'day' && mes) {
      const extraWhere = where ? `${where} AND substr(i.fecha_hora, 1, 7) = ?` : `WHERE substr(i.fecha_hora, 1, 7) = ?`;
      const sql = `
        SELECT 
          substr(i.fecha_hora, 1, 10) AS periodo,
          COUNT(i.id_inspeccion) AS total,
          SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobadas,
          SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazadas,
          ROUND(AVG(i.angulo), 2) AS angulo_promedio
        FROM INSPECCION i
        JOIN LOTE l ON i.id_lote = l.id_lote
        ${extraWhere}
        GROUP BY substr(i.fecha_hora, 1, 10)
        ORDER BY periodo ASC;
      `;
      const data = await query(sql, [...params, mes]);
      res.json({ nivel: 'day', mes, data });
      return;
    }

    if (nivel === 'inspection' && dia) {
      const extraWhere = where ? `${where} AND substr(i.fecha_hora, 1, 10) = ?` : `WHERE substr(i.fecha_hora, 1, 10) = ?`;
      const sql = `
        SELECT 
          i.id_inspeccion,
          i.angulo,
          i.estado,
          i.fecha_hora,
          l.correlativo AS lote,
          b.correlativo AS batch,
          r.nombre_receta AS receta,
          t.nombre AS turno
        FROM INSPECCION i
        JOIN LOTE l ON i.id_lote = l.id_lote
        JOIN BATCH b ON i.id_batch = b.id_batch
        JOIN TURNO t ON l.id_turno = t.id_turno
        LEFT JOIN RECETA r ON i.id_receta = r.id_receta
        ${extraWhere}
        ORDER BY datetime(i.fecha_hora) DESC
        LIMIT 50;
      `;
      const data = await query(sql, [...params, dia]);
      res.json({ nivel: 'inspection', dia, data });
      return;
    }

    res.status(400).json({ error: 'Parámetros de drill-down inválidos' });
  } catch (err) {
    console.error('[DASHBOARD] Error en drilldown:', err);
    res.status(500).json({ error: 'Error al consultar drilldown' });
  }
});
