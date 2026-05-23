<template>
  <v-container fluid>
    <!-- Botón regresar -->
    <v-row class="mb-2">
      <v-col cols="12">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="volver">
          {{ esModoDetalle ? textoBotonVolver : 'Volver a Ventas' }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- MODO NUEVO: Formulario de creación -->
    <template v-if="!esModoDetalle">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white pa-4 d-flex align-center">
          <v-icon size="28" class="mr-2">mdi-file-document-plus</v-icon>
          <span>Nuevo {{ tituloTipo }}</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <v-progress-linear v-if="cargandoCatalogos" indeterminate color="primary" class="mb-3" />
          <v-alert v-if="errorCatalogos" type="error" variant="tonal" closable class="mb-3" @click:close="errorCatalogos = ''">{{ errorCatalogos }}</v-alert>

          <v-row>
            <v-col cols="12" sm="6">
              <v-autocomplete v-model="form.cliente_id" :items="clientes" item-title="razon_social" item-value="id" label="Cliente *" variant="outlined" :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron clientes" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-autocomplete v-model="form.vendedor_id" :items="vendedores" item-title="razon_social" item-value="id" label="Vendedor" variant="outlined" :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron vendedores" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.metodo_pago" :items="metodosPago" label="Método de pago" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.almacen_id" :items="almacenes" item-title="nombre" item-value="id" label="Almacén" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.terminos_pago_id" :items="terminosPago" item-title="nombre" item-value="id" label="Términos de pago" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.tipo_concepto"
                :items="[
                  { title: 'Estándar', value: 'estandar' },
                  { title: 'Deudores', value: 'deudores' },
                ]"
                label="Concepto"
                variant="outlined"
                density="compact"
                item-title="title"
                item-value="value"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.fecha_vencimiento" label="Fecha vencimiento" type="date" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.comentario" label="Comentario" variant="outlined" />
            </v-col>
          </v-row>

          <v-divider class="my-3" />
          <h4 class="text-h6 mb-2">Artículos</h4>

          <v-row v-for="(linea, i) in form.articulos" :key="i" class="mb-2" align="center">
            <v-col cols="5">
              <v-autocomplete v-model="linea.articulo_id" :items="articulos" item-title="nombre" item-value="id" label="Artículo" variant="outlined" density="compact" return-object :loading="cargandoCatalogos" :disabled="cargandoCatalogos" no-data-text="No se encontraron artículos" @update:model-value="sel => { if(sel) { linea.precio_unitario = sel.precio_venta; linea.articulo_nombre = sel.nombre } }" />
            </v-col>
            <v-col cols="2"><v-text-field v-model="linea.cantidad" label="Cant." type="number" min="1" variant="outlined" density="compact" /></v-col>
            <v-col cols="3"><v-text-field v-model="linea.precio_unitario" label="Precio" type="number" prefix="$" variant="outlined" density="compact" /></v-col>
            <v-col cols="2" class="text-right"><v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="form.articulos.splice(i, 1)" /></v-col>
          </v-row>

          <v-btn variant="tonal" prepend-icon="mdi-plus" @click="agregarLinea" class="mt-2" :disabled="cargandoCatalogos">Agregar artículo</v-btn>

          <v-divider class="my-3" />
          <div class="text-h5 text-right font-weight-bold">Total: ${{ calcularTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</div>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="volver">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" @click="guardarDocumento" :disabled="!puedeGuardar || cargandoCatalogos">
            Guardar {{ tituloTipo }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </template>

    <!-- MODO DETALLE: Visualización del documento -->
    <template v-else-if="documento">
      <!-- Cabecera del documento -->
      <v-card class="mb-4" variant="outlined">
        <v-card-title class="bg-primary text-white pa-4 d-flex align-center">
          <v-icon size="28" class="mr-2">mdi-file-document</v-icon>
          <span class="text-h6 font-weight-bold">{{ documento.folio }}</span>
          <v-chip :color="chipColorEstado" size="small" variant="tonal" class="ml-3" :text-color="documento.estado === 'confirmado' ? 'white' : 'white'">
            {{ documento.estado }}
          </v-chip>
          <v-spacer />
          <v-chip color="white" variant="tonal" size="small" class="mr-2">
            {{ labelTipoDocumento }}
          </v-chip>
        </v-card-title>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" md="6">
              <table class="info-table">
                <tbody>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">Cliente:</td>
                    <td class="font-weight-medium">{{ documento.cliente_nombre || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">RFC:</td>
                    <td>{{ documento.cliente_rfc || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">Vendedor:</td>
                    <td>{{ documento.vendedor_nombre || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">Fecha:</td>
                    <td>{{ new Date(documento.fecha).toLocaleString('es-MX') }}</td>
                  </tr>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">Serie:</td>
                    <td>{{ documento.serie || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </v-col>
            <v-col cols="12" md="6">
              <table class="info-table">
                <tbody>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">Total:</td>
                    <td class="text-h6 font-weight-bold text-primary">
                      ${{ Number(documento.total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">Método Pago:</td>
                    <td>{{ documento.metodo_pago || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-caption text-medium-emphasis pr-4">Almacén:</td>
                    <td>{{ documento.almacen_nombre || documento.almacen_id || '—' }}</td>
                  </tr>
                  <tr v-if="documento.terminos_pago_nombre">
                    <td class="text-caption text-medium-emphasis pr-4">Términos:</td>
                    <td>{{ documento.terminos_pago_nombre }} {{ documento.dias_credito ? `(${documento.dias_credito} días)` : '' }}</td>
                  </tr>
                  <tr v-if="documento.fecha_vencimiento">
                    <td class="text-caption text-medium-emphasis pr-4">Vencimiento:</td>
                    <td>{{ new Date(documento.fecha_vencimiento).toLocaleDateString('es-MX') }}</td>
                  </tr>
                  <tr v-if="documento.comentario">
                    <td class="text-caption text-medium-emphasis pr-4" valign="top">Comentario:</td>
                    <td>{{ documento.comentario }}</td>
                  </tr>
                </tbody>
              </table>
            </v-col>
          </v-row>

          <!-- Trazabilidad: Origen -->
          <v-row v-if="documento.origen">
            <v-col cols="12">
              <v-alert variant="tonal" color="info" class="mt-2" density="compact">
                <v-icon class="mr-2">mdi-arrow-decision</v-icon>
                <strong>Proviene de:</strong>
                <router-link :to="`/dashboard/ventas/${documento.origen.id}`" class="text-info font-weight-medium ml-1">
                  {{ labelTipoOrigen(documento.origen.tipo) }} {{ documento.origen.folio }}
                </router-link>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Trazabilidad: Destino -->
          <v-row v-if="documento.destino">
            <v-col cols="12">
              <v-alert variant="tonal" color="primary" class="mt-2" density="compact">
                <v-icon class="mr-2">mdi-arrow-decision</v-icon>
                <strong>Convertido a:</strong>
                <router-link :to="`/dashboard/ventas/${documento.destino.id}`" class="text-primary font-weight-medium ml-1">
                  {{ labelTipoDestino(documento.destino.tipo) }} {{ documento.destino.folio }}
                </router-link>
              </v-alert>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Acciones -->
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn v-if="documento" color="info" variant="tonal" prepend-icon="mdi-printer" :loading="generandoPDF" @click="imprimirPDF">
            Imprimir PDF
          </v-btn>
          <v-btn v-if="documento.estado === 'confirmado' && puedeConvertirAOrden" color="primary" variant="tonal" prepend-icon="mdi-arrow-decision" :loading="convirtiendo" @click="convertir('orden_venta')">
            Convertir a Orden de Venta
          </v-btn>
          <v-btn v-if="documento.estado === 'confirmado' && puedeConvertirAVenta" color="success" variant="tonal" prepend-icon="mdi-arrow-decision" :loading="convirtiendo" @click="convertir('venta')">
            Convertir a Venta
          </v-btn>
          <v-btn v-if="documento.estado === 'confirmado'" color="error" variant="tonal" prepend-icon="mdi-cancel" @click="confirmarCancelar">
            Cancelar
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- Detalle (Líneas del documento) -->
      <v-card class="mb-4" variant="outlined">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
          <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
          Detalle de Artículos
        </v-card-title>
        <v-data-table :headers="detalleColumnas" :items="documento.detalles || []" :loading="cargandoDocumento" hide-default-footer class="elevation-0">
          <template v-slot:item.articulo_nombre="{ item }">
            <div>
              <span class="font-weight-medium">{{ item.articulo_nombre || '—' }}</span>
              <span v-if="item.articulo_sku" class="text-caption text-medium-emphasis ml-1">({{ item.articulo_sku }})</span>
            </div>
          </template>
          <template v-slot:item.precio_unitario="{ item }">${{ Number(item.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
          <template v-slot:item.subtotal="{ item }">${{ Number(item.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
        </v-data-table>
      </v-card>

      <!-- Asientos Contables -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
          <v-icon class="mr-2">mdi-book-multiple</v-icon>
          Asientos Contables
          <v-chip v-if="documento.asientos_contables?.length" size="small" variant="tonal" class="ml-2">{{ documento.asientos_contables.length }} registro(s)</v-chip>
        </v-card-title>
        <v-card-text class="pa-4">
          <div v-if="!documento.asientos_contables?.length" class="text-center pa-4 text-medium-emphasis">
            <v-icon size="48" class="mb-2">mdi-book-multiple</v-icon>
            <p>No hay asientos contables para esta transacción.</p>
          </div>
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th class="text-left">Cuenta</th>
                <th class="text-left">Código</th>
                <th class="text-right">Debe</th>
                <th class="text-right">Haber</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(asiento, idx) in documento.asientos_contables" :key="idx">
                <td>{{ asiento.cuenta_nombre || '—' }}</td>
                <td><v-chip size="x-small" variant="tonal">{{ asiento.cuenta_codigo || '—' }}</v-chip></td>
                <td class="text-right"><span v-if="parseFloat(asiento.debe) > 0" class="text-success font-weight-medium">${{ Number(asiento.debe).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span><span v-else class="text-medium-emphasis">—</span></td>
                <td class="text-right"><span v-if="parseFloat(asiento.haber) > 0" class="text-error font-weight-medium">${{ Number(asiento.haber).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span><span v-else class="text-medium-emphasis">—</span></td>
              </tr>
            </tbody>
            <tfoot v-if="documento.asientos_contables?.length > 0">
              <tr class="font-weight-bold">
                <td colspan="2">Totales</td>
                <td class="text-right text-success">${{ Number(documento.asientos_contables.reduce((s, a) => s + parseFloat(a.debe || 0), 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</td>
                <td class="text-right text-error">${{ Number(documento.asientos_contables.reduce((s, a) => s + parseFloat(a.haber || 0), 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</td>
              </tr>
            </tfoot>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- Panel de Historial (CHATTER) -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
          <v-icon class="mr-2">mdi-history</v-icon>
          Historial de Cambios
          <v-chip v-if="historial.length" size="small" variant="tonal" class="ml-2">{{ historial.length }} registro(s)</v-chip>
        </v-card-title>
        <v-card-text class="pa-4">
          <div v-if="cargandoHistorial" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary" size="24" /><span class="ml-2">Cargando historial...</span>
          </div>
          <div v-else-if="historial.length === 0" class="text-center pa-4 text-medium-emphasis">
            <v-icon size="48" class="mb-2">mdi-history</v-icon><p>No hay registros de historial para este documento.</p>
          </div>
          <v-timeline v-else side="end" density="compact">
            <v-timeline-item v-for="item in historial" :key="item.id_cabecera" :dot-color="obtenerColorOperacion(item.tipo_operacion)" size="small">
              <template v-slot:opposite>
                <span class="text-caption text-medium-emphasis">{{ new Date(item.fecha).toLocaleString('es-MX') }}</span>
              </template>
              <v-card variant="outlined" class="mb-2" density="compact">
                <v-card-text class="pa-3">
                  <div class="d-flex align-center mb-1">
                    <v-icon size="small" :color="obtenerColorOperacion(item.tipo_operacion)" class="mr-1">{{ obtenerIconoOperacion(item.tipo_operacion) }}</v-icon>
                    <strong class="text-body-2">{{ item.usuario_nombre || 'Sistema' }}</strong>
                    <v-chip size="x-small" :color="obtenerColorOperacion(item.tipo_operacion)" variant="tonal" class="ml-2">{{ item.tipo_operacion === 'I' ? 'Creación' : item.tipo_operacion === 'U' ? 'Modificación' : 'Eliminación' }}</v-chip>
                  </div>
                  <p v-if="item.comentario" class="text-body-2 mb-1 text-medium-emphasis">{{ item.comentario }}</p>
                  <div v-if="item.detalles && item.detalles.length > 0">
                    <v-list density="compact" class="pa-0 bg-transparent">
                      <v-list-item v-for="(det, didx) in item.detalles" :key="didx" class="pa-0 pl-2" density="compact">
                        <template v-slot:default>
                          <span class="text-caption"><strong>{{ det.campo_afectado }}:</strong><span v-if="det.valor_anterior" class="text-error text-decoration-line-through ml-1">{{ det.valor_anterior }}</span><v-icon size="x-small" class="mx-1">mdi-arrow-right</v-icon><span v-if="det.valor_nuevo" class="text-success font-weight-medium">{{ det.valor_nuevo }}</span></span>
                        </template>
                      </v-list-item>
                    </v-list>
                  </div>
                  <div v-else-if="item.tipo_operacion === 'I'" class="text-body-2 text-success">Documento creado sin cambios adicionales.</div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
          <div class="text-center mt-2">
            <v-btn variant="text" size="small" prepend-icon="mdi-refresh" @click="cargarHistorial">Recargar historial</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </template>

    <!-- Loading -->
    <v-card v-else-if="cargandoDocumento" class="pa-8 text-center">
      <v-progress-circular indeterminate color="primary" size="48" /><p class="mt-2">Cargando documento...</p>
    </v-card>

    <!-- Diálogo de confirmación -->
    <v-dialog v-model="dialogoConfirmar" max-width="400">
      <v-card><v-card-title class="text-h5">Confirmar acción</v-card-title><v-card-text>{{ mensajeConfirmacion }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialogoConfirmar = false">Cancelar</v-btn><v-btn :color="accionConfirmarColor" @click="ejecutarAccionPendiente">{{ accionConfirmarTexto }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '@/plugins/axios'

const route = useRoute()
const router = useRouter()

// --- ESTADO ---
const cargandoCatalogos = ref(false)
const cargandoDocumento = ref(false)
const cargandoHistorial = ref(false)
const errorCatalogos = ref('')
const guardando = ref(false)
const convirtiendo = ref(false)
const generandoPDF = ref(false)

const documento = ref(null)
const historial = ref([])

const clientes = ref([])
const vendedores = ref([])
const articulos = ref([])
const almacenes = ref([])
const terminosPago = ref([])

const dialogoConfirmar = ref(false)
const mensajeConfirmacion = ref('')
const accionConfirmarTexto = ref('Aceptar')
const accionConfirmarColor = ref('primary')
let accionPendiente = null

const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const metodosPago = ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque']

const form = ref({
  cliente_id: null,
  vendedor_id: null,
  metodo_pago: 'transferencia',
  almacen_id: null,
  terminos_pago_id: null,
  fecha_vencimiento: '',
  comentario: '',
  tipo_concepto: 'estandar',
  articulos: [],
})

// --- COMPUTADOS ---
const esModoDetalle = computed(() => !route.params.tipo || route.name === 'DocumentoVentaDetalle')

const tipoTransaccion = computed(() => {
  if (esModoDetalle.value) return documento.value?.tipo || ''
  return route.params.tipo || 'venta'
})

const tituloTipo = computed(() => {
  const map = { cotizacion: 'Cotización', orden_venta: 'Orden de Venta', venta: 'Venta' }
  return map[tipoTransaccion.value] || 'Documento'
})

const labelTipoDocumento = computed(() => {
  const map = { cotizacion: 'Cotización', orden_venta: 'Orden de Venta', venta: 'Venta', asiento_manual: 'Asiento Manual' }
  return map[tipoTransaccion.value] || tipoTransaccion.value
})

const chipColorEstado = computed(() => {
  if (!documento.value) return 'grey'
  if (documento.value.estado === 'confirmado') return 'success'
  if (documento.value.estado === 'cancelado') return 'error'
  if (documento.value.estado === 'convertido') return 'info'
  return 'warning'
})

const puedeConvertirAOrden = computed(() => documento.value?.tipo === 'cotizacion')
const puedeConvertirAVenta = computed(() => documento.value?.tipo === 'cotizacion' || documento.value?.tipo === 'orden_venta')

const detalleColumnas = [
  { title: 'Artículo', key: 'articulo_nombre', sortable: true },
  { title: 'SKU', key: 'articulo_sku', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true, align: 'end' },
  { title: 'Precio Unit.', key: 'precio_unitario', sortable: true, align: 'end' },
  { title: 'Subtotal', key: 'subtotal', sortable: true, align: 'end' },
]

const textoBotonVolver = computed(() => {
  if (!documento.value) return 'Volver'
  const map = {
    cotizacion: 'Volver a Cotizaciones de Venta',
    orden_venta: 'Volver a Órdenes de Venta',
    venta: 'Volver a Facturas de Venta',
  }
  return map[documento.value.tipo] || 'Volver'
})

const puedeGuardar = computed(() => {
  if (form.value.articulos.length === 0) return false
  if (!form.value.cliente_id) return false
  return form.value.articulos.every(l => l.articulo_id && parseFloat(l.cantidad) > 0)
})

// --- FUNCIONES ---
function agregarLinea() {
  form.value.articulos.push({ articulo_id: null, cantidad: 1, precio_unitario: 0, articulo_nombre: '' })
}

function calcularTotal() {
  return form.value.articulos.reduce((sum, l) => sum + (parseFloat(l.cantidad || 0) * parseFloat(l.precio_unitario || 0)), 0)
}

function labelTipoOrigen(tipo) {
  const map = { cotizacion: 'Cotización', orden_venta: 'Orden de Venta' }
  return map[tipo] || tipo
}

function labelTipoDestino(tipo) {
  const map = { orden_venta: 'Orden de Venta', venta: 'Venta' }
  return map[tipo] || tipo
}

function obtenerColorOperacion(tipo) {
  return { I: 'success', U: 'info', D: 'error' }[tipo] || 'grey'
}

function obtenerIconoOperacion(tipo) {
  return { I: 'mdi-plus-circle', U: 'mdi-pencil', D: 'mdi-delete' }[tipo] || 'mdi-history'
}

// --- CARGA DE CATÁLOGOS (para modo nuevo) ---
async function cargarCatalogos() {
  cargandoCatalogos.value = true
  errorCatalogos.value = ''
  try {
    const [cliRes, vendRes, artRes, almRes, tpRes] = await Promise.all([
      apiClient.get('/api/v1/entidades', { params: { rol: 'cliente', limite: 200 } }),
      apiClient.get('/api/v1/entidades', { params: { rol: 'vendedor', limite: 200 } }),
      apiClient.get('/api/v1/articulos', { params: { limite: 200 } }),
      apiClient.get('/api/v1/inventario/almacenes'),
      apiClient.get('/api/v1/catalogos/terminos-pago').catch(() => ({ data: { datos: [] } })),
    ])
    clientes.value = cliRes.data.datos || []
    vendedores.value = vendRes.data.datos || []
    articulos.value = artRes.data.datos || []
    almacenes.value = almRes.data.datos || []
    terminosPago.value = tpRes.data.datos || []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
    errorCatalogos.value = err.response?.data?.error || 'Error al cargar datos. Verifique la conexión con el servidor.'
    snackbar.value = { show: true, mensaje: 'Error al cargar catálogos', color: 'error' }
  } finally {
    cargandoCatalogos.value = false
  }
}

// --- CARGA DEL DOCUMENTO (modo detalle) ---
async function cargarDocumento() {
  const id = route.params.id
  if (!id) return

  cargandoDocumento.value = true
  try {
    const res = await apiClient.get(`/api/v1/transacciones/${id}`)
    documento.value = res.data
  } catch (err) {
    console.error('Error al cargar documento:', err)
    snackbar.value = { show: true, mensaje: 'Error al cargar el documento', color: 'error' }
  } finally {
    cargandoDocumento.value = false
  }
}

async function cargarHistorial() {
  const id = route.params.id
  if (!id) return

  cargandoHistorial.value = true
  try {
    const res = await apiClient.get(`/api/v1/transacciones/${id}/historial`)
    historial.value = res.data || []
  } catch (err) {
    console.error('Error al cargar historial:', err)
  } finally {
    cargandoHistorial.value = false
  }
}

// --- GUARDAR (modo nuevo) ---
async function guardarDocumento() {
  if (!puedeGuardar.value) return
  guardando.value = true
  try {
    const payload = {
      tipo: tipoTransaccion.value,
      entidad_cliente_id: form.value.cliente_id,
      entidad_vendedor_id: form.value.vendedor_id,
      metodo_pago: form.value.metodo_pago,
      almacen_id: form.value.almacen_id,
      terminos_pago_id: form.value.terminos_pago_id,
      fecha_vencimiento: form.value.fecha_vencimiento || null,
      comentario: form.value.comentario || null,
      tipo_concepto: form.value.tipo_concepto || 'estandar',
      articulos: form.value.articulos.map(l => ({
        articulo_id: l.articulo_id?.id || l.articulo_id,
        cantidad: parseFloat(l.cantidad),
        precio_unitario: parseFloat(l.precio_unitario),
      })),
    }
    await apiClient.post('/api/v1/transacciones', payload)
    snackbar.value = { show: true, mensaje: `${tituloTipo.value} creada exitosamente`, color: 'success' }

    // Volver al listado correspondiente
    const rutasVolver = { cotizacion: '/dashboard/ventas/cotizaciones', orden_venta: '/dashboard/ventas/ordenes', venta: '/dashboard/ventas/facturas' }
    router.push(rutasVolver[tipoTransaccion.value] || '/dashboard/ventas/facturas')
  } catch (err) {
    snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error al guardar', color: 'error' }
  } finally {
    guardando.value = false
  }
}

// --- ACCIONES (modo detalle) ---
function confirmarCancelar() {
  mensajeConfirmacion.value = `¿Cancelar ${labelTipoDocumento.value} ${documento.value?.folio}? Se revertirá el inventario si aplica.`
  accionConfirmarTexto.value = 'Cancelar'
  accionConfirmarColor.value = 'error'
  accionPendiente = async () => {
    try {
      await apiClient.post(`/api/v1/transacciones/${documento.value.id}/cancelar`)
      snackbar.value = { show: true, mensaje: 'Documento cancelado exitosamente', color: 'success' }
      await cargarDocumento()
      await cargarHistorial()
    } catch (err) {
      snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error al cancelar', color: 'error' }
    }
  }
  dialogoConfirmar.value = true
}

async function convertir(nuevoTipo) {
  if (!documento.value) return
  convirtiendo.value = true
  try {
    const label = nuevoTipo === 'orden_venta' ? 'Orden de Venta' : 'Venta'
    await apiClient.post(`/api/v1/transacciones/${documento.value.id}/convertir`, { nuevo_tipo: nuevoTipo })
    snackbar.value = { show: true, mensaje: `Convertido a ${label} exitosamente`, color: 'success' }
    await cargarDocumento()
    await cargarHistorial()
  } catch (err) {
    snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error al convertir', color: 'error' }
  } finally {
    convirtiendo.value = false
  }
}

function ejecutarAccionPendiente() {
  if (accionPendiente) accionPendiente()
  dialogoConfirmar.value = false
}

async function imprimirPDF() {
  if (!documento.value) return
  generandoPDF.value = true
  try {
    const id = documento.value.id
    const token = localStorage.getItem('token')
    const baseURL = (import.meta.env.VITE_API_NODE_URL || 'http://localhost:3000').replace(/\/+$/, '')
    const response = await fetch(`${baseURL}/api/v1/transacciones/${id}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || `Error HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Liberar URL después de un tiempo
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } catch (err) {
    console.error('Error al generar PDF:', err)
    snackbar.value = { show: true, mensaje: 'Error al generar PDF: ' + err.message, color: 'error' }
  } finally {
    generandoPDF.value = false
  }
}

function volver() {
  if (esModoDetalle.value && documento.value) {
    const map = {
      cotizacion: '/dashboard/ventas/cotizaciones',
      orden_venta: '/dashboard/ventas/ordenes',
      venta: '/dashboard/ventas/facturas',
    }
    router.push(map[documento.value.tipo] || '/dashboard/ventas/facturas')
  } else {
    router.push('/dashboard/ventas/facturas')
  }
}

// --- INIT ---
onMounted(async () => {
  if (route.params.tipo) {
    // Modo nuevo
    await cargarCatalogos()
  } else if (route.params.id) {
    // Modo detalle
    await cargarDocumento()
    await cargarHistorial()
  }
})
</script>

<style scoped>
.info-table td {
  padding: 4px 0;
}
</style>
