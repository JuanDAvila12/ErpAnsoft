-- ============================================================
-- Script de inicialización de base de datos - SPI ERP
-- ============================================================

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id              SERIAL PRIMARY KEY,
    clave           VARCHAR(100) NOT NULL UNIQUE,
    valor           TEXT NOT NULL,
    descripcion     VARCHAR(255),
    tipo_dato       VARCHAR(50) DEFAULT 'texto',
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuraciones iniciales
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo_dato) VALUES
    ('empresa_nombre', 'Mi Empresa S.A. de C.V.', 'Nombre legal de la empresa', 'texto'),
    ('empresa_rfc', 'XAXX010101000', 'Registro Federal de Contribuyentes', 'texto'),
    ('moneda_base', 'MXN', 'Moneda base del sistema', 'texto'),
    ('iva_porcentaje', '16', 'Porcentaje de IVA general', 'numero'),
    ('version_sistema', '1.0.0', 'Versión actual del sistema ERP', 'texto')
ON CONFLICT (clave) DO NOTHING;

-- Tabla de ejemplo: catálogo de unidades de medida (SAT)
CREATE TABLE IF NOT EXISTS unidades_medida (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO unidades_medida (clave_sat, nombre, descripcion) VALUES
    ('H87', 'Pieza', 'Pieza o artículo individual'),
    ('KGM', 'Kilogramo', 'Unidad de masa - kilogramo'),
    ('LTR', 'Litro', 'Unidad de volumen - litro'),
    ('MTR', 'Metro', 'Unidad de longitud - metro'),
    ('E48', 'Servicio', 'Unidad de servicio')
ON CONFLICT (clave_sat) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracion_sistema_clave ON configuracion_sistema(clave);
CREATE INDEX IF NOT EXISTS idx_configuracion_sistema_activo ON configuracion_sistema(activo);
CREATE INDEX IF NOT EXISTS idx_unidades_medida_clave_sat ON unidades_medida(clave_sat);
