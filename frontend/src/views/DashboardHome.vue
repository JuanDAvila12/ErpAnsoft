<template>
  <div>
    <h2 class="text-h4 mb-2">Bienvenido, {{ usuario?.nombre || 'Usuario' }}</h2>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Panel de control del sistema ERP Ansoft
    </p>

    <!-- KPIs -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card variant="tonal" color="primary" class="pa-3">
          <v-card-text class="text-center">
            <v-icon size="36" color="primary">mdi-cart-arrow-down</v-icon>
            <div class="text-h5 font-weight-bold mt-1">${{ kpis.ventasMes.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
            <div class="text-caption">Ventas del Mes</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card variant="tonal" color="purple" class="pa-3">
          <v-card-text class="text-center">
            <v-icon size="36" color="purple">mdi-truck</v-icon>
            <div class="text-h5 font-weight-bold mt-1">${{ kpis.comprasMes.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
            <div class="text-caption">Compras del Mes</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card variant="tonal" color="warning" class="pa-3">
          <v-card-text class="text-center">
            <v-icon size="36" color="warning">mdi-package-variant-closed</v-icon>
            <div class="text-h5 font-weight-bold mt-1">{{ kpis.stockBajo }}</div>
            <div class="text-caption">Productos con Stock Bajo</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card variant="tonal" color="error" class="pa-3">
          <v-card-text class="text-center">
            <v-icon size="36" color="error">mdi-account-cash</v-icon>
            <div class="text-h5 font-weight-bold mt-1">${{ kpis.cuentasCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
            <div class="text-caption">Cuentas por Cobrar</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tarjetas de acceso rápido -->
    <v-row>
      <v-col cols="12" sm="6" md="4" lg="3" v-for="(card, i) in cardsAcceso" :key="i">
        <v-card
          class="pa-4 text-center"
          variant="tonal"
          :color="card.color"
          hover
          @click="card.ruta ? irA(card.ruta) : null"
        >
          <v-icon size="48" :color="card.color" class="mb-2">{{ card.icono }}</v-icon>
          <v-card-title class="text-h6 pa-0">{{ card.titulo }}</v-card-title>
          <v-card-text class="pa-0 mt-1 text-medium-emphasis">
            {{ card.descripcion }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Información del usuario -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card variant="tonal">
          <v-card-title class="text-h6">
            <v-icon class="mr-2">mdi-account-circle</v-icon>
            Información del Usuario
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-email</v-icon></template>
                <v-list-item-title>Email</v-list-item-title>
                <v-list-item-subtitle>{{ usuario?.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-shield-account</v-icon></template>
                <v-list-item-title>Rol</v-list-item-title>
                <v-list-item-subtitle>{{ usuario?.rol_nombre }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="usuario?.entidad_razon_social">
                <template v-slot:prepend><v-icon>mdi-domain</v-icon></template>
                <v-list-item-title>Entidad</v-list-item-title>
                <v-list-item-subtitle>{{ usuario?.entidad_razon_social }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card variant="tonal">
          <v-card-title class="text-h6">
            <v-icon class="mr-2">mdi-information-outline</v-icon>
            Estado del Sistema
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template v-slot:prepend><v-icon color="success">mdi-check-circle</v-icon></template>
                <v-list-item-title>API Node.js</v-list-item-title>
                <v-list-item-subtitle>Conectado</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon color="success">mdi-check-circle</v-icon></template>
                <v-list-item-title>API Python</v-list-item-title>
                <v-list-item-subtitle>Conectado</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon color="success">mdi-check-circle</v-icon></template>
                <v-list-item-title>PostgreSQL</v-list-item-title>
                <v-list-item-subtitle>Conectado</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/plugins/axios'

const router = useRouter()
const usuario = ref({})
const kpis = ref({ ventasMes: 0, comprasMes: 0, stockBajo: 0, cuentasCobrar: 0 })

const cardsAcceso = [
  { titulo: 'Punto de Venta', icono: 'mdi-cash-register', color: 'orange', descripcion: 'POS rápido', ruta: '/dashboard/pos' },
  { titulo: 'Cotizaciones', icono: 'mdi-file-document-outline', color: 'primary', descripcion: 'Administrar cotizaciones', ruta: '/dashboard/ventas/cotizaciones' },
  { titulo: 'Facturación', icono: 'mdi-file-invoice', color: 'error', descripcion: 'Facturas electrónicas', ruta: '/dashboard/ventas/facturas' },
  { titulo: 'Inventario', icono: 'mdi-package-variant', color: 'warning', descripcion: 'Control de existencias', ruta: '/dashboard/inventario/stock' },
  { titulo: 'Compras', icono: 'mdi-truck', color: 'purple', descripcion: 'Órdenes de compra', ruta: '/dashboard/compras/ordenes' },
  { titulo: 'Contabilidad', icono: 'mdi-book-open-page-variant', color: 'blue', descripcion: 'Cuentas y asientos', ruta: '/dashboard/contabilidad/cuentas' },
  { titulo: 'CRM', icono: 'mdi-chart-line', color: 'orange', descripcion: 'Oportunidades', ruta: '/dashboard/crm/oportunidades' },
  { titulo: 'Configuración', icono: 'mdi-cog-outline', color: 'grey', descripcion: 'Catálogos del sistema', ruta: '/dashboard/configuracion/catalogos' },
]

async function cargarKPIs() {
  try {
    const hoy = new Date()
    const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
    const mesFin = hoy.toISOString().split('T')[0]

    const [ventasRes, comprasRes, stockRes] = await Promise.all([
      apiClient.get('/api/v1/transacciones', { params: { tipo: 'venta', fecha_desde: mesInicio, fecha_hasta: mesFin, estado: 'confirmado' } }),
      apiClient.get('/api/v1/transacciones', { params: { tipo: 'compra', fecha_desde: mesInicio, fecha_hasta: mesFin, estado: 'confirmado' } }),
      apiClient.get('/api/v1/inventario/stock', { params: { stock_bajo: true } }),
    ])

    kpis.value.ventasMes = (ventasRes.data || []).reduce((s, t) => s + parseFloat(t.total || 0), 0)
    kpis.value.comprasMes = (comprasRes.data || []).reduce((s, t) => s + parseFloat(t.total || 0), 0)
    kpis.value.stockBajo = (stockRes.data.datos || []).length
    kpis.value.cuentasCobrar = 0 // Placeholder - se puede calcular desde contabilidad
  } catch (err) { console.error('Error cargando KPIs:', err) }
}

onMounted(() => {
  const stored = localStorage.getItem('usuario')
  if (stored) {
    usuario.value = JSON.parse(stored)
  }
  cargarKPIs()
})

function irA(ruta) {
  router.push(ruta)
}
</script>
