import { createRouter, createWebHistory } from 'vue-router'

// Layouts
import PublicLayout from '../layouts/PublicLayout.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import PortalLayout from '../layouts/PortalLayout.vue'

// Landing pages
import HomeView from '../views/landing/HomeView.vue'

// Dashboard views
import DashboardHome from '../views/DashboardHome.vue'

// Ventas
import CotizacionesView from '../views/ventas/CotizacionesView.vue'
import OrdenesView from '../views/ventas/OrdenesView.vue'
import FacturasView from '../views/ventas/FacturasView.vue'
import ClientesView from '../views/ventas/ClientesView.vue'

// Compras
import OrdenesCompraView from '../views/compras/OrdenesCompraView.vue'
import ComprasView from '../views/compras/ComprasView.vue'
import RecepcionesView from '../views/compras/RecepcionesView.vue'
import ProveedoresView from '../views/compras/ProveedoresView.vue'
import DocumentoCompraDetalle from '../views/compras/DocumentoCompraDetalle.vue'

// Inventario
import ArticulosView from '../views/inventario/ArticulosView.vue'
import AlmacenesView from '../views/inventario/AlmacenesView.vue'
import MovimientosView from '../views/inventario/MovimientosView.vue'
import SeriesView from '../views/inventario/SeriesView.vue'

// Contabilidad
import CuentasView from '../views/contabilidad/CuentasView.vue'
import AsientosView from '../views/contabilidad/AsientosView.vue'
import BalanzaView from '../views/contabilidad/BalanzaView.vue'

// Fiscal
import CFDIView from '../views/fiscal/CFDIView.vue'
import TimbradoView from '../views/fiscal/TimbradoView.vue'
import CancelacionesView from '../views/fiscal/CancelacionesView.vue'

// CRM
import OportunidadesView from '../views/crm/OportunidadesView.vue'
import ActividadesView from '../views/crm/ActividadesView.vue'

// POS
import POSView from '../views/pos/POSView.vue'

// Configuración
import UsuariosView from '../views/configuracion/UsuariosView.vue'
import PermisosView from '../views/configuracion/PermisosView.vue'
import CatalogosView from '../views/configuracion/CatalogosView.vue'
import AuditoriaView from '../views/configuracion/AuditoriaView.vue'

// Portal Clientes
import PortalFacturasView from '../views/portal/FacturasView.vue'
import PortalEstadoCuentaView from '../views/portal/EstadoCuentaView.vue'

const routes = [
  // === RUTAS PÚBLICAS (Landing Page) ===
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: HomeView,
      },
    ],
  },
  {
    path: '/login',
    redirect: '/',
  },

  // === RUTAS PROTEGIDAS: Dashboard (ERP) ===
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: DashboardHome,
      },
      // Ventas
      {
        path: 'ventas/cotizaciones',
        name: 'Cotizaciones',
        component: CotizacionesView,
        meta: { requierePermiso: 'ventas.ver' },
      },
      {
        path: 'ventas/ordenes',
        name: 'OrdenesVenta',
        component: OrdenesView,
        meta: { requierePermiso: 'ventas.ver' },
      },
      {
        path: 'ventas/facturas',
        name: 'FacturasVenta',
        component: FacturasView,
        meta: { requierePermiso: 'ventas.ver' },
      },
      {
        path: 'ventas/clientes',
        name: 'ClientesVentas',
        component: ClientesView,
        meta: { requierePermiso: 'ventas.ver' },
      },
      // Compras
      {
        path: 'compras/ordenes',
        name: 'OrdenesCompra',
        component: OrdenesCompraView,
        meta: { requierePermiso: 'compras.ver' },
      },
      {
        path: 'compras/compras',
        name: 'Compras',
        component: ComprasView,
        meta: { requierePermiso: 'compras.ver' },
      },
      {
        path: 'compras/:id',
        name: 'DocumentoCompraDetalle',
        component: DocumentoCompraDetalle,
        meta: { requierePermiso: 'compras.ver' },
      },
      {
        path: 'compras/recepciones',
        name: 'Recepciones',
        component: RecepcionesView,
        meta: { requierePermiso: 'compras.ver' },
      },
      {
        path: 'compras/proveedores',
        name: 'Proveedores',
        component: ProveedoresView,
        meta: { requierePermiso: 'compras.ver' },
      },
      // Inventario
      {
        path: 'inventario/articulos',
        name: 'Articulos',
        component: ArticulosView,
        meta: { requierePermiso: 'inventario.ver' },
      },
      {
        path: 'inventario/almacenes',
        name: 'Almacenes',
        component: AlmacenesView,
        meta: { requierePermiso: 'inventario.ver' },
      },
      {
        path: 'inventario/movimientos',
        name: 'MovimientosInventario',
        component: MovimientosView,
        meta: { requierePermiso: 'inventario.ver' },
      },
      {
        path: 'inventario/series',
        name: 'Series',
        component: SeriesView,
        meta: { requierePermiso: 'inventario.ver' },
      },
      // Contabilidad
      {
        path: 'contabilidad/cuentas',
        name: 'CuentasContables',
        component: CuentasView,
        meta: { requierePermiso: 'contabilidad.ver' },
      },
      {
        path: 'contabilidad/asientos',
        name: 'AsientosContables',
        component: AsientosView,
        meta: { requierePermiso: 'contabilidad.ver' },
      },
      {
        path: 'contabilidad/balanza',
        name: 'Balanza',
        component: BalanzaView,
        meta: { requierePermiso: 'contabilidad.ver' },
      },
      // Fiscal
      {
        path: 'fiscal/cfdis',
        name: 'CFDIs',
        component: CFDIView,
        meta: { requierePermiso: 'fiscal.ver' },
      },
      {
        path: 'fiscal/timbrado',
        name: 'Timbrado',
        component: TimbradoView,
        meta: { requierePermiso: 'fiscal.ver' },
      },
      {
        path: 'fiscal/cancelaciones',
        name: 'Cancelaciones',
        component: CancelacionesView,
        meta: { requierePermiso: 'fiscal.ver' },
      },
      // CRM
      {
        path: 'crm/oportunidades',
        name: 'Oportunidades',
        component: OportunidadesView,
        meta: { requierePermiso: 'crm.ver' },
      },
      {
        path: 'crm/actividades',
        name: 'ActividadesCRM',
        component: ActividadesView,
        meta: { requierePermiso: 'crm.ver' },
      },
      // POS
      {
        path: 'pos',
        name: 'POS',
        component: POSView,
        meta: { requierePermiso: 'pos.usar' },
      },
      // Configuración
      {
        path: 'configuracion/usuarios',
        name: 'Usuarios',
        component: UsuariosView,
        meta: { requierePermiso: 'admin.configurar' },
      },
      {
        path: 'configuracion/permisos',
        name: 'Permisos',
        component: PermisosView,
        meta: { requierePermiso: 'admin.configurar' },
      },
      {
        path: 'configuracion/catalogos',
        name: 'CatalogosSAT',
        component: CatalogosView,
        meta: { requierePermiso: 'admin.configurar' },
      },
      {
        path: 'configuracion/auditoria',
        name: 'Auditoria',
        component: AuditoriaView,
        meta: { requierePermiso: 'admin.configurar' },
      },
      // Ruta heredada (compatibilidad)
      {
        path: 'configuracion',
        redirect: '/dashboard/configuracion/catalogos',
      },
    ],
  },

  // Ruta heredada (compatibilidad)
  {
    path: '/ventas/nueva',
    redirect: '/dashboard/pos',
  },
  {
    path: '/configuracion',
    redirect: '/dashboard/configuracion/catalogos',
  },

  // === RUTAS PROTEGIDAS: Portal de Clientes ===
  {
    path: '/portal',
    component: PortalLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/portal/facturas',
      },
      {
        path: 'facturas',
        name: 'PortalFacturas',
        component: PortalFacturasView,
      },
      {
        path: 'estado-cuenta',
        name: 'PortalEstadoCuenta',
        component: PortalEstadoCuentaView,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard para proteger rutas que requieren autenticación
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    // Redirigir al home (landing page con modal de login)
    next('/')
  } else {
    next()
  }
})

export default router
