<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="primary" size="36" class="mr-3">mdi-cart-arrow-right</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Órdenes de Venta</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="irNuevo">Nueva Orden</v-btn>
    </div>
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="4"><v-select v-model="filtroEstado" :items="estados" label="Estado" clearable variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="filtroFechaDesde" label="Fecha desde" type="date" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="filtroFechaHasta" label="Fecha hasta" type="date" variant="outlined" density="compact" /></v-col>
      </v-row>
    </v-card>

    <v-alert v-if="errorMsg" type="error" variant="tonal" closable class="mb-4" @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <v-card v-if="!loading && ordenes.length === 0" variant="tonal" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-cart-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron documentos</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay órdenes de venta registradas.</p>
    </v-card>

    <v-data-table v-else :headers="headers" :items="ordenes" :loading="loading" :items-per-page="15" class="elevation-1" @click:row="(e, { item }) => verDetalle(item)">
      <template v-slot:item.total="{ item }">${{ (item.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.estado="{ item }"><v-chip :color="item.estado === 'confirmado' ? 'success' : 'error'" size="small">{{ item.estado }}</v-chip></template>
      <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
      <template v-slot:item.acciones="{ item }">
        <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalle(item)" />
        <v-btn icon="mdi-cancel" size="small" variant="text" color="error" @click="confirmarCancelar(item)" v-if="item.estado !== 'cancelado'" />
        <v-btn icon="mdi-arrow-right-bold" size="small" variant="text" color="primary" @click="convertir(item, 'venta')" v-if="item.estado === 'confirmado'" title="Convertir a Venta" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialogoConfirmar" max-width="400">
      <v-card><v-card-title class="text-h5">Confirmar</v-card-title><v-card-text>{{ mensajeConfirmacion }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialogoConfirmar = false">Cancelar</v-btn><v-btn :color="accionConfirmarColor" @click="ejecutarAccion">{{ accionConfirmarTexto }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/plugins/axios'

const router = useRouter()
const loading = ref(false)
const ordenes = ref([])
const dialogoConfirmar = ref(false)
const mensajeConfirmacion = ref(''); const accionConfirmarTexto = ref('Aceptar'); const accionConfirmarColor = ref('primary')
let accionPendiente = null
const filtroEstado = ref(null); const filtroFechaDesde = ref(''); const filtroFechaHasta = ref('')
const estados = ['confirmado', 'cancelado']
const snackbar = ref({ show: false, mensaje: '', color: 'success' })
const errorMsg = ref('')
const headers = [
  { title: 'Folio', key: 'folio', sortable: true }, { title: 'Cliente', key: 'cliente_nombre', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true }, { title: 'Total', key: 'total', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true }, { title: 'Acciones', key: 'acciones', sortable: false },
]

function irNuevo() { router.push('/dashboard/ventas/nuevo/orden_venta') }

async function cargarOrdenes() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = { tipo: 'orden_venta' }
    if (filtroEstado.value) params.estado = filtroEstado.value
    if (filtroFechaDesde.value) params.fecha_desde = filtroFechaDesde.value
    if (filtroFechaHasta.value) params.fecha_hasta = filtroFechaHasta.value
    const res = await apiClient.get('/api/v1/transacciones', { params })
    ordenes.value = res.data || []
  } catch (err) {
    console.error('Error al cargar órdenes:', err)
    errorMsg.value = err.response?.data?.error || 'Error al cargar datos.'
    snackbar.value = { show: true, mensaje: 'Error al cargar órdenes', color: 'error' }
  } finally { loading.value = false }
}

function verDetalle(item) { router.push(`/dashboard/ventas/${item.id}`) }
function confirmarCancelar(item) {
  mensajeConfirmacion.value = `¿Cancelar la orden ${item.folio}?`
  accionConfirmarTexto.value = 'Cancelar'; accionConfirmarColor.value = 'error'
  accionPendiente = async () => {
    try {
      await apiClient.post(`/api/v1/transacciones/${item.id}/cancelar`)
      snackbar.value = { show: true, mensaje: 'Orden cancelada', color: 'success' }; await cargarOrdenes()
    } catch (err) { snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error', color: 'error' } }
  }
  dialogoConfirmar.value = true
}
function convertir(item, nuevoTipo) {
  mensajeConfirmacion.value = `¿Convertir ${item.folio} a ${nuevoTipo}?`
  accionConfirmarTexto.value = 'Convertir'; accionConfirmarColor.value = 'primary'
  accionPendiente = async () => {
    try {
      await apiClient.post(`/api/v1/transacciones/${item.id}/convertir`, { nuevo_tipo: nuevoTipo })
      snackbar.value = { show: true, mensaje: `Convertido a ${nuevoTipo}`, color: 'success' }; await cargarOrdenes()
    } catch (err) { snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error', color: 'error' } }
  }
  dialogoConfirmar.value = true
}
function ejecutarAccion() { if (accionPendiente) accionPendiente(); dialogoConfirmar.value = false }

onMounted(() => cargarOrdenes())
</script>
