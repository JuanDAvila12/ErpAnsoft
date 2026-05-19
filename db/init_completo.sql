-- ============================================================
-- SCRIPT DE INICIALIZACIÓN COMPLETO - SPI ERP
-- Unifica init.sql + migration_v3 + migration_v4 + 
-- migration_v4_unificacion + migration_v5_expansion
-- SIN BEGIN/COMMIT para compatibilidad con docker-entrypoint-initdb.d
-- ============================================================

-- ============================================================
-- PARTE 1: CATÁLOGOS MAESTROS BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS monedas (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(3) NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    simbolo         VARCHAR(10) DEFAULT '$',
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO monedas (codigo, nombre, simbolo) VALUES
    ('MXN', 'Peso Mexicano', '$'),
    ('USD', 'Dólar Americano', 'US$'),
    ('EUR', 'Euro', '€')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS paises (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(3) NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    nacionalidad    VARCHAR(100),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO paises (codigo, nombre, nacionalidad) VALUES
    ('MEX', 'México', 'Mexicana'),
    ('USA', 'Estados Unidos', 'Americana'),
    ('CAN', 'Canadá', 'Canadiense')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS impuestos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    tasa            DECIMAL(5,2) NOT NULL,
    tipo            VARCHAR(20) DEFAULT 'IVA' CHECK (tipo IN ('IVA', 'IEPS', 'ISR', 'Otro')),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO impuestos (nombre, tasa, tipo) VALUES
    ('IVA 16%', 16.00, 'IVA'),
    ('IVA 8% Fronterizo', 8.00, 'IVA'),
    ('IVA 0%', 0.00, 'IVA'),
    ('IEPS Gasolina', 5.00, 'IEPS')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS formas_pago (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO formas_pago (clave_sat, nombre) VALUES
    ('01', 'Efectivo'), ('02', 'Cheque nominativo'), ('03', 'Transferencia electrónica de fondos'),
    ('04', 'Tarjeta de crédito'), ('05', 'Monedero electrónico'), ('06', 'Dinero electrónico'),
    ('08', 'Vales de despensa'), ('12', 'Dación en pago'), ('13', 'Pago por subrogación'),
    ('14', 'Pago por consignación'), ('15', 'Condonación'), ('17', 'Compensación'),
    ('23', 'Novación'), ('24', 'Confusión'), ('25', 'Remisión de deuda'),
    ('26', 'Prescripción o caducidad'), ('27', 'A satisfacción del acreedor'),
    ('28', 'Tarjeta de débito'), ('29', 'Tarjeta de servicios'),
    ('30', 'Aplicación de anticipos'), ('31', 'Intermediario pagos'), ('99', 'Por definir')
ON CONFLICT (clave_sat) DO NOTHING;

CREATE TABLE IF NOT EXISTS listas_precios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    factor_descuento DECIMAL(5,2) DEFAULT 0.00,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO listas_precios (nombre, factor_descuento) VALUES
    ('Precio Público General', 0.00), ('Precio Mayorista', 10.00),
    ('Precio Distribuidor', 20.00), ('Precio Especial', 35.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PARTE 2: ENTIDADES Y USUARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS entidades (
    id              SERIAL PRIMARY KEY,
    razon_social    VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    rfc             VARCHAR(13) NOT NULL UNIQUE,
    regimen_fiscal  VARCHAR(10) DEFAULT '601',
    email           VARCHAR(255),
    telefono        VARCHAR(30),
    contacto_nombre VARCHAR(255),
    direccion       TEXT,
    cp              VARCHAR(5),
    pais_id         INTEGER REFERENCES paises(id),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    CREATE TYPE entidad_rol_enum AS ENUM ('cliente', 'proveedor', 'vendedor', 'contacto', 'empleado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS entidad_roles (
    id              SERIAL PRIMARY KEY,
    entidad_id      INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
    rol             entidad_rol_enum NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entidad_id, rol)
);

CREATE TABLE IF NOT EXISTS roles (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     VARCHAR(255)
);

INSERT INTO roles (nombre, descripcion) VALUES
    ('admin', 'Administrador del sistema con acceso total'),
    ('almacen', 'Usuario de almacén / inventario'),
    ('ventas', 'Usuario del módulo de ventas'),
    ('consulta', 'Usuario de solo lectura')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nombre          VARCHAR(255) NOT NULL,
    rol_id          INTEGER NOT NULL REFERENCES roles(id),
    entidad_id      INTEGER REFERENCES entidades(id),
    activo          BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- PARTE 3: ARTÍCULOS, ALMACENES E INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS articulos (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(50) NOT NULL UNIQUE,
    nombre          VARCHAR(255) NOT NULL,
    precio_venta    DECIMAL(12,2) NOT NULL DEFAULT 0,
    costo_promedio  DECIMAL(12,2) NOT NULL DEFAULT 0,
    clave_sat       VARCHAR(8),
    stock_minimo    DECIMAL(12,2) NOT NULL DEFAULT 0,
    lista_precio_id INTEGER REFERENCES listas_precios(id),
    impuesto_id     INTEGER REFERENCES impuestos(id),
    unidad_medida_id INTEGER,
    categoria_id    INTEGER,
    marca_id        INTEGER,
    codigo_barras   VARCHAR(128),
    usa_serie       BOOLEAN DEFAULT FALSE,
    imagen_url      TEXT,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS almacenes (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    ubicacion       VARCHAR(255),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO almacenes (nombre, ubicacion) VALUES
    ('Almacén Central', 'Av. Principal #123, Col. Centro'),
    ('Almacén Sucursal Norte', 'Blvd. Norte #456, Col. Industrial'),
    ('Almacén Sucursal Sur', 'Calle Sur #789, Col. Comercial')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id              SERIAL PRIMARY KEY,
    articulo_id     INTEGER NOT NULL REFERENCES articulos(id),
    cantidad        DECIMAL(12,2) NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'inicial')),
    almacen_id      INTEGER REFERENCES almacenes(id),
    referencia_tipo VARCHAR(50),
    referencia_id   INTEGER,
    documento_detalle_tipo VARCHAR(20),
    documento_detalle_id INTEGER,
    creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PARTE 4: CONTROL DE FOLIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS control_folios (
    tipo_documento  VARCHAR(10) PRIMARY KEY,
    fecha_actual    DATE DEFAULT CURRENT_DATE,
    ultimo_numero   INTEGER DEFAULT 0
);

INSERT INTO control_folios (tipo_documento) VALUES
    ('VTA'), ('COT'), ('OV'), ('FAC'), ('OC'), ('COM'),
    ('COTC'), ('RECC'), ('TRAS'), ('RECT'),
    ('AJU'), ('ENT'), ('SAL'), ('PAG'), ('COB')
ON CONFLICT (tipo_documento) DO NOTHING;

-- ============================================================
-- PARTE 5: CONFIGURACIÓN DEL SISTEMA
-- ============================================================

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

INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo_dato) VALUES
    ('empresa_nombre', 'Mi Empresa S.A. de C.V.', 'Nombre legal de la empresa', 'texto'),
    ('empresa_rfc', 'XAXX010101000', 'Registro Federal de Contribuyentes', 'texto'),
    ('empresa_regimen_fiscal', '601', 'Régimen fiscal de la empresa (SAT)', 'texto'),
    ('empresa_cp', '00000', 'Código postal de la empresa', 'texto'),
    ('empresa_direccion', 'Dirección Fiscal', 'Dirección fiscal de la empresa', 'texto'),
    ('moneda_base', 'MXN', 'Moneda base del sistema', 'texto'),
    ('iva_porcentaje', '16', 'Porcentaje de IVA general', 'numero'),
    ('iva_tasa', '0.16', 'Tasa de IVA para cálculos contables', 'numero'),
    ('version_sistema', '2.0.0', 'Versión actual del sistema ERP', 'texto'),
    ('certificado_sat_archivo', '', 'Ruta al archivo .cer del SAT', 'texto'),
    ('certificado_sat_key', '', 'Ruta al archivo .key del SAT', 'texto'),
    ('certificado_sat_password', '', 'Password del key del SAT', 'texto'),
    ('serie_factura_default', 'F', 'Serie por defecto para facturación', 'texto'),
    ('lugar_expedicion', '00000', 'Lugar de expedición (CP)', 'texto')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- PARTE 6: CATÁLOGOS SAT (migration_v3)
-- ============================================================

CREATE TABLE IF NOT EXISTS unidades_medida (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO unidades_medida (clave_sat, nombre, descripcion) VALUES
    ('H87', 'Pieza', 'Pieza / Unidad'), ('KGM', 'Kilogramo', 'Kilogramo'),
    ('LTR', 'Litro', 'Litro'), ('MTR', 'Metro', 'Metro'),
    ('E48', 'Servicio', 'Servicio profesional'), ('EA', 'Elemento', 'Elemento / Unidad individual'),
    ('GRM', 'Gramo', 'Gramo'), ('MTK', 'Metro Cuadrado', 'Metro cuadrado'),
    ('MGM', 'Miligramo', 'Miligramo'), ('MLT', 'Mililitro', 'Mililitro'),
    ('BX', 'Caja', 'Caja'), ('DZ', 'Docena', 'Docena / 12 unidades'),
    ('KT', 'Kit', 'Kit / Conjunto')
ON CONFLICT (clave_sat) DO NOTHING;

CREATE TABLE IF NOT EXISTS categorias_producto (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    padre_id        INTEGER REFERENCES categorias_producto(id),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categorias_producto (nombre, padre_id) VALUES
    ('Electrónicos', NULL), ('Cómputo', (SELECT id FROM categorias_producto WHERE nombre = 'Electrónicos')),
    ('Periféricos', (SELECT id FROM categorias_producto WHERE nombre = 'Electrónicos')),
    ('Telefonía', (SELECT id FROM categorias_producto WHERE nombre = 'Electrónicos')),
    ('Oficina', NULL), ('Papelería', (SELECT id FROM categorias_producto WHERE nombre = 'Oficina')),
    ('Mobiliario', (SELECT id FROM categorias_producto WHERE nombre = 'Oficina')), ('Servicios', NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS marcas (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO marcas (nombre) VALUES
    ('HP'), ('Dell'), ('Lenovo'), ('Logitech'), ('Samsung'), ('Apple'), ('Genérica')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS terminos_pago (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    dias_credito    INTEGER NOT NULL DEFAULT 0,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO terminos_pago (nombre, dias_credito) VALUES
    ('Contado', 0), ('Neto 15', 15), ('Neto 30', 30), ('Neto 60', 60)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS regimenes_fiscales (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO regimenes_fiscales (clave_sat, descripcion) VALUES
    ('601', 'General de Ley Personas Morales'), ('603', 'Personas Morales con Fines no Lucrativos'),
    ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios'), ('606', 'Arrendamiento'),
    ('608', 'Demás ingresos'), ('612', 'Personas Morales del Régimen de Coodinados'),
    ('620', 'Sociedades Cooperativas de Producción'), ('621', 'Incorporación Fiscal'),
    ('622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras'),
    ('623', 'Opcional para Grupos de Sociedades'), ('624', 'Coordinados'),
    ('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas'),
    ('626', 'Régimen Simplificado de Confianza')
ON CONFLICT (clave_sat) DO NOTHING;

CREATE TABLE IF NOT EXISTS usos_cfdi (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usos_cfdi (clave_sat, descripcion) VALUES
    ('G01', 'Adquisición de mercancías'), ('G02', 'Devoluciones, descuentos o bonificaciones'),
    ('G03', 'Gastos en general'), ('I01', 'Construcciones'),
    ('I02', 'Mobiliario y equipo de oficina por inversiones'), ('I03', 'Equipo de transporte'),
    ('P01', 'Por definir'), ('D01', 'Honorarios médicos, dentales y gastos hospitalarios'),
    ('D02', 'Gastos médicos por incapacidad o discapacidad'), ('D03', 'Gastos funerarios'),
    ('D04', 'Donativos'), ('D05', 'Intereses reales efectivamente pagados por créditos hipotecarios'),
    ('D06', 'Aportaciones voluntarias al SAR'), ('D07', 'Primas por seguros de gastos médicos'),
    ('D08', 'Gastos de transportación escolar obligatoria'), ('D09', 'Depósitos en cuentas para el ahorro'),
    ('D10', 'Pagos por servicios educativos')
ON CONFLICT (clave_sat) DO NOTHING;

CREATE TABLE IF NOT EXISTS metodos_pago_sat (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO metodos_pago_sat (clave_sat, descripcion) VALUES
    ('PUE', 'Pago en una sola exhibición'), ('PPD', 'Pago en parcialidades o diferido')
ON CONFLICT (clave_sat) DO NOTHING;

CREATE TABLE IF NOT EXISTS objetos_impuesto (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(2) UNIQUE NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO objetos_impuesto (clave_sat, descripcion) VALUES
    ('01', 'No objeto de impuesto'), ('02', 'Sí objeto de impuesto'),
    ('03', 'Sí objeto de impuesto y no obligado al desglose')
ON CONFLICT (clave_sat) DO NOTHING;

CREATE TABLE IF NOT EXISTS series_documentos (
    id              SERIAL PRIMARY KEY,
    tipo            VARCHAR(20) NOT NULL,
    serie           VARCHAR(5) NOT NULL,
    codigo          VARCHAR(10),
    descripcion     VARCHAR(255),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo, serie)
);

INSERT INTO series_documentos (tipo, serie, codigo, descripcion) VALUES
    ('cotizacion', 'COT', 'COT', 'Cotizaciones'),
    ('orden_venta', 'OV', 'OV', 'Órdenes de venta'),
    ('venta', 'F', 'F', 'Facturación / Ventas'),
    ('orden_compra', 'OC', 'OC', 'Órdenes de compra'),
    ('compra', 'COM', 'COM', 'Comprobantes de compra'),
    ('cotizacion_compra', 'COTC', 'COTC', 'Cotizaciones de compra'),
    ('recepcion_compra', 'RECC', 'RECC', 'Recepciones de compra'),
    ('traspaso', 'TRAS', 'TRAS', 'Traspasos entre almacenes'),
    ('recepcion_traspaso', 'RECT', 'RECT', 'Recepciones de traspaso'),
    ('ajuste', 'AJU', 'AJU', 'Ajustes de inventario'),
    ('entrada', 'ENT', 'ENT', 'Entradas de inventario'),
    ('salida', 'SAL', 'SAL', 'Salidas de inventario'),
    ('pago', 'PAG', 'PAG', 'Pagos'),
    ('cobro', 'COB', 'COB', 'Cobros')
ON CONFLICT (tipo, serie) DO NOTHING;

-- ============================================================
-- PARTE 7: FUNCIÓN DE FOLIO
-- ============================================================

CREATE OR REPLACE FUNCTION obtener_folio(tipo_doc VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_folio     VARCHAR(20);
    v_hoy       DATE := CURRENT_DATE;
    v_ultimo    INTEGER;
    v_serie     VARCHAR(5);
    v_fecha_actual DATE;
BEGIN
    SELECT ultimo_numero, fecha_actual INTO v_ultimo, v_fecha_actual
    FROM control_folios
    WHERE tipo_documento = tipo_doc
    FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO control_folios (tipo_documento, ultimo_numero, fecha_actual)
        VALUES (tipo_doc, 0, CURRENT_DATE)
        RETURNING ultimo_numero, fecha_actual INTO v_ultimo, v_fecha_actual;
    END IF;
    IF v_fecha_actual <> CURRENT_DATE THEN
        v_ultimo := 0;
    END IF;
    v_ultimo := v_ultimo + 1;
    UPDATE control_folios
    SET ultimo_numero = v_ultimo, fecha_actual = CURRENT_DATE
    WHERE tipo_documento = tipo_doc;
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

CREATE OR REPLACE FUNCTION obtener_folio_venta()
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN obtener_folio('VTA');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PARTE 8: TABLAS LEGACY (compatibilidad)
-- ============================================================

CREATE TABLE IF NOT EXISTS ventas (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER,
    entidad_cliente_id INTEGER REFERENCES entidades(id),
    entidad_vendedor_id INTEGER REFERENCES entidades(id),
    folio           VARCHAR(50) NOT NULL UNIQUE,
    fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    metodo_pago     VARCHAR(50) DEFAULT 'efectivo',
    forma_pago_id   INTEGER REFERENCES formas_pago(id),
    estatus         VARCHAR(20) DEFAULT 'completada' CHECK (estatus IN ('completada', 'cancelada', 'pendiente')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas_detalle (
    id              SERIAL PRIMARY KEY,
    venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE RESTRICT,
    articulo_id     INTEGER NOT NULL REFERENCES articulos(id),
    cantidad        DECIMAL(12,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal        DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asientos_contables (
    id              SERIAL PRIMARY KEY,
    referencia_tipo VARCHAR(50) NOT NULL,
    referencia_id   INTEGER NOT NULL,
    cuenta_contable VARCHAR(20) NOT NULL,
    debe            DECIMAL(12,2) NOT NULL DEFAULT 0,
    haber           DECIMAL(12,2) NOT NULL DEFAULT 0,
    fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PARTE 9: DOCUMENTOS DE VENTA (migration_v3)
-- ============================================================

-- Renombrar ventas a documentos_venta si existen
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas') THEN
        ALTER TABLE ventas RENAME TO documentos_venta;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_detalle') THEN
        ALTER TABLE ventas_detalle RENAME TO documentos_venta_detalle;
    END IF;
END $$;

-- Agregar columnas a documentos_venta
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta' AND column_name = 'tipo') THEN
        ALTER TABLE documentos_venta ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'venta'
            CHECK (tipo IN ('cotizacion','orden_venta','venta'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta' AND column_name = 'estado') THEN
        ALTER TABLE documentos_venta ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'confirmado'
            CHECK (estado IN ('borrador','pendiente','confirmado','facturado','cancelado'));
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta' AND column_name = 'estatus') THEN
        UPDATE documentos_venta SET estado = CASE estatus
            WHEN 'completada' THEN 'confirmado' WHEN 'cancelada' THEN 'cancelado'
            WHEN 'pendiente' THEN 'pendiente' ELSE 'confirmado' END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta' AND column_name = 'documento_origen_id') THEN
        ALTER TABLE documentos_venta ADD COLUMN documento_origen_id INTEGER REFERENCES documentos_venta(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta' AND column_name = 'terminos_pago_id') THEN
        ALTER TABLE documentos_venta ADD COLUMN terminos_pago_id INTEGER REFERENCES terminos_pago(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta' AND column_name = 'fecha_vencimiento') THEN
        ALTER TABLE documentos_venta ADD COLUMN fecha_vencimiento DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta' AND column_name = 'serie_id') THEN
        ALTER TABLE documentos_venta ADD COLUMN serie_id INTEGER REFERENCES series_documentos(id);
    END IF;
END $$;

-- Renombrar columna venta_id a documento_venta_id
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_venta_detalle' AND column_name = 'venta_id') THEN
        ALTER TABLE documentos_venta_detalle RENAME COLUMN venta_id TO documento_venta_id;
    END IF;
END $$;

-- ============================================================
-- PARTE 10: DOCUMENTOS DE COMPRA (migration_v3)
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
-- PARTE 11: SERIES DE ARTÍCULOS Y COMPROBANTES FISCALES
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
-- PARTE 12: PERMISOS RBAC (migration_v4)
-- ============================================================

CREATE TABLE IF NOT EXISTS permisos (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    modulo          VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id          INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id      INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rol_id, permiso_id)
);

INSERT INTO permisos (codigo, descripcion, modulo) VALUES
    ('ventas.ver', 'Ver módulo de ventas', 'ventas'),
    ('ventas.crear', 'Crear cotizaciones, órdenes y facturas', 'ventas'),
    ('ventas.editar', 'Editar documentos de venta', 'ventas'),
    ('ventas.cancelar', 'Cancelar documentos de venta', 'ventas'),
    ('ventas.exportar', 'Exportar datos de ventas', 'ventas'),
    ('compras.ver', 'Ver módulo de compras', 'compras'),
    ('compras.crear', 'Crear órdenes de compra', 'compras'),
    ('compras.editar', 'Editar órdenes de compra', 'compras'),
    ('compras.cancelar', 'Cancelar órdenes de compra', 'compras'),
    ('compras.cotizaciones', 'Cotizaciones de Compra', 'compras'),
    ('compras.recepciones', 'Recepciones de Compra', 'compras'),
    ('compras.reportes', 'Reportes de Compras', 'compras'),
    ('inventario.ver', 'Ver módulo de inventario', 'inventario'),
    ('inventario.crear', 'Crear movimientos de inventario