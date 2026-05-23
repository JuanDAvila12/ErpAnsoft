<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="primary" size="36" class="mr-3">mdi-pencil-plus</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Asientos Manuales</h2>
    </div>

    <v-card variant="tonal" class="pa-4 mb-4">
      <v-card-title class="pa-0 mb-4">
        <v-icon class="mr-2">mdi-file-document-edit</v-icon>
        Nuevo Asiento Manual
      </v-card-title>

      <v-row>
        <v-col cols="12" sm="4">
          <v-text-field v-model="form.fecha" label="Fecha" type="date" variant="outlined" density="compact" required />
        </v-col>
        <v-col cols="12" sm="8">
          <v-text-field v-model="form.concepto" label="Concepto / Descripción" variant="outlined" density="compact" required />
        </v-col>
      </v-row>

      <v-divider class="my-3" />

      <v-card-title class="pa-0 mb-3">
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        Líneas Contables
      </v-card-title>

      <!-- Cabecera de la tabla de líneas -->
      <v-row class="font-weight-bold text-caption text-medium-emphasis px-3 mb-1">
        <v-col cols="5">Cuenta Contable</v-col>
        <v-col cols="3" class="text-right">Debe</v-col>
        <v-col cols="3" class="text-right">Haber</v-col>
        <v-col cols="1"></v-col>
      </v-row>

      <!-- Líneas dinámicas -->
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
          <v-text-field
            v-model="linea.debe"
            label="Debe"
            type="number"
            step="0.01"
            min="0"
            variant="outlined"
            density="compact"
            @update:model-value="linea.debe = Math.max(0, parseFloat(linea.debe) || 0); recalcularTotales()"
          />
        </v-col>
        <v-col cols="3" class="pr-2">
          <v-text-field
            v-model="linea.haber"
            label="Haber"
            type="number"
            step="0.01"
            min="0"
            variant="outlined"
            density="compact"
            @update:model-value="linea.haber = Math.max(0, parseFloat(linea.haber) || 0); recalcularTotales()"
          />
        </v-col>
        <v-col cols="1" class="d-flex align-center pt-2">
          <v-btn icon="mdi-close" size="x-small" color="error" variant="text" @click="eliminarLinea(idx)" />
        </v-col>
      </v-row>

      <!-- Botón agregar línea -->
      <v-row class="px-3 mt-2">
        <v-col cols="12">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" size="small" @click="agregarLinea">
            Agregar Línea
          </v-btn>
        </v-col>
      </v-row>

      <!-- Totales -->
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

      <!-- Botón guardar -->
      <v-row class="px-3 mt-4">
        <v-col cols="12" class="text-right">
          <v-btn color="success" variant="flat" prepend-icon="mdi-content-save" :loading="guardando" :disabled="!puedeGuardar" @click="guardarAsiento">
            Guardar Asiento
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const guardando = ref(false)
const snackbar = ref({ show: false, mensaje: '', color: 'success' })
const cuentasContables = ref([])

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
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/contabilidad/cuentas', {
      headers: { Authorization: `Bearer ${token}` },
    })
    // Aplanar el árbol jerárquico para el autocomplete
    const flat = res.data.flat || []
    cuentasContables.value = flat.map(c => ({
      id: c.id,
      label: `${c.codigo} - ${c.nombre}`,
      codigo: c.codigo,
      nombre: c.nombre,
    }))
  } catch (err) {
    console.error('Error al cargar cuentas:', err)
    snackbar.value = { show: true, mensaje: 'Error al cargar cuentas contables', color: 'error' }
  }
}

async function guardarAsiento() {
  if (!puedeGuardar.value) return
  guardando.value = true

  const token = localStorage.getItem('token')
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

    await axios.post('/api/v1/transacciones', payload, {
      headers: { Authorization: `Bearer ${token}` },
    })

    snackbar.value = { show: true, mensaje: 'Asiento manual creado exitosamente', color: 'success' }

    // Resetear formulario
    form.value = {
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      lineas: [
        { cuenta_contable_id: null, debe: 0, haber: 0, errorCuenta: '' },
        { cuenta_contable_id: null, debe: 0, haber: 0, errorCuenta: '' },
      ],
    }
    recalcularTotales()
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
  recalcularTotales()
})
</script>
