<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="purple" size="36" class="mr-3">mdi-file-invoice</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Compras / Facturas</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="abrirDialogoNuevo">Nueva Compra</v-btn>
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
    <v-card v-if="!loading && compras.length === 0" variant="tonal" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-file-invoice-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron documentos</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay compras registradas.</p>
    </v-card>

    <v-data-table v-else :headers="headers" :items="compras" :loading="loading" :items-per-page="15" class="elevation-1">
      <template v-slot:item.total="{ item }">${{ (item.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.estado="{ item }"><v-chip :color="item.estado === 'confirmado' ? 'success' : 'error'" size="small">{{ item.estado }}</v-chip></template>
      <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
      <template v-slot:item.acciones="{ item }">
        <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalle(item)" />
        <v-btn icon="mdi-cancel" size="small" variant="text" color="error" @click="confirmarCancelar(item)" v-if="item.estado !== 'cancelado'" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialogoNuevo" max-width="800" persistent>
      <v-card>
        <v-card-title class="text-h5">Nueva Compra</v-card-title>
        <v-card-text>
          <!-- Loading state for catalog data -->
          <v-progress-linear v-if="cargandoCatalogos" indeterminate color="primary" class="mb-3"></v-progress-linear>

          <!-- Error loading catalogs -->
          <v-alert v-if="errorCatalogos" type="error" variant="tonal" closable class="mb-3" @click:close="errorCatalogos = ''">
            {{ errorCatalogos }}
          </v-alert>

          <v-row>
            <v-col cols="12" sm="6">
              <v-autocomplete v-model="nuevoDocumento.proveedor_id" :items="proveedores" item-title="razon_social" item-value="id" label="Proveedor *" variant="outlined" :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron proveedores" />
            </v-col>
            <v-col cols="12" sm="6"><v-select v-model="nuevoDocumento.metodo_pago" :items="metodosPago" label="Método de pago" variant="outlined" /></v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="nuevoDocumento.tipo_concepto"
                :items="[
                  { title: 'Estándar', value: 'estandar' },
                  { title: 'Gasto', value: 'gasto' },
                ]"
                label="Concepto"
                variant="outlined"
                density="compact"
                item-title="title"
                item-value="value"
              />
            </v-col>
            <v-col cols="12" sm="6"><v-select v-model="nuevoDocumento.almacen_id" :items="almacenes" item-title="nombre" item-value="id" label="Almacén" variant="outlined" /></v-col>
          </v-row>
          <v-divider class="my-3" />
          <h4 class="text-h6 mb-2">Artículos</h4>
          <v-row v-for="(linea, i) in nuevoDocumento.articulos" :key="i" class="mb-2" align="center">
            <v-col cols="5">
              <v-autocomplete v-model="linea.articulo_id" :items="articulos" item-title="nombre" item-value="id" label="Artículo" variant="outlined" density="compact" return-object :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron artículos" @update:model-value="sel => { if(sel) { linea.precio_unitario = sel.costo_promedio } }" />
            </v-col>
            <v-col cols="2"><v-text-field v-model="linea.cantidad" label="Cant." type="number" min="1" variant="outlined" density="compact" /></v-col>
            <v-col cols="3"><v-text-field v-model="linea.precio_unitario" label="Costo" type="number" prefix="$" variant="outlined" density="compact" /></v-col>
            <v-col cols="2" class="text-right"><v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="nuevoDocumento.articulos.splice(i, 1)" /></v-col>
          </v-row>
          <v-btn variant="tonal" prepend-icon="mdi-plus" @click="agregarLinea" :disabled="cargandoCatalogos">Agregar artículo</v-btn>
          <v-divider class="my-3" />
          <div class="text-h5 text-right font-weight-bold">Total: ${{ calcularTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer /><v-btn variant="text" @click="cerrarDialogoNuevo">Cancelar</v-btn>
          <v-btn color="success" :loading="guardando" @click="guardar" :disabled="!puedeGuardar || cargandoCatalogos">Crear Compra</v-btn>
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
const compras = ref([]); const proveedores = ref([]); const articulos = ref([]); const almacenes = ref([])
const dialogoNuevo = ref(false); const dialogoConfirmar = ref(false)
const mensajeConfirmacion = ref(''); const accionConfirmarTexto = ref('Aceptar'); const accionConfirmarColor = ref('primary')
let accionPendiente = null
const filtroEstado = ref(null); const filtroFechaDesde = ref(''); const filtroFechaHasta = ref('')
const estados = ['confirmado', 'cancelado']; const metodosPago = ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito']
const snackbar = ref({ show: false, mensaje: '', color: 'success' })
const errorMsg = ref('')
const headers = [
  { title: 'Folio', key: 'folio', sortable: true }, { title: 'Proveedor', key: 'proveedor_nombre', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true }, { title: 'Total', key: 'total', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true }, { title: 'Acciones', key: 'acciones', sortable: false },
]
const nuevoDocumento = ref({ proveedor_id: null, metodo_pago: 'transferencia', almacen_id: null, tipo_concepto: 'estandar', articulos: [] })

function agregarLinea() { nuevoDocumento.value.articulos.push({ articulo_id: null, cantidad: 1, precio_unitario: 0 }) }
function calcularTotal() { return nuevoDocumento.value.articulos.reduce((s, l) => s + (parseFloat(l.cantidad||0) * parseFloat(l.precio_unitario||0)), 0) }
const puedeGuardar = computed(() => nuevoDocumento.value.proveedor_id && nuevoDocumento.value.articulos.length > 0 && nuevoDocumento.value.articulos.every(l => l.articulo_id && l.cantidad > 0))

function cerrarDialogoNuevo() {
  dialogoNuevo.value = false
  nuevoDocumento.value = { proveedor_id: null, metodo_pago: 'transferencia', almacen_id: null, articulos: [] }
  errorCatalogos.value = ''
}

async function abrirDialogoNuevo() {
  dialogoNuevo.value = true
  cargandoCatalogos.value = true
  errorCatalogos.value = ''
  try {
    const [p, a, al] = await Promise.all([
      apiClient.get('/api/v1/entidades', { params: { rol: 'proveedor', limite: 200 } }),
      apiClient.get('/api/v1/articulos', { params: { limite: 200 } }),
      apiClient.get('/api/v1/inventario/almacenes'),
    ])
    proveedores.value = p.data.datos || []
    articulos.value = a.data.datos || []
    almacenes.value = al.data.datos || []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
    errorCatalogos.value = err.response?.data?.error || 'Error al cargar datos. Verifique la conexión con el servidor.'
    snackbar.value = { show: true, mensaje: 'Error al cargar catálogos', color: 'error' }
  } finally {
    cargandoCatalogos.value = false
  }
}

async function cargarDatos() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = { tipo: 'compra' }
    if (filtroEstado.value) params.estado = filtroEstado.value
    if (filtroFechaDesde.value) params.fecha_desde = filtroFechaDesde.value
    if (filtroFechaHasta.value) params.fecha_hasta = filtroFechaHasta.value
    const r = await apiClient.get('/api/v1/transacciones', { params })
    compras.value = r.data || []
  } catch (err) {
    console.error('Error al cargar compras:', err)
    errorMsg.value = err.response?.data?.error || 'Error al cargar datos. Verifique la conexión con el servidor.'
    snackbar.value = { show: true, mensaje: 'Error al cargar datos', color: 'error' }
  } finally {
    loading.value = false
  }
}

async function guardar() {
  guardando.value = true
  try {
    await apiClient.post('/api/v1/transacciones', {
      tipo: 'compra', entidad_proveedor_id: nuevoDocumento.value.proveedor_id,
      metodo_pago: nuevoDocumento.value.metodo_pago, almacen_id: nuevoDocumento.value.almacen_id,
      tipo_concepto: nuevoDocumento.value.tipo_concepto || 'estandar',
      articulos: nuevoDocumento.value.articulos.map(l => ({ articulo_id: l.articulo_id?.id||l.articulo_id, cantidad: parseFloat(l.cantidad), precio_unitario: parseFloat(l.precio_unitario) })),
    })
    snackbar.value = { show: true, mensaje: 'Compra creada', color: 'success' }
    cerrarDialogoNuevo()
    await cargarDatos()
  } catch (err) { snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error', color: 'error' } }
  finally { guardando.value = false }
}

function verDetalle(item) { router.push(`/dashboard/compras/${item.id}`) }
function confirmarCancelar(item) {
  mensajeConfirmacion.value = `¿Cancelar ${item.folio}? Se revertirá inventario.`
  accionConfirmarTexto.value = 'Cancelar'; accionConfirmarColor.value = 'error'
  accionPendiente = async () => {
    try {
      await apiClient.post(`/api/v1/transacciones/${item.id}/cancelar`)
      snackbar.value = { show: true, mensaje: 'Cancelado', color: 'success' }; await cargarDatos()
    } catch (err) { snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error', color: 'error' } }
  }
  dialogoConfirmar.value = true
}
function ejecutarAccion() { if (accionPendiente) accionPendiente(); dialogoConfirmar.value = false }

onMounted(() => cargarDatos())
</script>
