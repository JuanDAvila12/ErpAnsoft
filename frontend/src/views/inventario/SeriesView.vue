<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon color="success" size="36" class="mr-3">mdi-qrcode</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Trazabilidad por Serie</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Consulta de movimientos por número de serie</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-card variant="outlined" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="8">
          <v-text-field v-model="numeroSerie" label="Buscar número de serie" variant="outlined" density="compact" @keyup.enter="buscar" clearable />
        </v-col>
        <v-col cols="12" sm="4">
          <v-btn color="primary" @click="buscar" :loading="loading" block>Buscar</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Loader -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="success" size="48" width="4" />
      <p class="text-body-1 text-medium-emphasis mt-4">Buscando serie...</p>
    </div>

    <!-- Error -->
    <v-alert
      v-else-if="errorMsg && !serieInfo"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="errorMsg = ''"
    >
      <template v-slot:title>Error</template>
      {{ errorMsg }}
    </v-alert>

    <!-- Serie Info -->
    <v-card v-if="serieInfo" class="mb-4" variant="tonal">
      <v-card-title>Información de la Serie</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="4"><strong>Número:</strong> {{ serieInfo.numero_serie }}</v-col>
          <v-col cols="12" sm="4"><strong>Artículo:</strong> {{ serieInfo.articulo_nombre }}</v-col>
          <v-col cols="12" sm="4">
            <strong>Estado:</strong>
            <v-chip :color="serieInfo.estado === 'disponible' ? 'success' : 'warning'" size="small">{{ serieInfo.estado }}</v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Empty history -->
    <v-card v-if="serieInfo && movimientos.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-history</v-icon>
      <p class="text-body-2 text-medium-emphasis">No hay movimientos registrados para esta serie</p>
    </v-card>

    <!-- Movimientos -->
    <v-data-table v-if="movimientos.length" :headers="headers" :items="movimientos" :items-per-page="15" class="elevation-1">
      <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
      <template v-slot:item.tipo="{ item }"><v-chip size="small">{{ item.tipo }}</v-chip></template>
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
import { ref } from 'vue'
import axios from 'axios'

const loading = ref(false)
const errorMsg = ref('')
const numeroSerie = ref('')
const serieInfo = ref(null)
const movimientos = ref([])
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const headers = [
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Tipo', key: 'tipo', sortable: true },
  { title: 'Documento', key: 'folio', sortable: true },
  { title: 'Almacén', key: 'almacen_nombre', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true },
]

async function buscar() {
  if (!numeroSerie.value) return
  loading.value = true
  errorMsg.value = ''
  serieInfo.value = null
  movimientos.value = []
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/inventario/serie/${encodeURIComponent(numeroSerie.value)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    serieInfo.value = res.data.datos
    movimientos.value = res.data.historial || []
  } catch (err) {
    console.error('Error al buscar serie:', err)
    errorMsg.value = err.response?.data?.error || 'Serie no encontrada'
    serieInfo.value = null
    movimientos.value = []
  } finally { loading.value = false }
}
</script>
