# Registro de Modificaciones - SPI ERP

## 0001 - Configuración inicial del proyecto
- Creación de estructura base del proyecto con Node.js, Python y PostgreSQL.
- Configuración de Docker Compose, Dockerfiles y dependencias.
- Creación de base de datos inicial con tablas de usuarios, roles y sesiones.

## 0002 - Catálogos maestros y módulo de inventarios
- Implementación de catálogos maestros (entidades, almacenes, marcas, formas_pago, etc.).
- Creación del módulo de inventarios con movimientos (entradas, salidas, ajustes).
- API REST para gestión de inventarios y artículos.
- Vistas frontend: Configuración Maestra.

## 0003 - Módulo de ventas y procesos de negocio
- Implementación del módulo de ventas con transacciones completas.
- Vistas de Nueva Venta, Dashboard de Ventas, etc.
- Backend para registro de ventas con detalles y actualización de inventario.

## 0004 - Sistema de roles, permisos y seguridad
- Implementación de roles y permisos a nivel de base de datos y aplicación.
- Middleware de autenticación JWT.
- Control de acceso basado en roles en rutas y vistas.

## 0005 - Sistema de auditoría completo
- Implementación de auditoría con triggers en base de datos.
- Modelo y ruta para consultar cambios.
- Integración de setAuditContext en transacciones existentes.

## 0006 - Sistema de configuración y ajustes
- Tabla de configuración del sistema.
- API para gestionar parámetros configurables.
- Integración con módulos existentes.

## 0007 - Catálogos SAT y expansión de entidades
- Agregados catálogos SAT iniciales a la base de datos.
- Expansión de tabla entidades con campos fiscales.
- Mejoras en la estructura de datos maestros.

## 0008 - Transacciones por capas (cabecera/líneas/inventario/series/fiscal), catálogos SAT completos y facturación CFDI 4.0
### SQL (db/migration_v3.sql):
- **Nuevos catálogos maestros:** unidades_medida (13 registros SAT), categorias_producto (jerárquica), marcas, terminos_pago (Contado/Neto15/30/60), regimenes_fiscales (13 claves SAT 601-626), usos_cfdi (17 claves G01-D10), metodos_pago_sat (PUE/PPD), objetos_impuesto (01/02/03), series_documentos (COT/OV/F/OC/COM).
- **Ampliación de articulos:** unidad_medida_id, categoria_id, marca_id, codigo_barras, usa_serie.
- **Ampliación de entidades:** telefono, email, regimen_fiscal_id, uso_cfdi_default_id.
- **Renombrado:** ventas → documentos_venta, ventas_detalle → documentos_venta_detalle.
- **Nuevos campos en documentos_venta:** tipo (cotizacion/orden_venta/venta), estado (borrador/pendiente/confirmado/facturado/cancelado), documento_origen_id, terminos_pago_id, fecha_vencimiento, serie_id.
- **Función obtener_folio(tipo):** bloqueo FOR UPDATE atómico, formato SERIE-YYYYMMDD-NNNN, reinicio por fecha.
- **Nuevos tipos en control_folios:** COT, OV, FAC, OC, COM.
- **inventario_movimientos:** documento_detalle_tipo, documento_detalle_id.
- **Tablas nuevas:** documentos_compra, documentos_compra_detalle, articulos_series, comprobantes_fiscales.
- **Índices:** ~40 nuevos índices para todas las tablas y columnas FK.
- **Triggers de auditoría:** para todas las nuevas tablas y renombradas.

### Python (api-python/):
- **fiscal_service.py:** Función generar_pre_xml() con consulta completa a catálogos SAT (regimenes_fiscales, usos_cfdi, metodos_pago_sat, unidades_medida). Función generar_xml_cfdi() que construye XML real CFDI 4.0, inserta en comprobantes_fiscales, actualiza estado a facturado. Función obtener_comprobante() con JOIN a documentos_venta y entidades.
- **main.py:** Endpoint POST /api/v1/fiscal/timbrar/{documento_venta_id} (timbra y retorna UUID simulado). Endpoint GET /api/v1/comprobantes/{id} (consulta con XML y UUID).

### Node.js (api-node/):
- **Modelos nuevos:**
  - documentosVenta.model.js: crearDocumento(tipo, datos, req) con transacción ACID, folio atómico vía obtener_folio(), validación de roles cliente/vendedor, inventario para ventas, series automáticas. convertirDocumento(origenId, nuevoTipo, req) con pipeline cotizacion→orden_venta→venta. cancelar(id, req) con reversión de inventario y series.
  - documentosCompra.model.js: crearDocumento, cancelar con reversión de inventario.
  - inventario.model.js: insertarMovimiento con vínculo a línea de documento (documento_detalle_tipo, documento_detalle_id), getMovimientosPorDocumentoDetalle.
  - articulosSeries.model.js: CRUD completo, marcarVendido, findDisponibles, validación de estado (disponible/vendido/reservado/baja).
  - comprobantesFiscales.model.js: consultas findAll/findById/findByUUID/findByDocumentoVentaId.
- **Rutas nuevas (protegidas con authMiddleware):**
  - /api/v1/documentos-venta (GET/POST, GET /:id, POST /convertir/:origenId, POST /:id/cancelar)
  - /api/v1/documentos-compra (GET/POST, GET /:id, POST /:id/cancelar)
  - /api/v1/articulos-series (GET /articulo/:id, GET /disponibles/:id, POST, GET /:id, PUT /:id/estado, GET /buscar/:serie)
  - /api/v1/comprobantes-fiscales (GET, GET /:id, GET /documento/:id, GET /uuid/:uuid)
- **index.js:** Registro de todas las nuevas rutas, compatibilidad hacia atrás en /api/v1/ventas.

### Configuración:
- Se generó commit: "feat: transacciones por capas (cabecera/líneas/inventario/series/fiscal), catálogos SAT completos y facturación CFDI 4.0"

## 0009 - Sistema de permisos RBAC y endpoints de entidades/artículos
### SQL (db/migration_v4.sql):
- Creación de tabla `permisos` (id, codigo UNICO, descripcion, modulo)
- Creación de tabla `rol_permisos` (rol_id, permiso_id, PRIMARY KEY compuesta)
- Precarga de permisos: ventas.crear, ventas.cancelar, ventas.ver, compras.ver, inventario.ver, contabilidad.ver, contabilidad.exportar, fiscal.ver, crm.ver, pos.usar, admin.configurar
- Asignación de todos los permisos al rol `admin`

### Node.js (api-node/):
- `src/middleware/permissions.js`: Middleware `checkPermission(permisoRequerido)` que consulta rol_permisos y retorna 403 si no tiene permiso
- `src/routes/auth.routes.js`: 
  - Nuevo endpoint POST `/login-cliente` para autenticación de portal clientes (con claim `portal: true`)
  - Nuevo endpoint GET `/perfil` para obtener información del usuario logueado
  - Nuevo endpoint GET `/mis-permisos` que devuelve los códigos de permisos del usuario
  - Actualización de `/login` para incluir `rol_nombre` y `entidad_razon_social` en respuesta
- `src/routes/permisos.routes.js`: CRUD completo de permisos por rol
- `api-node/index.js`: 
  - Nuevos endpoints `/api/v1/articulos?search=` para búsqueda de productos (usado por POS)
  - Nuevo endpoint `/api/v1/entidades?search=&rol=` para búsqueda de entidades (clientes, proveedores)
  - Registro de rutas de permisos

### Frontend - Landing Page y Login:
- `src/layouts/PublicLayout.vue`: Layout público con AppBar, footer, y botón "Acceso" que abre modal
- `src/views/landing/HomeView.vue`: Hero section, módulos cards, servicios, formulario de contacto
- `src/components/LoginModal.vue`: Modal con tabs ERP y Portal de Clientes, login JWT, redirección a dashboard/portal

### Frontend - Dashboard Modular:
- `src/layouts/DashboardLayout.vue`: Barra superior con usuario y logout, Navigation Drawer con menú agrupado por módulos y permisos, router-view para contenido
- `src/views/DashboardHome.vue`: Cards de acceso rápido, información del usuario, estado del sistema
- Módulo Ventas: CotizacionesView, OrdenesView, FacturasView, ClientesView
- Módulo Compras: OrdenesCompraView, RecepcionesView, ProveedoresView
- Módulo Inventario: ArticulosView, AlmacenesView, MovimientosView, SeriesView
- Módulo Contabilidad: CuentasView, AsientosView, BalanzaView
- Módulo Fiscal: CFDIView, TimbradoView, CancelacionesView
- Módulo CRM: OportunidadesView, ActividadesView
- Módulo Configuración: UsuariosView, CatalogosView (SAT), AuditoriaView
- `src/components/ModuloPlaceholder.vue`: Componente reutilizable para vistas placeholder con tabla vacía

### Frontend - Portal de Clientes:
- `src/layouts/PortalLayout.vue`: Layout simplificado para portal con navegación a facturas y estado de cuenta
- `src/views/portal/FacturasView.vue`: Consulta de facturas del cliente autenticado
- `src/views/portal/EstadoCuentaView.vue`: Resumen de saldos pendientes con cards informativos

### Frontend - Sistema de Permisos (RBAC):
- `src/views/configuracion/PermisosView.vue`: Interfaz para asignar/desasignar permisos por rol mediante checkboxes agrupados por módulo

### Frontend - Punto de Venta (POS):
- `src/views/pos/POSView.vue`: POS completo con buscador de productos, carrito, selector de cliente, método de pago y botón Cobrar que POST a documentos-venta

### Vue Router (`src/router/index.js`):
- Ruta `/` usa PublicLayout y renderiza HomeView (landing page)
- Ruta `/login` redirige a `/`
- Ruta `/dashboard` usa DashboardLayout con ~20 rutas hijas protegidas (requiresAuth)
- Ruta `/portal` usa PortalLayout con rutas hijas para facturas y estado de cuenta
- Navigation guard protege rutas requiresAuth redirigiendo a `/`

### Configuración:
- Se generó commit: "feat: landing page Odoo-like, portal clientes, RBAC y POS"

## 0010 - Módulo de Ventas completo con trazabilidad y chatter de auditoría
- Modelo `documentosVenta.model.js` con métodos: crearDocumento, convertirDocumento, cancelar, findAll, findById
- Rutas `documentosVenta.routes.js` con endpoints: GET, GET /:id, GET /:id/historial, POST, POST /convertir/:origenId, POST /:id/cancelar
- Vistas Vue 3/Vuetify: CotizacionesView, OrdenesView, FacturasView con tablas, filtros, diálogos de creación y acciones
- Vista de detalle DocumentoVentaDetalle con trazabilidad origen/destino y panel CHATTER con v-timeline
- Endpoint de historial que consulta log_modificaciones_cabecera y log_modificaciones_detalle.
- Trazabilidad completa entre cotización → orden de venta → factura/venta con transacciones ACID.

## 0011 - Sistema de facturación electrónica CFDI 4.0 completo
- Generación de XML CFDI 4.0 desde api-python con catálogos SAT
- Endpoint POST /api/v1/fiscal/timbrar/{documento_venta_id}
- Consulta de comprobantes fiscales con UUID, XML, estado
- Vistas frontend: CFDIView, TimbradoView, CancelacionesView con VDataTable y acciones
- Panel de historial (CHATTER) para CFDI
- Integración con documentos de venta: actualiza estado a facturado y vincula comprobante

## 0012 - Módulo de Compras completo con flujo de etapas, trazabilidad y chatter de auditoría
### Node.js (api-node/):
- **src/models/documentosCompra.model.js** (actualizado): 
  - `crearDocumento(tipo, datos, req)`: Valida proveedor con rol 'proveedor', obtiene serie por defecto, genera folio atómico con `obtener_folio('OC'/'COM')`, calcula total, inserta en documentos_compra con estado 'confirmado', inserta líneas en documentos_compra_detalle, genera movimientos de inventario de entrada para tipo 'compra', actualiza costo_promedio con promedio ponderado simple. Transacción BEGIN/COMMIT/ROLLBACK con setAuditContext.
  - `convertirDocumento(origenId, nuevoTipo, req)`: Toma documento origen (orden_compra), crea compra con los mismos detalles, establece documento_origen_id, genera movimientos de entrada y actualiza costo_promedio.
  - `cancelar(id, req)`: Si es compra, revierte inventario con movimiento de salida. Cambia estado a 'cancelado'.
  - `findAll(filtros)`: Con JOINs a entidades y series, filtros por tipo/estado/proveedor.
  - `findById(id)`: Con JOINs, subconsultas para origen y destino (trazabilidad).
- **src/routes/documentosCompra.routes.js** (actualizado):
  - GET / → listar con filtros
  - GET /:id → detalle con origen/destino
  - GET /:id/historial → auditoría desde log_modificaciones_cabecera/detalle
  - POST / → crear documento (orden_compra o compra)
  - POST /convertir/:origenId → convertir orden_compra → compra
  - POST /:id/cancelar → cancelar con reversión de inventario
  - Todas protegidas con authMiddleware

### Frontend (frontend/):
- **src/views/compras/OrdenesCompraView.vue**: Listado de órdenes de compra con v-data-table, filtros, diálogo de creación con autocomplete de proveedores/artículos, acciones de convertir a compra y cancelar. Iconos: mdi-plus-circle, mdi-content-save, mdi-cancel, mdi-arrow-decision.
- **src/views/compras/ComprasView.vue**: Listado de compras con columna de origen, diálogo de creación directa de compra con entrada de inventario.
- **src/views/compras/DocumentoCompraDetalle.vue**: Vista de detalle con cabecera, líneas, trazabilidad origen/destino con enlaces, panel CHATTER con v-timeline mostrando historial de auditoría (tipo_operación I/U/D, usuario, fecha, campos modificados).
- **src/router/index.js**: Agregadas rutas /dashboard/compras/compras, /dashboard/compras/:id

### Trazabilidad:
- `convertirDocumento` establece correctamente `documento_origen_id` en el nuevo documento
- `findById` incluye subconsultas para origen (documento que lo originó) y destino (documento creado a partir de éste)
- Vistas muestran alerts con enlaces navegables: "Proviene de [Tipo] [Folio]" y "Convertido a [Tipo] [Folio]"

### Iconografía:
- Crear nuevo: mdi-plus-circle
- Editar: mdi-pencil
- Guardar: mdi-content-save
- Cancelar: mdi-cancel
- Convertir: mdi-arrow-decision
- Ver historial: mdi-history

## 0013 - Modelo unificado TransaccionesModel y rutas /api/v1/transacciones
### SQL (db/migration_v4_unificacion.sql):
- Creación de tablas unificadas: transacciones, transacciones_detalle, transacciones_series, transacciones_contables y cuentas_contables
- Migración de datos desde documentos_venta, documentos_compra, inventario_movimientos, articulos_series y asientos_contables
- Índices y triggers de auditoría para las nuevas tablas
- Nuevos tipos en control_folios: AJU, ENT, SAL

### Node.js (api-node/):
- `src/models/transacciones.model.js`: Nuevo modelo unificado con métodos:
  - crearTransaccion(tipo, datos, req): Crea cualquier tipo de transacción con folio atómico, validación de roles, cálculo de totales, inserción de detalles, movimientos de inventario, manejo de series y generación automática de asientos contables
  - convertirTransaccion(origenId, nuevoTipo, req): Conversión lógica entre tipos (cotizacion→orden_venta→venta, orden_compra→compra)
  - cancelarTransaccion(id, req): Cancelación con reversión de inventario y liberación de series
  - findAll(filtros): Búsqueda con filtros por tipo, estado, cliente, proveedor, fechas
  - findById(id): Consulta completa con JOIN a entidades, series, detalles con sub-series, asientos contables, origen y destino
- `src/routes/transacciones.routes.js`: Rutas protegidas GET/POST /api/v1/transacciones, GET /:id, GET /:id/historial, POST /convertir/:origenId, POST /:id/cancelar
- `api-node/index.js`: Registro de ruta /api/v1/transacciones

### Backward compatibility:
- `src/routes/documentosVenta.routes.js`: Reescrito como wrapper que redirige todo a TransaccionesModel con mapeo de campos
- `src/routes/documentosCompra.routes.js`: Reescrito como wrapper que redirige todo a TransaccionesModel con mapeo de campos
- Los endpoints antiguos (/api/v1/documentos-venta, /api/v1/documentos-compra) siguen funcionando sin cambios en el frontend

## 0014 - Expansión Compras (flujo completo), Inventarios, Catálogos funcionales y Reportes
### SQL (db/migration_v5_expansion.sql):
- Nuevos tipos de transacción: 'cotizacion_compra', 'recepcion_compra', 'traspaso', 'recepcion_traspaso'
- Nuevos folios en control_folios: COTC, RECC, TRAS, RECT
- Nuevas series en series_documentos para los 4 nuevos tipos
- Ampliación del CHECK de tipo en transacciones

### Node.js (api-node/):
- `src/models/transacciones.model.js`: Lógica para traspaso (movimiento dual salida/entrada sin contabilidad), recepcion_traspaso (confirmación de entrada), recepcion_compra (entrada inventario sin contabilidad)
- `src/models/reportes.model.js`: Nuevo modelo con métodos reportesComprasPorArticulo, reportesComprasPorProveedor, stockActual, movimientosInventario, trazabilidadSerie
- `src/routes/reportes.routes.js`: GET /api/v1/reportes/compras... (2 endpoints)
- `src/routes/inventario.routes.js`: GET /api/v1/inventario/stock, /movimientos, /serie/:numero_serie
- `api-node/index.js`: Registro de nuevas rutas de reportes e inventario
- Actualización de transacciones.routes.js para incluir nuevos tipos en validaciones
- Migración de endpoints antiguos (documentos-compra) a /api/v1/transacciones en frontend

### Frontend - Catálogos maestros funcionales:
- Entidades (Clientes/Proveedores): Vista funcional con CRUD, multi-roles, v-data-table y diálogos
- Artículos: Vista funcional con SKU, precios, categorías, marcas, unidades, usa_serie, código barras
- Almacenes: Vista funcional con nombre, ubicación, activo, diálogo CRUD

### Frontend - Módulo de Compras completo:
- Cotizaciones de Compra (tipo='cotizacion_compra'): Tabla, diálogo nueva, selección de proveedor/artículos
- Órdenes de Compra (tipo='orden_compra'): Convertir desde cotización, tabla con filtros
- Compras (tipo='compra'): Directa o convertida desde orden, con entrada a inventario
- Recepciones de Compra (tipo='recepcion_compra'): Registro de entrada física vinculada a orden/compra
- Detalle genérico de transacción: Cabecera, líneas, trazabilidad origen/destino, panel historial (chatter)

### Frontend - Módulo de Inventarios profesional:
- Traspasos entre Almacenes (tipo='traspaso'): Movimiento dual salida/entrada, selección almacén origen/destino
- Recepciones de Traspaso (tipo='recepcion_traspaso'): Confirmación de entrada en almacén destino
- Reportes de Inventario: Stock actual, movimientos por artículo/almacén con filtros de fecha
- Consulta por Número de Serie: Búsqueda y trazabilidad completa del ciclo de vida de una serie

### Frontend - Integración y Menú:
- DashboardLayout.vue actualizado con nuevas rutas en menú lateral
- Vue Router con todas las nuevas rutas protegidas
- Flujos completos: Cotización → Orden → Recepción → Compra (factura)
