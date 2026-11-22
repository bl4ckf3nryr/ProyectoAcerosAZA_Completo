import { Router } from 'express';
import { query } from '../../config/db.js';
import { authenticateJWT, requireRole } from '../../shared/middlewares/auth.middleware.js';

export const auditoriaRouter = Router();

/**
 * Escapa un valor para formato CSV estándar (RFC 4180).
 */
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/admin/auditoria/exportar
 * Genera y descarga el informe de gestión CRUD en formato CSV (solo Administrador).
 */
auditoriaRouter.get('/exportar', authenticateJWT, requireRole('Administrador'), async (_req, res) => {
  try {
    const registros = await query(`
      SELECT
        a.id,
        a.fecha_hora,
        a.accion,
        a.tabla_afectada,
        a.registro_id,
        a.detalles,
        u.nombre_usuario,
        u.apellido
      FROM AUDITORIA a
      LEFT JOIN USUARIO u ON a.usuario_id = u.id_usuario
      ORDER BY a.id DESC;
    `);

    const headers = [
      'ID',
      'Fecha/Hora',
      'Usuario',
      'Acción',
      'Tabla Afectada',
      'ID Registro',
      'Detalles',
    ];

    const lines = [headers.map(escapeCsvCell).join(',')];

    for (const row of registros) {
      const nombreUsuario = row.nombre_usuario
        ? `${row.nombre_usuario}${row.apellido ? ` ${row.apellido}` : ''}`
        : 'Sistema';

      const csvRow = [
        row.id,
        row.fecha_hora,
        nombreUsuario,
        row.accion,
        row.tabla_afectada,
        row.registro_id ?? '',
        row.detalles ?? '',
      ];

      lines.push(csvRow.map(escapeCsvCell).join(','));
    }

    // BOM UTF-8 (\uFEFF) para correcta apertura con tildes en Microsoft Excel
    const csvContent = '\uFEFF' + lines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="auditoria_crud.csv"');
    res.status(200).send(Buffer.from(csvContent, 'utf8'));
  } catch (err) {
    console.error('[AUDITORIA] Error al exportar informe CSV:', err);
    res.status(500).json({ error: 'Error al generar el informe de auditoría en formato CSV' });
  }
});
