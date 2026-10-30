import { Router } from 'express';
import { query, run, queryOne } from '../../config/db.js';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware.js';

export const observacionesRouter = Router();

/**
 * GET /api/observaciones
 * Listado de observaciones, opcionalmente filtradas por id_inspeccion
 */
observacionesRouter.get('/', authenticateJWT, async (req, res) => {
  const { id_inspeccion } = req.query;

  try {
    let sql = `
      SELECT 
        o.id_observacion,
        o.id_inspeccion,
        o.texto,
        o.fecha_hora,
        u.id_usuario,
        u.nombre_usuario,
        u.apellido,
        r.nombre AS usuario_rol,
        i.angulo AS inspeccion_angulo,
        i.estado AS inspeccion_estado
      FROM OBSERVACION o
      JOIN USUARIO u ON o.id_usuario = u.id_usuario
      JOIN ROL r ON u.id_rol = r.id_rol
      JOIN INSPECCION i ON o.id_inspeccion = i.id_inspeccion
    `;
    const params = [];

    if (id_inspeccion) {
      sql += ` WHERE o.id_inspeccion = ?`;
      params.push(Number(id_inspeccion));
    }

    sql += ` ORDER BY datetime(o.fecha_hora) DESC LIMIT 100;`;

    const records = await query(sql, params);
    res.json({ observaciones: records });
  } catch (err) {
    console.error('[OBSERVACIONES] Error al consultar observaciones:', err);
    res.status(500).json({ error: 'Error al listar las observaciones' });
  }
});

/**
 * POST /api/observaciones
 * CU6 / RNF06: Registrar observación sobre una inspección existente.
 * Inmutable (append-only): no existe endpoint de edición ni eliminación.
 */
observacionesRouter.post('/', authenticateJWT, async (req, res) => {
  const { id_inspeccion, texto } = req.body;
  const user = req.user;

  if (!id_inspeccion || !texto || typeof texto !== 'string' || texto.trim().length === 0) {
    res.status(400).json({ error: 'Parámetros obligatorios: id_inspeccion y texto son requeridos' });
    return;
  }

  try {
    const inspeccion = await queryOne('SELECT id_inspeccion FROM INSPECCION WHERE id_inspeccion = ?;', [Number(id_inspeccion)]);
    if (!inspeccion) {
      res.status(404).json({ error: `La inspección con ID ${id_inspeccion} no existe` });
      return;
    }

    const fechaHora = new Date().toISOString();
    const result = await run(`
      INSERT INTO OBSERVACION (id_inspeccion, id_usuario, texto, fecha_hora)
      VALUES (?, ?, ?, ?);
    `, [Number(id_inspeccion), user.id_usuario, texto.trim(), fechaHora]);

    res.status(201).json({
      message: 'Observación registrada exitosamente',
      observacion: {
        id_observacion: result.lastInsertRowid,
        id_inspeccion: Number(id_inspeccion),
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        apellido: user.apellido,
        usuario_rol: user.rol,
        texto: texto.trim(),
        fecha_hora: fechaHora
      }
    });
  } catch (err) {
    console.error('[OBSERVACIONES] Error al registrar observación:', err);
    res.status(500).json({ error: 'Error al registrar la observación' });
  }
});
