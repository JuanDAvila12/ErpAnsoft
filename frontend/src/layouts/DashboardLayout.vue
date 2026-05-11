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

      <!-- Menú agrupado por módulos -->
      <v-list density="compact" nav>
        <!-- Ventas -->
        <v-list-group v-if="tienePermiso('ventas.ver')" value="ventas">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-cart-outline" title="Ventas" color="primary" />
          </template>
          <v-list-item prepend-icon="mdi-file-document-outline" title="Cotizaciones" @click="irA('/dashboard/ventas/cotizaciones')" />
          <v-list-item prepend-icon="mdi-receipt" title="Órdenes de Venta" @click="irA('/dashboard/ventas/ordenes')" />
          <v-list-item prepend-icon="mdi-file-invoice" title="Facturas" @click="irA('/dashboard/ventas/facturas')" />
          <v-list-item prepend-icon="mdi-account-group" title="Clientes" @click="irA('/dashboard/ventas/clientes')" />
        </v-list-group>

        <!-- Compras -->
        <v-list-group v-if="tienePermiso('compras.ver')" value="compras">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-truck-delivery" title="Compras" color="success" />
          </template>
          <v-list-item prepend-icon="mdi-file-document" title="Órdenes de Compra" @click="irA('/dashboard/compras/ordenes')" />
          <v-list-item prepend-icon="mdi-package-down" title="Recepciones" @click="irA('/dashboard/compras/recepciones')" />
          <v-list-item prepend-icon="mdi-account" title="Proveedores" @click="irA('/dashboard/compras/proveedores')" />
        </v-list-group>

        <!-- Inventario -->
        <v-list-group v-if="tienePermiso('inventario.ver')" value="inventario">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-package-variant" title="Inventario" color="warning" />
          </template>
          <v-list-item prepend-icon="mdi-package" title="Artículos" @click="irA('/dashboard/inventario/articulos')" />
          <v-list-item prepend-icon="mdi-warehouse" title="Almacenes" @click="irA('/dashboard/inventario/almacenes')" />
          <v-list-item prepend-icon="mdi-transfer" title="Movimientos" @click="irA('/dashboard/inventario/movimientos')" />
          <v-list-item prepend-icon="mdi-qrcode" title="Series" @click="irA('/dashboard/inventario/series')" />
        </v-list-group>

        <!-- Contabilidad -->
        <v-list-group v-if="tienePermiso('contabilidad.ver')" value="contabilidad">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-book-account" title="Contabilidad" color="info" />
          </template>
          <v-list-item prepend-icon="mdi-book-multiple" title="Cuentas Contables" @click="irA('/dashboard/contabilidad/cuentas')" />
          <v-list-item prepend-icon="mdi-notebook" title="Asientos" @click="irA('/dashboard/contabilidad/asientos')" />
          <v-list-item prepend-icon="mdi-scale-balance" title="Balanza" @click="irA('/dashboard/contabilidad/balanza')" />
        </v-list-group>

        <!-- Fiscal -->
        <v-list-group v-if="tienePermiso('fiscal.ver')" value="fiscal">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-file-certificate" title="Fiscal" color="error" />
          </template>
          <v-list-item prepend-icon="mdi-file-send" title="CFDIs Emitidos" @click="irA('/dashboard/fiscal/cfdis')" />
          <v-list-item prepend-icon="mdi-clock-outline" title="Timbrado" @click="irA('/dashboard/fiscal/timbrado')" />
          <v-list-item prepend-icon="mdi-cancel" title="Cancelaciones" @click="irA('/dashboard/fiscal/cancelaciones')" />
        </v-list-group>

        <!-- CRM -->
        <v-list-group v-if="tienePermiso('crm.ver')" value="crm">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-account-group" title="CRM" color="purple" />
          </template>
          <v-list-item prepend-icon="mdi-trending-up" title="Oportunidades" @click="irA('/dashboard/crm/oportunidades')" />
          <v-list-item prepend-icon="mdi-calendar-check" title="Actividades" @click="irA('/dashboard/crm/actividades')" />
        </v-list-group>

        <v-divider class="mx-3 my-2" />

        <!-- Punto de Venta - acceso directo -->
        <v-list-item v-if="tienePermiso('pos.usar')" prepend-icon="mdi-cash-register" title="Punto de Venta" color="orange" @click="irA('/dashboard/pos')" />

        <!-- Configuración -->
        <v-list-group v-if="tienePermiso('admin.configurar')" value="config">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-cog-outline" title="Configuración" color="grey" />
          </template>
          <v-list-item prepend-icon="mdi-account" title="Usuarios" @click="irA('/dashboard/configuracion/usuarios')" />
          <v-list-item prepend-icon="mdi-shield-account" title="Roles y Permisos" @click="irA('/dashboard/configuracion/permisos')" />
          <v-list-item prepend-icon="mdi-database-cog" title="Catálogos SAT" @click="irA('/dashboard/configuracion/catalogos')" />
          <v-list-item prepend-icon="mdi-history" title="Auditoría" @click="irA('/dashboard/configuracion/auditoria')" />
        </v-list-group>
      </v-list>
    </v-navigation-drawer>

    <!-- Contenido principal -->
    <v-main>
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const drawer = ref(true)
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
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    const response = await axios.get('/api/v1/auth/mis-permisos', {
      headers: { Authorization: `Bearer ${token}` },
    })
    permisosUsuario.value = response.data.permisos || []
  } catch (err) {
    console.warn('No se pudieron cargar permisos:', err)
    // Si falla, permitir todo por seguridad
    permisosUsuario.value = []
  }
}

function tienePermiso(codigo) {
  // Si no hay permisos cargados, permitir (comportamiento permisivo)
  if (permisosUsuario.value.length === 0) return true
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
