-- ============================================================
-- MIGRACIÓN v12 - Corrección de vistas y catálogo contable
-- 1. Agrega columna naturaleza a cuentas_contables
-- 2. Asegura que el catálogo de cuentas esté completo
-- 3. Agrega almacen_destino_id a transacciones
-- 4. Actualiza v_movimientos_inventario para incluir referencia_id
-- ============================================================

BEGIN;

-- ============================================================
-- 0. Agregar almacen_destino_id a transacciones (para traspasos)
-- ============================================================
ALTER TABLE transacciones
ADD COLUMN IF NOT EXISTS almacen_destino_id INTEGER REFERENCES almacenes(id);

-- ============================================================
-- 1. Agregar columna naturaleza a cuentas_contables
-- ============================================================
ALTER TABLE cuentas_contables
ADD COLUMN IF NOT EXISTS naturaleza VARCHAR(20)
CHECK (naturaleza IN ('deudora', 'acreedora'));

-- Asignar naturaleza según el tipo de cuenta
UPDATE cuentas_contables SET naturaleza = 'deudora'
WHERE codigo LIKE '1%' AND naturaleza IS NULL;  -- Activo: deudora

UPDATE cuentas_contables SET naturaleza = 'acreedora'
WHERE codigo LIKE '2%' AND naturaleza IS NULL;  -- Pasivo: acreedora

UPDATE cuentas_contables SET naturaleza = 'acreedora'
WHERE codigo LIKE '3%' AND naturaleza IS NULL;  -- Capital: acreedora

UPDATE cuentas_contables SET naturaleza = 'acreedora'
WHERE codigo LIKE '4%' AND naturaleza IS NULL;  -- Ingresos: acreedora

UPDATE cuentas_contables SET naturaleza = 'deudora'
WHERE codigo LIKE '5%' AND naturaleza IS NULL;  -- Costos: deudora

UPDATE cuentas_contables SET naturaleza = 'deudora'
WHERE codigo LIKE '6%' AND naturaleza IS NULL;  -- Gastos: deudora

-- ============================================================
-- 2. Insertar catálogo completo de cuentas contables si faltan
-- ============================================================

-- Cuentas de nivel 1 (mayor) si no existen
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, naturaleza) VALUES
    ('1000', 'Activo', 'mayor', 1, 'deudora'),
    ('2000', 'Pasivo', 'mayor', 1, 'acreedora'),
    ('3000', 'Capital Contable', 'mayor', 1, 'acreedora'),
    ('4000', 'Ingresos', 'mayor', 1, 'acreedora'),
    ('5000', 'Costos', 'mayor', 1, 'deudora'),
    ('6000', 'Gastos', 'mayor', 1, 'deudora')
ON CONFLICT (codigo) DO UPDATE SET naturaleza = EXCLUDED.naturaleza
WHERE cuentas_contables.naturaleza IS NULL;

-- Cuentas de nivel 2 (control) bajo Activo (1000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('1100', 'Activo Circulante', 'control', 2),
    ('1200', 'Activo No Circulante', 'control', 2),
    ('1300', 'Activo Diferido', 'control', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 3 (detalle) bajo Activo Circulante (1100)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1100')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('1101', 'Caja Chica', 'detalle', 3),
    ('1102', 'Bancos', 'detalle', 3),
    ('1103', 'Inversiones Temporales', 'detalle', 3),
    ('1104', 'Clientes', 'detalle', 3),
    ('1105', 'Deudores Diversos', 'detalle', 3),
    ('1106', 'Documentos por Cobrar', 'detalle', 3),
    ('1107', 'IVA Acreditable', 'detalle', 3),
    ('1108', 'IVA por Acreditar', 'detalle', 3),
    ('1109', 'Inventarios', 'detalle', 3),
    ('1110', 'Anticipo a Proveedores', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 3 (detalle) bajo Activo No Circulante (1200)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1200')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('1201', 'Propiedades, Planta y Equipo', 'detalle', 3),
    ('1202', 'Depreciación Acumulada', 'detalle', 3),
    ('1203', 'Mobiliario y Equipo de Oficina', 'detalle', 3),
    ('1204', 'Equipo de Cómputo', 'detalle', 3),
    ('1205', 'Equipo de Transporte', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 3 (detalle) bajo Activo Diferido (1300)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1300')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('1301', 'Gastos de Instalación', 'detalle', 3),
    ('1302', 'Gastos de Organización', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Pasivo (2000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '2000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'acreedora'
FROM (VALUES
    ('2100', 'Pasivo Circulante', 'control', 2),
    ('2200', 'Pasivo No Circulante', 'control', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Pasivo Circulante (2100)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '2100')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'acreedora'
FROM (VALUES
    ('2101', 'Proveedores', 'detalle', 3),
    ('2102', 'Acreedores Diversos', 'detalle', 3),
    ('2103', 'Documentos por Pagar', 'detalle', 3),
    ('2104', 'IVA por Pagar', 'detalle', 3),
    ('2105', 'ISR por Pagar', 'detalle', 3),
    ('2106', 'Impuestos y Derechos por Pagar', 'detalle', 3),
    ('2107', 'Sueldos por Pagar', 'detalle', 3),
    ('2108', 'IVA Trasladado', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Pasivo No Circulante (2200)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '2200')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'acreedora'
FROM (VALUES
    ('2201', 'Préstamos Bancarios Largo Plazo', 'detalle', 3),
    ('2202', 'Acreedores Hipotecarios', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Capital Contable (3000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '3000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'acreedora'
FROM (VALUES
    ('3100', 'Capital Social', 'detalle', 2),
    ('3200', 'Utilidad del Ejercicio', 'detalle', 2),
    ('3300', 'Utilidad de Ejercicios Anteriores', 'detalle', 2),
    ('3400', 'Reserva Legal', 'detalle', 2),
    ('3500', 'Pérdida del Ejercicio', 'detalle', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Ingresos (4000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '4000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'acreedora'
FROM (VALUES
    ('4100', 'Ventas', 'detalle', 2),
    ('4200', 'Devoluciones sobre Ventas', 'detalle', 2),
    ('4300', 'Descuentos sobre Ventas', 'detalle', 2),
    ('4400', 'Otros Ingresos', 'detalle', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Costos (5000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '5000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('5100', 'Costo de Ventas', 'detalle', 2),
    ('5200', 'Costo de Producción', 'detalle', 2),
    ('5300', 'Compras', 'detalle', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Gastos (6000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '6000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('6100', 'Gastos de Operación', 'control', 2),
    ('6200', 'Gastos de Venta', 'control', 2),
    ('6300', 'Gastos Financieros', 'control', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Gastos de Operación (6100)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '6100')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('6101', 'Sueldos y Salarios', 'detalle', 3),
    ('6102', 'Rentas', 'detalle', 3),
    ('6103', 'Servicios de Agua, Luz y Teléfono', 'detalle', 3),
    ('6104', 'Papelería y Útiles de Oficina', 'detalle', 3),
    ('6105', 'Honorarios Profesionales', 'detalle', 3),
    ('6106', 'Depreciación de Equipo', 'detalle', 3),
    ('6107', 'Gastos de Mantenimiento', 'detalle', 3),
    ('6108', 'Seguros', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Gastos de Venta (6200)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '6200')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('6201', 'Comisiones sobre Ventas', 'detalle', 3),
    ('6202', 'Publicidad y Propaganda', 'detalle', 3),
    ('6203', 'Gastos de Envío', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Gastos Financieros (6300)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '6300')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id, naturaleza)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre), 'deudora'
FROM (VALUES
    ('6301', 'Intereses Bancarios', 'detalle', 3),
    ('6302', 'Comisiones Bancarias', 'detalle', 3),
    ('6303', 'Gastos por Intereses', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- ============================================================
-- 3. Recrear v_movimientos_inventario con referencia_id
-- ============================================================

DROP VIEW IF EXISTS v_movimientos_inventario;

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
    t.tipo AS referencia_tipo,
    td.transaccion_id AS referencia_id,
    COALESCE(
        (SELECT json_agg(json_build_object('numero_serie', ts.numero_serie, 'estado', ts.estado))
         FROM transacciones_series ts WHERE ts.transaccion_detalle_id = td.id),
        '[]'::json
    ) AS series
FROM transacciones_detalle td
JOIN transacciones t ON t.id = td.transaccion_id AND t.estado NOT IN ('cancelado')
JOIN articulos a ON a.id = td.articulo_id
LEFT JOIN almacenes al ON al.id = td.almacen_id;

COMMIT;
