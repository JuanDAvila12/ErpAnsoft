<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-icon size="36" color="success" class="mr-3">mdi-chart-bar</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Reportes de Compras</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Consulta de compras agrupadas por artículo y proveedor</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-tabs v-model="tabActivo" color="success" class="mb-4">
      <v-tab value="por-articulo">Compras por Artículo</v-tab>
      <v-tab value="por-proveedor">Compras por Proveedor</v-tab>
    </v-tabs>

    <v-window v-model="tabActivo">
      <!-- Compras por Artículo -->
      <v-window-item value="por-articulo">
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="4" md="3">
                <v-select v-model="filtrosArt.articulo_id" :items="articulos" item-title="nombre" item-value="id" label="Artículo *" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosArt.fecha_desde" label="Desde" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosArt.fecha_hasta" label="Hasta" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="12" sm="2" md="2">
                <v-btn variant="outlined" prepend-icon="mdi-magnify" @click="cargarPorArticulo()">Consultar</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        <v-card variant="outlined">
          <v-data-table :headers="columnasArt" :items="reporteArticulos" :loading="loading" loading-text="Consultando..." :items-per-page="20" class="elevation-0">
            <template v-slot:item.articulo_nombre="{ item }"><strong>{{ item.articulo_nombre }}</strong></template>
            <template v-slot:item.cantidad_total="{ item }">{{ Number(item.cantidad_total).toFixed(2) }}</template>
            <template v-slot:item.total_comprado="{ item }">${{ Number(item.total_comprado).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
            <template v-slot:item.promedio_precio="{ item }">${{ Number(item.promedio_precio).toFixed(2) }}</template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Compras por Proveedor -->
      <v-window-item value="por-proveedor">
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="4" md="3">
                <v-select v-model="filtrosProv.proveedor_id" :items="proveedores" item-title="razon_social" item-value="id" label="Proveedor" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosProv.fecha_desde" label="Desde" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosProv.fecha_hasta" label="Hasta" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="12" sm="2" md="2">
                <v-btn variant="outlined" prepend-icon="mdi-magnify" @click="cargarPorProveedor()">Consultar</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        <v-card variant="outlined">
          <v-data-table :headers="columnasProv" :items="reporteProveedores" :loading="loading" loading-text="Consultando..." :items-per-page="20" class="elevation-0">
            <template v-slot:item.proveedor_nombre="{ item }"><strong>{{ item.proveedor_nombre }}</strong></template>
            <template v-slot:item.rfc="{ item }">{{ item.rfc }}</template>
            <template v-slot:item.total_compras="{ item }">{{ Number(item.total_compras).toFixed(2) }}</template>
            <template v-slot:item.total_monto="{ item }">${{ Number(item.total_monto).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tabActivo = ref('por-articulo')
const loading = ref(false)
const articulos = ref([])
const proveedores = ref([])
const reporteArticulos = ref([])
const reporteProveedores = ref([])
const snackbar = ref({ show: false, text: '', color: 'success' })

const filtrosArt = ref({ articulo_id: null, fecha_desde: '', fecha_hasta: '' })
const filtrosProv = ref({ proveedor_id: null, fecha_desde: '', fecha_hasta: '' })

const columnasArt = [
  { title: 'Artículo', key: 'articulo_nombre', sortable: true },
  { title: 'Cantidad Total', key: 'cantidad_total', sortable: true, align: 'end' },
  { title: 'Total Comprado', key: 'total_comprado', sortable: true, align: 'end' },
  { title: 'Precio Promedio', key: 'promedio_precio', sortable: true, align: 'end' },
]

const columnasProv = [
  { title: 'Proveedor', key: 'proveedor_nombre', sortable: true },
  { title: 'RFC', key: 'rfc', sortable: true },
  { title: 'No. Compras', key: 'total_compras', sortable: true, align: 'end' },
  { title: 'Monto Total', key: 'total_monto', sortable: true, align: 'end' },
]

async function cargarCatalogos() {
  try {
    const token = localStorage.getItem('token')
    const [artRes, provRes] = await Promise.all([
      axios.get('/api/v1/articulos?limite=500', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/entidades?rol=proveedor', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    articulos.value = artRes.data?.datos || artRes.data || []
    proveedores.value = provRes.data?.datos || provRes.data || []
  } catch (err) { console.error(err) }
}

async function cargarPorArticulo() {
  if (!filtrosArt.value.articulo_id) {
    snackbar.value = { show: true, text: 'Seleccione un artículo', color: 'warning' }; return
  }
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = { articulo_id: filtrosArt.value.articulo_id }
    if (filtrosArt.value.fecha_desde) params.fecha_desde = filtrosArt.value.fecha_desde
    if (filtrosArt.value.fecha_hasta) params.fecha_hasta = filtrosArt.value.fecha_hasta
    const res = await axios.get('/api/v1/reportes/compras-por-articulo', { headers: { Authorization: `Bearer ${token}` }, params })
    reporteArticulos.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err); snackbar.value = { show: true, text: 'Error', color: 'error' } }
  finally { loading.value = false }
}

async function cargarPorProveedor() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = {}
    if (filtrosProv.value.proveedor_id) params.proveedor_id = filtrosProv.value.proveedor_id
    if (filtrosProv.value.fecha_desde) params.fecha_desde = filtrosProv.value.fecha_desde
    if (filtrosProv.value.fecha_hasta) params.fecha_hasta = filtrosProv.value.fecha_hasta
    const res = await axios.get('/api/v1/reportes/compras-por-proveedor', { headers: { Authorization: `Bearer ${token}` }, params })
    reporteProveedores.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err); snackbar.value = { show: true, text: 'Error', color: 'error' } }
  finally { loading.value = false }
}

onMounted(() => cargarCatalogos())
</script>
