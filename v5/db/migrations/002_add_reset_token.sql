-- =====================================================================
-- Sistema Web de Monitoreo y Trazabilidad del Trefilado — Aceros AZA
-- Migración 002: Agregar columnas para recuperación de contraseña
-- =====================================================================

ALTER TABLE USUARIO ADD COLUMN reset_token TEXT;
ALTER TABLE USUARIO ADD COLUMN reset_token_expira TEXT;
