import { Router } from 'express';
import { query, queryOne, run } from '../../config/db.js';
import { SERVICE_TOKEN } from '../../shared/middlewares/auth.middleware.js';

export const simuladorRouter = Router();

/**
 * POST /api/simulador/disparar
 */
simuladorRouter.post('/disparar', async (_req, res) => {
  try {
    const lote = await queryOne('SELECT id_lote, correlativo FROM LOTE ORDER BY id_lote DESC LIMIT 1;');
    if (!lote) {
      res.status(400).json({ error: 'No hay lotes registrados para asociar la inspección simulada' });
      return;
    }

    const batches = await query('SELECT id_batch, correlativo FROM BATCH WHERE id_lote = ? ORDER BY id_batch ASC;', [lote.id_lote]);
    const batch = batches.length > 0 ? batches[Math.floor(Math.random() * batches.length)] : null;
    if (!batch) {
      res.status(400).json({ error: 'No hay batches registrados para el lote' });
      return;
    }

    const recetas = await query('SELECT id_receta, nombre_receta, limite_minimo, limite_maximo FROM RECETA WHERE vigente_hasta IS NULL;');
    const tipo = Math.random();

    let idReceta = null;
    let angulo = 0;
    let estado = 'aprobado';
    let recetaUsada = null;

    if (tipo < 0.10 || recetas.length === 0) {
      estado = 'sin receta';
      angulo = parseFloat((11.0 + Math.random() * 4.0).toFixed(2));
      idReceta = null;
    } else {
      recetaUsada = recetas[Math.floor(Math.random() * recetas.length)];
      idReceta = recetaUsada.id_receta;

      if (tipo < 0.25) {
        estado = 'rechazado';
        if (Math.random() < 0.5) {
          angulo = parseFloat((recetaUsada.limite_minimo - 0.2 - Math.random() * 1.5).toFixed(2));
        } else {
          angulo = parseFloat((recetaUsada.limite_maximo + 0.2 + Math.random() * 1.5).toFixed(2));
        }
      } else {
        estado = 'aprobado';
        const min = recetaUsada.limite_minimo;
        const max = recetaUsada.limite_maximo;
        angulo = parseFloat((min + 0.1 + Math.random() * (max - min - 0.2)).toFixed(2));
      }
    }

    const nowIso = new Date().toISOString();
    const result = await run(`
      INSERT INTO INSPECCION (angulo, estado, id_lote, id_batch, id_receta, fecha_hora)
      VALUES (?, ?, ?, ?, ?, ?);
    `, [angulo, estado, lote.id_lote, batch.id_batch, idReceta, nowIso]);

    res.status(201).json({
      message: 'Inspección de prueba simulada exitosamente',
      service_token: SERVICE_TOKEN,
      inspeccion: {
        id_inspeccion: result.lastInsertRowid,
        angulo,
        estado,
        id_lote: lote.id_lote,
        lote_correlativo: lote.correlativo,
        id_batch: batch.id_batch,
        batch_correlativo: batch.correlativo,
        id_receta: idReceta,
        nombre_receta: recetaUsada?.nombre_receta || 'Sin Receta',
        limite_minimo: recetaUsada?.limite_minimo ?? null,
        limite_maximo: recetaUsada?.limite_maximo ?? null,
        fecha_hora: nowIso
      }
    });
  } catch (err) {
    console.error('[SIMULADOR] Error al disparar inspección simulada:', err);
    res.status(500).json({ error: 'Error en el simulador de inspecciones' });
  }
});
