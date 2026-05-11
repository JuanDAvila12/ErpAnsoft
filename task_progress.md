# Task Progress - Landing Page, Portal Clientes, Dashboard Modular, RBAC y POS

## BLOQUE 1: Landing Page Pública (Pre-Login)
- [x] Crear `src/layouts/PublicLayout.vue` con AppBar, botones Inicio/Servicios/Contacto/Acceso, footer
- [x] Crear `src/views/landing/HomeView.vue` con Hero, Módulos cards, formulario de contacto
- [x] Crear `src/components/LoginModal.vue` con tabs ERP y Portal de Clientes, login JWT
- [x] Ajustar Vue Router con rutas públicas, dashboard y portal

## BLOQUE 2: Dashboard Post-Login con Módulos
- [x] Crear `src/layouts/DashboardLayout.vue` con barra superior, navigation drawer, menú agrupado por módulos
- [x] Crear vistas placeholder para todos los módulos (~20 vistas)
- [x] Conectar rutas hijas en el router bajo `/dashboard/*`
- [x] Filtrar menú por permisos del usuario

## BLOQUE 3: Portal de Clientes
- [x] Crear `src/layouts/PortalLayout.vue` simplificado (Mis Facturas, Estado de Cuenta)
- [x] Crear `src/views/portal/FacturasView.vue` con consulta de facturas filtradas
- [x] Crear `src/views/portal/EstadoCuentaView.vue` con resumen de saldos
- [x] Endpoint POST `/api/v1/auth/login-cliente` con claim `portal: true` y `entidad_id`

## BLOQUE 4: Sistema de Permisos (RBAC)
- [x] SQL: Tablas `permisos` y `rol_permisos`, precarga de 27 permisos, asignación a roles
- [x] Node: Middleware `checkPermission(permisoRequerido)` con caché en permissions.js
- [x] Node: Rutas CRUD de permisos (`permisos.routes.js`) con GET /roles, GET /roles/:rolId, PUT /roles/:rolId/permisos
- [x] Frontend: `PermisosView.vue` con checkboxes agrupados por módulo
- [x] Endpoints auxiliares: `/api/v1/auth/perfil`, `/mis-permisos`, `/api/v1/permisos/verificar/:codigo`
- [x] Endpoints públicos: `/api/v1/articulos?search=`, `/api/v1/entidades?search=&rol=`

## BLOQUE 5: Punto de Venta (POS)
- [x] Crear `src/views/pos/POSView.vue` con buscador de productos, carrito, selector cliente, método pago, botón Cobrar
- [x] POST a `/api/v1/documentos-venta` con `tipo: 'venta'`

## BLOQUE 6: Integración y Pruebas
- [x] Rutas importadas correctamente en `index.js` de Node
- [x] Corregir importación de authMiddleware
- [x] Asegurar docker-compose incluye migration_v4.sql
- [x] Documentar en LOG_MODIFICACIONES.md (entrada 0009)
- [x] Commit: "feat: landing page Odoo-like, portal clientes, RBAC y POS"
