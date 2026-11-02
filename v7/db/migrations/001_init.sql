-- =====================================================================
-- Sistema Web de Monitoreo y Trazabilidad del Trefilado — Aceros AZA
-- Esquema DDL SQLite (trefilado.db)
-- Equipo: Lancelot Castro, Rodrigo Mancilla
-- =====================================================================

PRAGMA foreign_keys = ON;

-- 1. TABLA ROL (Catálogo de roles del sistema, NO enum)
CREATE TABLE IF NOT EXISTS ROL (
    id_rol INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
);

-- 2. TABLA USUARIO
CREATE TABLE IF NOT EXISTS USUARIO (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    id_rol INTEGER NOT NULL,
    nombre_usuario TEXT NOT NULL UNIQUE,
    rut TEXT NOT NULL UNIQUE,
    apellido TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    habilitado INTEGER NOT NULL DEFAULT 1,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    reset_token TEXT,
    reset_token_expira TEXT,
    FOREIGN KEY (id_rol) REFERENCES ROL(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 3. TABLA RECETA (Versionado por vigencia, nunca se sobrescribe)
CREATE TABLE IF NOT EXISTS RECETA (
    id_receta INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_receta TEXT NOT NULL,
    limite_minimo REAL NOT NULL,
    limite_maximo REAL NOT NULL,
    vigente_desde TEXT NOT NULL,
    vigente_hasta TEXT,
    CHECK (limite_minimo < limite_maximo)
);

-- 4. TABLA TURNO (Sin relación con USUARIO por decisión de diseño explícita)
CREATE TABLE IF NOT EXISTS TURNO (
    id_turno INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL
);

-- 5. TABLA LOTE
CREATE TABLE IF NOT EXISTS LOTE (
    id_lote INTEGER PRIMARY KEY AUTOINCREMENT,
    id_turno INTEGER NOT NULL,
    correlativo TEXT NOT NULL UNIQUE,
    fecha_creacion TEXT NOT NULL,
    FOREIGN KEY (id_turno) REFERENCES TURNO(id_turno) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 6. TABLA BATCH
CREATE TABLE IF NOT EXISTS BATCH (
    id_batch INTEGER PRIMARY KEY AUTOINCREMENT,
    id_lote INTEGER NOT NULL,
    correlativo TEXT NOT NULL UNIQUE,
    FOREIGN KEY (id_lote) REFERENCES LOTE(id_lote) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 7. TABLA INSPECCION (Inmutable: nunca se actualiza ni elimina)
CREATE TABLE IF NOT EXISTS INSPECCION (
    id_inspeccion INTEGER PRIMARY KEY AUTOINCREMENT,
    angulo REAL NOT NULL,
    estado TEXT NOT NULL CHECK(estado IN ('aprobado', 'rechazado', 'sin receta')),
    id_lote INTEGER NOT NULL,
    id_batch INTEGER NOT NULL,
    id_receta INTEGER,
    fecha_hora TEXT NOT NULL,
    FOREIGN KEY (id_lote) REFERENCES LOTE(id_lote) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_batch) REFERENCES BATCH(id_batch) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_receta) REFERENCES RECETA(id_receta) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 8. TABLA OBSERVACION (Solo se agregan, nunca se modifican)
CREATE TABLE IF NOT EXISTS OBSERVACION (
    id_observacion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_inspeccion INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    texto TEXT NOT NULL,
    fecha_hora TEXT NOT NULL,
    FOREIGN KEY (id_inspeccion) REFERENCES INSPECCION(id_inspeccion) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- =====================================================================
-- ÍNDICES REQUERIDOS
-- =====================================================================

-- Índice compuesto (fecha_hora, id_lote) en INSPECCION (optimización de históricos y rangos)
CREATE INDEX IF NOT EXISTS idx_inspeccion_fecha_lote ON INSPECCION (fecha_hora, id_lote);

-- Índice sobre id_receta en INSPECCION (optimización de filtros por receta)
CREATE INDEX IF NOT EXISTS idx_inspeccion_receta ON INSPECCION (id_receta);

-- Índice sobre id_turno en LOTE (optimización de trazabilidad por turno)
CREATE INDEX IF NOT EXISTS idx_lote_turno ON LOTE (id_turno);

-- Índice adicional para optimizar búsqueda de último resultado
CREATE INDEX IF NOT EXISTS idx_inspeccion_fecha_hora ON INSPECCION (fecha_hora DESC);
