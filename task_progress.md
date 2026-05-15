# Task Progress - Expansión Compras/Inventarios

## Bloque 1: SQL Migration (Nuevos tipos de transacción)
- [ ] Crear script SQL migration_v5_expansion.sql

## Bloque 2: Catálogos Maestros Funcionales (Frontend)
- [ ] Crear EntidadesView.vue (gestión completa con roles)
- [ ] Actualizar ArticulosView.vue (CRUD completo con todos los campos)
- [ ] Actualizar AlmacenesView.vue (CRUD completo)

## Bloque 3: Módulo de Compras Completo (Frontend)
- [ ] Crear CotizacionesCompraView.vue
- [ ] Actualizar OrdenesCompraView.vue (usar /api/v1/transacciones, convertir desde cotización)
- [ ] Actualizar ComprasView.vue (usar /api/v1/transacciones)
- [ ] Actualizar RecepcionesView.vue (completa con creación)
- [ ] Actualizar DocumentoCompraDetalle.vue (soporte genérico para todos los tipos)
- [ ] Crear ReportesComprasView.vue

## Bloque 4: Módulo de Inventarios Profesional (Frontend)
- [ ] Crear TraspasosView.vue
- [ ] Crear RecepcionesTraspasoView.vue
- [ ] Crear ReportesInventarioView.vue
- [ ] Actualizar SeriesView.vue (consulta por número de serie)

## Bloque 5: Nuevos Endpoints API (Node.js)
- [ ] Mejorar transacciones.model.js (soporte nuevos tipos: traspaso, recepcion_traspaso, cotizacion_compra, recepcion_compra)
- [ ] Mejorar transacciones.routes.js (agregar tipos válidos)
- [ ] Crear reportes.routes.js (compras por artículo/proveedor, stock, movimientos)
- [ ] Mejorar inventario.routes.js (stock con filtros, movimientos con filtros)
- [ ] Agregar endpoint serie/{numero_serie} en inventario.routes.js
- [ ] Crear reportes.model.js
- [ ] Actualizar index.js (nuevas rutas)

## Bloque 6: Integración y Menú
- [ ] Actualizar router/index.js (nuevas rutas)
- [ ] Actualizar DashboardLayout.vue (menú actualizado)
- [ ] Actualizar LOG_MODIFICACIONES.md
