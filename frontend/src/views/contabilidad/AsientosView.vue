<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="blue" size="36" class="mr-3">mdi-book-multiple</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Asientos Contables</h2>
    </div>
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="4"><v-text-field v-model="filtroFechaDesde" label="Fecha desde" type="date" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="filtroFechaHasta" label="Fecha hasta" type="date" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="4"><v-btn color="primary" @click="cargarAsientos" block>Filtrar</v-btn></v-col>
      </v-row>
    </v-card>
    <v-data-table :headers="headers" :items="asientos" :loading="loading" :items-per-page="15" class="elevation-1"
      @click:row="verDetalle" item-value="id">
      <template v-slot:item.debe="{ item }">${{ (item.debe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.haber="{ item }">${{ (item.haber || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
    </v-data-table>

    <v-dialog v-model="dialogoDetalle" max-width="700">
      <v-card v-if="asientoDetalle">
        <v-card-title>Asiento #{{ asientoDetalle.id }}</v-card-title>
        <v-card-text>
          <p><strong>Fecha:</strong> {{ new Date(asientoDetalle.fecha).toLocaleDateString('es-MX') }}</p>
          <p><strong>Transacción:</strong> {{ asientoDetalle.transaccion_tipo }} - {{ asientoDetalle.transaccion_folio || 'N/A' }}</p>
          <v-divider class="my-2" />
          <v-table>
            <thead><tr><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead>
            <tbody>
              <tr>
                <td>{{ asientoDetalle.cuenta_codigo }} - {{ asientoDetalle.cuenta_nombre }}</td>
                <td>${{ (asientoDetalle.debe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</td>
                <td>${{ (asientoDetalle.haber || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialogoDetalle = false">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const loading = ref(false)
const asientos = ref([])
const asientoDetalle = ref(null)
const dialogoDetalle = ref(false)
const filtroFechaDesde = ref('')
const filtroFechaHasta = ref('')
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Cuenta', key: 'cuenta_nombre', sortable: true },
  { title: 'Transacción', key: 'transaccion_folio', sortable: true },
  { title: 'Debe', key: 'debe', sortable: true },
  { title: 'Haber', key: 'haber', sortable: true },
]

async function cargarAsientos() {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    const params = {}
    if (filtroFechaDesde.value) params.fecha_desde = filtroFechaDesde.value
    if (filtroFechaHasta.value) params.fecha_hasta = filtroFechaHasta.value
    if (route.query.cuenta_id) params.cuenta_id = route.query.cuenta_id
    const res = await axios.get('/api/v1/contabilidad/asientos', { params, headers: { Authorization: `Bearer ${token}` } })
    asientos.value = res.data.datos || []
  } catch (err) { snackbar.value = { show: true, mensaje: 'Error al cargar asientos', color: 'error' } }
  finally { loading.value = false }
}

async function verDetalle(event, { item }) {
  asientoDetalle.value = item
  dialogoDetalle.value = true
}

onMounted(() => cargarAsientos())
</script>
