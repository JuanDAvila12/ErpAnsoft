<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-icon size="36" color="warning" class="mr-3">mdi-qrcode-scan</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Consulta por Número de Serie</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Trazabilidad de artículos por número de serie</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" sm="8" md="6">
            <v-text-field
              v-model="numeroSerie"
              label="Número de Serie"
              placeholder="Ingrese el número de serie a consultar"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @keyup.enter="buscar"
              :loading="buscando"
            />
          </v-col>
          <v-col cols="12" sm="4" md="2">
            <v-btn color="warning" variant="elevated" prepend-icon="mdi-magnify" @click="buscar" :loading="buscando" block>Buscar</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Resultados -->
    <template v-if="resultados.length > 0">
      <!-- Información General -->
      <v-card variant="outlined" class="mb-4">
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6">
              <p class="mb-1"><strong>No. Serie:</strong> {{ numeroSerie }}</p>
              <p class="mb-1"><strong>Artículo:</strong> {{ resultados[0].articulo_nombre }} ({{ resultados[0].sku }})</p>
              <p class="mb-0"><strong>Estado:</strong>
                <v-chip :color="resultados[0].serie_estado === 'disponible' ? 'success' : 'error'" size="small" variant="tonal">
                  {{ resultados[0].serie_estado }}
                </v-chip>
              </p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Historial de Movimientos -->
      <v-card variant="outlined">
        <v-card-title class="text-subtitle-1 font-weight-bold">Historial de Movimientos</v-card-title>
        <v-data-table :headers="columnas" :items="resultados" :items-per-page="20" class="elevation-0">
          <template v-slot:item.transaccion_fecha="{ item }">{{ new Date(item.transaccion_fecha).toLocaleDateString('es-MX') }}</template>
          <template v-slot:item.tipo_movimiento="{ item }">
            <v-chip :color="item.tipo_movimiento === 'entrada' ? 'success' : 'error'" size="x-small" variant="tonal">{{ item.tipo_movimiento }}</v-chip>
          </template>
          <template v-slot:item.transaccion_folio="{ item }"><strong>{{ item.transaccion_folio }}</strong></template>
          <template v-slot:item.transaccion_tipo="{ item }">{{ item.transaccion_tipo }}</template>
          <template v-slot:item.entidad_nombre="{ item }">{{ item.entidad_nombre }}</template>
          <template v-slot:item.almacen_nombre="{ item }">{{ item.almacen_nombre || '—' }}</template>
        </v-data-table>
      </v-card>
    </template>

    <!-- Sin resultados -->
    <v-card v-else-if="buscado && !buscando" variant="outlined">
      <v-card-text class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-qrcode-scan</v-icon>
        <h3 class="text-h6 text-medium-emphasis">No se encontraron resultados</h3>
        <p class="text-body-2 text-medium-emphasis">El número de serie "{{ numeroSerie }}" no tiene registros en el sistema.</p>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const numeroSerie = ref('')
const buscando = ref(false)
const buscado = ref(false)
const resultados = ref([])
const snackbar = ref({ show: false, text: '', color: 'success' })

const columnas = [
  { title: 'Fecha', key: 'transaccion_fecha', sortable: true },
  { title: 'Tipo Mov.', key: 'tipo_movimiento', sortable: true },
  { title: 'Folio', key: 'transaccion_folio', sortable: true },
  { title: 'Tipo Trans.', key: 'transaccion_tipo', sortable: true },
  { title: 'Entidad', key: 'entidad_nombre', sortable: true },
  { title: 'Almacén', key: 'almacen_nombre', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true, align: 'end' },
]

async function buscar() {
  if (!numeroSerie.value) {
    snackbar.value = { show: true, text: 'Ingrese un número de serie', color: 'warning' }
    return
  }
  buscando.value = true
  buscado.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/api/v1/inventario/serie/${encodeURIComponent(numeroSerie.value)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    resultados.value = res.data?.datos || []
    if (resultados.value.length === 0) {
      snackbar.value = { show: true, text: 'Serie no encontrada', color: 'warning' }
    }
  } catch (err) {
    console.error(err)
    resultados.value = []
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al buscar serie', color: 'error' }
  } finally {
    buscando.value = false
  }
}
</script>
