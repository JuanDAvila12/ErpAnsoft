-- ============================================================
-- MIGRACIÓN v9 - Correcciones para flujo de conversión
-- SPI ERP
-- ============================================================
-- 1. Agrega 'convertido' al CHECK de estado en transacciones
-- 2. Asegura que control_folios tenga todos los tipos
-- 3. Asegura que series_documentos tenga todos los registros
-- ============================================================

-- ============================================================
-- BLOQUE 1: Agregar 'convertido' al CHECK de estado
-- ============================================================

ALTER TABLE transacciones
DROP CONSTRAINT IF EXISTS transacciones_estado_check;

ALTER TABLE transacciones
ADD CONSTRAINT transacciones_estado_check
CHECK (estado IN (
    'borrador','pendiente','confirmado','facturado','cancelado','convertido'
));

-- ============================================================
-- BLOQUE 2: Asegurar que control_folios tenga todos los tipos
-- ============================================================

INSERT INTO control_folios (tipo_documento) VALUES
    ('COT'),
    ('OV'),
    ('FAC'),
    ('OC'),
    ('COM'),
    ('COTC'),
    ('RECC'),
    ('TRAS'),
    ('RECT'),
    ('AJU'),
    ('ENT'),
    ('SAL'),
    ('PAG'),
    ('COB')
ON CONFLICT (tipo_documento) DO NOTHING;

-- ============================================================
-- BLOQUE 3: Asegurar que series_documentos tenga registros
-- ============================================================

INSERT INTO series_documentos (tipo, serie, codigo, descripcion, activo) VALUES
    ('cotizacion', 'COT', 'COT', 'Cotizaciones de venta', true),
    ('orden_venta', 'OV', 'OV', 'Órdenes de venta', true),
    ('venta', 'FAC', 'FAC', 'Facturas de venta', true),
    ('orden_compra', 'OC', 'OC', 'Órdenes de compra', true),
    ('compra', 'COM', 'COM', 'Compras', true),
    ('cotizacion_compra', 'COTC', 'COTC', 'Cotizaciones de compra', true),
    ('recepcion_compra', 'RECC', 'RECC', 'Recepciones de compra', true),
    ('traspaso', 'TRAS', 'TRAS', 'Traspasos entre almacenes', true),
    ('recepcion_traspaso', 'RECT', 'RECT', 'Recepciones de traspaso', true)
ON CONFLICT (tipo, serie) DO NOTHING;

-- ============================================================
-- REPORTE DE MIGRACIÓN
-- ============================================================
DO $$
DECLARE
    v_check_actualizado BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'transacciones_estado_check'
        AND check_clause LIKE '%convertido%'
    ) INTO v_check_actualizado;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRACIÓN v9 - Correcciones de Conversión';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CHECK estado actualizado        : %', v_check_actualizado;
    RAISE NOTICE '============================================';
END $$;
