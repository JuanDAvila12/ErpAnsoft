<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="blue" size="36" class="mr-3">mdi-book-open-variant</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Libro Mayor</h2>
    </div>
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="4"><v-autocomplete v-model="cuentaId" :items="cuentas" item-title="nombre_completo" item-value="id" label="Cuenta *" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="3"><v-text-field v-model="filtroFechaDesde" label="Fecha desde" type="date" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="3"><v-text-field v-model="filtroFechaHasta" label="Fecha hasta" type="date" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="2"><v-btn color="primary" @click="consultar" :loading="loading" block>Consultar</v-btn></v-col>
      </v-row>
    </v-card>

    <v-card v-if="movimientos.length" variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="4"><strong>Total Debe:</strong> ${{ (totalDebe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</v-col>
        <v-col cols="4"><strong>Total Haber:</strong> ${{ (totalHaber || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</v-col>
        <v-col cols="4"><strong>Saldo Final:</strong> ${{ (saldoFinal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</v-col>
      </v-row>
    </v-card>

    <v-data-table :headers="headers" :items="movimientos" :loading="loading" :items-per-page="20" class="elevation-1">
      <template v-slot:item.debe="{ item }">${{ (item.debe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.haber="{ item }">${{ (item.haber || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.saldo_acumulado="{ item }">${{ (item.saldo_acumulado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
    </v-data-table>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const cuentas = ref([])
const cuentaId = ref(null)
const filtroFechaDesde = ref('')
const filtroFechaHasta = ref('')
const movimientos = ref([])
const totalDebe = ref(0)
const totalHaber = ref(0)
const saldoFinal = ref(0)
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const headers = [
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Comentario', key: 'comentario', sortable: true },
  { title: 'Transacción', key: 'transaccion_folio', sortable: true },
  { title: 'Debe', key: 'debe', sortable: true },
  { title: 'Haber', key: 'haber', sortable: true },
  { title: 'Saldo', key: 'saldo_acumulado', sortable: true },
]

async function cargarCuentas() {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/contabilidad/cuentas', { headers: { Authorization: `Bearer ${token}` } })
    const aplanar = (items, prefix = '') => {
      let result = []
      for (const item of items) {
        const nombre = `${item.codigo} - ${item.nombre}`
        result.push({ ...item, nombre_completo: nombre })
        if (item.children) result = result.concat(aplanar(item.children, nombre + ' / '))
      }
      return result
    }
    cuentas.value = aplanar(res.data.datos || [])
  } catch (err) { console.error(err) }
}

async function consultar() {
  if (!cuentaId.value) return
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    const params = { cuenta_id: cuentaId.value }
    if (filtroFechaDesde.value) params.fecha_desde = filtroFechaDesde.value
    if (filtroFechaHasta.value) params.fecha_hasta = filtroFechaHasta.value
    const res = await axios.get('/api/v1/contabilidad/libro-mayor', { params, headers: { Authorization: `Bearer ${token}` } })
    movimientos.value = res.data.datos?.movimientos || []
    totalDebe.value = res.data.datos?.total_debe || 0
    totalHaber.value = res.data.datos?.total_haber || 0
    saldoFinal.value = res.data.datos?.saldo_final || 0
  } catch (err) { snackbar.value = { show: true, mensaje: 'Error al consultar', color: 'error' } }
  finally { loading.value = false }
}

onMounted(() => cargarCuentas())
</script>
