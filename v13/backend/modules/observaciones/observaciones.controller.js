import { Router } from 'express';
import { query, run, queryOne } from '../../config/db.js';
import { authenticateJWT, requireRole } from '../../shared/middlewares/auth.middleware.js';

export const observacionesRouter = Router();

const ESTADOS_VALIDOS = ['pendiente', 'aprobada', 'rechazada'];
const ESTADOS_RESOLUCION = ['aprobada', 'rechazada'];

/**
 * GET /api/observaciones
 * Listado de observaciones, opcionalmente filtradas por id_inspeccion y/o estado
 */
observacionesRouter.get('/', authenticateJWT, async (req, res) => {
  const { id_inspeccion, estado } = req.query;

  try {
    let sql = `
      SELECT 
        o.id_observacion,
        o.id_inspeccion,
        o.texto,
        o.fecha_hora,
        COALESCE(o.estado, 'pendiente') AS estado,
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
    const conditions = [];
    const params = [];

    if (id_inspeccion) {
      conditions.push('o.id_inspeccion = ?');
      params.push(Number(id_inspeccion));
    }

    if (estado && ESTADOS_VALIDOS.includes(String(estado).toLowerCase())) {
      conditions.push("COALESCE(o.estado, 'pendiente') = ?");
      params.push(String(estado).toLowerCase());
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY datetime(o.fecha_hora) DESC, o.id_observacion DESC LIMIT 200;`;

    const records = await query(sql, params);
    res.json({ observaciones: records });
  } catch (err) {
    console.error('[OBSERVACIONES] Error al consultar observaciones:', err);
    res.status(500).json({ error: 'Error al listar las observaciones' });
  }
});

/**
 * GET /api/observaciones/por-inspeccion/:id_inspeccion
 * Devuelve todas las observaciones asociadas a una inspección específica (usado en Vista Operador).
 */
observacionesRouter.get('/por-inspeccion/:id_inspeccion', authenticateJWT, async (req, res) => {
  const idInspeccion = Number(req.params.id_inspeccion);

  if (!Number.isInteger(idInspeccion) || idInspeccion <= 0) {
    res.status(400).json({ error: 'El parámetro id_inspeccion debe ser un número entero positivo' });
    return;
  }

  try {
    const records = await query(`
      SELECT 
        o.id_observacion,
        o.id_inspeccion,
        o.texto,
        o.fecha_hora,
        COALESCE(o.estado, 'pendiente') AS estado,
        u.id_usuario,
        u.nombre_usuario,
        u.apellido,
        r.nombre AS usuario_rol
      FROM OBSERVACION o
      JOIN USUARIO u ON o.id_usuario = u.id_usuario
      JOIN ROL r ON u.id_rol = r.id_rol
      WHERE o.id_inspeccion = ?
      ORDER BY datetime(o.fecha_hora) DESC, o.id_observacion DESC;
    `, [idInspeccion]);

    res.json({
      id_inspeccion: idInspeccion,
      total: records.length,
      observaciones: records
    });
  } catch (err) {
    console.error('[OBSERVACIONES] Error al consultar observaciones por inspección:', err);
    res.status(500).json({ error: 'Error al consultar las observaciones de la inspección' });
  }
});

/**
 * POST /api/observaciones
 * Registrar observación sobre una inspección existente (estado inicial: 'pendiente').
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
    const estadoInicial = 'pendiente';
    const result = await run(`
      INSERT INTO OBSERVACION (id_inspeccion, id_usuario, texto, fecha_hora, estado)
      VALUES (?, ?, ?, ?, ?);
    `, [Number(id_inspeccion), user.id_usuario, texto.trim(), fechaHora, estadoInicial]);

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
        fecha_hora: fechaHora,
        estado: estadoInicial
      }
    });
  } catch (err) {
    console.error('[OBSERVACIONES] Error al registrar observación:', err);
    res.status(500).json({ error: 'Error al registrar la observación' });
  }
});

/**
 * PUT /api/observaciones/:id/estado
 * Actualiza el estado de aprobación de una observación ('aprobada' | 'rechazada').
 * Solo accesible para Supervisor o Administrador.
 */
observacionesRouter.put(
  '/:id/estado',
  authenticateJWT,
  requireRole('Supervisor', 'Administrador'),
  async (req, res) => {
    const idObservacion = Number(req.params.id);
    const { estado } = req.body || {};

    if (!Number.isInteger(idObservacion) || idObservacion <= 0) {
      res.status(400).json({ error: 'ID de observación inválido' });
      return;
    }

    const estadoNormalizado = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
    if (!ESTADOS_RESOLUCION.includes(estadoNormalizado)) {
      res.status(400).json({
        error: "Estado inválido. Los valores permitidos son 'aprobada' o 'rechazada'."
      });
      return;
    }

    try {
      const existente = await queryOne(
        'SELECT id_observacion, estado FROM OBSERVACION WHERE id_observacion = ?;',
        [idObservacion]
      );

      if (!existente) {
        res.status(404).json({ error: `La observación #${idObservacion} no existe` });
        return;
      }

      await run(
        'UPDATE OBSERVACION SET estado = ? WHERE id_observacion = ?;',
        [estadoNormalizado, idObservacion]
      );

      const actualizada = await queryOne(`
        SELECT 
          o.id_observacion,
          o.id_inspeccion,
          o.texto,
          o.fecha_hora,
          COALESCE(o.estado, 'pendiente') AS estado,
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
        WHERE o.id_observacion = ?;
      `, [idObservacion]);

      res.json({
        message: `Observación #${idObservacion} marcada como ${estadoNormalizado}`,
        observacion: actualizada
      });
    } catch (err) {
      console.error('[OBSERVACIONES] Error al actualizar estado de observación:', err);
      res.status(500).json({ error: 'Error al actualizar el estado de la observación' });
    }
  }
);
