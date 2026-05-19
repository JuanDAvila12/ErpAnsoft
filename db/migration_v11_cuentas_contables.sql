-- ============================================================
-- MIGRACIÓN v11 - Catálogo completo de cuentas contables
-- Inserta 30+ cuentas contables mexicanas con estructura de árbol
-- ============================================================

-- Insertar cuentas de nivel 1 (mayor) si no existen
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel) VALUES
    ('1000', 'Activo', 'mayor', 1),
    ('2000', 'Pasivo', 'mayor', 1),
    ('3000', 'Capital Contable', 'mayor', 1),
    ('4000', 'Ingresos', 'mayor', 1),
    ('5000', 'Costos', 'mayor', 1),
    ('6000', 'Gastos', 'mayor', 1)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar cuentas de nivel 2 (control) bajo Activo (1000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('1100', 'Activo Circulante', 'control', 2),
    ('1200', 'Activo No Circulante', 'control', 2),
    ('1300', 'Activo Diferido', 'control', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Insertar cuentas de nivel 3 (detalle) bajo Activo Circulante (1100)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1100')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
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

-- Insertar cuentas de nivel 3 (detalle) bajo Activo No Circulante (1200)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1200')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('1201', 'Propiedades, Planta y Equipo', 'detalle', 3),
    ('1202', 'Depreciación Acumulada', 'detalle', 3),
    ('1203', 'Mobiliario y Equipo de Oficina', 'detalle', 3),
    ('1204', 'Equipo de Cómputo', 'detalle', 3),
    ('1205', 'Equipo de Transporte', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Insertar cuentas de nivel 3 (detalle) bajo Activo Diferido (1300)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '1300')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('1301', 'Gastos de Instalación', 'detalle', 3),
    ('1302', 'Gastos de Organización', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Pasivo (2000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '2000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('2100', 'Pasivo Circulante', 'control', 2),
    ('2200', 'Pasivo No Circulante', 'control', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Pasivo Circulante (2100)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '2100')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
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
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('2201', 'Préstamos Bancarios Largo Plazo', 'detalle', 3),
    ('2202', 'Acreedores Hipotecarios', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Capital Contable (3000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '3000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
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
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
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
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('5100', 'Costo de Ventas', 'detalle', 2),
    ('5200', 'Costo de Producción', 'detalle', 2),
    ('5300', 'Compras', 'detalle', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Cuentas de nivel 2 bajo Gastos (6000)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '6000')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('6100', 'Gastos de Operación', 'control', 2),
    ('6200', 'Gastos de Venta', 'control', 2),
    ('6300', 'Gastos Financieros', 'control', 2)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Gastos de Operación (6100)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '6100')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
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
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('6201', 'Comisiones sobre Ventas', 'detalle', 3),
    ('6202', 'Publicidad y Propaganda', 'detalle', 3),
    ('6203', 'Gastos de Envío', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);

-- Detalle bajo Gastos Financieros (6300)
WITH padre AS (SELECT id FROM cuentas_contables WHERE codigo = '6300')
INSERT INTO cuentas_contables (codigo, nombre, tipo, nivel, padre_id)
SELECT v.codigo, v.nombre, v.tipo, v.nivel, (SELECT id FROM padre)
FROM (VALUES
    ('6301', 'Intereses Bancarios', 'detalle', 3),
    ('6302', 'Comisiones Bancarias', 'detalle', 3),
    ('6303', 'Gastos por Intereses', 'detalle', 3)
) AS v(codigo, nombre, tipo, nivel)
WHERE NOT EXISTS (SELECT 1 FROM cuentas_contables WHERE codigo = v.codigo)
AND EXISTS (SELECT 1 FROM padre);
