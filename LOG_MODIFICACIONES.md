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
