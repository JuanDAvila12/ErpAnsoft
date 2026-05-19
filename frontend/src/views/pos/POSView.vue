<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="green" size="36" class="mr-3">mdi-cart</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Punto de Venta (POS)</h2>
    </div>
    <v-row>
      <v-col cols="12" md="7">
        <v-card variant="tonal" class="pa-4 mb-4">
          <v-text-field v-model="busqueda" label="Buscar producto (nombre, SKU, código de barras)" variant="outlined" density="compact" clearable @keyup.enter="agregarProductoBuscado" />
          <v-row>
            <v-col v-for="art in articulosFiltrados" :key="art.id" cols="6" sm="4">
              <v-card variant="outlined" class="pa-2 text-center" hover @click="agregarAlCarrito(art)">
                <div class="text-caption font-weight-bold">{{ art.nombre }}</div>
                <div class="text-h6 font-weight-bold text-primary">${{ (art.precio_venta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
                <div class="text-caption">Stock: {{ art.stock_actual || 0 }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card variant="tonal" class="pa-4">
          <v-card-title class="text-h5">Carrito</v-card-title>
          <v-list v-if="carrito.length">
            <v-list-item v-for="(item, i) in carrito" :key="i">
              <template v-slot:prepend>
                <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="carrito.splice(i, 1)" />
              </template>
              <v-list-item-title>{{ item.nombre }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-row dense align="center">
                  <v-col cols="4"><v-text-field v-model="item.cantidad" label="Cant" type="number" min="1" variant="outlined" density="compact" hide-details /></v-col>
                  <v-col cols="4">${{ (item.precio_venta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</v-col>
                  <v-col cols="4" class="text-right">${{ (item.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</v-col>
                </v-row>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-divider class="my-3" />
          <div class="text-h4 text-right font-weight-bold mb-4">Total: ${{ totalCarrito.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
          <v-row>
            <v-col cols="12"><v-autocomplete v-model="clienteId" :items="clientes" item-title="razon_social" item-value="id" label="Cliente (opcional)" variant="outlined" density="compact" clearable /></v-col>
            <v-col cols="12"><v-select v-model="metodoPago" :items="metodosPago" label="Método de pago" variant="outlined" density="compact" /></v-col>
            <v-col cols="12"><v-text-field v-model="montoRecibido" label="Monto recibido" type="number" prefix="$" variant="outlined" density="compact" /></v-col>
            <v-col cols="12" class="text-h5 text-right">Cambio: ${{ cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</v-col>
            <v-col cols="12">
              <v-btn color="success" size="large" block :loading="cobrando" @click="cobrar" :disabled="carrito.length === 0">
                <v-icon start>mdi-cash</v-icon> Cobrar (${{ totalCarrito.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }})
              </v-btn>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialogoResumen" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Venta Completada</v-card-title>
        <v-card-text>
          <p><strong>Folio:</strong> {{ ultimaVenta?.folio }}</p>
          <p><strong>Total:</strong> ${{ (ultimaVenta?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</p>
          <p><strong>Método de pago:</strong> {{ metodoPago }}</p>
          <v-divider class="my-2" />
          <h4>Artículos:</h4>
          <v-list density="compact">
            <v-list-item v-for="art in ultimaVenta?.articulos || []" :key="art.id">
              <v-list-item-title>{{ art.articulo_nombre }} x {{ art.cantidad }} = ${{ (art.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogoResumen = false; limpiarCarrito()">Cerrar</v-btn>
          <v-btn color="primary" variant="tonal" @click="imprimirResumen">Imprimir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const busqueda = ref('')
const articulos = ref([])
const clientes = ref([])
const carrito = ref([])
const clienteId = ref(null)
const metodoPago = ref('efectivo')
const montoRecibido = ref(0)
const cobrando = ref(false)
const dialogoResumen = ref(false)
const ultimaVenta = ref(null)
const metodosPago = ['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia']
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const articulosFiltrados = computed(() => {
  if (!busqueda.value) return articulos.value.slice(0, 12)
  const q = busqueda.value.toLowerCase()
  return articulos.value.filter(a => a.nombre?.toLowerCase().includes(q) || a.sku?.toLowerCase().includes(q))
})

const totalCarrito = computed(() => {
  return carrito.value.reduce((s, item) => {
    item.subtotal = (parseFloat(item.cantidad || 1) * parseFloat(item.precio_venta || 0))
    return s + item.subtotal
  }, 0)
})

const cambio = computed(() => {
  return Math.max(0, parseFloat(montoRecibido.value || 0) - totalCarrito.value)
})

function agregarAlCarrito(art) {
  const existente = carrito.value.find(i => i.id === art.id)
  if (existente) {
    existente.cantidad = parseInt(existente.cantidad || 1) + 1
  } else {
    carrito.value.push({ ...art, cantidad: 1, subtotal: art.precio_venta })
  }
}

function agregarProductoBuscado() {
  if (articulosFiltrados.value.length === 1) {
    agregarAlCarrito(articulosFiltrados.value[0])
    busqueda.value = ''
  }
}

function limpiarCarrito() {
  carrito.value = []; clienteId.value = null; montoRecibido.value = 0
}

async function cobrar() {
  if (carrito.value.length === 0) return
  cobrando.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await axios.post('/api/v1/transacciones', {
      tipo: 'venta',
      entidad_cliente_id: clienteId.value,
      metodo_pago: metodoPago.value,
      articulos: carrito.value.map(item => ({
        articulo_id: item.id,
        cantidad: parseFloat(item.cantidad || 1),
        precio_unitario: parseFloat(item.precio_venta || 0),
      })),
    }, { headers: { Authorization: `Bearer ${token}` } })
    ultimaVenta.value = res.data.datos
    dialogoResumen.value = true
    snackbar.value = { show: true, mensaje: `Venta ${res.data.datos.folio} completada`, color: 'success' }
  } catch (err) {
    snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error al cobrar', color: 'error' }
  } finally { cobrando.value = false }
}

function imprimirResumen() {
  const ventana = window.open('', '_blank')
  ventana.document.write(`
    <html><head><title>Ticket - ${ultimaVenta.value?.folio}</title>
    <style>body{font-family:monospace;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px}</style>
    </head><body>
    <h2>ERP Ansoft - Ticket de Venta</h2>
    <p><strong>Folio:</strong> ${ultimaVenta.value?.folio}</p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
    <p><strong>Método de pago:</strong> ${metodoPago.value}</p>
    <table><tr><th>Artículo</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr>
    ${(ultimaVenta.value?.articulos || []).map(a => `<tr><td>${a.articulo_nombre}</td><td>${a.cantidad}</td><td>$${parseFloat(a.precio_unitario).toFixed(2)}</td><td>$${parseFloat(a.subtotal).toFixed(2)}</td></tr>`).join('')}
    </table>
    <h3>Total: $${(ultimaVenta.value?.total || 0).toFixed(2)}</h3>
    <p>¡Gracias por su compra!</p>
    <script>window.print();window.close();<\/script>
    </body></html>
  `)
  ventana.document.close()
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  try {
    const [a, c] = await Promise.all([
      axios.get('/api/v1/articulos?limite=200', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/entidades?rol=cliente', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    articulos.value = a.data.datos || []
    clientes.value = c.data.datos || []
  } catch (err) { console.error(err) }
})
</script>
