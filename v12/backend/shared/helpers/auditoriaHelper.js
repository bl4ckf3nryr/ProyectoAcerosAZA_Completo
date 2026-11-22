import { run } from '../../config/db.js';

/**
 * Registra una acción administrativa del CRUD en la tabla AUDITORIA.
 *
 * @param {number|null} usuarioId - ID del usuario Administrador que ejecuta la acción.
 * @param {'CREAR'|'EDITAR'|'DESHABILITAR'} accion - Tipo de acción ejecutada.
 * @param {'USUARIO'|'RECETA'} tablaAfectada - Entidad afectada por la acción.
 * @param {number|null} registroId - ID del registro creado o modificado.
 * @param {string} detalles - Descripción legible de la operación realizada.
 */
export async function registrarAuditoria(usuarioId, accion, tablaAfectada, registroId, detalles) {
  try {
    const accionNorm = String(accion || '').trim().toUpperCase();
    const tablaNorm = String(tablaAfectada || '').trim().toUpperCase();
    const detallesTexto = detalles ? String(detalles) : '';

    await run(
      `INSERT INTO AUDITORIA (usuario_id, accion, tabla_afectada, registro_id, detalles)
       VALUES (?, ?, ?, ?, ?);`,
      [
        usuarioId ? Number(usuarioId) : null,
        accionNorm,
        tablaNorm,
        registroId !== undefined && registroId !== null ? Number(registroId) : null,
        detallesTexto,
      ]
    );
  } catch (err) {
    console.error('[AUDITORIA] Error al registrar evento de auditoría:', err);
  }
}
