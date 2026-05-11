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
