# Task Progress - Evolución ERP Transacciones por Capas + CFDI 4.0

## BLOQUE 1: Nuevos Catálogos Maestros (SQL)
- [ ] Crear migration SQL con 9 nuevas tablas (unidades_medida, categorias_producto, marcas, terminos_pago, regimenes_fiscales, usos_cfdi, metodos_pago_sat, objetos_impuesto, series_documentos)
- [ ] Ampliar tablas articulos y entidades con nuevos campos FK
- [ ] Agregar índices

## BLOQUE 2: Reestructurar Ventas en Capas
- [ ] Renombrar ventas → documentos_venta, ventas_detalle → documentos_venta_detalle
- [ ] Agregar nuevos campos: tipo, estado, documento_origen_id, terminos_pago_id, fecha_vencimiento, serie_id
- [ ] Expandir control_folios y crear obtener_folio(tipo) genérico
- [ ] Actualizar inventario_movimientos con documento_detalle_tipo/ID

## BLOQUE 3: Documentos de Compra
- [ ] Crear documentos_compra y documentos_compra_detalle
- [ ] Actualizar control_folios y series_documentos para compras

## BLOQUE 4: Series de Artículos
- [ ] Crear articulos_series table

## BLOQUE 5: Comprobantes Fiscales
- [ ] Crear comprobantes_fiscales table
- [ ] Actualizar fiscal_service.py con CFDI 4.0 completo usando SAT catálogos
- [ ] Agregar endpoints POST /timbrar y GET /comprobantes en main.py

## BLOQUE 6: Modelos y Rutas Node.js
- [ ] Crear documentosVenta.model.js (crearDocumento, convertirDocumento, cancelar)
- [ ] Crear documentosCompra.model.js
- [ ] Actualizar inventario.model.js (insertarMovimiento con vínculo)
- [ ] Crear articulosSeries.model.js
- [ ] Crear comprobantesFiscales.model.js
- [ ] Crear rutas correspondientes
- [ ] Actualizar index.js con nuevas rutas

## BLOQUE 7: LOG_MODIFICACIONES.md
- [ ] Registrar adición 0008
