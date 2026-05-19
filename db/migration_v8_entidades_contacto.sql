-- ============================================================
-- MIGRATION V8: Agregar columnas de contacto a entidades
-- ============================================================

-- Agregar columnas de contacto si no existen
DO $$ BEGIN
    ALTER TABLE entidades ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE entidades ADD COLUMN IF NOT EXISTS email VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE entidades ADD COLUMN IF NOT EXISTS contacto_nombre VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
