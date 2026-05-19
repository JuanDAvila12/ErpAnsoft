-- ============================================================
-- DEMO DATA - SPI ERP
-- Datos de demostración para una empresa real
-- ============================================================
BEGIN;

-- ============================================================
-- 1. CATÁLOGOS BASE (solo si no existen)
-- ============================================================
INSERT INTO monedas (codigo, nombre, simbolo)
SELECT 'MXN', 'Peso Mexicano', '$'
WHERE NOT EXISTS (SELECT 1 FROM monedas WHERE codigo = 'MXN');

INSERT INTO monedas (codigo, nombre, simbolo)
SELECT 'USD', 'Dólar Americano', 'US$'
WHERE NOT EXISTS (SELECT 1 FROM monedas WHERE codigo = 'USD');

INSERT INTO unidades_medida (nombre, clave_sat)
SELECT 'Pieza', 'H87'
WHERE NOT EXISTS (SELECT 1 FROM unidades_medida WHERE nombre = 'Pieza');

INSERT INTO unidades_medida (nombre, clave_sat)
SELECT 'Kilogramo', 'KGM'
WHERE NOT EXISTS (SELECT 1 FROM unidades_medida WHERE nombre = 'Kilogramo');

INSERT INTO unidades_medida (nombre, clave_sat)
SELECT 'Litro', 'LTR'
WHERE NOT EXISTS (SELECT 1 FROM unidades_medida WHERE nombre = 'Litro');

INSERT INTO unidades_medida (nombre, clave_sat)
SELECT 'Metro', 'MTR'
WHERE NOT EXISTS (SELECT 1 FROM unidades_medida WHERE nombre = 'Metro');

INSERT INTO unidades_medida (nombre, clave_sat)
SELECT 'Caja', 'XBX'
WHERE NOT EXISTS (SELECT 1 FROM unidades_medida WHERE nombre = 'Caja');

INSERT INTO unidades_medida (nombre, clave_sat)
SELECT 'Servicio', 'E48'
WHERE NOT EXISTS (SELECT 1 FROM unidades_medida WHERE nombre = 'Servicio');

INSERT INTO formas_pago (clave_sat, nombre)
SELECT '01', 'Efectivo'
WHERE NOT EXISTS (SELECT 1 FROM formas_pago WHERE clave_sat = '01');

INSERT INTO formas_pago (clave_sat, nombre)
SELECT '03', 'Transferencia'
WHERE NOT EXISTS (SELECT 1 FROM formas_pago WHERE clave_sat = '03');

INSERT INTO formas_pago (clave_sat, nombre)
SELECT '04', 'Tarjeta Crédito'
WHERE NOT EXISTS (SELECT 1 FROM formas_pago WHERE clave_sat = '04');

INSERT INTO formas_pago (clave_sat, nombre)
SELECT '28', 'Tarjeta Débito'
WHERE NOT EXISTS (SELECT 1 FROM formas_pago WHERE clave_sat = '28');

INSERT INTO terminos_pago (nombre, dias_credito)
SELECT 'Contado', 0
WHERE NOT EXISTS (SELECT 1 FROM terminos_pago WHERE nombre = 'Contado');

INSERT INTO terminos_pago (nombre, dias_credito)
SELECT 'Neto 15', 15
WHERE NOT EXISTS (SELECT 1 FROM terminos_pago WHERE nombre = 'Neto 15');

INSERT INTO terminos_pago (nombre, dias_credito)
SELECT 'Neto 30', 30
WHERE NOT EXISTS (SELECT 1 FROM terminos_pago WHERE nombre = 'Neto 30');

INSERT INTO terminos_pago (nombre, dias_credito)
SELECT 'Neto 60', 60
WHERE NOT EXISTS (SELECT 1 FROM terminos_pago WHERE nombre = 'Neto 60');

INSERT INTO impuestos (nombre, tasa, tipo)
SELECT 'IVA 16%', 0.16, 'IVA'
WHERE NOT EXISTS (SELECT 1 FROM impuestos WHERE nombre = 'IVA 16%');

INSERT INTO impuestos (nombre, tasa, tipo)
SELECT 'IVA Exento', 0.00, 'IVA'
WHERE NOT EXISTS (SELECT 1 FROM impuestos WHERE nombre = 'IVA Exento');

INSERT INTO impuestos (nombre, tasa, tipo)
SELECT 'ISR 10%', 0.10, 'ISR'
WHERE NOT EXISTS (SELECT 1 FROM impuestos WHERE nombre = 'ISR 10%');

INSERT INTO categorias_producto (nombre)
SELECT 'Electrónicos'
WHERE NOT EXISTS (SELECT 1 FROM categorias_producto WHERE nombre = 'Electrónicos');

INSERT INTO categorias_producto (nombre)
SELECT 'Papelería'
WHERE NOT EXISTS (SELECT 1 FROM categorias_producto WHERE nombre = 'Papelería');

INSERT INTO categorias_producto (nombre)
SELECT 'Limpieza'
WHERE NOT EXISTS (SELECT 1 FROM categorias_producto WHERE nombre = 'Limpieza');

INSERT INTO categorias_producto (nombre)
SELECT 'Alimentos'
WHERE NOT EXISTS (SELECT 1 FROM categorias_producto WHERE nombre = 'Alimentos');

INSERT INTO categorias_producto (nombre)
SELECT 'Muebles'
WHERE NOT EXISTS (SELECT 1 FROM categorias_producto WHERE nombre = 'Muebles');

INSERT INTO categorias_producto (nombre)
SELECT 'Servicios'
WHERE NOT EXISTS (SELECT 1 FROM categorias_producto WHERE nombre = 'Servicios');

INSERT INTO marcas (nombre)
SELECT 'Genérica'
WHERE NOT EXISTS (SELECT 1 FROM marcas WHERE nombre = 'Genérica');

INSERT INTO marcas (nombre)
SELECT 'HP'
WHERE NOT EXISTS (SELECT 1 FROM marcas WHERE nombre = 'HP');

INSERT INTO marcas (nombre)
SELECT 'Dell'
WHERE NOT EXISTS (SELECT 1 FROM marcas WHERE nombre = 'Dell');

INSERT INTO marcas (nombre)
SELECT 'Office Depot'
WHERE NOT EXISTS (SELECT 1 FROM marcas WHERE nombre = 'Office Depot');

INSERT INTO marcas (nombre)
SELECT 'Clorox'
WHERE NOT EXISTS (SELECT 1 FROM marcas WHERE nombre = 'Clorox');

-- ============================================================
-- 2. ENTIDADES
-- ============================================================
INSERT INTO entidades (razon_social, nombre_comercial, rfc, email, telefono, regimen_fiscal, direccion, cp, activo) VALUES
('Comercializadora del Norte S.A. de C.V.','Comercial Norte','CND8512123A1','contacto@comercialnorte.com','8181234567','601','Av. Constitución 1234, Col. Centro, Monterrey, N.L.','64000',true),
('María García Hernández','María García','GAHM8501019A2','maria.garcia@email.com','5551234567','605','Calle Reforma 456, Col. Juárez, CDMX','06600',true),
('Distribuidora de Tecnología S.A. de C.V.','Distecno','DTE9201017B3','ventas@distecno.com','3312345678','601','Av. Tecnológico 789, Col. Moderna, Guadalajara, Jal.','44100',true),
('Papelería y Suministros S.A. de C.V.','PapelSum','PSU9501011C4','pedidos@papelsum.com','5559876543','601','Calle Industria 321, Col. Obrera, CDMX','06800',true),
('Roberto Sánchez López','Roberto Sánchez','SALR8901015D5','roberto.sanchez@spierp.com','5551112233','605','Av. Siempre Viva 742, Col. Del Valle, CDMX','03100',true);

-- Roles
INSERT INTO entidad_roles (entidad_id, rol)
SELECT id, 'cliente' FROM entidades WHERE rfc IN ('CND8512123A1','GAHM8501019A2')
AND NOT EXISTS (SELECT 1 FROM entidad_roles er WHERE er.entidad_id = entidades.id AND er.rol = 'cliente');

INSERT INTO entidad_roles (entidad_id, rol)
SELECT id, 'proveedor' FROM entidades WHERE rfc IN ('DTE9201017B3','PSU9501011C4')
AND NOT EXISTS (SELECT 1 FROM entidad_roles er WHERE er.entidad_id = entidades.id AND er.rol = 'proveedor');

INSERT INTO entidad_roles (entidad_id, rol)
SELECT id, 'vendedor' FROM entidades WHERE rfc = 'SALR8901015D5'
AND NOT EXISTS (SELECT 1 FROM entidad_roles er WHERE er.entidad_id = entidades.id AND er.rol = 'vendedor');

-- ============================================================
-- 3. ALMACENES
-- ============================================================
INSERT INTO almacenes (nombre, ubicacion, activo)
SELECT 'Almacén Principal', 'Av. Principal 100, Col. Centro, CDMX', true
WHERE NOT EXISTS (SELECT 1 FROM almacenes WHERE nombre = 'Almacén Principal');

INSERT INTO almacenes (nombre, ubicacion, activo)
SELECT 'Almacén Secundario', 'Calle Secundaria 200, Col. Industrial, CDMX', true
WHERE NOT EXISTS (SELECT 1 FROM almacenes WHERE nombre = 'Almacén Secundario');

INSERT INTO almacenes (nombre, ubicacion, activo)
SELECT 'Almacén de Reparto', 'Periférico Sur 300, Col. Comercial, CDMX', true
WHERE NOT EXISTS (SELECT 1 FROM almacenes WHERE nombre = 'Almacén de Reparto');

-- ============================================================
-- 4. ARTÍCULOS
-- ============================================================
DO $$
DECLARE
  v_pieza INT; v_caja INT; v_serv INT; v_iva16 INT;
  v_elec INT; v_papel INT; v_limp INT; v_alim INT; v_mueb INT; v_servc INT;
  v_gen INT; v_hp INT; v_dell INT; v_od INT;
BEGIN
  SELECT id INTO v_pieza FROM unidades_medida WHERE nombre='Pieza' LIMIT 1;
  SELECT id INTO v_caja FROM unidades_medida WHERE nombre='Caja' LIMIT 1;
  SELECT id INTO v_serv FROM unidades_medida WHERE nombre='Servicio' LIMIT 1;
  SELECT id INTO v_iva16 FROM impuestos WHERE nombre='IVA 16%' LIMIT 1;
  SELECT id INTO v_elec FROM categorias_producto WHERE nombre='Electrónicos' LIMIT 1;
  SELECT id INTO v_papel FROM categorias_producto WHERE nombre='Papelería' LIMIT 1;
  SELECT id INTO v_limp FROM categorias_producto WHERE nombre='Limpieza' LIMIT 1;
  SELECT id INTO v_alim FROM categorias_producto WHERE nombre='Alimentos' LIMIT 1;
  SELECT id INTO v_mueb FROM categorias_producto WHERE nombre='Muebles' LIMIT 1;
  SELECT id INTO v_servc FROM categorias_producto WHERE nombre='Servicios' LIMIT 1;
  SELECT id INTO v_gen FROM marcas WHERE nombre='Genérica' LIMIT 1;
  SELECT id INTO v_hp FROM marcas WHERE nombre='HP' LIMIT 1;
  SELECT id INTO v_dell FROM marcas WHERE nombre='Dell' LIMIT 1;
  SELECT id INTO v_od FROM marcas WHERE nombre='Office Depot' LIMIT 1;

  INSERT INTO articulos (sku,nombre,precio_venta,costo_promedio,clave_sat,unidad_medida_id,categoria_id,marca_id,codigo_barras,usa_serie,impuesto_id,stock_minimo) VALUES
  ('LAP-HP-001','Laptop HP ProBook 450 G10',18500,14200,'43211509',v_pieza,v_elec,v_hp,'7501234567890',true,v_iva16,3),
  ('MON-DELL-001','Monitor Dell 27" 4K U2723QE',12500,9200,'43211706',v_pieza,v_elec,v_dell,'7509876543210',true,v_iva16,2),
  ('MOU-HP-001','Mouse Inalámbrico HP 200',450,280,'43211706',v_pieza,v_elec,v_hp,'7501112223334',false,v_iva16,10),
  ('TEC-HP-001','Teclado USB HP K1500',380,220,'43211706',v_pieza,v_elec,v_hp,'7501112223335',false,v_iva16,10),
  ('PAP-RES-001','Resma Papel Bond Carta 500h',120,85,'14111506',v_caja,v_papel,v_od,'7502223334445',false,v_iva16,20),
  ('TON-HP-001','Tóner HP 26A Original Negro',1850,1350,'44101705',v_pieza,v_elec,v_hp,'7503334445556',false,v_iva16,5),
  ('JAB-LIQ-001','Jabón Líquido para Manos 1L',65,42,'47131501',v_pieza,v_limp,v_gen,'7504445556667',false,v_iva16,30),
  ('AGU-EMB-001','Agua Purificada 1.5L',18,10,'14111506',v_pieza,v_alim,v_gen,'7505556667778',false,v_iva16,50),
  ('SIL-EJE-001','Silla Ejecutiva Ergonómica Negra',4500,3200,'56101502',v_pieza,v_mueb,v_gen,'7506667778889',false,v_iva16,2),
  ('SER-CON-001','Consultoría TI por Hora',1500,900,'43231500',v_serv,v_servc,v_gen,NULL,false,v_iva16,0);
END $$;

-- ============================================================
-- 5. SALDOS INICIALES DE INVENTARIO
-- ============================================================
DO $$
DECLARE
  v_alm INT;
  v_art RECORD;
BEGIN
  SELECT id INTO v_alm FROM almacenes WHERE nombre='Almacén Principal' LIMIT 1;
  FOR v_art IN SELECT a.id, a.sku FROM articulos a WHERE a.sku!='SER-CON-001' LOOP
    INSERT INTO inventario_movimientos (articulo_id, cantidad, tipo_movimiento, almacen_id, referencia_tipo)
    VALUES (v_art.id,
      CASE v_art.sku
        WHEN 'LAP-HP-001' THEN 10 WHEN 'MON-DELL-001' THEN 8
        WHEN 'MOU-HP-001' THEN 50 WHEN 'TEC-HP-001' THEN 30
        WHEN 'PAP-RES-001' THEN 100 WHEN 'TON-HP-001' THEN 15
        WHEN 'JAB-LIQ-001' THEN 60 WHEN 'AGU-EMB-001' THEN 200
        WHEN 'SIL-EJE-001' THEN 5 ELSE 0 END,
      'entrada', v_alm, 'inicial');
  END LOOP;
END $$;

-- ============================================================
-- 6. TRANSACCIONES DE EJEMPLO
-- ============================================================

-- 6.1 COTIZACIÓN DE VENTA
DO $$
DECLARE
  v_cli INT; v_vend INT; v_lap INT; v_mou INT; v_mon INT; v_ton INT;
  v_alm INT; v_serie INT; v_folio TEXT; v_tid INT;
BEGIN
  SELECT id INTO v_cli FROM entidades WHERE rfc='CND8512123A1';
  SELECT id INTO v_vend FROM entidades WHERE rfc='SALR8901015D5';
  SELECT id INTO v_lap FROM articulos WHERE sku='LAP-HP-001';
  SELECT id INTO v_mou FROM articulos WHERE sku='MOU-HP-001';
  SELECT id INTO v_mon FROM articulos WHERE sku='MON-DELL-001';
  SELECT id INTO v_ton FROM articulos WHERE sku='TON-HP-001';
  SELECT id INTO v_alm FROM almacenes WHERE nombre='Almacén Principal' LIMIT 1;
  SELECT id INTO v_serie FROM series_documentos WHERE tipo='cotizacion' AND activo=true LIMIT 1;
  SELECT obtener_folio('COT') INTO v_folio;

  INSERT INTO transacciones (tipo,estado,folio,total,entidad_cliente_id,entidad_vendedor_id,almacen_id,serie_id,metodo_pago,comentario)
  VALUES ('cotizacion','confirmado',v_folio,168750,v_cli,v_vend,v_alm,v_serie,'transferencia','Cotización equipamiento oficina - 5 equipos')
  RETURNING id INTO v_tid;

  INSERT INTO transacciones_detalle (transaccion_id,articulo_id,cantidad,precio_unitario,subtotal,almacen_id,tipo_movimiento) VALUES
  (v_tid,v_lap,5,18500,92500,v_alm,'ninguno'),
  (v_tid,v_mon,5,12500,62500,v_alm,'ninguno'),
  (v_tid,v_mou,10,450,4500,v_alm,'ninguno'),
  (v_tid,v_ton,5,1850,9250,v_alm,'ninguno');
END $$;

-- 6.2 ORDEN DE COMPRA
DO $$
DECLARE
  v_prov INT; v_lap INT; v_mon INT; v_alm INT; v_serie INT; v_folio TEXT; v_tid INT;
BEGIN
  SELECT id INTO v_prov FROM entidades WHERE rfc='DTE9201017B3';
  SELECT id INTO v_lap FROM articulos WHERE sku='LAP-HP-001';
  SELECT id INTO v_mon FROM articulos WHERE sku='MON-DELL-001';
  SELECT id INTO v_alm FROM almacenes WHERE nombre='Almacén Principal' LIMIT 1;
  SELECT id INTO v_serie FROM series_documentos WHERE tipo='orden_compra' AND activo=true LIMIT 1;
  SELECT obtener_folio('OC') INTO v_folio;

  INSERT INTO transacciones (tipo,estado,folio,total,entidad_proveedor_id,almacen_id,serie_id,metodo_pago,terminos_pago_id,comentario)
  VALUES ('orden_compra','confirmado',v_folio,61000,v_prov,v_alm,v_serie,'transferencia',(SELECT id FROM terminos_pago WHERE nombre='Neto 30' LIMIT 1),'Reabastecimiento inventario')
  RETURNING id INTO v_tid;

  INSERT INTO transacciones_detalle (transaccion_id,articulo_id,cantidad,precio_unitario,subtotal,almacen_id,tipo_movimiento) VALUES
  (v_tid,v_lap,3,14200,42600,v_alm,'ninguno'),
  (v_tid,v_mon,2,9200,18400,v_alm,'ninguno');
END $$;

-- 6.3 VENTA COMPLETADA (con inventario y contabilidad)
DO $$
DECLARE
  v_cli INT; v_vend INT; v_lap INT; v_mon INT; v_mou INT; v_tec INT;
  v_alm INT; v_serie INT; v_folio TEXT; v_tid INT;
  v_dl INT; v_dm INT; v_dmo INT; v_dt INT;
  v_total NUMERIC := 32280; v_iva NUMERIC := 5164.80; v_totalc NUMERIC := 37444.80;
  v_cxc INT; v_vent INT; v_iva_c INT; v_costo INT; v_inv INT;
  v_cl NUMERIC; v_cm NUMERIC; v_ct NUMERIC;
BEGIN
  SELECT id INTO v_cli FROM entidades WHERE rfc='GAHM8501019A2';
  SELECT id INTO v_vend FROM entidades WHERE rfc='SALR8901015D5';
  SELECT id INTO v_lap FROM articulos WHERE sku='LAP-HP-001';
  SELECT id INTO v_mon FROM articulos WHERE sku='MON-DELL-001';
  SELECT id INTO v_mou FROM articulos WHERE sku='MOU-HP-001';
  SELECT id INTO v_tec FROM articulos WHERE sku='TEC-HP-001';
  SELECT id INTO v_alm FROM almacenes WHERE nombre='Almacén Principal' LIMIT 1;
  SELECT id INTO v_serie FROM series_documentos WHERE tipo='venta' AND activo=true LIMIT 1;
  SELECT costo_promedio INTO v_cl FROM articulos WHERE id=v_lap;
  SELECT costo_promedio INTO v_cm FROM articulos WHERE id=v_mon;
  v_ct := (1*v_cl)+(1*v_cm)+(2*280)+(1*220);

  SELECT obtener_folio('FAC') INTO v_folio;

  INSERT INTO transacciones (tipo,estado,folio,total,entidad_cliente_id,entidad_vendedor_id,almacen_id,serie_id,metodo_pago,comentario)
  VALUES ('venta','confirmado',v_folio,v_totalc,v_cli,v_vend,v_alm,v_serie,'tarjeta_credito','Venta mostrador - equipo cómputo')
  RETURNING id INTO v_tid;

  INSERT INTO transacciones_detalle (transaccion_id,articulo_id,cantidad,precio_unitario,subtotal,almacen_id,tipo_movimiento) VALUES
  (v_tid,v_lap,1,18500,18500,v_alm,'salida') RETURNING id INTO v_dl;
  INSERT INTO inventario_movimientos (articulo_id,cantidad,tipo_movimiento,almacen_id,referencia_tipo,referencia_id, documento_detalle_tipo,documento_detalle_id)
  VALUES (v_lap,1,'salida',v_alm,'transaccion',v_tid,'transacciones_detalle',v_dl);

  INSERT INTO transacciones_detalle (transaccion_id,articulo_id,cantidad,precio_unitario,subtotal,almacen_id,tipo_movimiento) VALUES
  (v_tid,v_mon,1,12500,12500,v_alm,'salida') RETURNING id INTO v_dm;
  INSERT INTO inventario_movimientos (articulo_id,cantidad,tipo_movimiento,almacen_id,referencia_tipo,referencia_id, documento_detalle_tipo,documento_detalle_id)
  VALUES (v_mon,1,'salida',v_alm,'transaccion',v_tid,'transacciones_detalle',v_dm);

  INSERT INTO transacciones_detalle (transaccion_id,articulo_id,cantidad,precio_unitario,subtotal,almacen_id,tipo_movimiento) VALUES
  (v_tid,v_mou,2,450,900,v_alm,'salida') RETURNING id INTO v_dmo;
  INSERT INTO inventario_movimientos (articulo_id,cantidad,tipo_movimiento,almacen_id,referencia_tipo,referencia_id, documento_detalle_tipo,documento_detalle_id)
  VALUES (v_mou,2,'salida',v_alm,'transaccion',v_tid,'transacciones_detalle',v_dmo);

  INSERT INTO transacciones_detalle (transaccion_id,articulo_id,cantidad,precio_unitario,subtotal,almacen_id,tipo_movimiento) VALUES
  (v_tid,v_tec,1,380,380,v_alm,'salida') RETURNING id INTO v_dt;
  INSERT INTO inventario_movimientos (articulo_id,cantidad,tipo_movimiento,almacen_id,referencia_tipo,referencia_id, documento_detalle_tipo,documento_detalle_id)
  VALUES (v_tec,1,'salida',v_alm,'transaccion',v_tid,'transacciones_detalle',v_dt);

  -- Asientos contables
  SELECT id INTO v_cxc FROM cuentas_contables WHERE codigo='1200' LIMIT 1;
  SELECT id INTO v_vent FROM cuentas_contables WHERE codigo='4100' LIMIT 1;
  SELECT id INTO v_iva_c FROM cuentas_contables WHERE codigo='2200' LIMIT 1;
  SELECT id INTO v_costo FROM cuentas_contables WHERE codigo='5100' LIMIT 1;
  SELECT id INTO v_inv FROM cuentas_contables WHERE codigo='1300' LIMIT 1;

  IF v_cxc IS NOT NULL AND v_vent IS NOT NULL THEN
    INSERT INTO transacciones_contables (transaccion_id,cuenta_contable_id,debe,haber) VALUES
    (v_tid,v_cxc,v_totalc,0),
    (v_tid,v_vent,0,v_total);
    IF v_iva_c IS NOT NULL THEN
      INSERT INTO transacciones_contables (transaccion_id,cuenta_contable_id,debe,haber) VALUES (v_tid,v_iva_c,0,v_iva);
    END IF;
    IF v_costo IS NOT NULL AND v_inv IS NOT NULL THEN
      INSERT INTO transacciones_contables (transaccion_id,cuenta_contable_id,debe,haber) VALUES
      (v_tid,v_costo,v_ct,0),
      (v_tid,v_inv,0,v_ct);
    END IF;
  END IF;
END $$;

COMMIT;
