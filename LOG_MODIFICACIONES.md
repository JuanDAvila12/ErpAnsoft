# Registro de Modificaciones - SPI ERP

## 0001 - ConfiguraciĂłn inicial del proyecto
- CreaciĂłn de estructura base del proyecto con Node.js, Python y PostgreSQL.
- ConfiguraciĂłn de Docker Compose, Dockerfiles y dependencias.
- CreaciĂłn de base de datos inicial con tablas de usuarios, roles y sesiones.

## 0002 - CatĂĄlogos maestros y mĂłdulo de inventarios
- ImplementaciĂłn de catĂĄlogos maestros (entidades, almacenes, marcas, formas_pago, etc.).
- CreaciĂłn del mĂłdulo de inventarios con movimientos (entradas, salidas, ajustes).
- API REST para gestiĂłn de inventarios y artĂ­culos.
- Vistas frontend: ConfiguraciĂłn Maestra.

## 0003 - MĂłdulo de ventas y procesos de negocio
- ImplementaciĂłn del mĂłdulo de ventas con transacciones completas.
- Vistas de Nueva Venta, Dashboard de Ventas, etc.
- Backend para registro de ventas con detalles y actualizaciĂłn de inventario.

## 0004 - Sistema de roles, permisos y seguridad
- ImplementaciĂłn de roles y permisos a nivel de base de datos y aplicaciĂłn.
- Middleware de autenticaciĂłn JWT.
- Control de acceso basado en roles en rutas y vistas.

## 0005 - Sistema de auditorĂ­a completo
- ImplementaciĂłn de auditorĂ­a con triggers en base de datos.
- Modelo y ruta para consultar cambios.
- IntegraciĂłn de setAuditContext en transacciones existentes.

## 0006 - Sistema de configuraciĂłn y ajustes
- Tabla de configuraciĂłn del sistema.
- API para gestionar parĂĄmetros configurables.
- IntegraciĂłn con mĂłdulos existentes.

## 0007 - CatĂĄlogos SAT y expansiĂłn de entidades
- Agregados catĂĄlogos SAT iniciales a la base de datos.
- ExpansiĂłn de tabla entidades con campos fiscales.
- Mejoras en la estructura de datos maestros.

## 0008 - Transacciones por capas (cabecera/lĂ­neas/inventario/series/fiscal), catĂĄlogos SAT completos y facturaciĂłn CFDI 4.0
### SQL (db/migration_v3.sql):
- **Nuevos catĂĄlogos maestros:** unidades_medida (13 registros SAT), categorias_producto (jerĂĄrquica), marcas, terminos_pago (Contado/Neto15/30/60), regimenes_fiscales (13 claves SAT 601-626), usos_cfdi (17 claves G01-D10), metodos_pago_sat (PUE/PPD), objetos_impuesto (01/02/03), series_documentos (COT/OV/F/OC/COM).
- **AmpliaciĂłn de articulos:** unidad_medida_id, categoria_id, marca_id, codigo_barras, usa_serie.
- **AmpliaciĂłn de entidades:** telefono, email, regimen_fiscal_id, uso_cfdi_default_id.
- **Renombrado:** ventas â documentos_venta, ventas_detalle â documentos_venta_detalle.
- **Nuevos campos en documentos_venta:** tipo (cotizacion/orden_venta/venta), estado (borrador/pendiente/confirmado/facturado/cancelado), documento_origen_id, terminos_pago_id, fecha_vencimiento, serie_id.
- **FunciĂłn obtener_folio(tipo):** bloqueo FOR UPDATE atĂłmico, formato SERIE-YYYYMMDD-NNNN, reinicio por fecha.
- **Nuevos tipos en control_folios:** COT, OV, FAC, OC, COM.
- **inventario_movimientos:** documento_detalle_tipo, documento_detalle_id.
- **Tablas nuevas:** documentos_compra, documentos_compra_detalle, articulos_series, comprobantes_fiscales.
- **Ăndices:** ~40 nuevos Ă­ndices para todas las tablas y columnas FK.
- **Triggers de auditorĂ­a:** para todas las nuevas tablas y renombradas.

### Python (api-python/):
- **fiscal_service.py:** FunciĂłn generar_pre_xml() con consulta completa a catĂĄlogos SAT (regimenes_fiscales, usos_cfdi, metodos_pago_sat, unidades_medida). FunciĂłn generar_xml_cfdi() que construye XML real CFDI 4.0, inserta en comprobantes_fiscales, actualiza estado a facturado. FunciĂłn obtener_comprobante() con JOIN a documentos_venta y entidades.
- **main.py:** Endpoint POST /api/v1/fiscal/timbrar/{documento_venta_id} (timbra y retorna UUID simulado). Endpoint GET /api/v1/comprobantes/{id} (consulta con XML y UUID).

### Node.js (api-node/):
- **Modelos nuevos:**
  - documentosVenta.model.js: crearDocumento(tipo, datos, req) con transacciĂłn ACID, folio atĂłmico vĂ­a obtener_folio(), validaciĂłn de roles cliente/vendedor, inventario para ventas, series automĂĄticas. convertirDocumento(origenId, nuevoTipo, req) con pipeline cotizacionâorden_ventaâventa. cancelar(id, req) con reversiĂłn de inventario y series.
  - documentosCompra.model.js: crearDocumento, cancelar con reversiĂłn de inventario.
  - inventario.model.js: insertarMovimiento con vĂ­nculo a lĂ­nea de documento (documento_detalle_tipo, documento_detalle_id), getMovimientosPorDocumentoDetalle.
  - articulosSeries.model.js: CRUD completo, marcarVendido, findDisponibles, validaciĂłn de estado (disponible/vendido/reservado/baja).
  - comprobantesFiscales.model.js: consultas findAll/findById/findByUUID/findByDocumentoVentaId.
- **Rutas nuevas (protegidas con authMiddleware):**
  - /api/v1/documentos-venta (GET/POST, GET /:id, POST /convertir/:origenId, POST /:id/cancelar)
  - /api/v1/documentos-compra (GET/POST, GET /:id, POST /:id/cancelar)
  - /api/v1/articulos-series (GET /articulo/:id, GET /disponibles/:id, POST, GET /:id, PUT /:id/estado, GET /buscar/:serie)
  - /api/v1/comprobantes-fiscales (GET, GET /:id, GET /documento/:id, GET /uuid/:uuid)
- **index.js:** Registro de todas las nuevas rutas, compatibilidad hacia atrĂĄs en /api/v1/ventas.

### ConfiguraciĂłn:
- Se generĂł commit: "feat: transacciones por capas (cabecera/lĂ­neas/inventario/series/fiscal), catĂĄlogos SAT completos y facturaciĂłn CFDI 4.0"

## 0009 - Sistema de permisos RBAC y endpoints de entidades/artĂ­culos
### SQL (db/migration_v4.sql):
- CreaciĂłn de tabla `permisos` (id, codigo UNICO, descripcion, modulo)
- CreaciĂłn de tabla `rol_permisos` (rol_id, permiso_id, PRIMARY KEY compuesta)
- Precarga de permisos: ventas.crear, ventas.cancelar, ventas.ver, compras.ver, inventario.ver, contabilidad.ver, contabilidad.exportar, fiscal.ver, crm.ver, pos.usar, admin.configurar
- AsignaciĂłn de todos los permisos al rol `admin`

### Node.js (api-node/):
- `src/middleware/permissions.js`: Middleware `checkPermission(permisoRequerido)` que consulta rol_permisos y retorna 403 si no tiene permiso
- `src/routes/auth.routes.js`: 
  - Nuevo endpoint POST `/login-cliente` para autenticaciĂłn de portal clientes (con claim `portal: true`)
  - Nuevo endpoint GET `/perfil` para obtener informaciĂłn del usuario logueado
  - Nuevo endpoint GET `/mis-permisos` que devuelve los cĂłdigos de permisos del usuario
  - ActualizaciĂłn de `/login` para incluir `rol_nombre` y `entidad_razon_social` en respuesta
- `src/routes/permisos.routes.js`: CRUD completo de permisos por rol
- `api-node/index.js`: 
  - Nuevos endpoints `/api/v1/articulos?search=` para bĂşsqueda de productos (usado por POS)
  - Nuevo endpoint `/api/v1/entidades?search=&rol=` para bĂşsqueda de entidades (clientes, proveedores)
  - Registro de rutas de permisos

### Frontend - Landing Page y Login:
- `src/layouts/PublicLayout.vue`: Layout pĂşblico con AppBar, footer, y botĂłn "Acceso" que abre modal
- `src/views/landing/HomeView.vue`: Hero section, mĂłdulos cards, servicios, formulario de contacto
- `src/components/LoginModal.vue`: Modal con tabs ERP y Portal de Clientes, login JWT, redirecciĂłn a dashboard/portal

### Frontend - Dashboard Modular:
- `src/layouts/DashboardLayout.vue`: Barra superior con usuario y logout, Navigation Drawer con menĂş agrupado por mĂłdulos y permisos, router-view para contenido
- `src/views/DashboardHome.vue`: Cards de acceso rĂĄpido, informaciĂłn del usuario, estado del sistema
- MĂłdulo Ventas: CotizacionesView, OrdenesView, FacturasView, ClientesView
- MĂłdulo Compras: OrdenesCompraView, RecepcionesView, ProveedoresView
- MĂłdulo Inventario: ArticulosView, AlmacenesView, MovimientosView, SeriesView
- MĂłdulo Contabilidad: CuentasView, AsientosView, BalanzaView
- MĂłdulo Fiscal: CFDIView, TimbradoView, CancelacionesView
- MĂłdulo CRM: OportunidadesView, ActividadesView
- MĂłdulo ConfiguraciĂłn: UsuariosView, CatalogosView (SAT), AuditoriaView
- `src/components/ModuloPlaceholder.vue`: Componente reutilizable para vistas placeholder con tabla vacĂ­a

### Frontend - Portal de Clientes:
- `src/layouts/PortalLayout.vue`: Layout simplificado para portal con navegaciĂłn a facturas y estado de cuenta
- `src/views/portal/FacturasView.vue`: Consulta de facturas del cliente autenticado
- `src/views/portal/EstadoCuentaView.vue`: Resumen de saldos pendientes con cards informativos

### Frontend - Sistema de Permisos (RBAC):
- `src/views/configuracion/PermisosView.vue`: Interfaz para asignar/desasignar permisos por rol mediante checkboxes agrupados por mĂłdulo

### Frontend - Punto de Venta (POS):
- `src/views/pos/POSView.vue`: POS completo con buscador de productos, carrito, selector de cliente, mĂŠtodo de pago y botĂłn Cobrar que POST a documentos-venta

### Vue Router (`src/router/index.js`):
- Ruta `/` usa PublicLayout y renderiza HomeView (landing page)
- Ruta `/login` redirige a `/`
- Ruta `/dashboard` usa DashboardLayout con ~20 rutas hijas protegidas (requiresAuth)
- Ruta `/portal` usa PortalLayout con rutas hijas para facturas y estado de cuenta
- Navigation guard protege rutas requiresAuth redirigiendo a `/`

### ConfiguraciĂłn:
- Se generĂł commit: "feat: landing page Odoo-like, portal clientes, RBAC y POS"

## 0010 - MĂłdulo de Ventas completo con trazabilidad y chatter de auditorĂ­a
- Modelo `documentosVenta.model.js` con mĂŠtodos: crearDocumento, convertirDocumento, cancelar, findAll, findById
- Rutas `documentosVenta.routes.js` con endpoints: GET, GET /:id, GET /:id/historial, POST, POST /convertir/:origenId, POST /:id/cancelar
- Vistas Vue 3/Vuetify: CotizacionesView, OrdenesView, FacturasView con tablas, filtros, diĂĄlogos de creaciĂłn y acciones
- Vista de detalle DocumentoVentaDetalle con trazabilidad origen/destino y panel CHATTER con v-timeline
- Endpoint de historial que consulta log_modificaciones_cabecera y log_modificaciones_detalle.
- Trazabilidad completa entre cotizaciĂłn â orden de venta â factura/venta con transacciones ACID.

## 0011 - Sistema de facturaciĂłn electrĂłnica CFDI 4.0 completo
- GeneraciĂłn de XML CFDI 4.0 desde api-python con catĂĄlogos SAT
- Endpoint POST /api/v1/fiscal/timbrar/{documento_venta_id}
- Consulta de comprobantes fiscales con UUID, XML, estado
- Vistas frontend: CFDIView, TimbradoView, CancelacionesView con VDataTable y acciones
- Panel de historial (CHATTER) para CFDI
- IntegraciĂłn con documentos de venta: actualiza estado a facturado y vincula comprobante

## 0012 - MĂłdulo de Compras completo con flujo de etapas, trazabilidad y chatter de auditorĂ­a
### Node.js (api-node/):
- **src/models/documentosCompra.model.js** (actualizado): 
  - `crearDocumento(tipo, datos, req)`: Valida proveedor con rol 'proveedor', obtiene serie por defecto, genera folio atĂłmico con `obtener_folio('OC'/'COM')`, calcula total, inserta en documentos_compra con estado 'confirmado', inserta lĂ­neas en documentos_compra_detalle, genera movimientos de inventario de entrada para tipo 'compra', actualiza costo_promedio con promedio ponderado simple. TransacciĂłn BEGIN/COMMIT/ROLLBACK con setAuditContext.
  - `convertirDocumento(origenId, nuevoTipo, req)`: Toma documento origen (orden_compra), crea compra con los mismos detalles, establece documento_origen_id, genera movimientos de entrada y actualiza costo_promedio.
  - `cancelar(id, req)`: Si es compra, revierte inventario con movimiento de salida. Cambia estado a 'cancelado'.
  - `findAll(filtros)`: Con JOINs a entidades y series, filtros por tipo/estado/proveedor.
  - `findById(id)`: Con JOINs, subconsultas para origen y destino (trazabilidad).
- **src/routes/documentosCompra.routes.js** (actualizado):
  - GET / â listar con filtros
  - GET /:id â detalle con origen/destino
  - GET /:id/historial â auditorĂ­a desde log_modificaciones_cabecera/detalle
  - POST / â crear documento (orden_compra o compra)
  - POST /convertir/:origenId â convertir orden_compra â compra
  - POST /:id/cancelar â cancelar con reversiĂłn de inventario
  - Todas protegidas con authMiddleware

### Frontend (frontend/):
- **src/views/compras/OrdenesCompraView.vue**: Listado de Ăłrdenes de compra con v-data-table, filtros, diĂĄlogo de creaciĂłn con autocomplete de proveedores/artĂ­culos, acciones de convertir a compra y cancelar. Iconos: mdi-plus-circle, mdi-content-save, mdi-cancel, mdi-arrow-decision.
- **src/views/compras/ComprasView.vue**: Listado de compras con columna de origen, diĂĄlogo de creaciĂłn directa de compra con entrada de inventario.
- **src/views/compras/DocumentoCompraDetalle.vue**: Vista de detalle con cabecera, lĂ­neas, trazabilidad origen/destino con enlaces, panel CHATTER con v-timeline mostrando historial de auditorĂ­a (tipo_operaciĂłn I/U/D, usuario, fecha, campos modificados).
- **src/router/index.js**: Agregadas rutas /dashboard/compras/compras, /dashboard/compras/:id

### Trazabilidad:
- `convertirDocumento` establece correctamente `documento_origen_id` en el nuevo documento
- `findById` incluye subconsultas para origen (documento que lo originĂł) y destino (documento creado a partir de ĂŠste)
- Vistas muestran alerts con enlaces navegables: "Proviene de [Tipo] [Folio]" y "Convertido a [Tipo] [Folio]"

### IconografĂ­a:
- Crear nuevo: mdi-plus-circle
- Editar: mdi-pencil
- Guardar: mdi-content-save
- Cancelar: mdi-cancel
- Convertir: mdi-arrow-decision
- Ver historial: mdi-history

## 0013 - Modelo unificado TransaccionesModel y rutas /api/v1/transacciones
### SQL (db/migration_v4_unificacion.sql):
- CreaciĂłn de tablas unificadas: transacciones, transacciones_detalle, transacciones_series, transacciones_contables y cuentas_contables
- MigraciĂłn de datos desde documentos_venta, documentos_compra, inventario_movimientos, articulos_series y asientos_contables
- Ăndices y triggers de auditorĂ­a para las nuevas tablas
- Nuevos tipos en control_folios: AJU, ENT, SAL

### Node.js (api-node/):
- `src/models/transacciones.model.js`: Nuevo modelo unificado con mĂŠtodos:
  - crearTransaccion(tipo, datos, req): Crea cualquier tipo de transacciĂłn con folio atĂłmico, validaciĂłn de roles, cĂĄlculo de totales, inserciĂłn de detalles, movimientos de inventario, manejo de series y generaciĂłn automĂĄtica de asientos contables
  - convertirTransaccion(origenId, nuevoTipo, req): ConversiĂłn lĂłgica entre tipos (cotizacionâorden_ventaâventa, orden_compraâcompra)
  - cancelarTransaccion(id, req): CancelaciĂłn con reversiĂłn de inventario y liberaciĂłn de series
  - findAll(filtros): BĂşsqueda con filtros por tipo, estado, cliente, proveedor, fechas
  - findById(id): Consulta completa con JOIN a entidades, series, detalles con sub-series, asientos contables, origen y destino
- `src/routes/transacciones.routes.js`: Rutas protegidas GET/POST /api/v1/transacciones, GET /:id, GET /:id/historial, POST /convertir/:origenId, POST /:id/cancelar
- `api-node/index.js`: Registro de ruta /api/v1/transacciones

### Backward compatibility:
- `src/routes/documentosVenta.routes.js`: Reescrito como wrapper que redirige todo a TransaccionesModel con mapeo de campos
- `src/routes/documentosCompra.routes.js`: Reescrito como wrapper que redirige todo a TransaccionesModel con mapeo de campos
- Los endpoints antiguos (/api/v1/documentos-venta, /api/v1/documentos-compra) siguen funcionando sin cambios en el frontend

## 0014 - ExpansiĂłn Compras (flujo completo), Inventarios, CatĂĄlogos funcionales y Reportes
### SQL (db/migration_v5_expansion.sql):
- Nuevos tipos de transacciĂłn: 'cotizacion_compra', 'recepcion_compra', 'traspaso', 'recepcion_traspaso'
- Nuevos folios en control_folios: COTC, RECC, TRAS, RECT
- Nuevas series en series_documentos para los 4 nuevos tipos
- AmpliaciĂłn del CHECK de tipo en transacciones

### Node.js (api-node/):
- `src/models/transacciones.model.js`: LĂłgica para traspaso (movimiento dual salida/entrada sin contabilidad), recepcion_traspaso (confirmaciĂłn de entrada), recepcion_compra (entrada inventario sin contabilidad)
- `src/models/reportes.model.js`: Nuevo modelo con mĂŠtodos reportesComprasPorArticulo, reportesComprasPorProveedor, stockActual, movimientosInventario, trazabilidadSerie
- `src/routes/reportes.routes.js`: GET /api/v1/reportes/compras... (2 endpoints)
- `src/routes/inventario.routes.js`: GET /api/v1/inventario/stock, /movimientos, /serie/:numero_serie
- `api-node/index.js`: Registro de nuevas rutas de reportes e inventario
- ActualizaciĂłn de transacciones.routes.js para incluir nuevos tipos en validaciones
- MigraciĂłn de endpoints antiguos (documentos-compra) a /api/v1/transacciones en frontend

### Frontend - CatĂĄlogos maestros funcionales:
- Entidades (Clientes/Proveedores): Vista funcional con CRUD, multi-roles, v-data-table y diĂĄlogos
- ArtĂ­culos: Vista funcional con SKU, precios, categorĂ­as, marcas, unidades, usa_serie, cĂłdigo barras
- Almacenes: Vista funcional con nombre, ubicaciĂłn, activo, diĂĄlogo CRUD

### Frontend - MĂłdulo de Compras completo:
- Cotizaciones de Compra (tipo='cotizacion_compra'): Tabla, diĂĄlogo nueva, selecciĂłn de proveedor/artĂ­culos
- Ărdenes de Compra (tipo='orden_compra'): Convertir desde cotizaciĂłn, tabla con filtros
- Compras (tipo='compra'): Directa o convertida desde orden, con entrada a inventario
- Recepciones de Compra (tipo='recepcion_compra'): Registro de entrada fĂ­sica vinculada a orden/compra
- Detalle genĂŠrico de transacciĂłn: Cabecera, lĂ­neas, trazabilidad origen/destino, panel historial (chatter)

### Frontend - MĂłdulo de Inventarios profesional:
- Traspasos entre Almacenes (tipo='traspaso'): Movimiento dual salida/entrada, selecciĂłn almacĂŠn origen/destino
- Recepciones de Traspaso (tipo='recepcion_traspaso'): ConfirmaciĂłn de entrada en almacĂŠn destino
- Reportes de Inventario: Stock actual, movimientos por artĂ­culo/almacĂŠn con filtros de fecha
- Consulta por NĂşmero de Serie: BĂşsqueda y trazabilidad completa del ciclo de vida de una serie

### Frontend - IntegraciĂłn y MenĂş:
- DashboardLayout.vue actualizado con nuevas rutas en menĂş lateral
- Vue Router con todas las nuevas rutas protegidas
- Flujos completos: CotizaciĂłn â Orden â RecepciĂłn â Compra (factura)

## 0015 - ERP operativo con datos demo, Ventas, Compras, Inventarios, Contabilidad, POS, CRM y RBAC
### SQL (db/demo_data.sql):
- Script de datos de demostraciĂłn con 5 entidades (2 clientes, 2 proveedores, 1 vendedor), 10 artĂ­culos variados (algunos con usa_serie=true), 3 almacenes, 3 transacciones de ejemplo (cotizaciĂłn venta, orden compra, venta completada) y saldos iniciales de inventario
- Folios generados correctamente usando obtener_folio()

### Frontend - MĂłdulo de Ventas completo:
- CotizacionesView, OrdenesView, FacturasView con v-data-table, filtros por estado/fechas, diĂĄlogos de creaciĂłn con autocomplete de clientes/artĂ­culos
- ConversiĂłn cotizaciĂłnâordenâventa con endpoint /api/v1/transacciones/convertir/:id
- ValidaciĂłn de stock suficiente antes de crear ventas
- Detalle de documento con cabecera, lĂ­neas, origen/destino y panel historial (chatter)

### Frontend - MĂłdulo de Compras completo:
- CotizacionesCompraView, OrdenesCompraView, ComprasView, RecepcionesView con misma estructura que Ventas
- Recepciones incrementan inventario (entrada fĂ­sica sin contabilidad)
- Compras generan asientos contables (cargo a inventario, abono a proveedores + IVA)

### Frontend - Inventarios y Trazabilidad:
- StockView: tabla con artĂ­culo, almacĂŠn, cantidad disponible calculada desde transacciones_detalle
- TraspasosView: lista de traspasos con diĂĄlogo nuevo, selecciĂłn almacĂŠn origen/destino
- SeriesView: buscador por nĂşmero de serie con historial de movimientos

### Frontend - Contabilidad BĂĄsica:
- CuentasView: ĂĄrbol de cuentas contables (v-treeview) con selecciĂłn y ver asientos
- AsientosView: tabla de asientos con filtros por fecha, detalle de cada asiento
- LibroMayorView: consulta por cuenta y rango de fechas con debe, haber y saldo
- BalanzaView: tabla con cuenta, saldo inicial, movimientos, saldo final

### Frontend - Punto de Venta (POS):
- POSView: interfaz de caja rĂĄpida con buscador de productos, carrito, total, cambio
- BotĂłn "Cobrar" crea transacciĂłn tipo 'venta' con mĂŠtodo de pago
- OpciĂłn de imprimir ticket (genera PDF simple en ventana nueva)

### Frontend - CRM BĂĄsico:
- OportunidadesView: tabla con oportunidades, filtros por etapa, diĂĄlogo crear/editar
- Relacionado con entidad (cliente) y vendedor

### Frontend - Dashboard Home con KPIs:
- Ventas del mes, Compras del mes, Stock bajo, Cuentas por cobrar
- Cards de acceso rĂĄpido a todos los mĂłdulos

### Backend - Mejoras:
- TransaccionesModel.crearTransaccion valida stock para 'venta' y 'salida_inventario'
- LĂłgica para 'compra': genera asientos de gasto/inventario
- GET /api/v1/inventario/stock con filtros por almacĂŠn y artĂ­culo
- GET /api/v1/inventario/serie/{numero_serie} con trazabilidad
- Contabilidad routes con endpoints para cuentas, asientos, libro mayor, balanza
- CRUD de oportunidades con tabla nueva (db/migration_v6_crm.sql)
- Middleware checkPermission en rutas protegidas
- Permisos RBAC aplicados en frontend (v-if en menĂş lateral)
- Vista de administraciĂłn de permisos (PermisosView) con checkboxes por rol

### UX y Mejoras Generales:
- v-snackbar en todas las vistas para feedback visual
- PaginaciĂłn en todas las v-data-table (items-per-page)
- Ordenamiento por columnas
- Loadings (v-progress-linear) mientras se cargan datos
- Confirmaciones (v-dialog) antes de cancelar o convertir documentos
- KPIs en dashboard principal

### ConfiguraciĂłn:
- Se generĂł commit: "feat: ERP operativo con datos demo, Ventas, Compras, Inventarios, Contabilidad, POS, CRM y RBAC"

## 0016 - MĂłdulo de ConfiguraciĂłn completo, generaciĂłn de PDF y soluciĂłn de errores en compras
### SQL (db/migration_v7_configuracion.sql):
- CreaciĂłn de tabla `empresa_configuracion` para datos fiscales, logo, tĂŠrminos legales y CSD
- CreaciĂłn de tabla `almacenes_formatos` para configuraciĂłn de impresiĂłn por almacĂŠn y tipo documento
- CreaciĂłn de tabla `reportes_configuracion` para almacenar consultas SQL parametrizadas
- AdiciĂłn de columna `almacen_id` en `control_folios` para secuencias por almacĂŠn
- InserciĂłn de nuevos permisos: `admin.configurar`, `reportes.editar`, `reportes.ejecutar`, `pdf.generar`, `pdf.configurar`
- InserciĂłn de datos demo de empresa y reportes de ejemplo

### Node.js (api-node/):
- `src/routes/configuracion.routes.js`: Endpoints GET/PUT /api/v1/configuracion/empresa para leer y escribir configuraciĂłn de empresa (empresa_configuracion + entidades)
- `src/routes/configuracionAlmacenes.routes.js`: CRUD completo de almacenes con series (series_documentos) y formatos de impresiĂłn (almacenes_formatos), soft delete
- `src/routes/reportesConfiguracion.routes.js`: CRUD de reportes configurables con ejecuciĂłn de SQL parametrizada, duplicado y eliminaciĂłn
- `src/routes/pdf.routes.js`: GeneraciĂłn de plantillas HTML para PDF de transacciones (cotizaciĂłn, orden_venta, factura, orden_compra, compra, traspaso) con datos de empresa, logo, entidad, artĂ­culos y totales
- `api-node/index.js`: Registro de nuevas rutas (/api/v1/configuracion, /api/v1/reportes-configuracion, /api/v1/generar-pdf)
- Mejora del endpoint GET /api/v1/entidades con filtro por rol (JOIN a entidad_roles)

### Frontend (frontend/):
- `src/views/configuracion/ConfiguracionEmpresaView.vue`: Formulario con 4 pestaĂąas (v-tabs): Datos Generales, Datos Fiscales, Formatos de Documentos, Certificados CSD. Carga/guarda desde GET/PUT /api/v1/configuracion/empresa. Estilo Odoo con v-card agrupados.
- `src/views/configuracion/ConfiguracionAlmacenesView.vue`: Tabla de almacenes con ediciĂłn en diĂĄlogo de 3 pestaĂąas: Datos Generales, Secuencias de Documentos (series), Formatos de ImpresiĂłn (tamaĂąo, orientaciĂłn, mĂĄrgenes). CRUD completo con soft delete.
- `src/views/configuracion/GeneradorReportesView.vue`: Tabla de reportes con filtro por mĂłdulo. DiĂĄlogo de ediciĂłn con 3 pestaĂąas: DiseĂąo, Consulta SQL (editor monospace), ParĂĄmetros y Columnas. Vista previa con ejecuciĂłn de consulta y exportaciĂłn a CSV.
- `src/router/index.js`: Nuevas rutas /dashboard/configuracion/empresa, /dashboard/configuracion/almacenes, /dashboard/configuracion/reportes
- `src/layouts/DashboardLayout.vue`: Nuevas opciones en menĂş ConfiguraciĂłn: Empresa, Almacenes, Generador Reportes (con permiso reportes.ejecutar)
- `src/views/compras/CotizacionesCompraView.vue` y `OrdenesCompraView.vue`: CorrecciĂłn de autocompletado de proveedores usando endpoint con rol=proveedor

### UX y Mejoras:
- v-snackbar en todas las nuevas vistas para feedback visual de ĂŠxito/error
- v-tabs con iconos en todas las vistas de configuraciĂłn
- v-card outlined agrupando campos por secciĂłn (estilo Odoo)
- Permisos checkPermission en todos los endpoints de configuraciĂłn
- ExportaciĂłn a CSV desde el generador de reportes
- Plantillas HTML profesionales para PDF con logo, datos fiscales, tabla de artĂ­culos y firmas
- Fallback de permisos en DashboardLayout para desarrollo

## 0017 - Sistema de notificaciĂłn de errores tipo SAP
### Backend (api-node/):
- `src/middleware/errorHandler.js`: Nuevo middleware de manejo de errores con clase `AppError` que genera cĂłdigos Ăşnicos formato `MOD-XXX` (ART-001, VENT-002, TRANS-001, ENT-001, INV-001, etc.). Responde con JSON estructurado: `{ codigo, mensaje, modulo, detalle, timestamp }`. Integrado al final de las rutas en `api-node/index.js` con `app.use(errorHandler)`.
- `src/routes/transacciones.routes.js`: Actualizados todos los catch blocks para usar `next(new AppError('TRANS-XXX', err.message))` y respuestas 404 con formato de error estĂĄndar.
- `src/routes/inventario.routes.js`: Actualizados todos los catch blocks en almacenes, entidades, artĂ­culos y reportes para usar `next(new AppError('INV-XXX'/'ENT-XXX'/'ART-XXX', err.message))` con cĂłdigos especĂ­ficos por operaciĂłn.
- `api-node/index.js`: Actualizados endpoints inline de artĂ­culos y entidades para usar `next(new AppError(...))` en catch blocks. ImportaciĂłn de `AppError` desde el middleware.

### Frontend (frontend/):
- `src/stores/errorStore.js`: Nuevo store reactivo con `useErrorStore()` que expone `errors`, `hasErrors`, `errorCount`, y acciones `addError`, `removeError`, `clearAll`, `toggleExpand`. Almacena hasta 50 errores con estructura `{ id, codigo, mensaje, modulo, detalle, timestamp, expanded }`.
- `src/components/ErrorNotification.vue`: Nuevo componente de notificaciĂłn flotante en esquina inferior derecha. Muestra panel con cabecera roja, lista de errores con Ă­cono, cĂłdigo, mĂłdulo y mensaje. Al hacer clic se expande para mostrar detalle tĂŠcnico y timestamp. BotĂłn de cerrar (X) individual y botĂłn para ocultar todas. Auto-eliminaciĂłn despuĂŠs de 15 segundos con `setTimeout`. Colores por prefijo de cĂłdigo (ART=orange, VENT=red, TRANS=purple, ENT=blue, INV=amber, etc.).
- `src/layouts/DashboardLayout.vue`: IntegraciĂłn de `<ErrorNotification />` al final del template para visibilidad global. Import del componente.
- `src/plugins/axios.js`: Interceptor de respuesta actualizado para capturar errores HTTP y enviarlos al store de errores. Extrae el JSON estructurado del backend (`{ codigo, mensaje, modulo, detalle, timestamp }`) o construye uno por defecto segĂşn el cĂłdigo de estado HTTP. Maneja errores de red (sin respuesta del servidor) con cĂłdigo `SYS-002`.

## 0018 - Log persistente de errores, mejoras en navegaciĂłn y detalle multi-tipo
### Base de datos (db/):
- `migration_v10_log_errores.sql`: Nueva migraciĂłn que crea la tabla `log_errores` con columnas: id, codigo, mensaje, modulo, detalle, usuario_id (FK a usuarios), ruta, ip, fecha. Incluye Ă­ndices para bĂşsqueda por fecha, mĂłdulo, cĂłdigo y usuario. Trigger de auditorĂ­a que registra en `log_modificaciones_cabecera` cada nuevo error.

### Backend (api-node/):
- `src/routes/logErrores.routes.js`: Nuevo archivo con dos endpoints:
  - `POST /api/v1/log-errores`: Registra errores desde el frontend con autenticaciĂłn. Valida que codigo y mensaje sean requeridos.
  - `GET /api/v1/log-errores`: Consulta paginada con filtros por fecha_desde, fecha_hasta, modulo, codigo. Solo accesible con permiso `admin.configurar`. Incluye JOIN con usuarios para mostrar nombre.
- `api-node/index.js`: Registro de la ruta `logErroresRoutes` en `/api/v1/log-errores`.

### Frontend (frontend/):
- `src/components/ErrorNotification.vue`: Ahora envĂ­a automĂĄticamente cada error al backend via `POST /api/v1/log-errores` cuando hay un token de sesiĂłn. ImplementaciĂłn silenciosa (no interrumpe al usuario si falla el envĂ­o).
- `src/views/configuracion/ConfiguracionLogErrores.vue`: Nueva vista administrativa para consultar el log de errores. Incluye:
  - Tabla con columnas: CĂłdigo (chip coloreado por mĂłdulo), MĂłdulo, Mensaje, Detalle (tooltip), Usuario, Fecha, Acciones.
  - Filtros por cĂłdigo, mĂłdulo, rango de fechas.
  - PaginaciĂłn nativa de Vuetify.
  - DiĂĄlogo modal con detalle completo del error (cĂłdigo, mĂłdulo, mensaje, detalle tĂŠcnico, usuario, fecha, ruta, IP).
  - DiseĂąo responsivo y colores consistentes con el sistema de notificaciĂłn.
- `src/router/index.js`: Ruta `LogErrores` registrada bajo `/dashboard/configuracion/log-errores` con permiso `admin.configurar`.
- `src/layouts/DashboardLayout.vue`: 
  - Nuevo botĂłn **"Inicio"** en el menĂş lateral con Ă­cono `mdi-home` que redirige a `/dashboard`.
  - Nuevo item **"Log de Errores"** dentro del grupo ConfiguraciĂłn con Ă­cono `mdi-alert-circle-outline` color error.
- `src/views/compras/DocumentoCompraDetalle.vue`: Mejora multi-tipo:
  - Nuevas propiedades computadas `esVenta` y `esCompra` para detectar el tipo de documento.
  - `textoBotonVolver` dinĂĄmico que muestra "Volver a Ventas" o "Volver a Compras" segĂşn el tipo de documento.
  - Compatible con tipos: venta, orden_venta, cotizacion, compra, orden_compra, cotizacion_compra, recepcion_compra.

## 0019 - CorrecciĂłn: Volver a Ventas redirige a Ventas y Log de Errores guarda en BD

### Bugfix 1 - BotĂłn "Volver a Ventas" redirigĂ­a siempre a Dashboard:
- **Causa raĂ­z:** El router de Vue.js no tenĂ­a rutas definidas para `/dashboard/ventas` ni `/dashboard/compras`. Solo tenĂ­a rutas hijas como `ventas/facturas`, `ventas/cotizaciones`, etc. Al hacer `router.push('/dashboard/ventas')`, el catch-all `:pathMatch(.*)*` redirigĂ­a a `/dashboard`.
- **SoluciĂłn:** Se agregaron rutas redirect en `frontend/src/router/index.js`:
  - `/dashboard/ventas` â redirige a `/dashboard/ventas/facturas`
  - `/dashboard/compras` â redirige a `/dashboard/compras/compras`
- La funciĂłn `volver()` en `DocumentoCompraDetalle.vue` ya estaba correcta con la detecciĂłn de tipo por `esVenta`/`esCompra`.

### Bugfix 2 - Log de Errores no guardaba en BD:
- **Causa raĂ­z 1:** La migraciĂłn `migration_v10_log_errores.sql` **NO** estaba incluida en `docker-compose.yml` (faltaba en el array de volumes del servicio postgres). Por lo tanto la tabla `log_errores` nunca se creĂł en la BD. Se agregĂł `07_migration_v10_log_errores.sql` al docker-compose y se ejecutĂł `CREATE TABLE` manualmente.
- **Causa raĂ­z 2:** La migraciĂłn v10 incluye un trigger de auditorĂ­a `trg_audit_log_errores` que intenta leer `app.usuario_id` (setAuditContext). Este contexto NO se configura en el endpoint POST de log-errores, por lo que cualquier INSERT fallarĂ­a con error. Se eliminĂł el trigger de la tabla ya que es redundante auditar una tabla de logs.
- **SoluciĂłn adicional:** El frontend ahora envĂ­a `usuario_id` explĂ­citamente desde el objeto `usuario` guardado en localStorage.
- **SoluciĂłn adicional backend:** Se modificĂł `logErrores.routes.js` para aceptar `usuario_id` desde el body, priorizĂĄndolo sobre el extraĂ­do del JWT.

### Bugfix 3 - Log de Errores mostraba tabla vacĂ­a sin mensaje:
- **Archivo**: `frontend/src/views/configuracion/ConfiguracionLogErrores.vue`
- **SoluciĂłn**: Se agregĂł un `v-card` con estado vacĂ­o (condicional `v-if="!loading && errores.length === 0"`) que muestra el mensaje "No hay errores registrados" con un Ă­cono grande y texto descriptivo.

## 0021 - Configuraciones adicionales CxC/CxP (crĂŠdito en entidades, cuentas contables default, cuentas en artĂ­culos)
### Frontend - Entidades (frontend/src/views/compras/EntidadesView.vue):
- Nuevos campos en el diĂĄlogo de creaciĂłn/ediciĂłn: LĂ­mite de CrĂŠdito, DĂ­as de CrĂŠdito por Defecto, Estatus Crediticio (activo/suspendido/bloqueado)
- Formulario actualizado con secciĂłn "ConfiguraciĂłn de CrĂŠdito" antes de Roles
- Datos incluidos en formData y abrirDialogo

### Frontend - ArtĂ­culos (frontend/src/views/inventario/ArticulosView.vue):
- Nuevos campos contables: Cuenta de Ingreso (Ventas) y Cuenta de Gasto (Compras) usando v-autocomplete
- Carga de catĂĄlogo de cuentas contables desde /api/v1/contabilidad/cuentas
- SecciĂłn "ConfiguraciĂłn Contable" con las dos cuentas FK

### Frontend - ConfiguraciĂłn Empresa (frontend/src/views/configuracion/ConfiguracionEmpresaView.vue):
- Nueva pestaĂąa "Cuentas Contables Default" con campos para 7 cuentas:
  - CxC (Clientes), CxP (Proveedores), Caja/Bancos, Ventas, Compras, IVA Trasladado, IVA Acreditable
- Carga/guarda desde/hacia /api/v1/configuracion-sistema
- Lee y escribe configuraciones de cuentas contables por defecto

### Contenedores reiniciados:
- `docker compose restart api-node frontend`

### Contenedores reiniciados:

## 0020 - MĂłdulos de Cuentas por Cobrar (CxC) y Cuentas por Pagar (CxP)
### SQL (db/migration_v13_cxc_cxp.sql):
- CreaciĂłn de tablas `cxc_movimientos` y `cxp_movimientos` con FK a transacciones/entidades, tipo CHECK('cargo','abono'), estado CHECK('pendiente','parcial','pagado','cancelado')
- Columnas en `entidades`: limite_credito DECIMAL(12,2) DEFAULT 0, dias_credito_default INTEGER DEFAULT 0, estatus_credito VARCHAR(20) DEFAULT 'activo'
- Columnas en `articulos`: cuenta_ingreso_id FK a cuentas_contables, cuenta_gasto_id FK a cuentas_contables
- Configuraciones en configuracion_sistema: cuenta_cxc_default, cuenta_cxp_default, cuenta_caja_default, cuenta_ventas_default, cuenta_compras_default, cuenta_iva_trasladado, cuenta_iva_acreditable
- Tipos 'cobro' y 'pago' agregados al CHECK de transacciones.tipo

### Node.js (api-node/):
- **src/models/cxc.model.js**: crearMovimientoCxC, aplicarCobro, obtenerEstadoCuenta, obtenerAntiguedad
- **src/models/cxp.model.js**: crearMovimientoCxP, aplicarPago, obtenerEstadoCuenta, obtenerAntiguedad
- **src/routes/cxc.routes.js**: GET/POST /api/v1/cxc/movimientos, GET /api/v1/cxc/estado-cuenta/:entidad_cliente_id, GET /api/v1/cxc/antiguedad/:entidad_cliente_id
- **src/routes/cxp.routes.js**: Equivalentes para proveedores
- **api-node/index.js**: Registro de rutas /api/v1/cxc y /api/v1/cxp
- **src/models/transacciones.model.js**: IntegraciĂłn de CxC/CxP en _generarAsientosContables:
  - Venta a crĂŠdito: cargo a Clientes (CxC) + abono a Ventas/IVA, inserta en cxc_movimientos
  - Venta contado: cargo a Caja/Bancos
  - Compra a crĂŠdito: cargo a Inventario/Compras + IVA acreditable + abono a Proveedores (CxP), inserta en cxp_movimientos
  - Cobro: cargo a Caja, abono a CxC, reduce saldo_restante
  - Pago: cargo a CxP, abono a Caja
  - Cuentas contables obtenidas desde configuracion_sistema con fallback

### Frontend (frontend/):
- **src/views/finanzas/CxcView.vue**: Vista completa con 3 pestaĂąas:
  - Estado de Cuenta: selector cliente + saldo actual + tabla movimientos
  - AntigĂźedad de Saldos: periodos 30/60/90+ dĂ­as
  - Registrar Cobro: selector cliente, factura pendiente, monto, mĂŠtodo pago, fecha
- **src/views/finanzas/CxpView.vue**: Estructura equivalente para proveedores
- **src/router/index.js**: Rutas /dashboard/cxc, /dashboard/cxp
- **src/layouts/DashboardLayout.vue**: Nuevo grupo "Finanzas" en menĂş lateral con CxC y CxP

### Contenedores reiniciados:
- `docker compose restart api-node frontend`
- `docker compose restart frontend api-node`

## 0020 - RediseĂąo CxC/CxP + IntegraciĂłn Asientos Contables y Asientos Manuales
### SQL (db/migration_v14_cxc_cxp_redesign.sql):
- **Tabla transacciones**: Nuevas columnas `saldo_restante DECIMAL(12,2) DEFAULT 0`, `estado_saldo VARCHAR(20) DEFAULT 'pendiente' CHECK (estado_saldo IN ('pendiente','parcial','liquidado'))`
- **transacciones_cuentas**: RediseĂąada para abonos - columnas `id SERIAL PRIMARY KEY`, `transaccion_id INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE RESTRICT`, `transaccion_factura_id INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE RESTRICT`, `monto DECIMAL(12,2) NOT NULL`, `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- **EliminaciĂłn**: Tablas `cxc_movimientos` y `cxp_movimientos` si existen
- **CHECK ampliado**: Tipo 'asiento_manual' agregado a transacciones.tipo CHECK

### Node.js (api-node/):
- **TransaccionesModel.crearTransaccion** (src/models/transacciones.model.js):
  - Venta/Compra a crĂŠdito (dias_credito > 0): establece `saldo_restante = total`, `estado_saldo = 'pendiente'`
  - Cobro: recibe factura_id + monto, inserta abono en transacciones_cuentas, actualiza saldo_restante de la factura, recalcula estado_saldo ('liquidado' si 0, 'parcial' si < total)
  - Pago: misma lĂłgica para proveedores (CxP)
  - Asiento_manual: inserta lĂ­neas contables directas sin afectar inventario ni saldos, valida dĂŠbitos = crĂŠditos
  - Asiento contable de cobro: Cargo a Caja/Bancos, Abono a Clientes (CxC)
  - Asiento contable de pago: Cargo a Proveedores (CxP), Abono a Caja/Bancos
- **transacciones.routes.js**: Acepta tipo 'asiento_manual'; no requiere artĂ­culos para asiento_manual, cobro ni pago
- **contabilidad.routes.js**: GET /api/v1/contabilidad/asientos ahora acepta filtro `tipo` para filtrar por tipo de transacciĂłn

### Frontend (frontend/):
- **AsientosView.vue**: Nuevo filtro por tipo de transacciĂłn (Venta, Compra, Cobro, Pago, Asiento Manual); al hacer clic en una fila abre diĂĄlogo de detalle con botĂłn "Ver TransacciĂłn" que navega al detalle de la transacciĂłn relacionada
- **AsientosManualesView.vue**: Nueva vista con formulario completo de asientos manuales:
  - Fecha, Concepto/DescripciĂłn
  - LĂ­neas contables dinĂĄmicas con v-autocomplete de cuentas contables (cĂłdigo + nombre), debe, haber
  - VisualizaciĂłn en tiempo real de total dĂŠbitos, crĂŠditos y diferencia
  - BotĂłn "Agregar LĂ­nea" para aĂąadir mĂĄs filas
  - ValidaciĂłn: requiere al menos 2 lĂ­neas, cada lĂ­nea con cuenta y monto, dĂŠbitos = crĂŠditos (tolerancia $0.01)
  - Al guardar, crea transacciĂłn tipo 'asiento_manual' vĂ­a POST /api/v1/transacciones
- **DocumentoCompraDetalle.vue**: SecciĂłn "Asientos Contables" que muestra registros de transacciones_contables filtrados por transaccion_id
- **router/index.js**: Ruta /dashboard/contabilidad/asientos-manuales
- **DashboardLayout.vue**: Nuevo item "Asientos Manuales" en grupo Contabilidad

### MigraciĂłn ejecutada:
- Script `api-node/run_migration_v14.js` creado
- MigraciĂłn SQL v14 ejecutada en base de datos
- `docker compose restart api-node frontend`

## 0019b - CorrecciĂłn final: Volver a ruta especĂ­fica por subtipo + Log de errores en BD

### Refinamiento Fix 1 - Log de errores:
- Se confirmĂł que el flujo completo funciona:
  - `ErrorNotification.vue`: envĂ­a POST con `{ codigo, mensaje, modulo, detalle, ruta, usuario_id }` (usuario_id extraĂ­do de localStorage)
  - `logErrores.routes.js`: POST protegido con authMiddleware, INSERT en log_errores con todos los campos
  - `ConfiguracionLogErrores.vue`: GET con filtros, muestra "No hay errores registrados" si array vacĂ­o
  - Tabla `log_errores` ya existe en BD (creada manualmente + agregada a docker-compose.yml)
  - Trigger de auditorĂ­a eliminado (causaba error al insertar sin setAuditContext)

### Refinamiento Fix 2 - BotĂłn volver ahora redirige a lista especĂ­fica por subtipo:
- **Antes**: `volver()` redirigĂ­a a genĂŠricos `/dashboard/ventas` o `/dashboard/compras` (ambos con redirect catch-all)
- **Ahora**: `volver()` usa `mapRutaVolver` con rutas especĂ­ficas:
  - `cotizacion_compra` â `/dashboard/compras/cotizaciones`
  - `orden_compra` â `/dashboard/compras/ordenes`
  - `compra` â `/dashboard/compras/compras`
  - `recepcion_compra` â `/dashboard/compras/recepciones`
  - `cotizacion` â `/dashboard/ventas/cotizaciones`
  - `orden_venta` â `/dashboard/ventas/ordenes`
  - `venta` â `/dashboard/ventas/facturas`
  - otros â `/dashboard`
- **Texto del botĂłn**: ahora usa `mapTextoVolver` con textos precisos:
  - "Volver a Cotizaciones de Compra", "Volver a Ărdenes de Compra", "Volver a Compras", "Volver a Recepciones"
  - "Volver a Cotizaciones de Venta", "Volver a Ărdenes de Venta", "Volver a Facturas de Venta"
- Todos los cambios en `frontend/src/views/compras/DocumentoCompraDetalle.vue`

### Rutas redirect agregadas en router/index.js (compatibilidad):
- `/dashboard/ventas` â `/dashboard/ventas/facturas`
- `/dashboard/compras` â `/dashboard/compras/compras`

### Contenedores reiniciados:
  
## 0021 - M˘dulo de Plantillas PDF para Transacciones  
- Creaci˘n de tabla `plantillas_pdf` en BD (migration_v15).  
- Inserci˘n de 11 plantillas HTML por defecto (venta, cotizacion, orden_venta, compra, orden_compra, cotizacion_compra, recepcion_compra, traspaso, cobro, pago, asiento_manual).  
- API REST de CRUD para plantillas PDF (`/api/v1/plantillas-pdf`) protegida con authMiddleware.  
- Servicio `pdfGenerator.js` que usa Puppeteer para generar PDFs a partir de plantillas HTML con variables din micas ({{cliente_nombre}}, {{folio}}, {{total}}, etc.).  
- Endpoint `POST /api/v1/generar-pdf` que recibe {tipo, id} y devuelve el PDF binario.  
- Bot˘n "Imprimir PDF" con icono mdi-printer en DocumentoVentaForm.vue (ventas) y DocumentoCompraDetalle.vue (compras).  
- Vista `ConfiguracionPlantillasPDF.vue` en `/dashboard/configuracion/plantillas-pdf` con editor HTML, creaci˘n y vista previa.  
- Ruta agregada al menŁ de Configuraci˘n en DashboardLayout.vue.  
- Instalaci˘n de Puppeteer en api-node.
- Configuraci˘n de Dockerfile para incluir Chromium y variable PUPPETEER_EXECUTABLE_PATH.

## 0022 - Configuraci\u00f3n Contable Granular para Entidades y Tipos de Operaci\u00f3n
- Creaci\u00f3n de tabla `entidad_cuentas_contables` (migration_v16) con roles: proveedor, anticipo_proveedor, acreedor, anticipo_acreedor, cliente, anticipo_cliente, deudor, anticipo_deudor.
- Campo `tipo_concepto` agregado a `transacciones` con CHECK (estandar, gasto, deudores).
- Endpoints REST:
  - `GET /api/v1/entidades/:id/contabilidad` - Obtener configuraciones contables de una entidad.
  - `PUT /api/v1/entidades/:id/contabilidad` - Guardar configuraciones contables (upsert con activo/inactivo).
- Mecanismo en `_generarAsientosContables` (TransaccionesModel):
  - Consulta `entidad_cuentas_contables` antes de generar asientos.
  - Para venta con concepto 'deudores': usa cuenta configurada como 'deudor' o 'cliente'.
  - Para compra con concepto 'gasto': usa cuenta configurada como 'acreedor' o 'proveedor'.
  - Si no hay configuraci\u00f3n, usa defaults de configuracion_sistema.
- Frontend:
  - Secci\u00f3n "Configuraci\u00f3n Contable" en EntidadesView.vue con 8 campos v-autocomplete para cuentas contables.
  - Campo "Concepto" (Est\u00e1ndar/Deudores) agregado en DocumentoVentaForm.vue.
  - Campo "Concepto" (Est\u00e1ndar/Gasto) agregado en ComprasView.vue.
- Contenedores: api-node y frontend reiniciados.
