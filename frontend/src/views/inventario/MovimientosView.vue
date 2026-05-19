<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon size="36" color="warning" class="mr-3">mdi-transfer</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Movimientos de Inventario</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Historial de entradas, salidas y ajustes de inventario</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="warning" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogoAjuste()">
          Nuevo Ajuste
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" sm="3" md="2">
            <v-select
              v-model="filtros.tipo_movimiento"
              :items="tiposMovimiento"
              label="Tipo"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3" md="3">
            <v-select
              v-model="filtros.almacen_id"
              :items="almacenes"
              item-title="nombre"
              item-value="id"
              label="Almacén"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-text-field v-model="filtros.fecha_desde" label="Desde" type="date" variant="outlined" density="compact" hide-details />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-text-field v-model="filtros.fecha_hasta" label="Hasta" type="date" variant="outlined" density="compact" hide-details />
          </v-col>
          <v-col cols="12" sm="3" md="2">
            <v-btn variant="outlined" prepend-icon="mdi-filter" @click="cargarDatos()" class="mr-2">Filtrar</v-btn>
            <v-btn variant="text" prepend-icon="mdi-refresh" @click="limpiarFiltros()">Limpiar</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loader -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="warning" size="48" width="4" />
      <p class="text-body-1 text-medium-emphasis mt-4">Cargando movimientos de inventario...</p>
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
      <template v-slot:title>Error al cargar movimientos</template>
      {{ errorMsg }}
      <template v-slot:append>
        <v-btn variant="text" color="error" @click="cargarDatos()">
          <v-icon left>mdi-refresh</v-icon> Reintentar
        </v-btn>
      </template>
    </v-alert>

    <!-- Empty state -->
    <v-card v-else-if="movimientos.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-transfer-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron movimientos</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay movimientos de inventario registrados</p>
    </v-card>

    <!-- Data Table -->
    <v-card v-else variant="outlined">
      <v-data-table
        :headers="columnas"
        :items="movimientos"
        :loading="loading"
        loading-text="Cargando movimientos..."
        :items-per-page="25"
        class="elevation-0"
      >
        <template v-slot:item.articulo_nombre="{ item }">
          <strong>{{ item.articulo_nombre }}</strong>
          <div class="text-caption text-medium-emphasis">{{ item.sku }}</div>
        </template>
        <template v-slot:item.tipo_movimiento="{ item }">
          <v-chip
            :color="item.tipo_movimiento === 'entrada' ? 'success' : item.tipo_movimiento === 'salida' ? 'error' : 'info'"
            size="x-small"
            variant="tonal"
          >
            {{ item.tipo_movimiento }}
          </v-chip>
        </template>
        <template v-slot:item.cantidad="{ item }">
          <span :class="item.tipo_movimiento === 'entrada' ? 'text-success' : 'text-error'">
            {{ item.tipo_movimiento === 'entrada' ? '+' : '-' }}{{ Number(item.cantidad).toFixed(2) }}
          </span>
        </template>
        <template v-slot:item.transaccion_fecha="{ item }">
          {{ new Date(item.transaccion_fecha).toLocaleString('es-MX') }}
        </template>
        <template v-slot:item.referencia="{ item }">
          <span v-if="item.referencia_tipo" class="text-caption">
            {{ item.referencia_tipo }} #{{ item.referencia_id }}
          </span>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo Nuevo Ajuste -->
    <v-dialog v-model="dialogoAjuste" max-width="600px" persistent>
      <v-card>
        <v-card-title class="text-h5 bg-warning text-white pa-4">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Nuevo Ajuste de Inventario
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form ref="formAjuste">
            <v-row>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="ajuste.articulo_id"
                  :items="articulos"
                  item-title="nombre"
                  item-value="id"
                  label="Artículo *"
                  variant="outlined"
                  density="compact"
                  :loading="buscandoArticulos"
                  @update:search="buscarArticulos"
                  required
                  clearable
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="`SKU: ${item.raw.sku}`" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="ajuste.almacen_id"
                  :items="almacenes"
                  item-title="nombre"
                  item-value="id"
                  label="Almacén *"
                  variant="outlined"
                  density="compact"
                  required
                  clearable
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="ajuste.tipo_movimiento"
                  :items="tiposAjuste"
                  label="Tipo de Ajuste *"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="ajuste.cantidad"
                  label="Cantidad *"
                  type="number"
                  variant="outlined"
                  density="compact"
                  min="0"
                  step="0.01"
                  required
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="ajuste.motivo"
                  label="Motivo del Ajuste"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoAjuste = false">Cancelar</v-btn>
          <v-btn color="warning" prepend-icon="mdi-content-save" :loading="guardando" @click="guardarAjuste">
            Registrar Ajuste
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const errorMsg = ref('')
const guardando = ref(false)
const buscandoArticulos = ref(false)
const movimientos = ref([])
const almacenes = ref([])
const articulos = ref([])
const dialogoAjuste = ref(false)

const tiposMovimiento = ['entrada', 'salida', 'ajuste', 'inicial']
const tiposAjuste = ['entrada', 'salida']

const filtros = ref({
  tipo_movimiento: '',
  almacen_id: null,
  fecha_desde: '',
  fecha_hasta: '',
})

const snackbar = ref({ show: false, text: '', color: 'success' })

const columnas = [
  { title: 'Artículo', key: 'articulo_nombre', sortable: true },
  { title: 'SKU', key: 'sku', sortable: true },
  { title: 'Almacén', key: 'almacen_nombre', sortable: true },
  { title: 'Tipo', key: 'tipo_movimiento', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true, align: 'end' },
  { title: 'Referencia', key: 'referencia', sortable: false },
  { title: 'Fecha', key: 'transaccion_fecha', sortable: true },
]

const ajuste = ref({
  articulo_id: null,
  almacen_id: null,
  tipo_movimiento: 'entrada',
  cantidad: 0,
  motivo: '',
})

async function buscarArticulos(query) {
  if (!query || query.length < 1) return
  buscandoArticulos.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/api/v1/articulos?search=${encodeURIComponent(query)}&limite=20`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    articulos.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err) }
  finally { buscandoArticulos.value = false }
}

async function cargarCatalogos() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/v1/inventario/almacenes', {
      headers: { Authorization: `Bearer ${token}` }
    })
    almacenes.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err) }
}

async function cargarDatos() {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const params = {}
    if (filtros.value.tipo_movimiento) params.tipo_movimiento = filtros.value.tipo_movimiento
    if (filtros.value.almacen_id) params.almacen_id = filtros.value.almacen_id
    if (filtros.value.fecha_desde) params.fecha_desde = filtros.value.fecha_desde
    if (filtros.value.fecha_hasta) params.fecha_hasta = filtros.value.fecha_hasta

    const res = await axios.get('/api/v1/inventario/movimientos', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    movimientos.value = res.data?.datos || res.data || []
    if (!Array.isArray(movimientos.value)) movimientos.value = []
  } catch (err) {
    console.error('Error al cargar movimientos:', err)
    errorMsg.value = err.response?.data?.error || err.message || 'Error al cargar movimientos'
    movimientos.value = []
  } finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  filtros.value = { tipo_movimiento: '', almacen_id: null, fecha_desde: '', fecha_hasta: '' }
  cargarDatos()
}

function abrirDialogoAjuste() {
  ajuste.value = { articulo_id: null, almacen_id: null, tipo_movimiento: 'entrada', cantidad: 0, motivo: '' }
  dialogoAjuste.value = true
}

async function guardarAjuste() {
  if (!ajuste.value.articulo_id || !ajuste.value.almacen_id || !ajuste.value.cantidad || ajuste.value.cantidad <= 0) {
    snackbar.value = { show: true, text: 'Complete todos los campos requeridos', color: 'warning' }
    return
  }

  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post('/api/v1/inventario/movimientos', {
      articulo_id: ajuste.value.articulo_id,
      almacen_id: ajuste.value.almacen_id,
      tipo_movimiento: ajuste.value.tipo_movimiento,
      cantidad: ajuste.value.cantidad,
      referencia_tipo: 'ajuste_manual',
      motivo: ajuste.value.motivo,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    dialogoAjuste.value = false
    snackbar.value = { show: true, text: 'Ajuste registrado exitosamente', color: 'success' }
    await cargarDatos()
  } catch (err) {
    console.error('Error al registrar ajuste:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al registrar ajuste', color: 'error' }
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarDatos()
  cargarCatalogos()
})
</script>
