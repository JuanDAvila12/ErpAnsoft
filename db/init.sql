-- ============================================================
-- Script de inicialización base - SPI ERP
-- Solo definiciones de tablas y catálogos maestros
-- ============================================================

-- Catálogo de monedas
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

-- Catálogo de países
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

-- Catálogo de impuestos
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

-- Catálogo de formas de pago (claves SAT)
CREATE TABLE IF NOT EXISTS formas_pago (
    id              SERIAL PRIMARY KEY,
    clave_sat       VARCHAR(3) NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO formas_pago (clave_sat, nombre) VALUES
    ('01', 'Efectivo'),
    ('02', 'Cheque nominativo'),
    ('03', 'Transferencia electrónica de fondos'),
    ('04', 'Tarjeta de crédito'),
    ('05', 'Monedero electrónico'),
    ('06', 'Dinero electrónico'),
    ('08', 'Vales de despensa'),
    ('12', 'Dación en pago'),
    ('13', 'Pago por subrogación'),
    ('14', 'Pago por consignación'),
    ('15', 'Condonación'),
    ('17', 'Compensación'),
    ('23', 'Novación'),
    ('24', 'Confusión'),
    ('25', 'Remisión de deuda'),
    ('26', 'Prescripción o caducidad'),
    ('27', 'A satisfacción del acreedor'),
    ('28', 'Tarjeta de débito'),
    ('29', 'Tarjeta de servicios'),
    ('30', 'Aplicación de anticipos'),
    ('31', 'Intermediario pagos'),
    ('99', 'Por definir')
ON CONFLICT (clave_sat) DO NOTHING;

-- Catálogo de listas de precios
CREATE TABLE IF NOT EXISTS listas_precios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    factor_descuento DECIMAL(5,2) DEFAULT 0.00,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO listas_precios (nombre, factor_descuento) VALUES
    ('Precio Público General', 0.00),
    ('Precio Mayorista', 10.00),
    ('Precio Distribuidor', 20.00),
    ('Precio Especial', 35.00)
ON CONFLICT DO NOTHING;

-- Tabla de entidades
CREATE TABLE IF NOT EXISTS entidades (
    id              SERIAL PRIMARY KEY,
    razon_social    VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    rfc             VARCHAR(13) NOT NULL UNIQUE,
    regimen_fiscal  VARCHAR(10) DEFAULT '601',
    direccion       TEXT,
    cp              VARCHAR(5),
    pais_id         INTEGER REFERENCES paises(id),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ENUM de roles de entidad
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


-- Tabla de roles (necesaria para usuarios)
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
-- Tabla de usuarios

CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nombre          VARCHAR(255) NOT NULL,
    rol_id          INTEGER NOT NULL REFERENCES roles(id),
    entidad_id      INTEGER REFERENCES entidades(id),
    activo          BOOLEAN DEFAULT TRUE
);

-- Tabla de artículos
CREATE TABLE IF NOT EXISTS articulos (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(50) NOT NULL UNIQUE,
    nombre          VARCHAR(255) NOT NULL,
    precio_venta    DECIMAL(12,2) NOT NULL DEFAULT 0,
    costo_promedio  DECIMAL(12,2) NOT NULL DEFAULT 0,
    clave_sat       VARCHAR(8),
    stock_minimo    DECIMAL(12,2) NOT NULL DEFAULT 0,
    lista_precio_id INTEGER REFERENCES listas_precios(id),
    impuesto_id     INTEGER REFERENCES impuestos(id)
);

-- Tabla de almacenes
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

-- Tabla de inventario_movimientos
CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id              SERIAL PRIMARY KEY,
    articulo_id     INTEGER NOT NULL REFERENCES articulos(id),
    cantidad        DECIMAL(12,2) NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'inicial')),
    almacen_id      INTEGER REFERENCES almacenes(id),
    referencia_tipo VARCHAR(50),
    referencia_id   INTEGER,
    creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Control de folios
CREATE TABLE IF NOT EXISTS control_folios (
    tipo_documento  VARCHAR(10) PRIMARY KEY,
    fecha_actual    DATE DEFAULT CURRENT_DATE,
    ultimo_numero   INTEGER DEFAULT 0
);

INSERT INTO control_folios (tipo_documento) VALUES ('VTA')
ON CONFLICT (tipo_documento) DO NOTHING;

-- Tabla ventas
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

-- Tabla ventas_detalle
CREATE TABLE IF NOT EXISTS ventas_detalle (
    id              SERIAL PRIMARY KEY,
    venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE RESTRICT,
    articulo_id     INTEGER NOT NULL REFERENCES articulos(id),
    cantidad        DECIMAL(12,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal        DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla asientos_contables
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

-- Configuración del sistema
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
    ('version_sistema', '2.0.0', 'Versión actual del sistema ERP', 'texto'),
    ('certificado_sat_archivo', '', 'Ruta al archivo .cer del SAT', 'texto'),
    ('certificado_sat_key', '', 'Ruta al archivo .key del SAT', 'texto'),
    ('certificado_sat_password', '', 'Password del key del SAT', 'texto'),
    ('serie_factura_default', 'F', 'Serie por defecto para facturación', 'texto'),
    ('lugar_expedicion', '00000', 'Lugar de expedición (CP)', 'texto')
ON CONFLICT (clave) DO NOTHING;

-- Datos iniciales
INSERT INTO entidades (razon_social, nombre_comercial, rfc, regimen_fiscal, direccion, cp)
SELECT 'Mi Empresa S.A. de C.V.', 'SPI ERP', 'XAXX010101000', '601', 'Dirección Fiscal', '00000'
WHERE NOT EXISTS (SELECT 1 FROM entidades WHERE rfc = 'XAXX010101000');

INSERT INTO entidad_roles (entidad_id, rol)
SELECT id, 'vendedor'::entidad_rol_enum FROM entidades WHERE rfc = 'XAXX010101000'
ON CONFLICT (entidad_id, rol) DO NOTHING;

INSERT INTO usuarios (email, password_hash, nombre, rol_id, entidad_id, activo)
SELECT 'admin@spierp.com', '$2a$10$Ag8fxS7Od4dODbqyfGRueu.J7.hGwKFYLKY2AwBoXbuFR063qCFru', 'Administrador', r.id, e.id, TRUE
FROM roles r, entidades e
WHERE r.nombre = 'admin' AND e.rfc = 'XAXX010101000'
ON CONFLICT (email) DO NOTHING;

INSERT INTO articulos (sku, nombre, precio_venta, costo_promedio, clave_sat, stock_minimo) VALUES
    ('LAP001', 'Laptop HP ProBook 450', 18500.00, 14200.00, '43211509', 5),
    ('MON001', 'Monitor Dell 27" 4K', 8500.00, 6200.00, '43211509', 10),
    ('TEC001', 'Teclado Mecánico RGB', 1200.00, 780.00, '43211509', 15),
    ('MOU001', 'Mouse Inalámbrico Logitech', 650.00, 420.00, '43211509', 20),
    ('CAB001', 'Cable HDMI 2m', 180.00, 95.00, '43211509', 50)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario_movimientos (articulo_id, cantidad, tipo_movimiento) 
SELECT id, 50, 'inicial' FROM articulos WHERE sku = 'LAP001'
UNION ALL
SELECT id, 30, 'inicial' FROM articulos WHERE sku = 'MON001'
UNION ALL
SELECT id, 100, 'inicial' FROM articulos WHERE sku = 'TEC001'
UNION ALL
SELECT id, 80, 'inicial' FROM articulos WHERE sku = 'MOU001'
UNION ALL
SELECT id, 200, 'inicial' FROM articulos WHERE sku = 'CAB001';