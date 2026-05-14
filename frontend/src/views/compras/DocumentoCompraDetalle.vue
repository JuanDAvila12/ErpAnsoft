<template>
  <v-container fluid>
    <!-- Botón regresar -->
    <v-row class="mb-2">
      <v-col cols="12">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="volver">
          Volver a {{ esOrden ? 'Órdenes de Compra' : 'Compras' }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Cabecera del documento -->
    <v-card class="mb-4" variant="outlined" v-if="documento">
      <v-card-title class="bg-success text-white pa-4 d-flex align-center">
        <v-icon size="28" class="mr-2">mdi-file-document</v-icon>
        <span class="text-h6 font-weight-bold">{{ documento.folio }}</span>
        <v-chip
          :color="documento.estado === 'confirmado' ? 'white' : documento.estado === 'cancelado' ? 'error' : 'warning'"
          size="small"
          variant="tonal"
          class="ml-3"
          :text-color="documento.estado === 'confirmado' ? 'success' : 'white'"
        >
          {{ documento.estado }}
        </v-chip>
        <v-spacer />
        <v-chip color="white" variant="tonal" size="small" class="mr-2">
          {{ documento.tipo === 'orden_compra' ? 'Orden de Compra' : 'Compra' }}
        </v-chip>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row>
          <v-col cols="12" md="6">
            <table class="info-table">
              <tr>
                <td class="text-caption text-medium-emphasis pr-4">Proveedor:</td>
                <td class="font-weight-medium">{{ documento.proveedor_nombre || '—' }}</td>
              </tr>
              <tr>
                <td class="text-caption text-medium-emphasis pr-4">RFC:</td>
                <td>{{ documento.proveedor_rfc || '—' }}</td>
              </tr>
              <tr>
                <td class="text-caption text-medium-emphasis pr-4">Fecha:</td>
                <td>{{ new Date(documento.fecha).toLocaleString('es-MX') }}</td>
              </tr>
              <tr>
                <td class="text-caption text-medium-emphasis pr-4">Serie:</td>
                <td>{{ documento.serie || '—' }}</td>
              </tr>
            </table>
          </v-col>
          <v-col cols="12" md="6">
            <table class="info-table">
              <tr>
                <td class="text-caption text-medium-emphasis pr-4">Total:</td>
                <td class="text-h6 font-weight-bold text-success">
                  ${{ Number(documento.total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
                </td>
              </tr>
              <tr>
                <td class="text-caption text-medium-emphasis pr-4">Método Pago:</td>
                <td>{{ documento.metodo_pago || '—' }}</td>
              </tr>
              <tr>
                <td class="text-caption text-medium-emphasis pr-4">Almacén ID:</td>
                <td>{{ documento.almacen_id || '—' }}</td>
              </tr>
              <tr v-if="documento.fecha_vencimiento">
                <td class="text-caption text-medium-emphasis pr-4">Vencimiento:</td>
                <td>{{ new Date(documento.fecha_vencimiento).toLocaleDateString('es-MX') }}</td>
              </tr>
            </table>
          </v-col>
        </v-row>

        <!-- Trazabilidad: Origen -->
        <v-row v-if="documento.origen">
          <v-col cols="12">
            <v-alert variant="tonal" color="info" class="mt-2" density="compact">
              <v-icon class="mr-2">mdi-arrow-decision</v-icon>
              <strong>Proviene de:</strong>
              <router-link
                :to="`/dashboard/compras/${documento.origen.id}`"
                class="text-info font-weight-medium ml-1"
              >
                {{ documento.origen.tipo === 'orden_compra' ? 'Orden de Compra' : 'Compra' }}
                {{ documento.origen.folio }}
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
              <router-link
                :to="`/dashboard/compras/${documento.destino.id}`"
                class="text-primary font-weight-medium ml-1"
              >
                {{ documento.destino.tipo === 'compra' ? 'Compra' : 'Orden de Compra' }}
                {{ documento.destino.folio }}
              </router-link>
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Acciones -->
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn
          v-if="documento.estado === 'confirmado' && documento.tipo === 'orden_compra'"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-arrow-decision"
          :loading="convirtiendo"
          @click="convertirACompra"
        >
          Convertir a Compra
        </v-btn>
        <v-btn
          v-if="documento.estado === 'confirmado'"
          color="error"
          variant="tonal"
          prepend-icon="mdi-cancel"
          @click="confirmarCancelar"
        >
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
      <v-data-table
        :headers="detalleColumnas"
        :items="documento?.detalles || []"
        :loading="loadingDetalle"
        hide-default-footer
        class="elevation-0"
      >
        <template v-slot:item.articulo_nombre="{ item }">
          <div>
            <span class="font-weight-medium">{{ item.articulo_nombre || '—' }}</span>
            <span v-if="item.articulo_sku" class="text-caption text-medium-emphasis ml-1">({{ item.articulo_sku }})</span>
          </div>
        </template>
        <template v-slot:item.precio_unitario="{ item }">
          ${{ Number(item.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
        <template v-slot:item.subtotal="{ item }">
          ${{ Number(item.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
      </v-data-table>
    </v-card>

    <!-- Panel de Historial (CHATTER) -->
    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
        <v-icon class="mr-2">mdi-history</v-icon>
        Historial de Cambios
        <v-chip v-if="historial.length" size="small" variant="tonal" class="ml-2">
          {{ historial.length }} registro(s)
        </v-chip>
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-if="cargandoHistorial" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span class="ml-2">Cargando historial...</span>
        </div>
        <div v-else-if="historial.length === 0" class="text-center pa-4 text-medium-emphasis">
          <v-icon size="48" class="mb-2">mdi-history</v-icon>
          <p>No hay registros de historial para este documento.</p>
        </div>
        <v-timeline v-else side="end" density="compact">
          <v-timeline-item
            v-for="(item, idx) in historial"
            :key="item.id_cabecera"
            :dot-color="obtenerColorOperacion(item.tipo_operacion)"
            size="small"
          >
            <template v-slot:opposite>
              <span class="text-caption text-medium-emphasis">
                {{ new Date(item.fecha).toLocaleString('es-MX') }}
              </span>
            </template>
            <v-card variant="outlined" class="mb-2" density="compact">
              <v-card-text class="pa-3">
                <div class="d-flex align-center mb-1">
                  <v-icon
                    size="small"
                    :color="obtenerColorOperacion(item.tipo_operacion)"
                    class="mr-1"
                  >
                    {{ obtenerIconoOperacion(item.tipo_operacion) }}
                  </v-icon>
                  <strong class="text-body-2">
                    {{ item.usuario_nombre || 'Sistema' }}
                  </strong>
                  <v-chip
                    size="x-small"
                    :color="obtenerColorOperacion(item.tipo_operacion)"
                    variant="tonal"
                    class="ml-2"
                  >
                    {{ item.tipo_operacion === 'I' ? 'Creación' : item.tipo_operacion === 'U' ? 'Modificación' : 'Eliminación' }}
                  </v-chip>
                </div>
                <p v-if="item.comentario" class="text-body-2 mb-1 text-medium-emphasis">
                  {{ item.comentario }}
                </p>
                <div v-if="item.detalles && item.detalles.length > 0">
                  <v-list density="compact" class="pa-0 bg-transparent">
                    <v-list-item
                      v-for="(det, didx) in item.detalles"
                      :key="didx"
                      class="pa-0 pl-2"
                      density="compact"
                    >
                      <template v-slot:default>
                        <span class="text-caption">
                          <strong>{{ det.campo_afectado }}:</strong>
                          <span v-if="det.valor_anterior" class="text-error text-decoration-line-through ml-1">
                            {{ det.valor_anterior }}
                          </span>
                          <v-icon size="x-small" class="mx-1">mdi-arrow-right</v-icon>
                          <span v-if="det.valor_nuevo" class="text-success font-weight-medium">
                            {{ det.valor_nuevo }}
                          </span>
                        </span>
                      </template>
                    </v-list-item>
                  </v-list>
                </div>
                <div v-else-if="item.tipo_operacion === 'I'" class="text-body-2 text-success">
                  Documento creado sin cambios adicionales.
                </div>
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>

        <!-- Botón para recargar historial -->
        <div class="text-center mt-2">
          <v-btn variant="text" size="small" prepend-icon="mdi-refresh" @click="cargarHistorial">
            Recargar historial
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Diálogo de confirmación de cancelación -->
    <v-dialog v-model="dialogoCancelar" max-width="400px">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white pa-4">
          <v-icon class="mr-2">mdi-alert-circle</v-icon>
          Confirmar Cancelación
        </v-card-title>
        <v-card-text class="pa-4">
          <p>¿Estás seguro de cancelar el documento <strong>{{ documento?.folio }}</strong>?</p>
          <p v-if="documento?.tipo === 'compra'" class="text-caption text-medium-emphasis">
            Se revertirá el inventario asociado a esta compra.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoCancelar = false">No</v-btn>
          <v-btn color="error" :loading="cancelando" @click="ejecutarCancelacion">Sí, Cancelar</v-btn>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const documento = ref(null)
const historial = ref([])
const cargando = ref(false)
const cargandoHistorial = ref(false)
const loadingDetalle = ref(false)
const convirtiendo = ref(false)
const cancelando = ref(false)
const dialogoCancelar = ref(false)

const snackbar = ref({ show: false, text: '', color: 'success' })

const detalleColumnas = [
  { title: 'Artículo', key: 'articulo_nombre', sortable: true },
  { title: 'SKU', key: 'articulo_sku', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true, align: 'end' },
  { title: 'Precio Unit.', key: 'precio_unitario', sortable: true, align: 'end' },
  { title: 'Subtotal', key: 'subtotal', sortable: true, align: 'end' },
]

const esOrden = computed(() => documento.value?.tipo === 'orden_compra')

function obtenerColorOperacion(tipo) {
  switch (tipo) {
    case 'I': return 'success'
    case 'U': return 'info'
    case 'D': return 'error'
    default: return 'grey'
  }
}

function obtenerIconoOperacion(tipo) {
  switch (tipo) {
    case 'I': return 'mdi-plus-circle'
    case 'U': return 'mdi-pencil'
    case 'D': return 'mdi-delete'
    default: return 'mdi-history'
  }
}

async function cargarDocumento() {
  const id = route.params.id
  if (!id) return

  cargando.value = true
  loadingDetalle.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/api/v1/documentos-compra/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    documento.value = res.data
  } catch (err) {
    console.error('Error al cargar documento:', err)
    snackbar.value = { show: true, text: 'Error al cargar el documento', color: 'error' }
  } finally {
    cargando.value = false
    loadingDetalle.value = false
  }
}

async function cargarHistorial() {
  const id = route.params.id
  if (!id) return

  cargandoHistorial.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`/api/v1/documentos-compra/${id}/historial`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    historial.value = res.data || []
  } catch (err) {
    console.error('Error al cargar historial:', err)
  } finally {
    cargandoHistorial.value = false
  }
}

async function convertirACompra() {
  if (!documento.value) return
  convirtiendo.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/v1/documentos-compra/convertir/${documento.value.id}`,
      { nuevo_tipo: 'compra' },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    snackbar.value = { show: true, text: 'Documento convertido a compra exitosamente', color: 'success' }
    await cargarDocumento()
    await cargarHistorial()
  } catch (err) {
    console.error('Error al convertir:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al convertir', color: 'error' }
  } finally {
    convirtiendo.value = false
  }
}

function confirmarCancelar() {
  dialogoCancelar.value = true
}

async function ejecutarCancelacion() {
  if (!documento.value) return
  cancelando.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/v1/documentos-compra/${documento.value.id}/cancelar`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    dialogoCancelar.value = false
    snackbar.value = { show: true, text: 'Documento cancelado exitosamente', color: 'success' }
    await cargarDocumento()
    await cargarHistorial()
  } catch (err) {
    console.error('Error al cancelar:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al cancelar', color: 'error' }
  } finally {
    cancelando.value = false
  }
}

function volver() {
  if (documento.value?.tipo === 'orden_compra') {
    router.push('/dashboard/compras/ordenes')
  } else {
    router.push('/dashboard/compras/compras')
  }
}

onMounted(() => {
  cargarDocumento()
  cargarHistorial()
})
</script>

<style scoped>
.info-table td {
  padding: 4px 0;
}
</style>
