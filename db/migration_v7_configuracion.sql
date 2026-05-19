-- ============================================================
-- MIGRATION V7: Módulo de Configuración, Reportes y PDF
-- ============================================================

-- ============================================================
-- 1. NUEVOS PERMISOS
-- ============================================================
INSERT INTO permisos (codigo, descripcion, modulo) VALUES
    ('admin.configurar', 'Acceso a configuración del sistema', 'admin'),
    ('reportes.editar', 'Crear y editar reportes personalizados', 'reportes'),
    ('reportes.ejecutar', 'Ejecutar reportes personalizados', 'reportes'),
    ('pdf.generar', 'Generar PDF de documentos', 'pdf'),
    ('pdf.configurar', 'Configurar plantillas PDF y logo', 'pdf')
ON CONFLICT (codigo) DO NOTHING;

-- Asignar nuevos permisos al rol admin
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'admin'
  AND p.codigo IN ('admin.configurar', 'reportes.editar', 'reportes.ejecutar', 'pdf.generar', 'pdf.configurar')
  AND NOT EXISTS (
    SELECT 1 FROM rol_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

-- ============================================================
-- 2. TABLA: almacenes_formatos
-- ============================================================
CREATE TABLE IF NOT EXISTS almacenes_formatos (
    id              SERIAL PRIMARY KEY,
    almacen_id      INTEGER NOT NULL REFERENCES almacenes(id) ON DELETE CASCADE,
    tipo_documento  VARCHAR(30) NOT NULL,
    tamano_papel    VARCHAR(20) DEFAULT 'carta',
    orientacion     VARCHAR(10) DEFAULT 'vertical' CHECK (orientacion IN ('vertical', 'horizontal')),
    margen_superior DECIMAL(5,2) DEFAULT 2.54,
    margen_inferior DECIMAL(5,2) DEFAULT 2.54,
    margen_izquierdo DECIMAL(5,2) DEFAULT 2.54,
    margen_derecho  DECIMAL(5,2) DEFAULT 2.54,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(almacen_id, tipo_documento)
);

-- ============================================================
-- 3. AGREGAR almacen_id A control_folios
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'control_folios' AND column_name = 'almacen_id'
    ) THEN
        ALTER TABLE control_folios ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
        -- Eliminar PK existente y recrear con almacen_id
        ALTER TABLE control_folios DROP CONSTRAINT IF EXISTS control_folios_pkey;
        ALTER TABLE control_folios ADD PRIMARY KEY (tipo_documento, almacen_id);
    END IF;
END $$;

-- ============================================================
-- 4. TABLA: reportes_configuracion
-- ============================================================
CREATE TABLE IF NOT EXISTS reportes_configuracion (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    modulo          VARCHAR(50) NOT NULL DEFAULT 'general',
    consulta_sql    TEXT NOT NULL,
    parametros      JSONB DEFAULT '[]'::jsonb,
    columnas        JSONB DEFAULT '[]'::jsonb,
    activo          BOOLEAN DEFAULT TRUE,
    created_by      INTEGER REFERENCES usuarios(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. TABLA: empresa_configuracion (datos fiscales extendidos)
-- ============================================================
CREATE TABLE IF NOT EXISTS empresa_configuracion (
    id                  SERIAL PRIMARY KEY,
    razon_social        VARCHAR(255),
    nombre_comercial    VARCHAR(255),
    rfc                 VARCHAR(13),
    regimen_fiscal      VARCHAR(10) DEFAULT '601',
    direccion           TEXT,
    cp                  VARCHAR(5),
    telefono            VARCHAR(30),
    email               VARCHAR(255),
    lugar_expedicion    VARCHAR(5),
    logo_url            TEXT,
    certificado_cer     TEXT,
    certificado_key     TEXT,
    certificado_password VARCHAR(255),
    pie_pagina          TEXT,
    terminos_legales    TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar registro por defecto si no existe
INSERT INTO empresa_configuracion (razon_social, rfc, regimen_fiscal)
SELECT 'Mi Empresa S.A. de C.V.', 'XAXX010101000', '601'
WHERE NOT EXISTS (SELECT 1 FROM empresa_configuracion);

-- ============================================================
-- 6. ACTUALIZAR FUNCIÓN obtener_folio PARA SOPORTAR almacen_id
-- ============================================================
CREATE OR REPLACE FUNCTION obtener_folio(
    tipo_doc VARCHAR,
    p_almacen_id INTEGER DEFAULT NULL
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_folio     VARCHAR(20);
    v_hoy       DATE := CURRENT_DATE;
    v_ultimo    INTEGER;
    v_serie     VARCHAR(5);
    v_fecha_actual DATE;
    v_almacen_id INTEGER;
BEGIN
    v_almacen_id := COALESCE(p_almacen_id, 0);

    -- Intentar obtener el registro existente
    SELECT ultimo_numero, fecha_actual INTO v_ultimo, v_fecha_actual
    FROM control_folios
    WHERE tipo_documento = tipo_doc AND (almacen_id = v_almacen_id OR (almacen_id IS NULL AND v_almacen_id = 0))
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO control_folios (tipo_documento, ultimo_numero, fecha_actual, almacen_id)
        VALUES (tipo_doc, 0, CURRENT_DATE, CASE WHEN v_almacen_id = 0 THEN NULL ELSE v_almacen_id END)
        RETURNING ultimo_numero, fecha_actual INTO v_ultimo, v_fecha_actual;
    END IF;

    IF v_fecha_actual <> CURRENT_DATE THEN
        v_ultimo := 0;
    END IF;

    v_ultimo := v_ultimo + 1;

    UPDATE control_folios
    SET ultimo_numero = v_ultimo, fecha_actual = CURRENT_DATE
    WHERE tipo_documento = tipo_doc
      AND (almacen_id = v_almacen_id OR (almacen_id IS NULL AND v_almacen_id = 0));

    -- Obtener serie
    SELECT COALESCE(
        (SELECT serie FROM series_documentos
         WHERE CASE
             WHEN tipo_doc = 'COT' THEN tipo = 'cotizacion'
             WHEN tipo_doc = 'OV' THEN tipo = 'orden_venta'
             WHEN tipo_doc = 'FAC' THEN tipo = 'venta'
             WHEN tipo_doc = 'OC' THEN tipo = 'orden_compra'
             WHEN tipo_doc = 'COM' THEN tipo = 'compra'
             WHEN tipo_doc = 'COTC' THEN tipo = 'cotizacion_compra'
             WHEN tipo_doc = 'RECC' THEN tipo = 'recepcion_compra'
             WHEN tipo_doc = 'TRAS' THEN tipo = 'traspaso'
             WHEN tipo_doc = 'RECT' THEN tipo = 'recepcion_traspaso'
             WHEN tipo_doc = 'AJU' THEN tipo = 'ajuste'
             WHEN tipo_doc = 'ENT' THEN tipo = 'entrada'
             WHEN tipo_doc = 'SAL' THEN tipo = 'salida'
             WHEN tipo_doc = 'PAG' THEN tipo = 'pago'
             WHEN tipo_doc = 'COB' THEN tipo = 'cobro'
             ELSE false END
         AND activo = true LIMIT 1),
        tipo_doc
    ) INTO v_serie;

    v_folio := v_serie || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
               LPAD(v_ultimo::TEXT, 4, '0');
    RETURN v_folio;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. DATOS DEMO: Proveedores con roles
-- ============================================================
INSERT INTO entidades (razon_social, nombre_comercial, rfc, regimen_fiscal, email, telefono, direccion, cp)
SELECT 'Proveedor Demo 1', 'Demo Proveedor', 'PROV010101XXX', '601', 'proveedor1@demo.com', '5551234567', 'Av. Proveedores #100', '10000'
WHERE NOT EXISTS (SELECT 1 FROM entidades WHERE rfc = 'PROV010101XXX');

INSERT INTO entidad_roles (entidad_id, rol)
SELECT id, 'proveedor'::entidad_rol_enum FROM entidades WHERE rfc = 'PROV010101XXX'
ON CONFLICT (entidad_id, rol) DO NOTHING;

INSERT INTO entidades (razon_social, nombre_comercial, rfc, regimen_fiscal, email, telefono, direccion, cp)
SELECT 'Proveedor Demo 2', 'Suministros SA', 'SUM020202XXX', '601', 'suministros@demo.com', '5559876543', 'Blvd. Suministros #200', '20000'
WHERE NOT EXISTS (SELECT 1 FROM entidades WHERE rfc = 'SUM020202XXX');

INSERT INTO entidad_roles (entidad_id, rol)
SELECT id, 'proveedor'::entidad_rol_enum FROM entidades WHERE rfc = 'SUM020202XXX'
ON CONFLICT (entidad_id, rol) DO NOTHING;

-- ============================================================
-- 8. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_control_folios_almacen ON control_folios(almacen_id);
CREATE INDEX IF NOT EXISTS idx_almacenes_formatos_almacen ON almacenes_formatos(almacen_id);
CREATE INDEX IF NOT EXISTS idx_reportes_config_modulo ON reportes_configuracion(modulo);
CREATE INDEX IF NOT EXISTS idx_reportes_config_activo ON reportes_configuracion(activo);
