<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="primary" size="36" class="mr-3">mdi-cart-arrow-right</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Órdenes de Venta</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="abrirDialogoNuevo">Nueva Orden</v-btn>
    </div>
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="4"><v-select v-model="filtroEstado" :items="estados" label="Estado" clearable variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="filtroFechaDesde" label="Fecha desde" type="date" variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="filtroFechaHasta" label="Fecha hasta" type="date" variant="outlined" density="compact" /></v-col>
      </v-row>
    </v-card>

    <!-- Error Alert -->
    <v-alert v-if="errorMsg" type="error" variant="tonal" closable class="mb-4" @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <!-- Mensaje cuando no hay datos -->
    <v-card v-if="!loading && ordenes.length === 0" variant="tonal" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-cart-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron documentos</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay órdenes de venta registradas.</p>
    </v-card>

    <v-data-table v-else :headers="headers" :items="ordenes" :loading="loading" :items-per-page="15" class="elevation-1">
      <template v-slot:item.total="{ item }">${{ (item.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.estado="{ item }"><v-chip :color="item.estado === 'confirmado' ? 'success' : 'error'" size="small">{{ item.estado }}</v-chip></template>
      <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
      <template v-slot:item.acciones="{ item }">
        <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalle(item)" />
        <v-btn icon="mdi-cancel" size="small" variant="text" color="error" @click="confirmarCancelar(item)" v-if="item.estado !== 'cancelado'" />
        <v-btn icon="mdi-arrow-right-bold" size="small" variant="text" color="primary" @click="convertir(item, 'venta')" v-if="item.estado === 'confirmado'" title="Convertir a Venta" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialogoNuevo" max-width="800" persistent>
      <v-card>
        <v-card-title class="text-h5">Nueva Orden de Venta</v-card-title>
        <v-card-text>
          <!-- Loading state for catalog data -->
          <v-progress-linear v-if="cargandoCatalogos" indeterminate color="primary" class="mb-3"></v-progress-linear>

          <!-- Error loading catalogs -->
          <v-alert v-if="errorCatalogos" type="error" variant="tonal" closable class="mb-3" @click:close="errorCatalogos = ''">
            {{ errorCatalogos }}
          </v-alert>

          <v-row>
            <v-col cols="12" sm="6"><v-autocomplete v-model="nuevoDocumento.cliente_id" :items="clientes" item-title="razon_social" item-value="id" label="Cliente *" variant="outlined" :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron clientes" /></v-col>
            <v-col cols="12" sm="6"><v-autocomplete v-model="nuevoDocumento.vendedor_id" :items="vendedores" item-title="razon_social" item-value="id" label="Vendedor" variant="outlined" :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron vendedores" /></v-col>
            <v-col cols="12" sm="6"><v-select v-model="nuevoDocumento.metodo_pago" :items="metodosPago" label="Método de pago" variant="outlined" /></v-col>
            <v-col cols="12" sm="6"><v-select v-model="nuevoDocumento.almacen_id" :items="almacenes" item-title="nombre" item-value="id" label="Almacén" variant="outlined" /></v-col>
          </v-row>
          <v-divider class="my-3" />
          <h4 class="text-h6 mb-2">Artículos</h4>
          <v-row v-for="(linea, i) in nuevoDocumento.articulos" :key="i" class="mb-2" align="center">
            <v-col cols="5">
              <v-autocomplete v-model="linea.articulo_id" :items="articulos" item-title="nombre" item-value="id" label="Artículo" variant="outlined" density="compact" return-object :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron artículos" @update:model-value="sel => { if(sel) { linea.precio_unitario = sel.precio_venta } }" />
            </v-col>
            <v-col cols="2"><v-text-field v-model="linea.cantidad" label="Cant." type="number" min="1" variant="outlined" density="compact" /></v-col>
            <v-col cols="3"><v-text-field v-model="linea.precio_unitario" label="Precio" type="number" prefix="$" variant="outlined" density="compact" /></v-col>
            <v-col cols="2" class="text-right"><v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="nuevoDocumento.articulos.splice(i, 1)" /></v-col>
          </v-row>
          <v-btn variant="tonal" prepend-icon="mdi-plus" @click="agregarLinea" :disabled="cargandoCatalogos">Agregar artículo</v-btn>
          <v-divider class="my-3" />
          <div class="text-h5 text-right font-weight-bold">Total: ${{ calcularTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer /><v-btn variant="text" @click="cerrarDialogoNuevo">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" @click="guardarOrden" :disabled="!puedeGuardar || cargandoCatalogos">Guardar Orden</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoConfirmar" max-width="400">
      <v-card><v-card-title class="text-h5">Confirmar</v-card-title><v-card-text>{{ mensajeConfirmacion }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialogoConfirmar = false">Cancelar</v-btn><v-btn :color="accionConfirmarColor" @click="ejecutarAccion">{{ accionConfirmarTexto }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/plugins/axios'

const router = useRouter()
const loading = ref(false); const guardando = ref(false)
const cargandoCatalogos = ref(false); const errorCatalogos = ref('')
const ordenes = ref([]); const clientes = ref([]); const vendedores = ref([]); const articulos = ref([]); const almacenes = ref([])
const dialogoNuevo = ref(false); const dialogoConfirmar = ref(false)
const mensajeConfirmacion = ref(''); const accionConfirmarTexto = ref('Aceptar'); const accionConfirmarColor = ref('primary')
let accionPendiente = null
const filtroEstado = ref(null); const filtroFechaDesde = ref(''); const filtroFechaHasta = ref('')
const estados = ['confirmado', 'cancelado']; const metodosPago = ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito']
const snackbar = ref({ show: false, mensaje: '', color: 'success' })
const errorMsg = ref('')
const headers = [
  { title: 'Folio', key: 'folio', sortable: true }, { title: 'Cliente', key: 'cliente_nombre', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true }, { title: 'Total', key: 'total', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true }, { title: 'Acciones', key: 'acciones', sortable: false },
]
const nuevoDocumento = ref({ cliente_id: null, vendedor_id: null, metodo_pago: 'transferencia', almacen_id: null, articulos: [] })

function agregarLinea() { nuevoDocumento.value.articulos.push({ articulo_id: null, cantidad: 1, precio_unitario: 0 }) }
function calcularTotal() { return nuevoDocumento.value.articulos.reduce((s, l) => s + (parseFloat(l.cantidad||0) * parseFloat(l.precio_unitario||0)), 0) }
const puedeGuardar = computed(() => nuevoDocumento.value.cliente_id && nuevoDocumento.value.articulos.length > 0 && nuevoDocumento.value.articulos.every(l => l.articulo_id && l.cantidad > 0))

function cerrarDialogoNuevo() {
  dialogoNuevo.value = false
  nuevoDocumento.value = { cliente_id: null, vendedor_id: null, metodo_pago: 'transferencia', almacen_id: null, articulos: [] }
  errorCatalogos.value = ''
}

async function abrirDialogoNuevo() {
  dialogoNuevo.value = true
  cargandoCatalogos.value = true
  errorCatalogos.value = ''
  try {
    const [c, v, a, al] = await Promise.all([
      apiClient.get('/api/v1/entidades', { params: { rol: 'cliente', limite: 200 } }),
      apiClient.get('/api/v1/entidades', { params: { rol: 'vendedor', limite: 200 } }),
      apiClient.get('/api/v1/articulos', { params: { limite: 200 } }),
      apiClient.get('/api/v1/inventario/almacenes'),
    ])
    clientes.value = c.data.datos || []; vendedores.value = v.data.datos || []
    articulos.value = a.data.datos || []; almacenes.value = al.data.datos || []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
    errorCatalogos.value = err.response?.data?.error || 'Error al cargar datos. Verifique la conexión con el servidor.'
    snackbar.value = { show: true, mensaje: 'Error al cargar catálogos', color: 'error' }
  } finally {
    cargandoCatalogos.value = false
  }
}

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
    errorMsg.value = err.response?.data?.error || 'Error al cargar datos. Verifique la conexión con el servidor.'
    snackbar.value = { show: true, mensaje: 'Error al cargar órdenes', color: 'error' }
  } finally { loading.value = false }
}

async function guardarOrden() {
  guardando.value = true
  try {
    await apiClient.post('/api/v1/transacciones', {
      tipo: 'orden_venta', entidad_cliente_id: nuevoDocumento.value.cliente_id,
      entidad_vendedor_id: nuevoDocumento.value.vendedor_id, metodo_pago: nuevoDocumento.value.metodo_pago,
      almacen_id: nuevoDocumento.value.almacen_id,
      articulos: nuevoDocumento.value.articulos.map(l => ({ articulo_id: l.articulo_id?.id||l.articulo_id, cantidad: parseFloat(l.cantidad), precio_unitario: parseFloat(l.precio_unitario) })),
    })
    snackbar.value = { show: true, mensaje: 'Orden creada exitosamente', color: 'success' }
    cerrarDialogoNuevo()
    await cargarOrdenes()
  } catch (err) { snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error al guardar', color: 'error' } }
  finally { guardando.value = false }
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
