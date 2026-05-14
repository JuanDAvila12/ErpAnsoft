-- ============================================================
-- MIGRACIÓN v4.1 - Modelo Unificado de Transacciones
-- SPI ERP
-- ============================================================
-- Este script se ejecuta DESPUÉS de migration_v4.sql
-- Crea tablas unificadas: transacciones, transacciones_detalle,
-- transacciones_series, transacciones_contables
-- Migra datos desde tablas legacy sin eliminarlas.
-- ============================================================

BEGIN;

-- ============================================================
-- BLOQUE 0: DEPENDENCIAS PREVIAS
-- ============================================================

-- 0.1 Crear catálogo cuentas_contables si no existe
CREATE TABLE IF NOT EXISTS cuentas_contables (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(20) NOT NULL UNIQUE,
    nombre          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(20) DEFAULT 'detalle'
                    CHECK (tipo IN ('mayor', 'detalle', 'control')),
    nivel           INTEGER DEFAULT 1,
    padre_id        INTEGER REFERENCES cuentas_contables(id),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar cuentas contables básicas si no existen
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel) VALUES
    ('1000', 'Activo', 'mayor', 1),
    ('1100', 'Efectivo y Equivalentes', 'control', 2),
    ('1101', 'Caja Chica', 'detalle', 3),
    ('1102', 'Bancos', 'detalle', 3),
    ('1200', 'Clientes', 'detalle', 2),
    ('1300', 'Inventarios', 'detalle', 2),
    ('2000', 'Pasivo', 'mayor', 1),
    ('2100', 'Proveedores', 'detalle', 2),
    ('2200', 'Impuestos por Pagar', 'detalle', 2),
    ('3000', 'Capital', 'mayor', 1),
    ('4000', 'Ingresos', 'mayor', 1),
    ('4100', 'Ventas', 'detalle', 2),
    ('5000', 'Costos', 'mayor', 1),
    ('5100', 'Costo de Ventas', 'detalle', 2),
    ('6000', 'Gastos', 'mayor', 1),
    ('6100', 'Gastos de Operación', 'detalle', 2)
ON CONFLICT (codigo) DO NOTHING;

-- 0.2 Crear tabla auditoria_cambios si no existe
CREATE TABLE IF NOT EXISTS auditoria_cambios (
    id              SERIAL PRIMARY KEY,
    tabla_nombre    VARCHAR(100),
    operacion       VARCHAR(10),
    registro_id     INTEGER,
    datos_anteriores TEXT,
    datos_nuevos    TEXT,
    usuario         VARCHAR(100),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 0.3 Crear función fn_auditar_cambios si no existe
CREATE OR REPLACE FUNCTION fn_auditar_cambios()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data TEXT;
    v_new_data TEXT;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_data := row_to_json(OLD)::TEXT;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new_data := row_to_json(NEW)::TEXT;
    END IF;

    INSERT INTO auditoria_cambios (tabla_nombre, operacion, registro_id, datos_anteriores, datos_nuevos, usuario)
    VALUES (TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id), v_old_data, v_new_data, current_user);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BLOQUE 1: CREACIÓN DE TABLAS UNIFICADAS
-- ============================================================

-- 1.1 transacciones
CREATE TABLE IF NOT EXISTS transacciones (
    id                      SERIAL PRIMARY KEY,
    tipo                    VARCHAR(20) NOT NULL
                            CHECK (tipo IN ('cotizacion','orden_venta','venta','orden_compra','compra','ajuste_inventario','entrada_inventario','salida_inventario','pago','cobro')),
    estado                  VARCHAR(20) NOT NULL DEFAULT 'borrador'
                            CHECK (estado IN ('borrador','pendiente','confirmado','facturado','cancelado')),
    folio                   VARCHAR(50) UNIQUE,
    fecha                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento       DATE,
    total                   DECIMAL(12,2) DEFAULT 0,
    moneda_id               INTEGER REFERENCES monedas(id) DEFAULT 1,
    entidad_cliente_id      INTEGER REFERENCES entidades(id),
    entidad_proveedor_id    INTEGER REFERENCES entidades(id),
    entidad_vendedor_id     INTEGER REFERENCES entidades(id),
    almacen_id              INTEGER REFERENCES almacenes(id),
    metodo_pago             VARCHAR(50),
    forma_pago_id           INTEGER REFERENCES formas_pago(id),
    terminos_pago_id        INTEGER REFERENCES terminos_pago(id),
    serie_id                INTEGER REFERENCES series_documentos(id),
    documento_origen_id     INTEGER REFERENCES transacciones(id),
    comentario              TEXT,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 transacciones_detalle
CREATE TABLE IF NOT EXISTS transacciones_detalle (
    id                      SERIAL PRIMARY KEY,
    transaccion_id          INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE RESTRICT,
    articulo_id             INTEGER NOT NULL REFERENCES articulos(id),
    cantidad                DECIMAL(12,2) NOT NULL,
    precio_unitario         DECIMAL(12,2) NOT NULL,
    subtotal                DECIMAL(12,2) NOT NULL,
    impuesto_id             INTEGER REFERENCES impuestos(id),
    cuenta_contable_id      INTEGER REFERENCES cuentas_contables(id),
    almacen_id              INTEGER REFERENCES almacenes(id),
    tipo_movimiento         VARCHAR(20) CHECK (tipo_movimiento IN ('entrada','salida','ninguno')),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 transacciones_series
CREATE TABLE IF NOT EXISTS transacciones_series (
    id                      SERIAL PRIMARY KEY,
    transaccion_detalle_id  INTEGER NOT NULL REFERENCES transacciones_detalle(id) ON DELETE RESTRICT,
    numero_serie            VARCHAR(100) NOT NULL,
    estado                  VARCHAR(20) DEFAULT 'disponible'
                            CHECK (estado IN ('disponible','vendido','reservado','baja')),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaccion_detalle_id, numero_serie)
);

-- 1.4 transacciones_contables
CREATE TABLE IF NOT EXISTS transacciones_contables (
    id                      SERIAL PRIMARY KEY,
    transaccion_id          INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE RESTRICT,
    cuenta_contable_id      INTEGER NOT NULL REFERENCES cuentas_contables(id),
    debe                    DECIMAL(12,2) DEFAULT 0,
    haber                   DECIMAL(12,2) DEFAULT 0,
    fecha                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BLOQUE 2: MIGRACIÓN DE DATOS - DOCUMENTOS VENTA
-- ============================================================

INSERT INTO transacciones (tipo, estado, folio, fecha, fecha_vencimiento, total,
    moneda_id, entidad_cliente_id, entidad_vendedor_id, almacen_id,
    metodo_pago, forma_pago_id, terminos_pago_id, serie_id, documento_origen_id, created_at, updated_at)
SELECT
    COALESCE(dv.tipo, 'venta'),
    COALESCE(dv.estado, 'confirmado'),
    dv.folio,
    dv.fecha,
    dv.fecha_vencimiento,
    COALESCE(dv.total, 0),
    1,
    dv.entidad_cliente_id,
    dv.entidad_vendedor_id,
    NULL AS almacen_id,  -- ← CORREGIDO
    dv.metodo_pago,
    dv.forma_pago_id,
    dv.terminos_pago_id,
    dv.serie_id,
    dv.documento_origen_id,
    dv.created_at,
    COALESCE(dv.updated_at, CURRENT_TIMESTAMP)
FROM documentos_venta dv;

-- 2.2 Migrar documentos_venta_detalle → transacciones_detalle (tipo_movimiento='salida')
INSERT INTO transacciones_detalle (transaccion_id, articulo_id, cantidad,
    precio_unitario, subtotal, impuesto_id, cuenta_contable_id, almacen_id,
    tipo_movimiento, created_at)
SELECT
    t.id,
    dvd.articulo_id,
    dvd.cantidad,
    dvd.precio_unitario,
    dvd.subtotal,
    NULL,
    NULL,
    NULL,
    'salida',
    dvd.created_at
FROM documentos_venta_detalle dvd
JOIN documentos_venta dv ON dv.id = dvd.documento_venta_id
JOIN transacciones t ON t.folio = dv.folio;

-- ============================================================
-- BLOQUE 3: MIGRACIÓN DE DATOS - DOCUMENTOS COMPRA
-- ============================================================

-- 3.1 Migrar documentos_compra → transacciones
INSERT INTO transacciones (tipo, estado, folio, fecha, fecha_vencimiento, total,
    moneda_id, entidad_proveedor_id, entidad_vendedor_id, almacen_id,
    metodo_pago, forma_pago_id, terminos_pago_id, serie_id, documento_origen_id, created_at, updated_at)
SELECT
    COALESCE(dc.tipo, 'compra'),
    COALESCE(dc.estado, 'confirmado'),
    dc.folio,
    dc.fecha,
    dc.fecha_vencimiento,
    COALESCE(dc.total, 0),
    1,
    dc.proveedor_entidad_id,
    dc.entidad_comprador_id,
    dc.almacen_id,
    dc.metodo_pago,
    dc.forma_pago_id,
    dc.terminos_pago_id,
    dc.serie_id,
    dc.documento_origen_id,
    dc.created_at,
    COALESCE(dc.updated_at, CURRENT_TIMESTAMP)
FROM documentos_compra dc;

-- 3.2 Migrar documentos_compra_detalle → transacciones_detalle (tipo_movimiento='entrada')
INSERT INTO transacciones_detalle (transaccion_id, articulo_id, cantidad,
    precio_unitario, subtotal, impuesto_id, cuenta_contable_id, almacen_id,
    tipo_movimiento, created_at)
SELECT
    t.id,
    dcd.articulo_id,
    dcd.cantidad,
    dcd.precio_unitario,
    dcd.subtotal,
    NULL,
    NULL,
    NULL,
    'entrada',
    dcd.created_at
FROM documentos_compra_detalle dcd
JOIN documentos_compra dc ON dc.id = dcd.documento_compra_id
JOIN transacciones t ON t.folio = dc.folio;

-- ============================================================
-- BLOQUE 4: MIGRACIÓN DE DATOS - INVENTARIO MOVIMIENTOS
-- ============================================================
-- Solo aquellos que NO tienen ya vinculo con ventas/compras

-- 4.1 Crear tabla temporal para mapear inventario_movimientos → transacciones
CREATE TEMP TABLE IF NOT EXISTS temp_inventario_map (
    inventario_movimiento_id INTEGER PRIMARY KEY,
    transaccion_id INTEGER NOT NULL,
    transaccion_detalle_id INTEGER NOT NULL
);

-- 4.2 Migrar cada movimiento como transacción independiente
DO $$
DECLARE
    v_rec RECORD;
    v_tipo_doc VARCHAR(20);
    v_new_tid INTEGER;
    v_new_did INTEGER;
    v_count INTEGER := 0;
BEGIN
    FOR v_rec IN
        SELECT im.*
        FROM inventario_movimientos im
        WHERE (im.documento_detalle_tipo IS NULL OR im.documento_detalle_id IS NULL)
        ORDER BY im.creado_en, im.id
    LOOP
        -- Determinar el tipo de transacción
        v_tipo_doc := CASE v_rec.tipo_movimiento
            WHEN 'entrada' THEN 'entrada_inventario'
            WHEN 'salida' THEN 'salida_inventario'
            WHEN 'ajuste' THEN 'ajuste_inventario'
            WHEN 'inicial' THEN 'entrada_inventario'
            ELSE 'ajuste_inventario'
        END;

        -- Crear la transacción padre
        INSERT INTO transacciones (tipo, estado, fecha, total, almacen_id, comentario, created_at)
        VALUES (
            v_tipo_doc,
            'confirmado',
            v_rec.creado_en,
            0,
            v_rec.almacen_id,
            'Migrado desde inventario_movimientos id=' || v_rec.id::TEXT ||
            ', tipo=' || v_rec.tipo_movimiento ||
            ', ref=' || COALESCE(v_rec.referencia_tipo, 'sin_ref') ||
            '-' || COALESCE(v_rec.referencia_id::TEXT, '0'),
            v_rec.creado_en
        )
        RETURNING id INTO v_new_tid;

        -- Crear el detalle
        INSERT INTO transacciones_detalle (transaccion_id, articulo_id, cantidad,
            precio_unitario, subtotal, impuesto_id, cuenta_contable_id, almacen_id,
            tipo_movimiento, created_at)
        VALUES (
            v_new_tid,
            v_rec.articulo_id,
            ABS(v_rec.cantidad),
            0,
            0,
            NULL, NULL,
            v_rec.almacen_id,
            CASE WHEN v_rec.tipo_movimiento IN ('entrada', 'inicial') THEN 'entrada'
                 WHEN v_rec.tipo_movimiento = 'salida' THEN 'salida'
                 ELSE 'ninguno'
            END,
            v_rec.creado_en
        )
        RETURNING id INTO v_new_did;

        -- Guardar mapeo
        INSERT INTO temp_inventario_map (inventario_movimiento_id, transaccion_id, transaccion_detalle_id)
        VALUES (v_rec.id, v_new_tid, v_new_did);

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Inventario movimientos migrados como transacciones independientes: %', v_count;
END $$;

-- ============================================================
-- BLOQUE 5: MIGRACIÓN DE DATOS - ASIENTOS CONTABLES
-- ============================================================

-- 5.1 Crear transacciones contables genéricas para asientos sueltos
INSERT INTO transacciones (tipo, estado, fecha, total, comentario, created_at)
SELECT DISTINCT
    'pago',
    'confirmado',
    ac.fecha,
    0,
    'Migrado desde asientos_contables ref=' || COALESCE(ac.referencia_tipo, '') || '-' || COALESCE(ac.referencia_id::TEXT, '0'),
    ac.created_at
FROM asientos_contables ac
LEFT JOIN transacciones t ON t.comentario LIKE '%asientos_contables id=%'|| ac.id ||'%'
WHERE t.id IS NULL;

-- 5.2 Migrar asientos_contables → transacciones_contables
INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber, fecha, created_at)
SELECT
    COALESCE(
        -- Buscar por referencia_tipo / referencia_id en documentos
        (SELECT t_venta.id FROM transacciones t_venta
         WHERE t_venta.tipo IN ('venta','cotizacion','orden_venta')
           AND t_venta.folio IN (SELECT dv.folio FROM documentos_venta dv WHERE dv.id = ac.referencia_id)
         LIMIT 1),
        (SELECT t_compra.id FROM transacciones t_compra
         WHERE t_compra.tipo IN ('compra','orden_compra')
           AND t_compra.folio IN (SELECT dc.folio FROM documentos_compra dc WHERE dc.id = ac.referencia_id)
         LIMIT 1),
        -- Buscar la transacción genérica que acabamos de crear
        (SELECT t_gen.id FROM transacciones t_gen
         WHERE t_gen.comentario LIKE '%asientos_contables ref=' || COALESCE(ac.referencia_tipo, '') || '-' || COALESCE(ac.referencia_id::TEXT, '0') || '%'
         LIMIT 1),
        -- Fallback: buscar por id directo
        (SELECT t_fb.id FROM transacciones t_fb
         WHERE t_fb.comentario LIKE '%asientos_contables id=' || ac.id || '%'
         LIMIT 1)
    ) AS transaccion_id,
    COALESCE(
        (SELECT cc.id FROM cuentas_contables cc WHERE cc.codigo = ac.cuenta_contable LIMIT 1),
        (SELECT min(cc2.id) FROM cuentas_contables cc2)
    ) AS cuenta_contable_id,
    ac.debe,
    ac.haber,
    ac.fecha,
    ac.created_at
FROM asientos_contables ac;

-- ============================================================
-- BLOQUE 6: MIGRACIÓN DE DATOS - ARTÍCULOS SERIES
-- ============================================================

-- 6.1 Migrar articulos_series → transacciones_series
INSERT INTO transacciones_series (transaccion_detalle_id, numero_serie, estado, created_at)
SELECT
    COALESCE(
        -- Buscar el detalle asociado por inventario_movimiento_id
        (SELECT tm.transaccion_detalle_id
         FROM temp_inventario_map tm
         WHERE tm.inventario_movimiento_id = aser.inventario_movimiento_id
         LIMIT 1),
        -- Fallback: buscar un detalle existente del mismo artículo en entrada_inventario
        (SELECT td.id
         FROM transacciones_detalle td
         JOIN transacciones t ON t.id = td.transaccion_id
         WHERE t.tipo = 'entrada_inventario'
           AND td.articulo_id = aser.articulo_id
         LIMIT 1),
        -- Último recurso: usar el primer detalle de entrada_inventario disponible
        (SELECT td.id
         FROM transacciones_detalle td
         JOIN transacciones t ON t.id = td.transaccion_id
         WHERE t.tipo = 'entrada_inventario'
         LIMIT 1)
    ) AS transaccion_detalle_id,
    aser.numero_serie,
    COALESCE(aser.estado, 'disponible'),
    aser.created_at
FROM articulos_series aser;

-- 6.2 Limpiar tabla temporal
DROP TABLE IF EXISTS temp_inventario_map;

-- ============================================================
-- BLOQUE 7: ÍNDICES
-- ============================================================

-- Índices para transacciones
CREATE INDEX IF NOT EXISTS idx_transacciones_folio ON transacciones(folio);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_estado ON transacciones(estado);
CREATE INDEX IF NOT EXISTS idx_transacciones_cliente ON transacciones(entidad_cliente_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_proveedor ON transacciones(entidad_proveedor_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha);
CREATE INDEX IF NOT EXISTS idx_transacciones_origen ON transacciones(documento_origen_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_serie ON transacciones(serie_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_almacen ON transacciones(almacen_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_moneda ON transacciones(moneda_id);

-- Índices para transacciones_detalle
CREATE INDEX IF NOT EXISTS idx_transacciones_detalle_transaccion ON transacciones_detalle(transaccion_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_detalle_articulo ON transacciones_detalle(articulo_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_detalle_impuesto ON transacciones_detalle(impuesto_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_detalle_ctacontable ON transacciones_detalle(cuenta_contable_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_detalle_almacen ON transacciones_detalle(almacen_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_detalle_tipo_mov ON transacciones_detalle(tipo_movimiento);

-- Índices para transacciones_series
CREATE INDEX IF NOT EXISTS idx_transacciones_series_detalle ON transacciones_series(transaccion_detalle_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_series_numero ON transacciones_series(numero_serie);
CREATE INDEX IF NOT EXISTS idx_transacciones_series_estado ON transacciones_series(estado);

-- Índices para transacciones_contables
CREATE INDEX IF NOT EXISTS idx_transacciones_contables_transaccion ON transacciones_contables(transaccion_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_contables_cuenta ON transacciones_contables(cuenta_contable_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_contables_fecha ON transacciones_contables(fecha);

-- ============================================================
-- BLOQUE 8: TRIGGERS DE AUDITORÍA
-- ============================================================

-- Trigger para transacciones
DROP TRIGGER IF EXISTS trg_auditar_transacciones ON transacciones;
CREATE TRIGGER trg_auditar_transacciones
AFTER INSERT OR UPDATE OR DELETE ON transacciones
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

-- Trigger para transacciones_detalle
DROP TRIGGER IF EXISTS trg_auditar_transacciones_detalle ON transacciones_detalle;
CREATE TRIGGER trg_auditar_transacciones_detalle
AFTER INSERT OR UPDATE OR DELETE ON transacciones_detalle
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

-- ============================================================
-- BLOQUE 9: ACTUALIZAR control_folios
-- ============================================================

INSERT INTO control_folios (tipo_documento) VALUES
    ('AJU'),
    ('ENT'),
    ('SAL')
ON CONFLICT (tipo_documento) DO NOTHING;

-- ============================================================
-- BLOQUE 10: REPORTE DE MIGRACIÓN
-- ============================================================
DO $$
DECLARE
    v_tot_transacciones       INTEGER;
    v_transacciones_venta     INTEGER;
    v_transacciones_compra    INTEGER;
    v_transacciones_inventario INTEGER;
    v_transacciones_otras     INTEGER;
    v_detalle_venta           INTEGER;
    v_detalle_compra          INTEGER;
    v_detalle_inventario      INTEGER;
    v_detalle_otro            INTEGER;
    v_series_migradas         INTEGER;
    v_contables_migradas      INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tot_transacciones FROM transacciones;
    SELECT COUNT(*) INTO v_transacciones_venta FROM transacciones WHERE tipo IN ('venta', 'cotizacion', 'orden_venta');
    SELECT COUNT(*) INTO v_transacciones_compra FROM transacciones WHERE tipo IN ('compra', 'orden_compra');
    SELECT COUNT(*) INTO v_transacciones_inventario FROM transacciones WHERE tipo IN ('ajuste_inventario', 'entrada_inventario', 'salida_inventario');
    SELECT COUNT(*) INTO v_transacciones_otras FROM transacciones WHERE tipo NOT IN ('venta', 'cotizacion', 'orden_venta', 'compra', 'orden_compra', 'ajuste_inventario', 'entrada_inventario', 'salida_inventario');

    SELECT COUNT(*) INTO v_detalle_venta
    FROM transacciones_detalle td
    JOIN transacciones t ON t.id = td.transaccion_id
    WHERE t.tipo IN ('venta', 'cotizacion', 'orden_venta');

    SELECT COUNT(*) INTO v_detalle_compra
    FROM transacciones_detalle td
    JOIN transacciones t ON t.id = td.transaccion_id
    WHERE t.tipo IN ('compra', 'orden_compra');

    SELECT COUNT(*) INTO v_detalle_inventario
    FROM transacciones_detalle td
    JOIN transacciones t ON t.id = td.transaccion_id
    WHERE t.tipo IN ('ajuste_inventario', 'entrada_inventario', 'salida_inventario');

    SELECT COUNT(*) INTO v_detalle_otro
    FROM transacciones_detalle td
    JOIN transacciones t ON t.id = td.transaccion_id
    WHERE t.tipo NOT IN ('venta', 'cotizacion', 'orden_venta', 'compra', 'orden_compra', 'ajuste_inventario', 'entrada_inventario', 'salida_inventario');

    SELECT COUNT(*) INTO v_series_migradas FROM transacciones_series;
    SELECT COUNT(*) INTO v_contables_migradas FROM transacciones_contables;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESUMEN DE MIGRACIÓN v4.1 - Transacciones';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TOTAL transacciones creadas               : %', v_tot_transacciones;
    RAISE NOTICE '  - documentos_venta → transacciones      : % (ventas+pedidos+cotizaciones)', v_transacciones_venta;
    RAISE NOTICE '  - documentos_compra → transacciones     : % (compras+órdenes)', v_transacciones_compra;
    RAISE NOTICE '  - inventario_movimientos (indep.)        : % (ent+sal+ajustes)', v_transacciones_inventario;
    RAISE NOTICE '  - otras (asientos contables, etc.)      : %', v_transacciones_otras;
    RAISE NOTICE '--------------------------------------------';
    RAISE NOTICE 'TOTAL transacciones_detalle creados       : %', (v_detalle_venta + v_detalle_compra + v_detalle_inventario + v_detalle_otro);
    RAISE NOTICE '  - documentos_venta_detalle              : %', v_detalle_venta;
    RAISE NOTICE '  - documentos_compra_detalle             : %', v_detalle_compra;
    RAISE NOTICE '  - inventario_movimientos (indep.)        : %', v_detalle_inventario;
    RAISE NOTICE '  - otros                                 : %', v_detalle_otro;
    RAISE NOTICE '--------------------------------------------';
    RAISE NOTICE 'articulos_series → transacciones_series   : %', v_series_migradas;
    RAISE NOTICE 'asientos_contables → transacciones_contables: %', v_contables_migradas;
    RAISE NOTICE '============================================';
END $$;

COMMIT;
