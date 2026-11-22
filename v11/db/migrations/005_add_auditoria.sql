-- =====================================================================
-- Sistema Web de Monitoreo y Trazabilidad del Trefilado — Aceros AZA
-- Migración 005: Creación de tabla AUDITORIA para registro CRUD (Admin)
-- =====================================================================

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

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON AUDITORIA (fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON AUDITORIA (tabla_afectada, registro_id);
