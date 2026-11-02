import { Router } from 'express';
import { query, queryOne, run } from '../../config/db.js';
import { authenticateJWT, requireRole } from '../../shared/middlewares/auth.middleware.js';

export const recetasRouter = Router();

/**
 * GET /api/recetas
 * Listado de recetas y sus versiones vigentes e históricas
 */
recetasRouter.get('/', authenticateJWT, async (req, res) => {
  const { solo_vigentes } = req.query;

  try {
    let sql = `
      SELECT 
        r.id_receta,
        r.nombre_receta,
        r.limite_minimo,
        r.limite_maximo,
        r.vigente_desde,
        r.vigente_hasta,
        CASE 
          WHEN r.vigente_hasta IS NULL OR datetime('now') <= datetime(r.vigente_hasta) THEN 1 
          ELSE 0 
        END AS es_vigente,
        (SELECT COUNT(*) FROM INSPECCION i WHERE i.id_receta = r.id_receta) AS total_inspecciones
      FROM RECETA r
    `;

    if (solo_vigentes === 'true') {
      sql += ` WHERE r.vigente_hasta IS NULL OR datetime('now') <= datetime(r.vigente_hasta)`;
    }

    sql += ` ORDER BY r.nombre_receta ASC, r.vigente_desde DESC;`;

    const recetas = await query(sql);
    res.json({ recetas });
  } catch (err) {
    console.error('[RECETAS] Error al consultar recetas:', err);
    res.status(500).json({ error: 'Error al listar las recetas' });
  }
});

/**
 * POST /api/recetas
 * CU7: Crear receta o versionar una receta existente
 */
recetasRouter.post('/', authenticateJWT, requireRole('Administrador'), async (req, res) => {
  const { nombre_receta, limite_minimo, limite_maximo, id_receta_anterior } = req.body;

  if (!nombre_receta || limite_minimo === undefined || limite_maximo === undefined) {
    res.status(400).json({ error: 'Debe ingresar nombre_receta, limite_minimo y limite_maximo' });
    return;
  }

  const min = parseFloat(limite_minimo);
  const max = parseFloat(limite_maximo);

  if (isNaN(min) || isNaN(max)) {
    res.status(400).json({ error: 'Los límites mínimo y máximo deben ser valores numéricos' });
    return;
  }

  if (min >= max) {
    res.status(400).json({ 
      error: `Regla de validación infringida: el límite mínimo (${min}°) debe ser estrictamente menor que el límite máximo (${max}°)` 
    });
    return;
  }

  const nowIso = new Date().toISOString();

  try {
    if (id_receta_anterior) {
      const anterior = await queryOne('SELECT id_receta FROM RECETA WHERE id_receta = ?;', [Number(id_receta_anterior)]);
      if (anterior) {
        await run('UPDATE RECETA SET vigente_hasta = ? WHERE id_receta = ? AND vigente_hasta IS NULL;', [nowIso, anterior.id_receta]);
        console.log(`[RECETAS] Vigencia cerrada para versión anterior ID ${anterior.id_receta}`);
      }
    }

    const result = await run(`
      INSERT INTO RECETA (nombre_receta, limite_minimo, limite_maximo, vigente_desde, vigente_hasta)
      VALUES (?, ?, ?, ?, NULL);
    `, [nombre_receta.trim(), min, max, nowIso]);

    res.status(201).json({
      message: 'Receta registrada exitosamente con control de vigencia',
      receta: {
        id_receta: result.lastInsertRowid,
        nombre_receta: nombre_receta.trim(),
        limite_minimo: min,
        limite_maximo: max,
        vigente_desde: nowIso,
        vigente_hasta: null,
        es_vigente: 1
      }
    });
  } catch (err) {
    console.error('[RECETAS] Error al crear receta:', err);
    res.status(500).json({ error: 'Error al registrar la receta en la base de datos' });
  }
});

/**
 * PUT /api/recetas/:id/cerrar-vigencia
 */
recetasRouter.put('/:id/cerrar-vigencia', authenticateJWT, requireRole('Administrador'), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID de receta inválido' });
    return;
  }

  try {
    const receta = await queryOne('SELECT id_receta, nombre_receta FROM RECETA WHERE id_receta = ?;', [id]);
    if (!receta) {
      res.status(404).json({ error: 'Receta no encontrada' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run('UPDATE RECETA SET vigente_hasta = ? WHERE id_receta = ?;', [nowIso, id]);

    res.json({
      message: `Vigencia de la receta "${receta.nombre_receta}" cerrada a partir de ${nowIso}`,
      id_receta: id,
      vigente_hasta: nowIso
    });
  } catch (err) {
    console.error('[RECETAS] Error al cerrar vigencia:', err);
    res.status(500).json({ error: 'Error al cerrar vigencia de la receta' });
  }
});
