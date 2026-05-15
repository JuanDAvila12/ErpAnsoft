<template>
  <v-container fluid>
    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon size="36" color="success" class="mr-3">mdi-file-document</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Órdenes de Compra</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Gestión de órdenes de compra a proveedores</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="success" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogoNuevo()">
          Nueva Orden
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" sm="4" md="3">
            <v-text-field
              v-model="filtros.estado"
              label="Estado"
              placeholder="confirmado, cancelado..."
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4" md="3">
            <v-text-field
              v-model="filtros.proveedor"
              label="ID Proveedor"
              placeholder="Filtrar por ID de proveedor"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4" md="3">
            <v-btn variant="outlined" prepend-icon="mdi-filter" @click="cargarDatos()" class="mr-2">
              Filtrar
            </v-btn>
            <v-btn variant="text" prepend-icon="mdi-refresh" @click="limpiarFiltros()">
              Limpiar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-card variant="outlined">
      <v-data-table
        :headers="columnas"
        :items="documentos"
        :loading="loading"
        loading-text="Cargando órdenes de compra..."
        :items-per-page="20"
        :footer-props="{ 'items-per-page-options': [10, 20, 50, 100] }"
        class="elevation-0"
        @click:row="irADetalle"
      >
        <template v-slot:item.folio="{ item }">
          <strong>{{ item.folio }}</strong>
        </template>
        <template v-slot:item.proveedor_nombre="{ item }">
          {{ item.proveedor_nombre || '—' }}
        </template>
        <template v-slot:item.total="{ item }">
          ${{ Number(item.total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
        <template v-slot:item.fecha="{ item }">
          {{ new Date(item.fecha).toLocaleDateString('es-MX') }}
        </template>
        <template v-slot:item.estado="{ item }">
          <v-chip
            :color="item.estado === 'confirmado' ? 'success' : item.estado === 'cancelado' ? 'error' : 'warning'"
            size="small"
            variant="tonal"
          >
            {{ item.estado }}
          </v-chip>
        </template>
        <template v-slot:item.acciones="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click.stop="irADetalle(item)">
            <v-icon>mdi-eye</v-icon>
            <v-tooltip activator="parent" location="bottom">Ver detalle</v-tooltip>
          </v-btn>
          <v-btn
            v-if="item.estado === 'confirmado' && item.tipo === 'orden_compra'"
            icon size="small" variant="text" color="success"
            @click.stop="convertirACompra(item)"
          >
            <v-icon>mdi-arrow-decision</v-icon>
            <v-tooltip activator="parent" location="bottom">Convertir a Compra</v-tooltip>
          </v-btn>
          <v-btn
            v-if="item.estado === 'confirmado'"
            icon size="small" variant="text" color="error"
            @click.stop="confirmarCancelar(item)"
          >
            <v-icon>mdi-cancel</v-icon>
            <v-tooltip activator="parent" location="bottom">Cancelar</v-tooltip>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo Nueva Orden de Compra -->
    <v-dialog v-model="dialogoNuevo" max-width="800px" persistent scrollable>
      <v-card>
        <v-card-title class="text-h5 bg-success text-white pa-4">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Nueva Orden de Compra
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form ref="formNuevo">
            <v-row>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="nuevoDocumento.proveedor_entidad_id"
                  :items="proveedores"
                  item-title="razon_social"
                  item-value="id"
                  label="Proveedor *"
                  variant="outlined"
                  density="compact"
                  :loading="buscandoProveedores"
                  :search-input.sync="busquedaProveedor"
                  @update:search="buscarProveedores"
                  required
                  clearable
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.rfc" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="nuevoDocumento.almacen_id"
                  :items="almacenes"
                  item-title="nombre"
                  item-value="id"
                  label="Almacén"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="nuevoDocumento.metodo_pago"
                  :items="metodosPago"
                  label="Método de Pago"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="nuevoDocumento.terminos_pago_id"
                  :items="terminosPago"
                  item-title="nombre"
                  item-value="id"
                  label="Términos de Pago"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>

            <v-divider class="my-3" />

            <h4 class="text-subtitle-1 font-weight-bold mb-2">Artículos</h4>
            <v-row v-for="(art, idx) in nuevoDocumento.articulos" :key="idx" class="mb-2" align="center">
              <v-col cols="5">
                <v-autocomplete
                  v-model="art.articulo_id"
                  :items="articulos"
                  item-title="nombre"
                  item-value="id"
                  label="Artículo *"
                  variant="outlined"
                  density="compact"
                  :loading="buscandoArticulos"
                  :search-input.sync="busquedaArticulo"
                  @update:search="buscarArticulos"
                  hide-details
                  clearable
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="`SKU: ${item.raw.sku} | Costo: $${Number(item.raw.costo_promedio).toFixed(2)}`" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="2">
                <v-text-field
                  v-model.number="art.cantidad"
                  label="Cant."
                  type="number"
                  variant="outlined"
                  density="compact"
                  min="0"
                  step="0.01"
                  hide-details
                />
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model.number="art.precio_unitario"
                  label="Precio Unit."
                  type="number"
                  variant="outlined"
                  density="compact"
                  min="0"
                  step="0.01"
                  hide-details
                  :suffix="'$'"
                />
              </v-col>
              <v-col cols="1" class="text-center">
                <v-btn icon size="small" color="error" variant="text" @click="eliminarArticulo(idx)">
                  <v-icon>mdi-close-circle</v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <v-btn
              variant="outlined"
              size="small"
              prepend-icon="mdi-plus"
              @click="agregarArticulo"
              class="mt-2"
            >
              Agregar Artículo
            </v-btn>

            <v-divider class="my-3" />

            <v-row>
              <v-col cols="12" class="text-right">
                <h3 class="text-h6 font-weight-bold">
                  Total: ${{ calcularTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
                </h3>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoNuevo = false">Cancelar</v-btn>
          <v-btn color="success" prepend-icon="mdi-content-save" :loading="guardando" @click="guardarNuevo">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de confirmación de cancelación -->
    <v-dialog v-model="dialogoCancelar" max-width="400px">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white pa-4">
          <v-icon class="mr-2">mdi-alert-circle</v-icon>
          Confirmar Cancelación
        </v-card-title>
        <v-card-text class="pa-4">
          <p>¿Estás seguro de cancelar el documento <strong>{{ documentoACancelar?.folio }}</strong>?</p>
          <p class="text-caption text-medium-emphasis">Esta acción no se puede deshacer.</p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoCancelar = false">No</v-btn>
          <v-btn color="error" :loading="cancelando" @click="cancelarDocumento">Sí, Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const loading = ref(false)
const guardando = ref(false)
const cancelando = ref(false)
const documentos = ref([])
const proveedores = ref([])
const almacenes = ref([])
const terminosPago = ref([])
const articulos = ref([])
const buscandoProveedores = ref(false)
const buscandoArticulos = ref(false)
const busquedaProveedor = ref('')
const busquedaArticulo = ref('')
const dialogoNuevo = ref(false)
const dialogoCancelar = ref(false)
const documentoACancelar = ref(null)

const metodosPago = ['efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito']

const filtros = ref({
  estado: '',
  proveedor: '',
})

const snackbar = ref({ show: false, text: '', color: 'success' })

const columnas = [
  { title: 'Folio', key: 'folio', sortable: true },
  { title: 'Proveedor', key: 'proveedor_nombre', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Total', key: 'total', sortable: true, align: 'end' },
  { title: 'Estado', key: 'estado', sortable: true },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center', width: '120px' },
]

const nuevoDocumento = ref({
  proveedor_entidad_id: null,
  almacen_id: null,
  metodo_pago: 'efectivo',
  terminos_pago_id: null,
  articulos: [{ articulo_id: null, cantidad: 1, precio_unitario: null }],
})

function agregarArticulo() {
  nuevoDocumento.value.articulos.push({ articulo_id: null, cantidad: 1, precio_unitario: null })
}

function eliminarArticulo(idx) {
  if (nuevoDocumento.value.articulos.length > 1) {
    nuevoDocumento.value.articulos.splice(idx, 1)
  }
}

function calcularTotal() {
  let total = 0
  for (const art of nuevoDocumento.value.articulos) {
    if (art.cantidad && art.precio_unitario) {
      total += art.cantidad * art.precio_unitario
    }
  }
  return total
}

async function buscarProveedores(query) {
  if (!query || query.length < 2) return
  buscandoProveedores.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/api/v1/entidades?rol=proveedor&search=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    proveedores.value = res.data.datos || []
  } catch (err) {
    console.error('Error al buscar proveedores:', err)
  } finally {
    buscandoProveedores.value = false
  }
}

async function buscarArticulos(query) {
  if (!query || query.length < 1) return
  buscandoArticulos.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/api/v1/articulos?search=${encodeURIComponent(query)}&limite=20`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    articulos.value = res.data.datos || []
  } catch (err) {
    console.error('Error al buscar artículos:', err)
  } finally {
    buscandoArticulos.value = false
  }
}

async function cargarCatalogos() {
  const token = localStorage.getItem('token')
  try {
    const [almRes, tpRes] = await Promise.all([
      axios.get('/api/v1/inventario/almacenes', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/catalogos/terminos-pago', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    almacenes.value = almRes.data?.datos || almRes.data || []
    terminosPago.value = tpRes.data?.datos || tpRes.data || []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
  }
}

async function cargarDatos() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = { tipo: 'orden_compra' }
    if (filtros.value.estado) params.estado = filtros.value.estado
    if (filtros.value.proveedor) params.entidad_proveedor_id = filtros.value.proveedor

    const res = await axios.get('/api/v1/transacciones', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    documentos.value = res.data?.datos || res.data || []
  } catch (err) {
    console.error('Error al cargar órdenes de compra:', err)
    snackbar.value = { show: true, text: 'Error al cargar órdenes de compra', color: 'error' }
  } finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  filtros.value = { estado: '', proveedor: '' }
  cargarDatos()
}

function abrirDialogoNuevo() {
  nuevoDocumento.value = {
    proveedor_entidad_id: null,
    almacen_id: null,
    metodo_pago: 'efectivo',
    terminos_pago_id: null,
    articulos: [{ articulo_id: null, cantidad: 1, precio_unitario: null }],
  }
  dialogoNuevo.value = true
}

async function guardarNuevo() {
  if (!nuevoDocumento.value.proveedor_entidad_id) {
    snackbar.value = { show: true, text: 'Seleccione un proveedor', color: 'warning' }
    return
  }
  if (!nuevoDocumento.value.articulos.length || !nuevoDocumento.value.articulos[0].articulo_id) {
    snackbar.value = { show: true, text: 'Agregue al menos un artículo', color: 'warning' }
    return
  }

  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    const payload = {
      tipo: 'orden_compra',
      proveedor_entidad_id: nuevoDocumento.value.proveedor_entidad_id,
      almacen_id: nuevoDocumento.value.almacen_id,
      metodo_pago: nuevoDocumento.value.metodo_pago,
      terminos_pago_id: nuevoDocumento.value.terminos_pago_id,
      articulos: nuevoDocumento.value.articulos.map(a => ({
        articulo_id: a.articulo_id,
        cantidad: a.cantidad,
        precio_unitario: a.precio_unitario,
      })),
    }

    await axios.post('/api/v1/transacciones', payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    dialogoNuevo.value = false
    snackbar.value = { show: true, text: 'Orden de compra creada exitosamente', color: 'success' }
    await cargarDatos()
  } catch (err) {
    console.error('Error al crear orden de compra:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al crear orden de compra', color: 'error' }
  } finally {
    guardando.value = false
  }
}

function irADetalle(item) {
  router.push(`/dashboard/compras/${item.id}`)
}

function confirmarCancelar(item) {
  documentoACancelar.value = item
  dialogoCancelar.value = true
}

async function cancelarDocumento() {
  if (!documentoACancelar.value) return
  cancelando.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(`/api/v1/transacciones/${documentoACancelar.value.id}/cancelar`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    dialogoCancelar.value = false
    snackbar.value = { show: true, text: 'Documento cancelado exitosamente', color: 'success' }
    await cargarDatos()
  } catch (err) {
    console.error('Error al cancelar:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al cancelar', color: 'error' }
  } finally {
    cancelando.value = false
  }
}

async function convertirACompra(item) {
  try {
    const token = localStorage.getItem('token')
    await axios.post(`/api/v1/transacciones/convertir/${item.id}`, { nuevo_tipo: 'compra' }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    snackbar.value = { show: true, text: 'Orden convertida a compra exitosamente', color: 'success' }
    await cargarDatos()
  } catch (err) {
    console.error('Error al convertir:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al convertir', color: 'error' }
  }
}

onMounted(() => {
  cargarDatos()
  cargarCatalogos()
})
</script>
