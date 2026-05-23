<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon color="primary" size="36" class="mr-3">mdi-book-multiple</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Asientos Contables</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Pólizas contables de todas las transacciones</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" @click="mostrarFormularioManual = !mostrarFormularioManual">
          {{ mostrarFormularioManual ? 'Ocultar Formulario' : 'Nuevo Asiento Manual' }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="3">
          <v-text-field v-model="filtros.fecha_desde" label="Fecha desde" type="date" variant="outlined" density="compact" clearable @update:model-value="cargarAsientos" />
        </v-col>
        <v-col cols="12" sm="3">
          <v-text-field v-model="filtros.fecha_hasta" label="Fecha hasta" type="date" variant="outlined" density="compact" clearable @update:model-value="cargarAsientos" />
        </v-col>
        <v-col cols="12" sm="3">
          <v-select v-model="filtros.tipo_transaccion" :items="tiposTransaccion" label="Tipo" variant="outlined" density="compact" clearable @update:model-value="cargarAsientos" />
        </v-col>
        <v-col cols="12" sm="3">
          <v-select v-model="filtros.cuenta_contable_id" :items="cuentasContables" item-title="label" item-value="id" label="Cuenta" variant="outlined" density="compact" clearable @update:model-value="cargarAsientos" />
        </v-col>
      </v-row>
    </v-card>

    <!-- Error -->
    <v-alert v-if="errorMsg" type="error" variant="tonal" closable class="mb-4" @click:close="errorMsg = ''">{{ errorMsg }}</v-alert>

    <!-- Formulario de Nuevo Asiento Manual -->
    <v-expand-transition>
      <v-card v-if="mostrarFormularioManual" variant="outlined" class="mb-4">
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon class="mr-2">mdi-file-document-edit</v-icon> Nuevo Asiento Manual
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field v-model="form.fecha" label="Fecha" type="date" variant="outlined" density="compact" required />
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field v-model="form.concepto" label="Concepto / Descripción" variant="outlined" density="compact" required />
            </v-col>
          </v-row>

          <v-divider class="my-3" />

          <v-row class="font-weight-bold text-caption text-medium-emphasis px-3 mb-1">
            <v-col cols="5">Cuenta Contable</v-col>
            <v-col cols="3" class="text-right">Debe</v-col>
            <v-col cols="3" class="text-right">Haber</v-col>
            <v-col cols="1"></v-col>
          </v-row>

          <v-row v-for="(linea, idx) in form.lineas" :key="idx" class="align-start px-3" no-gutters>
            <v-col cols="5" class="pr-2">
              <v-autocomplete
                v-model="linea.cuenta_contable_id"
                :items="cuentasContables"
                item-title="label"
                item-value="id"
                label="Cuenta"
                variant="outlined"
                density="compact"
                clearable
                :error-messages="linea.errorCuenta"
                @update:model-value="linea.errorCuenta = ''"
              />
            </v-col>
            <v-col cols="3" class="pr-2">
              <v-text-field v-model="linea.debe" label="Debe" type="number" step="0.01" min="0" variant="outlined" density="compact" @update:model-value="linea.debe = Math.max(0, parseFloat(linea.debe) || 0); recalcularTotales()" />
            </v-col>
            <v-col cols="3" class="pr-2">
              <v-text-field v-model="linea.haber" label="Haber" type="number" step="0.01" min="0" variant="outlined" density="compact" @update:model-value="linea.haber = Math.max(0, parseFloat(linea.haber) || 0); recalcularTotales()" />
            </v-col>
            <v-col cols="1" class="d-flex align-center pt-2">
              <v-btn icon="mdi-close" size="x-small" color="error" variant="text" @click="eliminarLinea(idx)" />
            </v-col>
          </v-row>

          <v-row class="px-3 mt-2">
            <v-col cols="12">
              <v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" size="small" @click="agregarLinea">Agregar Línea</v-btn>
            </v-col>
          </v-row>

          <v-divider class="my-3" />
          <v-row class="px-3">
            <v-col cols="5" class="text-right font-weight-bold">Totales</v-col>
            <v-col cols="3" class="text-right">
              <span :class="diferencia === 0 ? 'text-success font-weight-bold' : 'text-error font-weight-bold'">
                ${{ totalDebe.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
              </span>
            </v-col>
            <v-col cols="3" class="text-right">
              <span :class="diferencia === 0 ? 'text-success font-weight-bold' : 'text-error font-weight-bold'">
                ${{ totalHaber.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
              </span>
            </v-col>
            <v-col cols="1"></v-col>
          </v-row>
          <v-row class="px-3" v-if="diferencia !== 0">
            <v-col cols="12" class="text-right">
              <v-chip color="error" size="small" variant="tonal">
                Diferencia: ${{ Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
                ({{ diferencia > 0 ? 'Excedente en Débitos' : 'Excedente en Créditos' }})
              </v-chip>
            </v-col>
          </v-row>

          <v-row class="px-3 mt-4">
            <v-col cols="12" class="text-right">
              <v-btn color="success" variant="flat" prepend-icon="mdi-content-save" :loading="guardando" :disabled="!puedeGuardar" @click="guardarAsiento">Guardar Asiento</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-expand-transition>

    <!-- Tabla de asientos -->
    <div v-if="!loading && asientos.length === 0 && !errorMsg" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-book-multiple-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron asientos contables</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay asientos registrados con los filtros seleccionados.</p>
    </div>

    <v-data-table v-else :headers="headers" :items="asientos" :loading="loading" :items-per-page="25" class="elevation-1" density="compact">
      <template v-slot:item.fecha="{ item }">{{ new Date(item.fecha).toLocaleDateString('es-MX') }}</template>
      <template v-slot:item.debe="{ item }"><span v-if="parseFloat(item.debe) > 0" class="text-success font-weight-medium">${{ Number(item.debe).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span><span v-else class="text-medium-emphasis">—</span></template>
      <template v-slot:item.haber="{ item }"><span v-if="parseFloat(item.haber) > 0" class="text-error font-weight-medium">${{ Number(item.haber).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span><span v-else class="text-medium-emphasis">—</span></template>
      <template v-slot:item.tipo_transaccion="{ item }">
        <v-chip size="x-small" variant="tonal">{{ item.tipo_transaccion || '—' }}</v-chip>
      </template>
      <template v-slot:item.folio="{ item }">
        <router-link v-if="item.transaccion_id" :to="`/dashboard/ventas/${item.transaccion_id}`" class="text-primary">{{ item.folio || '—' }}</router-link>
        <span v-else>{{ item.folio || '—' }}</span>
      </template>
    </v-data-table>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiClient from '@/plugins/axios'

const loading = ref(false)
const guardando = ref(false)
const errorMsg = ref('')
const snackbar = ref({ show: false, mensaje: '', color: 'success' })
const mostrarFormularioManual = ref(false)
const asientos = ref([])
const cuentasContables = ref([])

const filtros = ref({
  fecha_desde: '',
  fecha_hasta: '',
  tipo_transaccion: null,
  cuenta_contable_id: null,
})

const tiposTransaccion = [
  'cotizacion', 'orden_venta', 'venta', 'orden_compra', 'compra',
  'pago', 'cobro', 'asiento_manual', 'ajuste_inventario',
]

const headers = [
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Folio Póliza', key: 'folio', sortable: true },
  { title: 'Tipo', key: 'tipo_transaccion', sortable: true },
  { title: 'Cuenta', key: 'cuenta_nombre', sortable: true },
  { title: 'Código', key: 'cuenta_codigo', sortable: true },
  { title: 'Debe', key: 'debe', sortable: true, align: 'end' },
  { title: 'Haber', key: 'haber', sortable: true, align: 'end' },
]

// Formulario de asiento manual
const form = ref({
  fecha: new Date().toISOString().split('T')[0],
  concepto: '',
  lineas: [
    { cuenta_contable_id: null, debe: 0, haber: 0, errorCuenta: '' },
    { cuenta_contable_id: null, debe: 0, haber: 0, errorCuenta: '' },
  ],
})

const totalDebe = ref(0)
const totalHaber = ref(0)
const diferencia = computed(() => totalDebe.value - totalHaber.value)

const puedeGuardar = computed(() => {
  if (!form.value.fecha || !form.value.concepto) return false
  if (form.value.lineas.length < 2) return false
  for (const linea of form.value.lineas) {
    if (!linea.cuenta_contable_id) return false
    const debe = parseFloat(linea.debe || 0)
    const haber = parseFloat(linea.haber || 0)
    if (debe <= 0 && haber <= 0) return false
  }
  return Math.abs(diferencia.value) <= 0.01
})

function recalcularTotales() {
  totalDebe.value = form.value.lineas.reduce((s, l) => s + parseFloat(l.debe || 0), 0)
  totalHaber.value = form.value.lineas.reduce((s, l) => s + parseFloat(l.haber || 0), 0)
}

function agregarLinea() {
  form.value.lineas.push({ cuenta_contable_id: null, debe: 0, haber: 0, errorCuenta: '' })
}

function eliminarLinea(idx) {
  if (form.value.lineas.length <= 2) {
    snackbar.value = { show: true, mensaje: 'Debe haber al menos 2 líneas contables', color: 'warning' }
    return
  }
  form.value.lineas.splice(idx, 1)
  recalcularTotales()
}

async function cargarCuentas() {
  try {
    const res = await apiClient.get('/api/v1/contabilidad/cuentas')
    const flat = res.data.flat || []
    cuentasContables.value = flat.map(c => ({
      id: c.id,
      label: `${c.codigo} - ${c.nombre}`,
      codigo: c.codigo,
      nombre: c.nombre,
    }))
  } catch (err) {
    console.error('Error al cargar cuentas:', err)
  }
}

async function cargarAsientos() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = {}
    if (filtros.value.fecha_desde) params.fecha_desde = filtros.value.fecha_desde
    if (filtros.value.fecha_hasta) params.fecha_hasta = filtros.value.fecha_hasta
    if (filtros.value.tipo_transaccion) params.tipo = filtros.value.tipo_transaccion
    if (filtros.value.cuenta_contable_id) params.cuenta_contable_id = filtros.value.cuenta_contable_id
    const res = await apiClient.get('/api/v1/contabilidad/asientos', { params })
    asientos.value = res.data.datos || []
  } catch (err) {
    console.error('Error al cargar asientos:', err)
    errorMsg.value = err.response?.data?.error || 'Error al cargar asientos contables.'
  } finally {
    loading.value = false
  }
}

async function guardarAsiento() {
  if (!puedeGuardar.value) return
  guardando.value = true
  try {
    const payload = {
      tipo: 'asiento_manual',
      fecha: form.value.fecha,
      comentario: form.value.concepto,
      lineas_contables: form.value.lineas.map(l => ({
        cuenta_contable_id: l.cuenta_contable_id,
        debe: parseFloat(l.debe || 0),
        haber: parseFloat(l.haber || 0),
      })),
    }
    await apiClient.post('/api/v1/transacciones', payload)
    snackbar.value = { show: true, mensaje: 'Asiento manual creado exitosamente', color: 'success' }
    form.value = {
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      lineas: [
        { cuenta_contable_id: null, debe: 0, haber: 0, errorCuenta: '' },
        { cuenta_contable_id: null, debe: 0, haber: 0, errorCuenta: '' },
      ],
    }
    recalcularTotales()
    await cargarAsientos()
  } catch (err) {
    console.error('Error al guardar asiento:', err)
    const msg = err.response?.data?.error || err.response?.data?.mensaje || 'Error al guardar asiento manual'
    snackbar.value = { show: true, mensaje: msg, color: 'error' }
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarCuentas()
  cargarAsientos()
  recalcularTotales()
})
</script>
