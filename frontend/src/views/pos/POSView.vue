<template>
  <div class="pos-container">
    <v-row>
      <!-- Columna izquierda: Búsqueda y productos -->
      <v-col cols="12" md="7">
        <div class="d-flex align-center mb-4">
          <v-icon color="orange" size="36" class="mr-3">mdi-cash-register</v-icon>
          <h2 class="text-h4 font-weight-bold mb-0">Punto de Venta</h2>
        </div>

        <!-- Buscador de productos -->
        <v-card variant="tonal" class="pa-4 mb-4">
          <v-autocomplete
            v-model="productoSeleccionado"
            :items="productos"
            item-title="nombre"
            item-value="id"
            label="Buscar producto por nombre, SKU o código de barras"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-no-data
            @update:search="onBuscarProducto"
            @update:model-value="agregarAlCarrito"
            return-object
          >
            <template v-slot:item="{ item, props }">
              <v-list-item v-bind="props" :subtitle="`SKU: ${item.raw.sku} | $${(item.raw.precio_venta || 0).toFixed(2)}`">
                <template v-slot:append>
                  <v-chip size="small" :color="item.raw.stock_actual > 0 ? 'success' : 'error'" variant="tonal">
                    {{ item.raw.stock_actual || 0 }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
        </v-card>

        <!-- Resultados de búsqueda rápida -->
        <v-row v-if="productos.length > 0" class="mb-4">
          <v-col
            v-for="(prod, i) in productos.slice(0, 8)"
            :key="i"
            cols="6"
            sm="4"
            md="3"
          >
            <v-card
              variant="tonal"
              color="primary"
              hover
              class="pa-3 text-center"
              @click="agregarAlCarrito(prod)"
            >
              <v-icon size="32" class="mb-1">mdi-package</v-icon>
              <div class="text-caption font-weight-bold text-truncate">{{ prod.nombre }}</div>
              <div class="text-body-2 font-weight-bold">${{ (prod.precio_venta || 0).toFixed(2) }}</div>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <!-- Columna derecha: Carrito -->
      <v-col cols="12" md="5">
        <v-card variant="tonal" class="pa-4 h-100 d-flex flex-column">
          <h3 class="text-h6 mb-3">
            <v-icon class="mr-2">mdi-cart</v-icon>
            Carrito ({{ carrito.length }})
          </h3>

          <!-- Selector de cliente -->
          <v-autocomplete
            v-model="clienteSeleccionado"
            :items="clientes"
            item-title="razon_social"
            item-value="id"
            label="Cliente (opcional)"
            variant="outlined"
            density="compact"
            clearable
            return-object
            class="mb-3"
            prepend-inner-icon="mdi-account"
          />

          <!-- Selector de método de pago -->
          <v-select
            v-model="metodoPago"
            :items="metodosPago"
            label="Método de pago"
            variant="outlined"
            density="compact"
            class="mb-3"
            prepend-inner-icon="mdi-credit-card"
          />

          <!-- Lista del carrito -->
          <v-list class="flex-grow-1 overflow-auto" style="max-height: 350px;">
            <v-list-item
              v-for="(item, i) in carrito"
              :key="i"
              class="mb-1"
              color="grey-lighten-3"
            >
              <template v-slot:prepend>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  color="error"
                  variant="text"
                  @click="eliminarDelCarrito(i)"
                />
              </template>

              <v-list-item-title class="text-body-2 font-weight-bold">
                {{ item.nombre }}
              </v-list-item-title>

              <template v-slot:append>
                <div class="d-flex align-center ga-2">
                  <v-btn
                    icon="mdi-minus"
                    size="x-small"
                    variant="tonal"
                    @click="disminuirCantidad(i)"
                    :disabled="item.cantidad <= 1"
                  />
                  <span class="text-body-1 font-weight-bold mx-2">{{ item.cantidad }}</span>
                  <v-btn
                    icon="mdi-plus"
                    size="x-small"
                    variant="tonal"
                    @click="aumentarCantidad(i)"
                  />
                  <span class="text-body-1 font-weight-bold ml-3" style="min-width: 80px; text-align: right;">
                    ${{ (item.subtotal || 0).toFixed(2) }}
                  </span>
                </div>
              </template>
            </v-list-item>
          </v-list>

          <v-divider class="my-3" />

          <!-- Totales -->
          <div class="d-flex justify-space-between text-h5 font-weight-bold mb-4">
            <span>Total:</span>
            <span>${{ total.toFixed(2) }}</span>
          </div>

          <!-- Botón Cobrar -->
          <v-btn
            color="success"
            size="x-large"
            block
            :disabled="carrito.length === 0"
            :loading="cobrando"
            @click="cobrar"
          >
            <v-icon start size="28">mdi-cash</v-icon>
            Cobrar - ${{ total.toFixed(2) }}
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

// Estado
const busquedaProducto = ref('')
const productos = ref([])
const productoSeleccionado = ref(null)
const carrito = ref([])
const clientes = ref([])
const clienteSeleccionado = ref(null)
const metodoPago = ref('efectivo')
const cobrando = ref(false)

const metodosPago = [
  { title: 'Efectivo', value: 'efectivo' },
  { title: 'Tarjeta de Débito', value: 'tarjeta_debito' },
  { title: 'Tarjeta de Crédito', value: 'tarjeta_credito' },
  { title: 'Transferencia', value: 'transferencia' },
]

const snackbar = ref({
  show: false,
  mensaje: '',
  color: 'success',
})

// Total del carrito
const total = computed(() => {
  return carrito.value.reduce((sum, item) => sum + (item.subtotal || 0), 0)
})

// Buscar productos
let timeoutBusqueda = null
function onBuscarProducto(val) {
  busquedaProducto.value = val
  clearTimeout(timeoutBusqueda)
  timeoutBusqueda = setTimeout(() => {
    buscarProductos(val)
  }, 300)
}

async function buscarProductos(search = '') {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`/api/v1/articulos?search=${encodeURIComponent(search)}&limite=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    productos.value = response.data.datos || []
  } catch (err) {
    console.error('Error al buscar productos:', err)
  }
}

// Cargar clientes al montar
async function cargarClientes() {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/v1/entidades?rol=cliente', {
      headers: { Authorization: `Bearer ${token}` },
    })
    clientes.value = response.data.datos || []
  } catch (err) {
    console.error('Error al cargar clientes:', err)
  }
}

// Cargar productos iniciales
async function cargarProductosIniciales() {
  await buscarProductos('')
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
  if (!producto) return

  const existente = carrito.value.find(item => item.id === producto.id)
  if (existente) {
    existente.cantidad += 1
    existente.subtotal = existente.cantidad * parseFloat(producto.precio_venta || 0)
  } else {
    carrito.value.push({
      id: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      cantidad: 1,
      precio_venta: parseFloat(producto.precio_venta || 0),
      subtotal: parseFloat(producto.precio_venta || 0),
    })
  }
  productoSeleccionado.value = null
}

function eliminarDelCarrito(index) {
  carrito.value.splice(index, 1)
}

function aumentarCantidad(index) {
  const item = carrito.value[index]
  item.cantidad += 1
  item.subtotal = item.cantidad * item.precio_venta
}

function disminuirCantidad(index) {
  const item = carrito.value[index]
  if (item.cantidad > 1) {
    item.cantidad -= 1
    item.subtotal = item.cantidad * item.precio_venta
  }
}

// Cobrar
async function cobrar() {
  cobrando.value = true
  try {
    const token = localStorage.getItem('token')

    const payload = {
      tipo: 'venta',
      metodo_pago: metodoPago.value,
      articulos: carrito.value.map(item => ({
        articulo_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
      })),
    }

    if (clienteSeleccionado.value) {
      payload.entidad_cliente_id = clienteSeleccionado.value.id
    }

    const response = await axios.post('/api/v1/documentos-venta', payload, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const { datos } = response.data
    snackbar.value = {
      show: true,
      mensaje: `Venta registrada exitosamente. Folio: ${datos?.folio || 'N/A'}`,
      color: 'success',
    }

    // Limpiar carrito después de cobrar exitosamente
    carrito.value = []
    clienteSeleccionado.value = null
    metodoPago.value = 'efectivo'
  } catch (err) {
    snackbar.value = {
      show: true,
      mensaje: err.response?.data?.mensaje || 'Error al procesar la venta',
      color: 'error',
    }
  } finally {
    cobrando.value = false
  }
}

// Inicializar
cargarClientes()
cargarProductosIniciales()
</script>

<style lang="scss" scoped>
.pos-container {
  height: 100%;

  .overflow-auto {
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.1);
      border-radius: 3px;
    }
  }
}
</style>
