<template>
  <v-app>
    <!-- Barra superior -->
    <v-app-bar color="primary" density="compact" elevation="2">
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer" />
        <v-icon class="ml-2">mdi-chart-box-outline</v-icon>
        <v-app-bar-title class="ml-2 font-weight-bold">
          SPI ERP
        </v-app-bar-title>
      </template>

      <template v-slot:append>
        <v-chip class="mr-2" color="white" variant="text" prepend-icon="mdi-account">
          {{ usuario?.nombre || 'Usuario' }}
        </v-chip>
        <v-chip class="mr-2" color="white" variant="text" size="small" prepend-icon="mdi-shield-account">
          {{ usuario?.rol_nombre || '' }}
        </v-chip>
        <v-btn icon @click="handleLogout" class="mr-2">
          <v-icon>mdi-logout</v-icon>
          <v-tooltip activator="parent" location="bottom">Cerrar sesión</v-tooltip>
        </v-btn>
      </template>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" expand-on-hover rail width="280" color="grey-darken-4">
      <template v-slot:prepend>
        <v-list-item
          class="pt-4 pb-2"
          lines="two"
          prepend-avatar=""
          :title="usuario?.nombre || 'Usuario'"
          :subtitle="usuario?.entidad_razon_social || 'SPI ERP'"
        >
          <template v-slot:prepend>
            <v-avatar color="primary" size="40">
              <v-icon color="white">mdi-account</v-icon>
            </v-avatar>
          </template>
        </v-list-item>
      </template>

      <v-divider class="mx-3" />

      <!-- Botón Inicio (Dashboard Home) -->
      <v-list-item
        prepend-icon="mdi-home"
        title="Inicio"
        color="primary"
        :to="'/dashboard'"
        class="mt-1 mb-1"
      />

      <v-divider class="mx-3" />

      <!-- Menú agrupado por módulos -->
      <v-list density="compact" nav>
        <!-- Ventas -->
        <v-list-group v-if="tienePermiso('ventas.ver')" value="ventas">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-cart-outline" title="Ventas" color="primary" />
          </template>
          <v-list-item prepend-icon="mdi-file-document-outline" title="Cotizaciones" :to="'/dashboard/ventas/cotizaciones'" />
          <v-list-item prepend-icon="mdi-receipt" title="Órdenes de Venta" :to="'/dashboard/ventas/ordenes'" />
          <v-list-item prepend-icon="mdi-file-invoice" title="Facturas" :to="'/dashboard/ventas/facturas'" />
          <v-list-item prepend-icon="mdi-account-group" title="Clientes" :to="'/dashboard/ventas/clientes'" />
        </v-list-group>

        <!-- Entidades / Contactos -->
        <v-list-item v-if="tienePermiso('compras.ver')" prepend-icon="mdi-account-multiple" title="Entidades (Clientes/Prov.)" color="primary" :to="'/dashboard/entidades'" />

        <!-- Compras -->
        <v-list-group v-if="tienePermiso('compras.ver')" value="compras">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-truck-delivery" title="Compras" color="success" />
          </template>
          <v-list-item prepend-icon="mdi-file-document-outline" title="Cotizaciones" :to="'/dashboard/compras/cotizaciones'" />
          <v-list-item prepend-icon="mdi-file-document" title="Órdenes de Compra" :to="'/dashboard/compras/ordenes'" />
          <v-list-item prepend-icon="mdi-receipt" title="Compras (Facturas)" :to="'/dashboard/compras/compras'" />
          <v-list-item prepend-icon="mdi-package-down" title="Recepciones" :to="'/dashboard/compras/recepciones'" />
          <v-list-item prepend-icon="mdi-account" title="Proveedores" :to="'/dashboard/compras/proveedores'" />
          <v-list-item prepend-icon="mdi-chart-bar" title="Reportes" :to="'/dashboard/compras/reportes'" />
        </v-list-group>

        <!-- Inventario -->
        <v-list-group v-if="tienePermiso('inventario.ver')" value="inventario">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-package-variant" title="Inventario" color="warning" />
          </template>
          <v-list-item prepend-icon="mdi-package" title="Artículos" :to="'/dashboard/inventario/articulos'" />
          <v-list-item prepend-icon="mdi-warehouse" title="Almacenes" :to="'/dashboard/inventario/almacenes'" />
          <v-list-item prepend-icon="mdi-transfer" title="Movimientos" :to="'/dashboard/inventario/movimientos'" />
          <v-list-item prepend-icon="mdi-arrow-decision" title="Traspasos" :to="'/dashboard/inventario/traspasos'" />
          <v-list-item prepend-icon="mdi-package-down" title="Recep. Traspaso" :to="'/dashboard/inventario/recepciones-traspaso'" />
          <v-list-item prepend-icon="mdi-chart-box" title="Reportes" :to="'/dashboard/inventario/reportes'" />
          <v-list-item prepend-icon="mdi-qrcode" title="Series" :to="'/dashboard/inventario/series'" />
        </v-list-group>

        <!-- Contabilidad -->
        <v-list-group v-if="tienePermiso('contabilidad.ver')" value="contabilidad">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-book-account" title="Contabilidad" color="info" />
          </template>
          <v-list-item prepend-icon="mdi-book-multiple" title="Cuentas Contables" :to="'/dashboard/contabilidad/cuentas'" />
          <v-list-item prepend-icon="mdi-notebook" title="Asientos" :to="'/dashboard/contabilidad/asientos'" />
          <v-list-item prepend-icon="mdi-pencil-plus" title="Asientos Manuales" :to="'/dashboard/contabilidad/asientos-manuales'" />
          <v-list-item prepend-icon="mdi-scale-balance" title="Balanza" :to="'/dashboard/contabilidad/balanza'" />
        </v-list-group>

        <!-- Finanzas (CxC, CxP) -->
        <v-list-group v-if="tienePermiso('contabilidad.ver')" value="finanzas">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-cash-multiple" title="Finanzas" color="teal" />
          </template>
          <v-list-item prepend-icon="mdi-account-cash" title="Cuentas por Cobrar" :to="'/dashboard/cxc'" />
          <v-list-item prepend-icon="mdi-cash-remove" title="Cuentas por Pagar" :to="'/dashboard/cxp'" />
        </v-list-group>

        <!-- Fiscal -->
        <v-list-group v-if="tienePermiso('fiscal.ver')" value="fiscal">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-file-certificate" title="Fiscal" color="error" />
          </template>
          <v-list-item prepend-icon="mdi-file-send" title="CFDIs Emitidos" :to="'/dashboard/fiscal/cfdis'" />
          <v-list-item prepend-icon="mdi-clock-outline" title="Timbrado" :to="'/dashboard/fiscal/timbrado'" />
          <v-list-item prepend-icon="mdi-cancel" title="Cancelaciones" :to="'/dashboard/fiscal/cancelaciones'" />
        </v-list-group>

        <!-- CRM -->
        <v-list-group v-if="tienePermiso('crm.ver')" value="crm">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-account-group" title="CRM" color="purple" />
          </template>
          <v-list-item prepend-icon="mdi-trending-up" title="Oportunidades" :to="'/dashboard/crm/oportunidades'" />
          <v-list-item prepend-icon="mdi-calendar-check" title="Actividades" :to="'/dashboard/crm/actividades'" />
        </v-list-group>

        <v-divider class="mx-3 my-2" />

        <!-- Punto de Venta - acceso directo -->
        <v-list-item v-if="tienePermiso('pos.usar')" prepend-icon="mdi-cash-register" title="Punto de Venta" color="orange" :to="'/dashboard/pos'" />

        <!-- Configuración -->
        <v-list-group v-if="tienePermiso('admin.configurar')" value="config">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-cog-outline" title="Configuración" color="grey" />
          </template>
          <v-list-item prepend-icon="mdi-account" title="Usuarios" :to="'/dashboard/configuracion/usuarios'" />
          <v-list-item prepend-icon="mdi-shield-account" title="Roles y Permisos" :to="'/dashboard/configuracion/permisos'" />
          <v-list-item prepend-icon="mdi-database-cog" title="Catálogos SAT" :to="'/dashboard/configuracion/catalogos'" />
          <v-list-item prepend-icon="mdi-history" title="Auditoría" :to="'/dashboard/configuracion/auditoria'" />
          <v-divider class="mx-3 my-1" />
          <v-list-item prepend-icon="mdi-domain" title="Empresa" :to="'/dashboard/configuracion/empresa'" />
          <v-list-item prepend-icon="mdi-warehouse" title="Almacenes" :to="'/dashboard/configuracion/almacenes'" />
          <v-list-item v-if="tienePermiso('reportes.ejecutar')" prepend-icon="mdi-chart-bar" title="Generador Reportes" :to="'/dashboard/configuracion/reportes'" />
          <v-divider class="mx-3 my-1" />
          <v-list-item prepend-icon="mdi-alert-circle-outline" title="Log de Errores" color="error" :to="'/dashboard/configuracion/log-errores'" />
          <v-list-item prepend-icon="mdi-file-document-edit-outline" title="Plantillas PDF" :to="'/dashboard/configuracion/plantillas-pdf'" />
        </v-list-group>

      </v-list>
    </v-navigation-drawer>

    <!-- Contenido principal -->
    <v-main>
      <!-- Indicador de carga mientras se obtienen permisos -->
      <v-container v-if="loading" fluid class="pa-6 d-flex justify-center align-center" style="min-height: 500px;">
        <div class="text-center">
          <v-progress-circular indeterminate color="primary" size="64" width="6" />
          <p class="mt-4 text-body-1 text-medium-emphasis">Cargando...</p>
        </div>
      </v-container>
      <v-container v-else fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>

    <!-- Sistema de notificación de errores (siempre visible) -->
    <ErrorNotification />
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/plugins/axios'
import ErrorNotification from '@/components/ErrorNotification.vue'

const router = useRouter()
const drawer = ref(true)
const loading = ref(true)
const usuario = ref({})
const permisosUsuario = ref([])

onMounted(() => {
  const stored = localStorage.getItem('usuario')
  if (stored) {
    usuario.value = JSON.parse(stored)
  }
  cargarPermisos()
})

async function cargarPermisos() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      loading.value = false
      return
    }
    const response = await apiClient.get('/api/v1/auth/mis-permisos')
    permisosUsuario.value = response.data.permisos || []
  } catch (err) {
    console.warn('No se pudieron cargar permisos, se otorgarán todos los permisos:', err)
    // Fallback: asignar todos los permisos para que el dashboard funcione
    permisosUsuario.value = [
      'ventas.ver',
      'compras.ver',
      'inventario.ver',
      'contabilidad.ver',
      'fiscal.ver',
      'crm.ver',
      'pos.usar',
      'admin.configurar',
    ]
  } finally {
    loading.value = false
  }
}

function tienePermiso(codigo) {
  return permisosUsuario.value.includes(codigo)
}

function irA(ruta) {
  router.push(ruta)
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  router.push('/')
}
</script>
