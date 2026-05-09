<template>
  <v-app-bar color="primary" density="compact" elevation="2">
    <template v-slot:prepend>
      <v-icon class="ml-4">mdi-cart-plus</v-icon>
    </template>

    <v-app-bar-title>
      SPI ERP - Nueva Venta
    </v-app-bar-title>

    <template v-slot:append>
      <v-chip class="mr-2" color="white" variant="text" prepend-icon="mdi-account">
        {{ usuario?.nombre || 'Usuario' }}
      </v-chip>
      <v-btn icon @click="irAlDashboard" class="mr-2">
        <v-icon>mdi-view-dashboard</v-icon>
        <v-tooltip activator="parent" location="bottom">Dashboard</v-tooltip>
      </v-btn>
      <v-btn icon @click="handleLogout" class="mr-2">
        <v-icon>mdi-logout</v-icon>
        <v-tooltip activator="parent" location="bottom">Cerrar sesión</v-tooltip>
      </v-btn>
    </template>
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-6">
      <v-row>
        <!-- Columna izquierda: Formulario -->
        <v-col cols="12" md="8">
          <v-card>
            <v-card-title class="d-flex align-center pa-4">
              <v-icon class="mr-2">mdi-cart-outline</v-icon>
              <span class="text-h6">Registrar Venta</span>
            </v-card-title>

            <v-card-text>
              <!-- Selección de artículo -->
              <v-row>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="articuloSeleccionado"
                    :items="articulos"
                    item-title="nombreCompleto"
                    item-value="id"
                    label="Seleccionar Artículo"
                    variant="outlined"
                    density="compact"
                    return-object
                    clearable
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item
                        v-bind="props"
                        :subtitle="`SKU: ${item.raw.sku} | Stock: ${item.raw.stock_actual} | Precio: $${formatNumber(item.raw.precio_venta)}`"
                      />
                    </template>
                  </v-select>
                </v-col>

                <v-col cols="12" sm="3">
                  <v-text-field
                    v-model="cantidad"
                    label="Cantidad"
                    type="number"
                    variant="outlined"
                    density="compact"
                    min="1"
                    :max="articuloSeleccionado?.stock_actual || 1"
                  />
                </v-col>

                <v-col cols="12" sm="3" class="d-flex align-center">
                  <v-btn
                    color="primary"
                    variant="flat"
                    @click="agregarArticulo"
                    :disabled="!articuloSeleccionado || !cantidad || cantidad <= 0"
                    block
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Agregar
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Selector de método de pago -->
              <v-row class="mt-2">
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="metodoPago"
                    :items="metodosPago"
                    label="Método de Pago"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>

              <!-- Tabla de artículos agregados -->
              <v-card-title class="px-0 pt-4 pb-2">
                <span class="text-subtitle-1">Artículos en la venta</span>
              </v-card-title>

              <v-data-table
                :headers="headersDetalle"
                :items="detalleVenta"
                no-data-text="No hay artículos agregados"
                class="elevation-1"
                hover
              >
                <template v-slot:item.precio_unitario="{ item }">
                  ${{ formatNumber(item.precio_unitario) }}
                </template>

                <template v-slot:item.subtotal="{ item }">
                  ${{ formatNumber(item.subtotal) }}
                </template>

                <template v-slot:item.acciones="{ item }">
                  <v-btn
                    icon
                    size="small"
                    color="error"
                    variant="text"
                    @click="eliminarArticulo(item)"
                  >
                    <v-icon>mdi-delete</v-icon>
                    <v-tooltip activator="parent" location="bottom">Eliminar</v-tooltip>
                  </v-btn>
                </template>
              </v-data-table>
            </v-card-text>

            <v-card-actions class="pa-4">
              <v-spacer />
              <v-btn
                variant="outlined"
                @click="limpiarFormulario"
              >
                Limpiar
              </v-btn>
              <v-btn
                color="success"
                variant="flat"
                :loading="cargando"
                :disabled="detalleVenta.length === 0"
                @click="registrarVenta"
              >
                <v-icon start>mdi-cash-register</v-icon>
                Registrar Venta
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Columna derecha: Resumen -->
        <v-col cols="12" md="4">
          <v-card color="primary" variant="tonal">
            <v-card-title class="text-h6">
              <v-icon class="mr-2">mdi-receipt</v-icon>
              Resumen de Venta
            </v-card-title>

            <v-card-text>
              <v-list>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-package-variant</v-icon>
                  </template>
                  <v-list-item-title>Artículos</v-list-item-title>
                  <v-list-item-subtitle class="text-h6">
                    {{ totalArticulos }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-currency-usd</v-icon>
                  </template>
                  <v-list-item-title>Subtotal</v-list-item-title>
                  <v-list-item-subtitle class="text-h6">
                    ${{ formatNumber(subtotal) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-percent</v-icon>
                  </template>
                  <v-list-item-title>IVA (16%)</v-list-item-title>
                  <v-list-item-subtitle class="text-h6">
                    ${{ formatNumber(iva) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-cash-check</v-icon>
                  </template>
                  <v-list-item-title class="text-h6 font-weight-bold">Total</v-list-item-title>
                  <v-list-item-subtitle class="text-h5 font-weight-bold text-success">
                    ${{ formatNumber(total) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Resultado de la venta -->
          <v-card v-if="ventaRegistrada" class="mt-4" color="success" variant="tonal">
            <v-card-title class="text-h6">
              <v-icon class="mr-2">mdi-check-circle</v-icon>
              Venta Registrada
            </v-card-title>
            <v-card-text>
              <p><strong>Folio:</strong> {{ ventaRegistrada.folio }}</p>
              <p><strong>Total:</strong> ${{ formatNumber(ventaRegistrada.total) }}</p>
              <p><strong>Fecha:</strong> {{ formatDate(ventaRegistrada.fecha) }}</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Snackbar de notificación -->
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        :timeout="3000"
      >
        {{ snackbar.mensaje }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const usuario = ref(JSON.parse(localStorage.getItem('usuario') || '{}'))
const articulos = ref([])
const articuloSeleccionado = ref(null)
const cantidad = ref(1)
const metodoPago = ref('efectivo')
const detalleVenta = ref([])
const cargando = ref(false)
const ventaRegistrada = ref(null)

const metodosPago = [
  { title: 'Efectivo', value: 'efectivo' },
  { title: 'Tarjeta de Débito', value: 'tarjeta_debito' },
  { title: 'Tarjeta de Crédito', value: 'tarjeta_credito' },
  { title: 'Transferencia', value: 'transferencia' },
]

const headersDetalle = [
  { title: 'Artículo', key: 'nombre', sortable: true },
  { title: 'SKU', key: 'sku', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true },
  { title: 'Precio Unitario', key: 'precio_unitario', sortable: true },
  { title: 'Subtotal', key: 'subtotal', sortable: true },
  { title: 'Acciones', key: 'acciones', sortable: false },
]

const snackbar = ref({
  show: false,
  mensaje: '',
  color: 'success',
})

// Cálculos del resumen
const totalArticulos = computed(() =>
  detalleVenta.value.reduce((sum, item) => sum + item.cantidad, 0)
)

const subtotal = computed(() =>
  detalleVenta.value.reduce((sum, item) => sum + item.subtotal, 0)
)

const iva = computed(() => subtotal.value * 0.16)

const total = computed(() => subtotal.value + iva.value)

function formatNumber(value) {
  return Number(value).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function agregarArticulo() {
  if (!articuloSeleccionado.value || !cantidad.value || cantidad.value <= 0) return

  const existente = detalleVenta.value.find(
    (item) => item.articulo_id === articuloSeleccionado.value.id
  )

  if (existente) {
    existente.cantidad += parseInt(cantidad.value)
    existente.subtotal = existente.cantidad * existente.precio_unitario
  } else {
    detalleVenta.value.push({
      articulo_id: articuloSeleccionado.value.id,
      nombre: articuloSeleccionado.value.nombre,
      sku: articuloSeleccionado.value.sku,
      cantidad: parseInt(cantidad.value),
      precio_unitario: parseFloat(articuloSeleccionado.value.precio_venta),
      subtotal: parseInt(cantidad.value) * parseFloat(articuloSeleccionado.value.precio_venta),
    })
  }

  articuloSeleccionado.value = null
  cantidad.value = 1
}

function eliminarArticulo(item) {
  detalleVenta.value = detalleVenta.value.filter(
    (i) => i.articulo_id !== item.articulo_id
  )
}

function limpiarFormulario() {
  detalleVenta.value = []
  articuloSeleccionado.value = null
  cantidad.value = 1
  metodoPago.value = 'efectivo'
  ventaRegistrada.value = null
}

async function registrarVenta() {
  if (detalleVenta.value.length === 0) return

  cargando.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.post(
      '/api/v1/ventas',
      {
        metodo_pago: metodoPago.value,
        articulos: detalleVenta.value.map((item) => ({
          articulo_id: item.articulo_id,
          cantidad: item.cantidad,
        })),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    ventaRegistrada.value = response.data.datos
    snackbar.value = {
      show: true,
      mensaje: `Venta registrada exitosamente - Folio: ${response.data.datos.folio}`,
      color: 'success',
    }

    // Limpiar el formulario después de registrar
    detalleVenta.value = []
    articuloSeleccionado.value = null
    cantidad.value = 1
  } catch (err) {
    console.error('Error al registrar venta:', err)
    snackbar.value = {
      show: true,
      mensaje: err.response?.data?.mensaje || 'Error al registrar la venta',
      color: 'error',
    }
    if (err.response && err.response.status === 401) {
      handleLogout()
    }
  } finally {
    cargando.value = false
  }
}

async function cargarArticulos() {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/v1/inventario', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    articulos.value = response.data.datos.map((art) => ({
      ...art,
      nombreCompleto: `${art.nombre} (${art.sku})`,
    }))
  } catch (err) {
    console.error('Error al cargar artículos:', err)
    if (err.response && err.response.status === 401) {
      handleLogout()
    }
  }
}

function irAlDashboard() {
  router.push('/dashboard')
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  router.push('/login')
}

onMounted(() => {
  cargarArticulos()
})
</script>

<style lang="scss" scoped>
</style>
