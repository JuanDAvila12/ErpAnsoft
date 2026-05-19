<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon color="success" size="36" class="mr-3">mdi-package-variant-closed</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Stock / Inventario</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Consulta de existencias por artículo y almacén</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-card variant="outlined" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="4">
          <v-select v-model="filtroAlmacen" :items="almacenes" item-title="nombre" item-value="id" label="Almacén" clearable variant="outlined" density="compact" />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field v-model="filtroArticulo" label="Buscar artículo" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="4">
          <v-checkbox v-model="filtroStockBajo" label="Solo stock bajo" />
        </v-col>
      </v-row>
    </v-card>

    <!-- Loader -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="success" size="48" width="4" />
      <p class="text-body-1 text-medium-emphasis mt-4">Cargando stock...</p>
    </div>

    <!-- Error -->
    <v-alert
      v-else-if="errorMsg"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="errorMsg = ''"
    >
      <template v-slot:title>Error al cargar stock</template>
      {{ errorMsg }}
      <template v-slot:append>
        <v-btn variant="text" color="error" @click="cargarStock()">
          <v-icon left>mdi-refresh</v-icon> Reintentar
        </v-btn>
      </template>
    </v-alert>

    <!-- Empty state -->
    <v-card v-else-if="stock.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-package-variant-closed-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis">Sin resultados</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No se encontraron registros de stock con los filtros actuales</p>
      <v-btn variant="text" color="success" @click="limpiarFiltros" prepend-icon="mdi-filter-remove">
        Limpiar filtros
      </v-btn>
    </v-card>

    <!-- Data Table -->
    <v-data-table v-else :headers="headers" :items="stock" :loading="loading" :items-per-page="20" class="elevation-1">
      <template v-slot:item.stock_actual="{ item }">
        <v-chip :color="item.stock_actual <= (item.stock_minimo || 0) ? 'error' : 'success'" size="small">
          {{ item.stock_actual || 0 }}
        </v-chip>
      </template>
      <template v-slot:item.precio_venta="{ item }">${{ (item.precio_venta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.costo_promedio="{ item }">${{ (item.costo_promedio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
    </v-data-table>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const errorMsg = ref('')
const stock = ref([])
const almacenes = ref([])
const filtroAlmacen = ref(null)
const filtroArticulo = ref('')
const filtroStockBajo = ref(false)
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const headers = [
  { title: 'SKU', key: 'sku', sortable: true },
  { title: 'Artículo', key: 'nombre', sortable: true },
  { title: 'Almacén', key: 'almacen_nombre', sortable: true },
  { title: 'Stock Actual', key: 'stock_actual', sortable: true },
  { title: 'Stock Mínimo', key: 'stock_minimo', sortable: true },
  { title: 'Precio Venta', key: 'precio_venta', sortable: true },
  { title: 'Costo Promedio', key: 'costo_promedio', sortable: true },
]

function limpiarFiltros() {
  filtroAlmacen.value = null
  filtroArticulo.value = ''
  filtroStockBajo.value = false
  cargarStock()
}

async function cargarStock() {
  loading.value = true
  errorMsg.value = ''
  const token = localStorage.getItem('token')
  try {
    const params = {}
    if (filtroAlmacen.value) params.almacen_id = filtroAlmacen.value
    if (filtroArticulo.value) params.articulo_id = filtroArticulo.value
    if (filtroStockBajo.value) params.stock_bajo = true
    const res = await axios.get('/api/v1/inventario/stock', { params, headers: { Authorization: `Bearer ${token}` } })
    stock.value = res.data?.datos || res.data || []
    if (!Array.isArray(stock.value)) stock.value = []
  } catch (err) {
    console.error('Error al cargar stock:', err)
    errorMsg.value = err.response?.data?.error || err.message || 'Error al cargar stock'
    stock.value = []
  } finally { loading.value = false }
}

async function cargarAlmacenes() {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/almacenes', { headers: { Authorization: `Bearer ${token}` } })
    almacenes.value = res.data?.datos || res.data || []
    if (!Array.isArray(almacenes.value)) almacenes.value = []
  } catch (err) { console.error(err) }
}

watch([filtroAlmacen, filtroArticulo, filtroStockBajo], () => cargarStock())

onMounted(() => { cargarAlmacenes(); cargarStock() })
</script>
