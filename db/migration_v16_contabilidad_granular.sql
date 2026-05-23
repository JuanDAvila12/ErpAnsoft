-- ============================================================
-- MIGRACIÓN v16 - Configuración contable granular para entidades
-- ============================================================
-- 1. Crea la tabla entidad_cuentas_contables
-- 2. Agrega el campo tipo_concepto a transacciones
-- ============================================================

BEGIN;

-- 1. Crear tabla entidad_cuentas_contables
CREATE TABLE IF NOT EXISTS entidad_cuentas_contables (
    id SERIAL PRIMARY KEY,
    entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
    rol_contable VARCHAR(30) NOT NULL CHECK (rol_contable IN (
        'proveedor','anticipo_proveedor','acreedor','anticipo_acreedor',
        'cliente','anticipo_cliente','deudor','anticipo_deudor'
    )),
    cuenta_contable_id INTEGER NOT NULL REFERENCES cuentas_contables(id),
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE(entidad_id, rol_contable)
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_entidad_cuentas_contables_entidad
    ON entidad_cuentas_contables(entidad_id);

-- 2. Agregar campo tipo_concepto a transacciones
ALTER TABLE transacciones
ADD COLUMN IF NOT EXISTS tipo_concepto VARCHAR(20) DEFAULT 'estandar'
CHECK (tipo_concepto IN ('estandar','gasto','deudores'));

COMMIT;
