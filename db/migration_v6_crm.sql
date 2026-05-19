-- ============================================================
-- MIGRATION V6: CRM - Oportunidades
-- ============================================================

CREATE TABLE IF NOT EXISTS oportunidades (
  id SERIAL PRIMARY KEY,
  entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  monto_estimado NUMERIC(12,2) DEFAULT 0,
  probabilidad INTEGER DEFAULT 0 CHECK (probabilidad >= 0 AND probabilidad <= 100),
  etapa VARCHAR(50) NOT NULL DEFAULT 'nuevo',
  fecha_cierre DATE,
  vendedor_entidad_id INTEGER REFERENCES entidades(id) ON DELETE SET NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  activo BOOLEAN DEFAULT true
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_oportunidades_entidad ON oportunidades(entidad_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa ON oportunidades(etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidades_vendedor ON oportunidades(vendedor_entidad_id);

-- Insertar etapas por defecto en configuración si no existen
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('crm_etapas', '["nuevo","calificado","propuesta","negociacion","ganado","perdido"]', 'Etapas del CRM')
ON CONFLICT (clave) DO NOTHING;
