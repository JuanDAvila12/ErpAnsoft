<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-icon size="36" color="warning" class="mr-3">mdi-chart-box-outline</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Reportes de Inventario</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Stock actual, movimientos y consultas</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-tabs v-model="tabActivo" color="warning" class="mb-4">
      <v-tab value="stock">Stock Actual</v-tab>
      <v-tab value="movimientos-articulo">Mov. por Artículo</v-tab>
      <v-tab value="movimientos-almacen">Mov. por Almacén</v-tab>
    </v-tabs>

    <v-window v-model="tabActivo">
      <!-- TAB: Stock Actual -->
      <v-window-item value="stock">
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="4" md="3">
                <v-select v-model="filtrosStock.almacen_id" :items="almacenes" item-title="nombre" item-value="id" label="Almacén" variant="outlined" density="compact" clearable />
              </v-col>
              <v-col cols="12" sm="4" md="3">
                <v-select v-model="filtrosStock.articulo_id" :items="articulos" item-title="nombre" item-value="id" label="Artículo" variant="outlined" density="compact" clearable />
              </v-col>
              <v-col cols="12" sm="4" md="2">
                <v-btn variant="outlined" prepend-icon="mdi-magnify" @click="cargarStock()">Consultar</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card variant="outlined">
          <v-data-table :headers="columnasStock" :items="stock" :loading="loadingStock" loading-text="Consultando stock..." :items-per-page="25" class="elevation-0">
            <template v-slot:item.articulo_nombre="{ item }"><strong>{{ item.articulo_nombre }}</strong><div class="text-caption text-medium-emphasis">{{ item.sku }}</div></template>
            <template v-slot:item.cantidad_disponible="{ item }">
              <v-chip :color="item.cantidad_disponible > 0 ? (item.cantidad_disponible <= (item.stock_minimo || 0) ? 'warning' : 'success') : 'error'" size="small" variant="tonal">
                {{ Number(item.cantidad_disponible).toFixed(2) }}
              </v-chip>
            </template>
            <template v-slot:item.precio_venta="{ item }">${{ Number(item.precio_venta).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
            <template v-slot:item.costo_promedio="{ item }">${{ Number(item.costo_promedio).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- TAB: Movimientos por Artículo -->
      <v-window-item value="movimientos-articulo">
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="4" md="3">
                <v-select v-model="filtrosMovArt.articulo_id" :items="articulos" item-title="nombre" item-value="id" label="Artículo *" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosMovArt.fecha_desde" label="Desde" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosMovArt.fecha_hasta" label="Hasta" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="12" sm="2" md="2">
                <v-btn variant="outlined" prepend-icon="mdi-magnify" @click="cargarMovimientosArticulo()">Consultar</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card variant="outlined">
          <v-data-table :headers="columnasMov" :items="movimientosArticulo" :loading="loadingMov" loading-text="Consultando movimientos..." :items-per-page="25" class="elevation-0">
            <template v-slot:item.transaccion_fecha="{ item }">{{ new Date(item.transaccion_fecha).toLocaleDateString('es-MX') }}</template>
            <template v-slot:item.tipo_movimiento="{ item }">
              <v-chip :color="item.tipo_movimiento === 'entrada' ? 'success' : 'error'" size="x-small" variant="tonal">{{ item.tipo_movimiento }}</v-chip>
            </template>
            <template v-slot:item.cantidad="{ item }">{{ Number(item.cantidad).toFixed(2) }}</template>
            <template v-slot:item.transaccion_folio="{ item }">{{ item.transaccion_folio || '—' }}</template>
            <template v-slot:item.almacen_nombre="{ item }">{{ item.almacen_nombre || '—' }}</template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- TAB: Movimientos por Almacén -->
      <v-window-item value="movimientos-almacen">
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="4" md="3">
                <v-select v-model="filtrosMovAlm.almacen_id" :items="almacenes" item-title="nombre" item-value="id" label="Almacén *" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosMovAlm.fecha_desde" label="Desde" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="6" sm="3" md="2">
                <v-text-field v-model="filtrosMovAlm.fecha_hasta" label="Hasta" type="date" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="12" sm="2" md="2">
                <v-btn variant="outlined" prepend-icon="mdi-magnify" @click="cargarMovimientosAlmacen()">Consultar</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card variant="outlined">
          <v-data-table :headers="columnasMov" :items="movimientosAlmacen" :loading="loadingMov" loading-text="Consultando movimientos..." :items-per-page="25" class="elevation-0">
            <template v-slot:item.transaccion_fecha="{ item }">{{ new Date(item.transaccion_fecha).toLocaleDateString('es-MX') }}</template>
            <template v-slot:item.tipo_movimiento="{ item }">
              <v-chip :color="item.tipo_movimiento === 'entrada' ? 'success' : 'error'" size="x-small" variant="tonal">{{ item.tipo_movimiento }}</v-chip>
            </template>
            <template v-slot:item.cantidad="{ item }">{{ Number(item.cantidad).toFixed(2) }}</template>
            <template v-slot:item.articulo_nombre="{ item }"><strong>{{ item.articulo_nombre }}</strong></template>
            <template v-slot:item.transaccion_folio="{ item }">{{ item.transaccion_folio || '—' }}</template>
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

const tabActivo = ref('stock')
const loadingStock = ref(false)
const loadingMov = ref(false)

const almacenes = ref([])
const articulos = ref([])
const stock = ref([])
const movimientosArticulo = ref([])
const movimientosAlmacen = ref([])

const snackbar = ref({ show: false, text: '', color: 'success' })

const filtrosStock = ref({ almacen_id: null, articulo_id: null })
const filtrosMovArt = ref({ articulo_id: null, fecha_desde: '', fecha_hasta: '' })
const filtrosMovAlm = ref({ almacen_id: null, fecha_desde: '', fecha_hasta: '' })

const columnasStock = [
  { title: 'Artículo', key: 'articulo_nombre', sortable: true },
  { title: 'SKU', key: 'sku', sortable: true },
  { title: 'Almacén', key: 'almacen_nombre', sortable: true },
  { title: 'Cant. Disponible', key: 'cantidad_disponible', sortable: true, align: 'end' },
  { title: 'Costo Prom.', key: 'costo_promedio', sortable: true, align: 'end' },
  { title: 'Precio Venta', key: 'precio_venta', sortable: true, align: 'end' },
]

const columnasMov = [
  { title: 'Fecha', key: 'transaccion_fecha', sortable: true },
  { title: 'Artículo', key: 'articulo_nombre', sortable: true },
  { title: 'Almacén', key: 'almacen_nombre', sortable: true },
  { title: 'Tipo', key: 'tipo_movimiento', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true, align: 'end' },
  { title: 'Folio', key: 'transaccion_folio', sortable: true },
  { title: 'Referencia', key: 'referencia_tipo', sortable: true },
]

async function cargarCatalogos() {
  try {
    const token = localStorage.getItem('token')
    const [almRes, artRes] = await Promise.all([
      axios.get('/api/v1/inventario/almacenes', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/articulos?limite=500', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    almacenes.value = almRes.data?.datos || almRes.data || []
    articulos.value = artRes.data?.datos || artRes.data || []
  } catch (err) { console.error(err) }
}

async function cargarStock() {
  loadingStock.value = true
  try {
    const token = localStorage.getItem('token')
    const params = {}
    if (filtrosStock.value.almacen_id) params.almacen_id = filtrosStock.value.almacen_id
    if (filtrosStock.value.articulo_id) params.articulo_id = filtrosStock.value.articulo_id
    const res = await axios.get('/api/v1/inventario/stock', { headers: { Authorization: `Bearer ${token}` }, params })
    stock.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err); snackbar.value = { show: true, text: 'Error al consultar stock', color: 'error' } }
  finally { loadingStock.value = false }
}

async function cargarMovimientosArticulo() {
  if (!filtrosMovArt.value.articulo_id) { snackbar.value = { show: true, text: 'Seleccione un artículo', color: 'warning' }; return }
  loadingMov.value = true
  try {
    const token = localStorage.getItem('token')
    const params = { articulo_id: filtrosMovArt.value.articulo_id }
    if (filtrosMovArt.value.fecha_desde) params.fecha_desde = filtrosMovArt.value.fecha_desde
    if (filtrosMovArt.value.fecha_hasta) params.fecha_hasta = filtrosMovArt.value.fecha_hasta
    const res = await axios.get('/api/v1/inventario/movimientos', { headers: { Authorization: `Bearer ${token}` }, params })
    movimientosArticulo.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err); snackbar.value = { show: true, text: 'Error al consultar', color: 'error' } }
  finally { loadingMov.value = false }
}

async function cargarMovimientosAlmacen() {
  if (!filtrosMovAlm.value.almacen_id) { snackbar.value = { show: true, text: 'Seleccione un almacén', color: 'warning' }; return }
  loadingMov.value = true
  try {
    const token = localStorage.getItem('token')
    const params = { almacen_id: filtrosMovAlm.value.almacen_id }
    if (filtrosMovAlm.value.fecha_desde) params.fecha_desde = filtrosMovAlm.value.fecha_desde
    if (filtrosMovAlm.value.fecha_hasta) params.fecha_hasta = filtrosMovAlm.value.fecha_hasta
    const res = await axios.get('/api/v1/inventario/movimientos', { headers: { Authorization: `Bearer ${token}` }, params })
    movimientosAlmacen.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err); snackbar.value = { show: true, text: 'Error al consultar', color: 'error' } }
  finally { loadingMov.value = false }
}

onMounted(() => { cargarCatalogos(); cargarStock() })
</script>
