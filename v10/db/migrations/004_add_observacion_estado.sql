-- =====================================================================
-- Sistema Web de Monitoreo y Trazabilidad del Trefilado — Aceros AZA
-- Migración 004: Agregar columna estado a la tabla OBSERVACION
-- Valores permitidos: 'pendiente' (por defecto), 'aprobada', 'rechazada'
-- =====================================================================

ALTER TABLE OBSERVACION
ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente'
CHECK(estado IN ('pendiente', 'aprobada', 'rechazada'));
