<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon size="36" color="warning" class="mr-3">mdi-package-down</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Recepciones de Traspaso</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Registro de entrada de mercancía por traspaso</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="warning" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogoNuevo()">Nueva Recepción</v-btn>
      </v-col>
    </v-row>

    <!-- Loader -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="warning" size="48" width="4" />
      <p class="text-body-1 text-medium-emphasis mt-4">Cargando recepciones de traspaso...</p>
    </div>

    <!-- Error -->
    <v-alert v-else-if="errorMsg" type="error" variant="tonal" closable class="mb-4" @click:close="errorMsg = ''">
      <template v-slot:title>Error al cargar recepciones</template>
      {{ errorMsg }}
      <template v-slot:append>
        <v-btn variant="text" color="error" @click="cargarDatos()">
          <v-icon left>mdi-refresh</v-icon> Reintentar
        </v-btn>
      </template>
    </v-alert>

    <!-- Empty state -->
    <v-card v-else-if="documentos.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-package-down</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron recepciones de traspaso</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay recepciones de traspaso registradas</p>
      <v-btn color="warning" variant="tonal" prepend-icon="mdi-plus-circle" class="mt-2" @click="abrirDialogoNuevo()">
        Registrar primera recepción
      </v-btn>
    </v-card>

    <v-card v-else variant="outlined">
      <v-data-table :headers="columnas" :items="documentos" :loading="loading" loading-text="Cargando recepciones..." :items-per-page="20" class="elevation-0">
        <template v-slot:item.folio="{ item }"><strong>{{ item.folio }}</strong></template>
        <template v-slot:item.traspaso_origen="{ item }">{{ item.traspaso_origen_folio || '—' }}</template>
        <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
        <template v-slot:item.estado="{ item }">
          <v-chip :color="item.estado === 'confirmado' ? 'success' : 'warning'" size="small" variant="tonal">{{ item.estado }}</v-chip>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialogoNuevo" max-width="800px" persistent scrollable>
      <v-card>
        <v-card-title class="text-h5 bg-warning text-white pa-4"><v-icon class="mr-2">mdi-plus-circle</v-icon>Nueva Recepción de Traspaso</v-card-title>
        <v-card-text class="pa-4">
          <v-form ref="formNuevo">
            <v-row>
              <v-col cols="12" md="6">
                <v-select v-model="nuevoDocumento.traspaso_origen_id" :items="traspasosPendientes" item-title="folio" item-value="id" label="Traspaso Origen" variant="outlined" density="compact" clearable />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="nuevoDocumento.almacen_id" :items="almacenes" item-title="nombre" item-value="id" label="Almacén Destino *" variant="outlined" density="compact" clearable />
              </v-col>
            </v-row>
            <v-divider class="my-3" />
            <h4 class="text-subtitle-1 font-weight-bold mb-2">Artículos Recibidos</h4>
            <v-row v-for="(art, idx) in nuevoDocumento.articulos" :key="idx" class="mb-2" align="center">
              <v-col cols="6">
                <v-autocomplete v-model="art.articulo_id" :items="articulos" item-title="nombre" item-value="id" label="Artículo *" variant="outlined" density="compact" @update:search="buscarArticulos" hide-details clearable>
                  <template v-slot:item="{ props, item }"><v-list-item v-bind="props" :subtitle="`SKU: ${item.raw.sku}`" /></template>
                </v-autocomplete>
              </v-col>
              <v-col cols="4"><v-text-field v-model.number="art.cantidad" label="Cantidad" type="number" variant="outlined" density="compact" min="0" step="0.01" hide-details /></v-col>
              <v-col cols="1"><v-btn icon size="small" color="error" variant="text" @click="eliminarArticulo(idx)"><v-icon>mdi-close-circle</v-icon></v-btn></v-col>
            </v-row>
            <v-btn variant="outlined" size="small" prepend-icon="mdi-plus" @click="agregarArticulo" class="mt-2">Agregar Artículo</v-btn>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer /><v-btn variant="outlined" @click="dialogoNuevo = false">Cancelar</v-btn>
          <v-btn color="warning" prepend-icon="mdi-content-save" :loading="guardando" @click="guardarNuevo">Registrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const loading = ref(false)
const errorMsg = ref('')
const guardando = ref(false)
const documentos = ref([])
const almacenes = ref([])
const traspasosPendientes = ref([])
const articulos = ref([])
const dialogoNuevo = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

const columnas = [
  { title: 'Folio', key: 'folio', sortable: true },
  { title: 'Traspaso Origen', key: 'traspaso_origen', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true },
]

const nuevoDocumento = ref({
  traspaso_origen_id: null,
  almacen_id: null,
  articulos: [{ articulo_id: null, cantidad: 1 }],
})

function agregarArticulo() { nuevoDocumento.value.articulos.push({ articulo_id: null, cantidad: 1 }) }
function eliminarArticulo(idx) { if (nuevoDocumento.value.articulos.length > 1) nuevoDocumento.value.articulos.splice(idx, 1) }

async function buscarArticulos(query) {
  if (!query || query.length < 1) return
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/articulos?search=${encodeURIComponent(query)}&limite=20`, { headers: { Authorization: `Bearer ${token}` } })
    articulos.value = res.data?.datos || res.data || []
  } catch (err) { console.error(err) }
}

async function cargarDatos() {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/v1/transacciones', { headers: { Authorization: `Bearer ${token}` }, params: { tipo: 'recepcion_traspaso' } })
    documentos.value = res.data?.datos || res.data || []
    if (!Array.isArray(documentos.value)) documentos.value = []
  } catch (err) {
    console.error('Error al cargar recepciones:', err)
    errorMsg.value = err.response?.data?.error || err.message || 'Error al cargar recepciones'
    documentos.value = []
  } finally { loading.value = false }
}

async function cargarCatalogos() {
  try {
    const token = localStorage.getItem('token')
    const [almRes, trasRes] = await Promise.all([
      axios.get('/api/v1/inventario/almacenes', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/transacciones', { headers: { Authorization: `Bearer ${token}` }, params: { tipo: 'traspaso', estado: 'confirmado' } }),
    ])
    almacenes.value = almRes.data?.datos || almRes.data || []
    traspasosPendientes.value = trasRes.data?.datos || trasRes.data || []
  } catch (err) { console.error(err) }
}

function abrirDialogoNuevo() {
  nuevoDocumento.value = { traspaso_origen_id: parseInt(route.query.origen_id) || null, almacen_id: null, articulos: [{ articulo_id: null, cantidad: 1 }] }
  dialogoNuevo.value = true
}

async function guardarNuevo() {
  if (!nuevoDocumento.value.almacen_id) { snackbar.value = { show: true, text: 'Seleccione un almacén destino', color: 'warning' }; return }
  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post('/api/v1/transacciones', {
      tipo: 'recepcion_traspaso',
      almacen_id: nuevoDocumento.value.almacen_id,
      documento_origen_id: nuevoDocumento.value.traspaso_origen_id,
      articulos: nuevoDocumento.value.articulos.map(a => ({ articulo_id: a.articulo_id, cantidad: a.cantidad })),
    }, { headers: { Authorization: `Bearer ${token}` } })
    dialogoNuevo.value = false
    snackbar.value = { show: true, text: 'Recepción registrada exitosamente', color: 'success' }
    await cargarDatos()
  } catch (err) { console.error(err); snackbar.value = { show: true, text: err.response?.data?.error || 'Error', color: 'error' } }
  finally { guardando.value = false }
}

onMounted(() => { cargarDatos(); cargarCatalogos() })
</script>
