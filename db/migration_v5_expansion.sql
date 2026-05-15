-- ============================================================
-- MIGRACIÓN v5 - Expansión Compras/Inventarios
-- SPI ERP
-- ============================================================
-- Nuevos tipos de transacción, catálogos maestros funcionales,
-- reportes y endpoints para el módulo de compras e inventarios.
-- ============================================================

BEGIN;

-- ============================================================
-- BLOQUE 1: NUEVOS TIPOS DE TRANSACCIÓN
-- ============================================================

-- 1.1 Ampliar el CHECK de transacciones.tipo
ALTER TABLE transacciones
DROP CONSTRAINT IF EXISTS transacciones_tipo_check;

ALTER TABLE transacciones
ADD CONSTRAINT transacciones_tipo_check
CHECK (tipo IN (
    'cotizacion','orden_venta','venta',
    'orden_compra','compra',
    'ajuste_inventario','entrada_inventario','salida_inventario',
    'pago','cobro',
    'cotizacion_compra','recepcion_compra','traspaso','recepcion_traspaso'
));

-- 1.2 Insertar en control_folios los nuevos tipos
INSERT INTO control_folios (tipo_documento) VALUES
    ('COTC'),
    ('RECC'),
    ('TRAS'),
    ('RECT')
ON CONFLICT (tipo_documento) DO NOTHING;

-- 1.3 Añadir en series_documentos las series correspondientes
INSERT INTO series_documentos (tipo, codigo, descripcion, activo) VALUES
    ('cotizacion_compra', 'COTC', 'Cotizaciones de compra', true),
    ('recepcion_compra', 'RECC', 'Recepciones de compra', true),
    ('traspaso', 'TRAS', 'Traspasos entre almacenes', true),
    ('recepcion_traspaso', 'RECT', 'Recepciones de traspaso', true)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- BLOQUE 2: MEJORAS A TABLAS EXISTENTES
-- ============================================================

-- 2.1 Añadir columnas faltantes a articulos (migration_v3 las tiene pero verificar)
DO $$
BEGIN
    -- Añadir codigo_barras si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articulos' AND column_name = 'codigo_barras') THEN
        ALTER TABLE articulos ADD COLUMN codigo_barras VARCHAR(50);
    END IF;
    -- Añadir usa_serie si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articulos' AND column_name = 'usa_serie') THEN
        ALTER TABLE articulos ADD COLUMN usa_serie BOOLEAN DEFAULT FALSE;
    END IF;
    -- Añadir imagen_url si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articulos' AND column_name = 'imagen_url') THEN
        ALTER TABLE articulos ADD COLUMN imagen_url TEXT;
    END IF;
END $$;

-- 2.2 Añadir email y telefono a entidades si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entidades' AND column_name = 'email') THEN
        ALTER TABLE entidades ADD COLUMN email VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entidades' AND column_name = 'telefono') THEN
        ALTER TABLE entidades ADD COLUMN telefono VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entidades' AND column_name = 'contacto_nombre') THEN
        ALTER TABLE entidades ADD COLUMN contacto_nombre VARCHAR(255);
    END IF;
END $$;

-- ============================================================
-- BLOQUE 3: VISTAS DE REPORTES
-- ============================================================

-- 3.1 Vista: Stock actual por artículo y almacén
CREATE OR REPLACE VIEW v_stock_actual AS
SELECT
    a.id AS articulo_id,
    a.sku,
    a.nombre AS articulo_nombre,
    a.costo_promedio,
    a.precio_venta,
    al.id AS almacen_id,
    al.nombre AS almacen_nombre,
    COALESCE(SUM(CASE WHEN td.tipo_movimiento = 'entrada' THEN td.cantidad ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN td.tipo_movimiento = 'salida' THEN td.cantidad ELSE 0 END), 0) AS cantidad_disponible
FROM articulos a
CROSS JOIN almacenes al
LEFT JOIN transacciones_detalle td ON td.articulo_id = a.id AND td.almacen_id = al.id
LEFT JOIN transacciones t ON t.id = td.transaccion_id AND t.estado NOT IN ('cancelado')
WHERE a.activo IS NOT FALSE AND al.activo IS NOT FALSE
GROUP BY a.id, a.sku, a.nombre, a.costo_promedio, a.precio_venta, al.id, al.nombre;

-- 3.2 Vista: Movimientos de inventario detallados
CREATE OR REPLACE VIEW v_movimientos_inventario AS
SELECT
    td.id AS movimiento_id,
    td.transaccion_id,
    t.folio,
    t.tipo AS transaccion_tipo,
    t.fecha AS transaccion_fecha,
    td.articulo_id,
    a.sku,
    a.nombre AS articulo_nombre,
    td.cantidad,
    td.precio_unitario,
    td.subtotal,
    td.tipo_movimiento,
    td.almacen_id,
    al.nombre AS almacen_nombre,
    t.estado AS transaccion_estado,
    COALESCE(
        (SELECT json_agg(json_build_object('numero_serie', ts.numero_serie, 'estado', ts.estado))
         FROM transacciones_series ts WHERE ts.transaccion_detalle_id = td.id),
        '[]'::json
    ) AS series
FROM transacciones_detalle td
JOIN transacciones t ON t.id = td.transaccion_id AND t.estado NOT IN ('cancelado')
JOIN articulos a ON a.id = td.articulo_id
LEFT JOIN almacenes al ON al.id = td.almacen_id;

-- ============================================================
-- BLOQUE 4: FUNCIÓN PARA REPORTES DE COMPRAS
-- ============================================================

-- 4.1 Función: Compras por artículo (agrupado)
CREATE OR REPLACE FUNCTION fn_compras_por_articulo(
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL,
    p_articulo_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
    articulo_id INTEGER,
    sku VARCHAR,
    articulo_nombre VARCHAR,
    cantidad_total DECIMAL,
    monto_total DECIMAL,
    precio_promedio DECIMAL,
    num_transacciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        td.articulo_id,
        a.sku,
        a.nombre::VARCHAR,
        SUM(td.cantidad) AS cantidad_total,
        SUM(td.subtotal) AS monto_total,
        CASE WHEN SUM(td.cantidad) > 0 THEN SUM(td.subtotal) / SUM(td.cantidad) ELSE 0 END AS precio_promedio,
        COUNT(DISTINCT td.transaccion_id) AS num_transacciones
    FROM transacciones_detalle td
    JOIN transacciones t ON t.id = td.transaccion_id AND t.estado NOT IN ('cancelado')
    JOIN articulos a ON a.id = td.articulo_id
    WHERE t.tipo IN ('compra', 'recepcion_compra')
      AND (p_fecha_desde IS NULL OR t.fecha >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR t.fecha <= p_fecha_hasta)
      AND (p_articulo_id IS NULL OR td.articulo_id = p_articulo_id)
    GROUP BY td.articulo_id, a.sku, a.nombre
    ORDER BY monto_total DESC;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Función: Compras por proveedor (agrupado)
CREATE OR REPLACE FUNCTION fn_compras_por_proveedor(
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL,
    p_proveedor_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
    proveedor_id INTEGER,
    razon_social VARCHAR,
    rfc VARCHAR,
    monto_total DECIMAL,
    num_compras BIGINT,
    num_articulos DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.entidad_proveedor_id,
        e.razon_social::VARCHAR,
        e.rfc::VARCHAR,
        SUM(t.total) AS monto_total,
        COUNT(DISTINCT t.id) AS num_compras,
        COALESCE(SUM(td.cantidad), 0) AS num_articulos
    FROM transacciones t
    JOIN entidades e ON e.id = t.entidad_proveedor_id
    LEFT JOIN transacciones_detalle td ON td.transaccion_id = t.id
    WHERE t.tipo IN ('compra', 'recepcion_compra')
      AND t.estado NOT IN ('cancelado')
      AND (p_fecha_desde IS NULL OR t.fecha >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR t.fecha <= p_fecha_hasta)
      AND (p_proveedor_id IS NULL OR t.entidad_proveedor_id = p_proveedor_id)
    GROUP BY t.entidad_proveedor_id, e.razon_social, e.rfc
    ORDER BY monto_total DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BLOQUE 5: PERMISOS PARA NUEVOS MÓDULOS
-- ============================================================

INSERT INTO permisos (codigo, nombre, modulo, descripcion) VALUES
    ('compras.cotizaciones', 'Cotizaciones de Compra', 'compras', 'Ver y gestionar cotizaciones de compra'),
    ('compras.recepciones', 'Recepciones de Compra', 'compras', 'Gestionar recepciones de mercancía'),
    ('compras.reportes', 'Reportes de Compras', 'compras', 'Ver reportes de compras'),
    ('inventario.traspasos', 'Traspasos', 'inventario', 'Gestionar traspasos entre almacenes'),
    ('inventario.reportes', 'Reportes de Inventario', 'inventario', 'Ver reportes de inventario'),
    ('inventario.series', 'Consulta de Series', 'inventario', 'Consultar números de serie'),
    ('entidades.gestion', 'Gestión de Entidades', 'admin', 'Gestionar entidades (clientes, proveedores, etc.)')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- BLOQUE 6: REPORTE DE MIGRACIÓN
-- ============================================================
DO $$
DECLARE
    v_tipos_actualizados BOOLEAN;
    v_folios_insertados INTEGER;
    v_series_insertadas INTEGER;
    v_total_transacciones INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'transacciones_tipo_check'
        AND check_clause LIKE '%cotizacion_compra%'
    ) INTO v_tipos_actualizados;

    SELECT COUNT(*) INTO v_folios_insertados
    FROM control_folios WHERE tipo_documento IN ('COTC','RECC','TRAS','RECT');

    SELECT COUNT(*) INTO v_series_insertadas
    FROM series_documentos WHERE codigo IN ('COTC','RECC','TRAS','RECT');

    SELECT COUNT(*) INTO v_total_transacciones FROM transacciones;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRACIÓN v5 - Expansión Compras/Inventarios';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CHECK actualizado con nuevos tipos        : %', v_tipos_actualizados;
    RAISE NOTICE 'Folios insertados en control_folios        : %', v_folios_insertados;
    RAISE NOTICE 'Series insertadas en series_documentos     : %', v_series_insertadas;
    RAISE NOTICE 'Total transacciones en BD                  : %', v_total_transacciones;
    RAISE NOTICE 'Vistas creadas: v_stock_actual, v_movimientos_inventario';
    RAISE NOTICE 'Funciones creadas: fn_compras_por_articulo, fn_compras_por_proveedor';
    RAISE NOTICE '============================================';
END $$;

COMMIT;
