<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="blue" size="36" class="mr-3">mdi-scale-balance</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Balanza de Comprobación</h2>
    </div>
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="4"><v-text-field v-model="fechaCorte" label="Fecha de corte" type="date" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="2"><v-btn color="primary" @click="consultar" :loading="loading" block>Consultar</v-btn></v-col>
      </v-row>
    </v-card>
    <v-data-table :headers="headers" :items="balanza" :loading="loading" :items-per-page="50" class="elevation-1">
      <template v-slot:item.debe="{ item }">${{ (item.debe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.haber="{ item }">${{ (item.haber || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.saldo="{ item }">${{ (item.saldo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
    </v-data-table>
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const fechaCorte = ref(new Date().toISOString().split('T')[0])
const balanza = ref([])
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const headers = [
  { title: 'Código', key: 'codigo', sortable: true },
  { title: 'Cuenta', key: 'nombre', sortable: true },
  { title: 'Tipo', key: 'tipo', sortable: true },
  { title: 'Debe', key: 'debe', sortable: true },
  { title: 'Haber', key: 'haber', sortable: true },
  { title: 'Saldo', key: 'saldo', sortable: true },
]

async function consultar() {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/contabilidad/balanza', { params: { fecha_corte: fechaCorte.value }, headers: { Authorization: `Bearer ${token}` } })
    balanza.value = res.data.datos || []
  } catch (err) { snackbar.value = { show: true, mensaje: 'Error al consultar', color: 'error' } }
  finally { loading.value = false }
}

onMounted(() => consultar())
</script>
