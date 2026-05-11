-- ============================================================
-- MIGRACIÓN v3.0 - Transacciones por Capas + CFDI 4.0
-- SPI ERP
-- ============================================================
-- Este script se ejecuta DESPUÉS de init.sql para evolucionar
-- la estructura existente.
-- ============================================================

-- ============================================================
-- BLOQUE 1: NUEVOS CATÁLOGOS MAESTROS (SAT y maestros)
-- ============================================================

-- 1.1 unidades_medida (Claves SAT)
CREATE TABLE IF NOT EXISTS unidades_medida (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO unidades_medida (clave_sat, nombre, descripcion) VALUES
    ('H87', 'Pieza', 'Pieza / Unidad'),
    ('KGM', 'Kilogramo', 'Kilogramo'),
    ('LTR', 'Litro', 'Litro'),
    ('MTR', 'Metro', 'Metro'),
    ('E48', 'Servicio', 'Servicio profesional'),
    ('EA', 'Elemento', 'Elemento / Unidad individual'),
    ('GRM', 'Gramo', 'Gramo'),
    ('MTK', 'Metro Cuadrado', 'Metro cuadrado'),
    ('MGM', 'Miligramo', 'Miligramo'),
    ('MLT', 'Mililitro', 'Mililitro'),
    ('BX', 'Caja', 'Caja'),
    ('DZ', 'Docena', 'Docena / 12 unidades'),
    ('KT', 'Kit', 'Kit / Conjunto')
ON CONFLICT (clave_sat) DO NOTHING;

-- 1.2 categorias_producto (estructura jerárquica)
CREATE TABLE IF NOT EXISTS categorias_producto (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    padre_id        INTEGER REFERENCES categorias_producto(id),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categorias_producto (nombre, padre_id) VALUES
    ('Electrónicos', NULL),
    ('Cómputo', (SELECT id FROM categorias_producto WHERE nombre = 'Electrónicos')),
    ('Periféricos', (SELECT id FROM categorias_producto WHERE nombre = 'Electrónicos')),
    ('Telefonía', (SELECT id FROM categorias_producto WHERE nombre = 'Electrónicos')),
    ('Oficina', NULL),
    ('Papelería', (SELECT id FROM categorias_producto WHERE nombre = 'Oficina')),
    ('Mobiliario', (SELECT id FROM categorias_producto WHERE nombre = 'Oficina')),
    ('Servicios', NULL)
ON CONFLICT DO NOTHING;

-- 1.3 marcas
CREATE TABLE IF NOT EXISTS marcas (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO marcas (nombre) VALUES
    ('HP'),
    ('Dell'),
    ('Lenovo'),
    ('Logitech'),
    ('Samsung'),
    ('Apple'),
    ('Genérica')
ON CONFLICT DO NOTHING;

-- 1.4 terminos_pago
CREATE TABLE IF NOT EXISTS terminos_pago (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    dias_credito    INTEGER NOT NULL DEFAULT 0,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO terminos_pago (nombre, dias_credito) VALUES
    ('Contado', 0),
    ('Neto 15', 15),
    ('Neto 30', 30),
    ('Neto 60', 60)
ON CONFLICT DO NOTHING;

-- 1.5 regimenes_fiscales SAT
CREATE TABLE IF NOT EXISTS regimenes_fiscales (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO regimenes_fiscales (clave_sat, descripcion) VALUES
    ('601', 'General de Ley Personas Morales'),
    ('603', 'Personas Morales con Fines no Lucrativos'),
    ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios'),
    ('606', 'Arrendamiento'),
    ('608', 'Demás ingresos'),
    ('612', 'Personas Morales del Régimen de Coodinados'),
    ('620', 'Sociedades Cooperativas de Producción'),
    ('621', 'Incorporación Fiscal'),
    ('622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras'),
    ('623', 'Opcional para Grupos de Sociedades'),
    ('624', 'Coordinados'),
    ('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas'),
    ('626', 'Régimen Simplificado de Confianza')
ON CONFLICT (clave_sat) DO NOTHING;

-- 1.6 usos_cfdi SAT
CREATE TABLE IF NOT EXISTS usos_cfdi (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usos_cfdi (clave_sat, descripcion) VALUES
    ('G01', 'Adquisición de mercancías'),
    ('G02', 'Devoluciones, descuentos o bonificaciones'),
    ('G03', 'Gastos en general'),
    ('I01', 'Construcciones'),
    ('I02', 'Mobiliario y equipo de oficina por inversiones'),
    ('I03', 'Equipo de transporte'),
    ('P01', 'Por definir'),
    ('D01', 'Honorarios médicos, dentales y gastos hospitalarios'),
    ('D02', 'Gastos médicos por incapacidad o discapacidad'),
    ('D03', 'Gastos funerarios'),
    ('D04', 'Donativos'),
    ('D05', 'Intereses reales efectivamente pagados por créditos hipotecarios'),
    ('D06', 'Aportaciones voluntarias al SAR'),
    ('D07', 'Primas por seguros de gastos médicos'),
    ('D08', 'Gastos de transportación escolar obligatoria'),
    ('D09', 'Depósitos en cuentas para el ahorro'),
    ('D10', 'Pagos por servicios educativos')
ON CONFLICT (clave_sat) DO NOTHING;

-- 1.7 metodos_pago_sat SAT
CREATE TABLE IF NOT EXISTS metodos_pago_sat (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO metodos_pago_sat (clave_sat, descripcion) VALUES
    ('PUE', 'Pago en una sola exhibición'),
    ('PPD', 'Pago en parcialidades o diferido')
ON CONFLICT (clave_sat) DO NOTHING;

-- 1.8 objetos_impuesto SAT
CREATE TABLE IF NOT EXISTS objetos_impuesto (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(2) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO objetos_impuesto (clave_sat, descripcion) VALUES
    ('01', 'No objeto de impuesto'),
    ('02', 'Sí objeto de impuesto'),
    ('03', 'Sí objeto de impuesto y no obligado al desglose')
ON CONFLICT (clave_sat) DO NOTHING;

-- 1.9 series_documentos
CREATE TABLE IF NOT EXISTS series_documentos (
    id              SERIAL PRIMARY KEY,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('cotizacion','orden_venta','venta','orden_compra','compra')),
    serie           VARCHAR(5) NOT NULL,
    descripcion     VARCHAR(255),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo, serie)
);

INSERT INTO series_documentos (tipo, serie, descripcion) VALUES
    ('cotizacion', 'COT', 'Cotizaciones'),
    ('orden_venta', 'OV', 'Órdenes de venta'),
    ('venta', 'F', 'Facturación / Ventas'),
    ('orden_compra', 'OC', 'Órdenes de compra'),
    ('compra', 'COM', 'Comprobantes de compra')
ON CONFLICT (tipo, serie) DO NOTHING;

-- ============================================================
-- 1.10 Ampliar tabla articulos
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articulos' AND column_name = 'unidad_medida_id'
    ) THEN
        ALTER TABLE articulos ADD COLUMN unidad_medida_id INTEGER REFERENCES unidades_medida(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articulos' AND column_name = 'categoria_id'
    ) THEN
        ALTER TABLE articulos ADD COLUMN categoria_id INTEGER REFERENCES categorias_producto(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articulos' AND column_name = 'marca_id'
    ) THEN
        ALTER TABLE articulos ADD COLUMN marca_id INTEGER REFERENCES marcas(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articulos' AND column_name = 'codigo_barras'
    ) THEN
        ALTER TABLE articulos ADD COLUMN codigo_barras VARCHAR(128);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articulos' AND column_name = 'usa_serie'
    ) THEN
        ALTER TABLE articulos ADD COLUMN usa_serie BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 1.11 Ampliar tabla entidades
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entidades' AND column_name = 'telefono'
    ) THEN
        ALTER TABLE entidades ADD COLUMN telefono VARCHAR(20);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entidades' AND column_name = 'email'
    ) THEN
        ALTER TABLE entidades ADD COLUMN email VARCHAR(100);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entidades' AND column_name = 'regimen_fiscal_id'
    ) THEN
        ALTER TABLE entidades ADD COLUMN regimen_fiscal_id INTEGER REFERENCES regimenes_fiscales(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entidades' AND column_name = 'uso_cfdi_default_id'
    ) THEN
        ALTER TABLE entidades ADD COLUMN uso_cfdi_default_id INTEGER REFERENCES usos_cfdi(id);
    END IF;
END $$;

-- ============================================================
-- BLOQUE 2: REESTRUCTURAR VENTAS EN CAPAS
-- ============================================================

-- 2.1 Renombrar ventas → documentos_venta si existen
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas') THEN
        ALTER TABLE ventas RENAME TO documentos_venta;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_detalle') THEN
        ALTER TABLE ventas_detalle RENAME TO documentos_venta_detalle;
    END IF;
END $$;

-- 2.2 Agregar/renombrar columnas en documentos_venta
DO $$ BEGIN
    -- Agregar columna tipo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta' AND column_name = 'tipo'
    ) THEN
        ALTER TABLE documentos_venta ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'venta'
            CHECK (tipo IN ('cotizacion','orden_venta','venta'));
    END IF;

    -- Agregar columna estado (reemplaza estatus)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta' AND column_name = 'estado'
    ) THEN
        ALTER TABLE documentos_venta ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'confirmado'
            CHECK (estado IN ('borrador','pendiente','confirmado','facturado','cancelado'));
    END IF;

    -- Migrar datos de estatus a estado si existe columna estatus
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta' AND column_name = 'estatus'
    ) THEN
        UPDATE documentos_venta SET estado = CASE estatus
            WHEN 'completada' THEN 'confirmado'
            WHEN 'cancelada' THEN 'cancelado'
            WHEN 'pendiente' THEN 'pendiente'
            ELSE 'confirmado'
        END;
    END IF;

    -- Agregar documento_origen_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta' AND column_name = 'documento_origen_id'
    ) THEN
        ALTER TABLE documentos_venta ADD COLUMN documento_origen_id INTEGER REFERENCES documentos_venta(id);
    END IF;

    -- Agregar terminos_pago_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta' AND column_name = 'terminos_pago_id'
    ) THEN
        ALTER TABLE documentos_venta ADD COLUMN terminos_pago_id INTEGER REFERENCES terminos_pago(id);
    END IF;

    -- Agregar fecha_vencimiento
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta' AND column_name = 'fecha_vencimiento'
    ) THEN
        ALTER TABLE documentos_venta ADD COLUMN fecha_vencimiento DATE;
    END IF;

    -- Agregar serie_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta' AND column_name = 'serie_id'
    ) THEN
        ALTER TABLE documentos_venta ADD COLUMN serie_id INTEGER REFERENCES series_documentos(id);
    END IF;
END $$;

-- 2.3 Asegurar ON DELETE RESTRICT en documentos_venta_detalle
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name LIKE 'documentos_venta_detalle_venta_id_fkey%' OR
              constraint_name LIKE 'documentos_venta_detalle_documentos_venta%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Buscar y reemplazar constraint
        -- Lo hacemos con un bloque dinámico
    END IF;
END $$;

DO $$ BEGIN
    PERFORM 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'documentos_venta_detalle'
      AND kcu.column_name = 'documento_venta_id'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.is_deferrable = 'NO';
    IF NOT FOUND THEN
        -- No hay constraint, intentar renombrar la columna si todavía se llama venta_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'documentos_venta_detalle' AND column_name = 'venta_id'
        ) THEN
            ALTER TABLE documentos_venta_detalle RENAME COLUMN venta_id TO documento_venta_id;
        END IF;
    END IF;
END $$;

-- Renombrar columna venta_id a documento_venta_id si existe
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documentos_venta_detalle' AND column_name = 'venta_id'
    ) THEN
        ALTER TABLE documentos_venta_detalle RENAME COLUMN venta_id TO documento_venta_id;
    END IF;
END $$;

-- Asegurar FK con RESTRICT
DO $$ BEGIN
    -- Eliminar constraint anterior si existía
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'documentos_venta_detalle'
          AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- No podemos eliminar fácilmente por nombre dinámico, lo intentamos
    END IF;
END $$;

DO $$ BEGIN
    -- Verificar si existe la FK correcta
    PERFORM 1 FROM information_schema.table_constraints
    WHERE table_name = 'documentos_venta_detalle'
      AND constraint_name = 'documentos_venta_detalle_documento_venta_id_fkey';
    IF NOT FOUND THEN
        ALTER TABLE documentos_venta_detalle
            ADD CONSTRAINT documentos_venta_detalle_documento_venta_id_fkey
            FOREIGN KEY (documento_venta_id) REFERENCES documentos_venta(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- ============================================================
-- 2.4 Control de folios expandido y función genérica obtener_folio
-- ============================================================

-- Agregar filas para nuevos tipos de documento en control_folios
INSERT INTO control_folios (tipo_documento) VALUES
    ('COT'),
    ('OV'),
    ('FAC'),
    ('OC'),
    ('COM')
ON CONFLICT (tipo_documento) DO NOTHING;

-- Función genérica obtener_folio(tipo) con bloqueo FOR UPDATE
CREATE OR REPLACE FUNCTION obtener_folio(tipo_doc VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_folio     VARCHAR(20);
    v_hoy       DATE := CURRENT_DATE;
    v_ultimo    INTEGER;
    v_serie     VARCHAR(5);
    v_fecha_actual DATE;
BEGIN
    -- Bloquear la fila para evitar condiciones de carrera
    SELECT ultimo_numero, fecha_actual INTO v_ultimo, v_fecha_actual
    FROM control_folios
    WHERE tipo_documento = tipo_doc
    FOR UPDATE;

    -- Si no existe, crearla
    IF NOT FOUND THEN
        INSERT INTO control_folios (tipo_documento, ultimo_numero, fecha_actual)
        VALUES (tipo_doc, 0, CURRENT_DATE)
        RETURNING ultimo_numero, fecha_actual INTO v_ultimo, v_fecha_actual;
    END IF;

    -- Si la fecha cambió, reiniciar contador
    IF v_fecha_actual <> CURRENT_DATE THEN
        v_ultimo := 0;
    END IF;

    -- Incrementar contador
    v_ultimo := v_ultimo + 1;

    -- Actualizar la tabla con el nuevo valor
    UPDATE control_folios
    SET ultimo_numero = v_ultimo,
        fecha_actual  = CURRENT_DATE
    WHERE tipo_documento = tipo_doc;

    -- Obtener la serie por defecto según el tipo desde series_documentos
    SELECT COALESCE(
        (SELECT serie FROM series_documentos
         WHERE CASE
             WHEN tipo_doc = 'COT' THEN tipo = 'cotizacion'
             WHEN tipo_doc = 'OV' THEN tipo = 'orden_venta'
             WHEN tipo_doc = 'FAC' THEN tipo = 'venta'
             WHEN tipo_doc = 'OC' THEN tipo = 'orden_compra'
             WHEN tipo_doc = 'COM' THEN tipo = 'compra'
             ELSE false END
         AND activo = true LIMIT 1),
        tipo_doc
    ) INTO v_serie;

    -- Generar folio con formato SERIE-YYYYMMDD-NNNN
    v_folio := v_serie || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
               LPAD(v_ultimo::TEXT, 4, '0');

    RETURN v_folio;
END;
$$ LANGUAGE plpgsql;

-- Mantener función anterior para compatibilidad
CREATE OR REPLACE FUNCTION obtener_folio_venta()
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN obtener_folio('VTA');
END;
$$ LANGUAGE plpgsql;

-- 2.5 Actualizar inventario_movimientos con documento_detalle_tipo y documento_detalle_id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventario_movimientos' AND column_name = 'documento_detalle_tipo'
    ) THEN
        ALTER TABLE inventario_movimientos
            ADD COLUMN documento_detalle_tipo VARCHAR(20),
            ADD COLUMN documento_detalle_id INTEGER;
    END IF;
END $$;

-- ============================================================
-- BLOQUE 3: DOCUMENTOS DE COMPRA
-- ============================================================

CREATE TABLE IF NOT EXISTS documentos_compra (
    id                      SERIAL PRIMARY KEY,
    proveedor_entidad_id    INTEGER NOT NULL REFERENCES entidades(id),
    entidad_comprador_id    INTEGER REFERENCES entidades(id),
    folio                   VARCHAR(50) NOT NULL UNIQUE,
    tipo                    VARCHAR(20) NOT NULL DEFAULT 'orden_compra'
                            CHECK (tipo IN ('orden_compra','compra')),
    estado                  VARCHAR(20) NOT NULL DEFAULT 'borrador'
                            CHECK (estado IN ('borrador','pendiente','confirmado','cancelado')),
    fecha                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento       DATE,
    total                   DECIMAL(12,2) NOT NULL DEFAULT 0,
    metodo_pago             VARCHAR(50) DEFAULT 'efectivo',
    forma_pago_id           INTEGER REFERENCES formas_pago(id),
    terminos_pago_id        INTEGER REFERENCES terminos_pago(id),
    serie_id                INTEGER REFERENCES series_documentos(id),
    documento_origen_id     INTEGER REFERENCES documentos_compra(id),
    almacen_id              INTEGER REFERENCES almacenes(id),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentos_compra_detalle (
    id              SERIAL PRIMARY KEY,
    documento_compra_id INTEGER NOT NULL REFERENCES documentos_compra(id) ON DELETE RESTRICT,
    articulo_id     INTEGER NOT NULL REFERENCES articulos(id),
    cantidad        DECIMAL(12,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal        DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BLOQUE 4: SERIES DE ARTÍCULOS
-- ============================================================

CREATE TABLE IF NOT EXISTS articulos_series (
    id                      SERIAL PRIMARY KEY,
    articulo_id             INTEGER NOT NULL REFERENCES articulos(id),
    numero_serie            VARCHAR(100) NOT NULL,
    inventario_movimiento_id INTEGER REFERENCES inventario_movimientos(id),
    estado                  VARCHAR(20) NOT NULL DEFAULT 'disponible'
                            CHECK (estado IN ('disponible','vendido','reservado','baja')),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(articulo_id, numero_serie)
);

-- ============================================================
-- BLOQUE 5: COMPROBANTES FISCALES
-- ============================================================

CREATE TABLE IF NOT EXISTS comprobantes_fiscales (
    id                  SERIAL PRIMARY KEY,
    documento_venta_id  INTEGER NOT NULL REFERENCES documentos_venta(id),
    uuid                VARCHAR(36) UNIQUE,
    xml                 TEXT,
    fecha_timbrado      TIMESTAMP,
    estatus             VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (estatus IN ('pendiente','timbrado','cancelado','error')),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. ÍNDICES
-- ============================================================

-- Índices para nuevos catálogos
CREATE INDEX IF NOT EXISTS idx_unidades_medida_clave_sat ON unidades_medida(clave_sat);
CREATE INDEX IF NOT EXISTS idx_unidades_medida_activo ON unidades_medida(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_producto_padre ON categorias_producto(padre_id);
CREATE INDEX IF NOT EXISTS idx_categorias_producto_activo ON categorias_producto(activo);
CREATE INDEX IF NOT EXISTS idx_marcas_activo ON marcas(activo);
CREATE INDEX IF NOT EXISTS idx_terminos_pago_activo ON terminos_pago(activo);
CREATE INDEX IF NOT EXISTS idx_regimenes_fiscales_clave ON regimenes_fiscales(clave_sat);
CREATE INDEX IF NOT EXISTS idx_usos_cfdi_clave ON usos_cfdi(clave_sat);
CREATE INDEX IF NOT EXISTS idx_metodos_pago_sat_clave ON metodos_pago_sat(clave_sat);
CREATE INDEX IF NOT EXISTS idx_objetos_impuesto_clave ON objetos_impuesto(clave_sat);
CREATE INDEX IF NOT EXISTS idx_series_documentos_tipo ON series_documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_series_documentos_activo ON series_documentos(activo);

-- Índices en columnas nuevas de articulos
CREATE INDEX IF NOT EXISTS idx_articulos_unidad_medida ON articulos(unidad_medida_id);
CREATE INDEX IF NOT EXISTS idx_articulos_categoria ON articulos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_articulos_marca ON articulos(marca_id);
CREATE INDEX IF NOT EXISTS idx_articulos_codigo_barras ON articulos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_articulos_usa_serie ON articulos(usa_serie);

-- Índices en columnas nuevas de entidades
CREATE INDEX IF NOT EXISTS idx_entidades_regimen_fiscal ON entidades(regimen_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_entidades_uso_cfdi ON entidades(uso_cfdi_default_id);

-- Índices para documentos_venta (renombrados)
CREATE INDEX IF NOT EXISTS idx_documentos_venta_folio ON documentos_venta(folio);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_tipo ON documentos_venta(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_estado ON documentos_venta(estado);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_cliente ON documentos_venta(entidad_cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_fecha ON documentos_venta(fecha);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_origen ON documentos_venta(documento_origen_id);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_serie ON documentos_venta(serie_id);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_terminos ON documentos_venta(terminos_pago_id);

-- Índices para documentos_venta_detalle
CREATE INDEX IF NOT EXISTS idx_documentos_venta_detalle_cabecera ON documentos_venta_detalle(documento_venta_id);
CREATE INDEX IF NOT EXISTS idx_documentos_venta_detalle_articulo ON documentos_venta_detalle(articulo_id);

-- Índices para documentos_compra
CREATE INDEX IF NOT EXISTS idx_documentos_compra_folio ON documentos_compra(folio);
CREATE INDEX IF NOT EXISTS idx_documentos_compra_proveedor ON documentos_compra(proveedor_entidad_id);
CREATE INDEX IF NOT EXISTS idx_documentos_compra_tipo ON documentos_compra(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_compra_estado ON documentos_compra(estado);
CREATE INDEX IF NOT EXISTS idx_documentos_compra_fecha ON documentos_compra(fecha);

-- Índices para documentos_compra_detalle
CREATE INDEX IF NOT EXISTS idx_documentos_compra_detalle_cabecera ON documentos_compra_detalle(documento_compra_id);
CREATE INDEX IF NOT EXISTS idx_documentos_compra_detalle_articulo ON documentos_compra_detalle(articulo_id);

-- Índices para articulos_series
CREATE INDEX IF NOT EXISTS idx_articulos_series_articulo ON articulos_series(articulo_id);
CREATE INDEX IF NOT EXISTS idx_articulos_series_estado ON articulos_series(estado);
CREATE INDEX IF NOT EXISTS idx_articulos_series_numero ON articulos_series(numero_serie);

-- Índices para comprobantes_fiscales
CREATE INDEX IF NOT EXISTS idx_comprobantes_fiscales_documento ON comprobantes_fiscales(documento_venta_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_fiscales_uuid ON comprobantes_fiscales(uuid);
CREATE INDEX IF NOT EXISTS idx_comprobantes_fiscales_estatus ON comprobantes_fiscales(estatus);

-- Índice en inventario_movimientos para nuevos campos
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_documento_detalle
    ON inventario_movimientos(documento_detalle_tipo, documento_detalle_id);

-- ============================================================
-- 7. ACTUALIZAR TRIGGERS DE AUDITORÍA para nuevos nombres
-- ============================================================

-- Trigger para documentos_venta (antes ventas)
DROP TRIGGER IF EXISTS trg_auditar_documentos_venta ON documentos_venta;
CREATE TRIGGER trg_auditar_documentos_venta
AFTER INSERT OR UPDATE OR DELETE ON documentos_venta
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

-- Trigger para documentos_venta_detalle (antes ventas_detalle)
DROP TRIGGER IF EXISTS trg_auditar_documentos_venta_detalle ON documentos_venta_detalle;
CREATE TRIGGER trg_auditar_documentos_venta_detalle
AFTER INSERT OR UPDATE OR DELETE ON documentos_venta_detalle
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

-- Trigger para comprobantes_fiscales
DROP TRIGGER IF EXISTS trg_auditar_comprobantes_fiscales ON comprobantes_fiscales;
CREATE TRIGGER trg_auditar_comprobantes_fiscales
AFTER INSERT OR UPDATE OR DELETE ON comprobantes_fiscales
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

-- Trigger para articulos_series
DROP TRIGGER IF EXISTS trg_auditar_articulos_series ON articulos_series;
CREATE TRIGGER trg_auditar_articulos_series
AFTER INSERT OR UPDATE OR DELETE ON articulos_series
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

-- Eliminar triggers viejos si las tablas viejas aún existen
DROP TRIGGER IF EXISTS trg_auditar_ventas ON ventas;
DROP TRIGGER IF EXISTS trg_auditar_ventas_detalle ON ventas_detalle;
