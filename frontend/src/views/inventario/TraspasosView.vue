<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon color="success" size="36" class="mr-3">mdi-swap-horizontal-bold</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Traspasos</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Transferencias entre almacenes</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn
          color="success"
          variant="elevated"
          prepend-icon="mdi-plus"
          @click="abrirDialogoNuevo"
          :disabled="almacenes.length === 0"
          :title="almacenes.length === 0 ? 'No hay almacenes disponibles' : ''"
        >
          Nuevo Traspaso
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loader principal -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="success" size="48" width="4" />
      <p class="text-body-1 text-medium-emphasis mt-4">Cargando traspasos...</p>
    </div>

    <!-- Error principal -->
    <v-alert
      v-else-if="errorMsg"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="errorMsg = ''"
    >
      <template v-slot:title>Error al cargar traspasos</template>
      {{ errorMsg }}
      <template v-slot:append>
        <v-btn variant="text" color="error" @click="cargarDatos()">
          <v-icon left>mdi-refresh</v-icon> Reintentar
        </v-btn>
      </template>
    </v-alert>

    <!-- Sin almacenes -->
    <v-alert
      v-else-if="!cargandoAlmacenes && almacenes.length === 0 && almacenesError === ''"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      <template v-slot:title>No hay almacenes registrados</template>
      Para poder realizar traspasos, primero debe crear al menos un almacén en el catálogo de almacenes.
    </v-alert>

    <!-- Error al cargar almacenes -->
    <v-alert
      v-else-if="almacenesError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="almacenesError = ''"
    >
      <template v-slot:title>Error al cargar almacenes</template>
      {{ almacenesError }}
      <template v-slot:append>
        <v-btn variant="text" color="error" @click="cargarCatalogos()">
          <v-icon left>mdi-refresh</v-icon> Reintentar
        </v-btn>
      </template>
    </v-alert>

    <!-- Empty state traspasos -->
    <v-card v-else-if="traspasos.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-swap-horizontal-bold</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron traspasos</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay traspasos registrados entre almacenes</p>
      <v-btn
        v-if="almacenes.length > 0"
        color="success"
        variant="tonal"
        prepend-icon="mdi-plus"
        class="mt-2"
        @click="abrirDialogoNuevo"
      >
        Realizar primer traspaso
      </v-btn>
    </v-card>

    <!-- Data Table -->
    <v-card v-else variant="outlined">
      <v-data-table
        :headers="headers"
        :items="traspasos"
        :loading="loading"
        loading-text="Cargando traspasos..."
        :items-per-page="15"
        class="elevation-1"
      >
        <template v-slot:item.total="{ item }">
          ${{ (item.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
        <template v-slot:item.estado="{ item }">
          <v-chip :color="item.estado === 'confirmado' ? 'success' : 'error'" size="small">
            {{ item.estado }}
          </v-chip>
        </template>
        <template v-slot:item.fecha="{ item }">
          {{ new Date(item.fecha).toLocaleDateString('es-MX') }}
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo Nuevo Traspaso -->
    <v-dialog v-model="dialogoNuevo" max-width="700" persistent>
      <v-card>
        <v-card-title class="text-h5 bg-success text-white pa-4">
          <v-icon class="mr-2">mdi-swap-horizontal-bold</v-icon>
          Nuevo Traspaso
        </v-card-title>
        <v-card-text class="pa-4">
          <!-- Loader almacenes en diálogo -->
          <div v-if="cargandoAlmacenes" class="text-center pa-4">
            <v-progress-circular indeterminate color="success" size="32" width="3" />
            <p class="text-body-2 text-medium-emphasis mt-2">Cargando almacenes...</p>
          </div>

          <!-- Error almacenes en diálogo -->
          <v-alert v-else-if="almacenesError" type="error" variant="tonal" class="mb-4">
            {{ almacenesError }}
            <template v-slot:append>
              <v-btn variant="text" color="error" @click="cargarCatalogos()">
                Reintentar
              </v-btn>
            </template>
          </v-alert>

          <!-- Sin almacenes en diálogo -->
          <v-alert v-else-if="almacenes.length === 0" type="warning" variant="tonal" class="mb-4">
            No hay almacenes registrados. Cree un almacén primero.
          </v-alert>

          <template v-if="!cargandoAlmacenes && almacenes.length > 0">
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="nuevoDocumento.origen_id"
                  :items="almacenes"
                  item-title="nombre"
                  item-value="id"
                  label="Almacén Origen *"
                  variant="outlined"
                  density="compact"
                  :disabled="cargandoAlmacenes"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="nuevoDocumento.destino_id"
                  :items="almacenes"
                  item-title="nombre"
                  item-value="id"
                  label="Almacén Destino *"
                  variant="outlined"
                  density="compact"
                  :disabled="cargandoAlmacenes"
                />
              </v-col>
            </v-row>
            <v-divider class="my-3" />
            <h4 class="text-subtitle-1 font-weight-bold mb-2">Artículos</h4>
            <v-row v-for="(linea, i) in nuevoDocumento.articulos" :key="i" class="mb-2" align="center">
              <v-col cols="6">
                <v-autocomplete
                  v-model="linea.articulo_id"
                  :items="articulos"
                  item-title="nombre"
                  item-value="id"
                  label="Artículo"
                  variant="outlined"
                  density="compact"
                  return-object
                />
              </v-col>
              <v-col cols="3">
                <v-text-field v-model="linea.cantidad" label="Cant." type="number" min="1" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="3" class="text-right">
                <v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="nuevoDocumento.articulos.splice(i, 1)" />
              </v-col>
            </v-row>
            <v-btn variant="tonal" prepend-icon="mdi-plus" class="mt-2" @click="agregarLinea">
              Agregar artículo
            </v-btn>
          </template>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoNuevo = false; limpiarFormulario()">Cancelar</v-btn>
          <v-btn
            color="success"
            :loading="guardando"
            @click="guardar"
            :disabled="!puedeGuardar"
          >
            Realizar Traspaso
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const errorMsg = ref('')
const guardando = ref(false)
const cargandoAlmacenes = ref(false)
const almacenesError = ref('')
const traspasos = ref([])
const almacenes = ref([])
const articulos = ref([])
const dialogoNuevo = ref(false)
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const headers = [
  { title: 'Folio', key: 'folio', sortable: true },
  { title: 'Origen', key: 'almacen_origen_nombre', sortable: true },
  { title: 'Destino', key: 'almacen_destino_nombre', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Total', key: 'total', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true },
]

const nuevoDocumento = ref({ origen_id: null, destino_id: null, articulos: [] })

function agregarLinea() {
  nuevoDocumento.value.articulos.push({ articulo_id: null, cantidad: 1 })
}

function limpiarFormulario() {
  nuevoDocumento.value = { origen_id: null, destino_id: null, articulos: [] }
}

function abrirDialogoNuevo() {
  limpiarFormulario()
  dialogoNuevo.value = true
}

const puedeGuardar = computed(() =>
  nuevoDocumento.value.origen_id &&
  nuevoDocumento.value.destino_id &&
  nuevoDocumento.value.origen_id !== nuevoDocumento.value.destino_id &&
  nuevoDocumento.value.articulos.length > 0 &&
  nuevoDocumento.value.articulos.every(l => l.articulo_id && l.cantidad > 0)
)

async function cargarCatalogos() {
  cargandoAlmacenes.value = true
  almacenesError.value = ''
  try {
    const token = localStorage.getItem('token')
    const [aRes, alRes] = await Promise.all([
      axios.get('/api/v1/articulos?limite=200', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('/api/v1/almacenes', {
        headers: { Authorization: `Bearer ${token}` }
      }),
    ])
    articulos.value = aRes.data?.datos || aRes.data || []
    almacenes.value = alRes.data?.datos || alRes.data || []
    if (!Array.isArray(articulos.value)) articulos.value = []
    if (!Array.isArray(almacenes.value)) almacenes.value = []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
    almacenesError.value = err.response?.data?.error || err.message || 'Error al cargar almacenes'
    almacenes.value = []
    articulos.value = []
  } finally {
    cargandoAlmacenes.value = false
  }
}

async function cargarDatos() {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/v1/transacciones?tipo=traspaso', {
      headers: { Authorization: `Bearer ${token}` }
    })
    traspasos.value = res.data?.datos || res.data || []
    if (!Array.isArray(traspasos.value)) traspasos.value = []
  } catch (err) {
    console.error('Error al cargar traspasos:', err)
    errorMsg.value = err.response?.data?.error || err.message || 'Error al cargar traspasos'
    traspasos.value = []
  } finally {
    loading.value = false
  }
}

async function guardar() {
  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post('/api/v1/transacciones', {
      tipo: 'traspaso',
      almacen_id: nuevoDocumento.value.origen_id,
      almacen_destino_id: nuevoDocumento.value.destino_id,
      articulos: nuevoDocumento.value.articulos.map(l => ({
        articulo_id: l.articulo_id?.id || l.articulo_id,
        cantidad: parseFloat(l.cantidad),
        precio_unitario: 0,
      })),
    }, { headers: { Authorization: `Bearer ${token}` } })

    snackbar.value = { show: true, mensaje: 'Traspaso realizado exitosamente', color: 'success' }
    dialogoNuevo.value = false
    limpiarFormulario()
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar traspaso:', err)
    snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error al guardar', color: 'error' }
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarDatos()
  cargarCatalogos()
})
</script>
