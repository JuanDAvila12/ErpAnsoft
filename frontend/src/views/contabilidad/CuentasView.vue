<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon color="primary" size="36" class="mr-3">mdi-book-open-page-variant</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Catálogo de Cuentas</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Plan de cuentas contables</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogo(null)">
          Nueva Cuenta
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loader -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" size="48" width="4" />
      <p class="text-body-1 text-medium-emphasis mt-4">Cargando catálogo de cuentas...</p>
    </div>

    <!-- Error -->
    <v-alert
      v-else-if="errorMsg"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="errorMsg = ''"
    >
      <template v-slot:title>Error al cargar cuentas contables</template>
      {{ errorMsg }}
      <template v-slot:append>
        <v-btn variant="text" color="error" @click="cargarCuentas()">
          <v-icon left>mdi-refresh</v-icon> Reintentar
        </v-btn>
      </template>
    </v-alert>

    <!-- Empty state -->
    <v-card v-else-if="cuentas.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-book-open-outline</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No hay cuentas contables registradas</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">El catálogo de cuentas está vacío</p>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" class="mt-2" @click="abrirDialogo(null)">
        Crear primera cuenta
      </v-btn>
    </v-card>

    <!-- Data Table -->
    <v-card v-else variant="outlined">
      <v-data-table
        :headers="columnas"
        :items="cuentas"
        :loading="loading"
        loading-text="Cargando cuentas contables..."
        :items-per-page="25"
        class="elevation-0"
      >
        <template v-slot:item.codigo="{ item }">
          <span class="font-weight-medium">{{ item.codigo }}</span>
        </template>
        <template v-slot:item.tipo="{ item }">
          <v-chip :color="colorTipo(item.tipo)" size="x-small" variant="tonal">
            {{ item.tipo }}
          </v-chip>
        </template>
        <template v-slot:item.naturaleza="{ item }">
          <v-chip :color="item.naturaleza === 'deudora' ? 'info' : 'warning'" size="x-small" variant="tonal" v-if="item.naturaleza">
            {{ item.naturaleza }}
          </v-chip>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template v-slot:item.padre_id="{ item }">
          {{ nombrePadre(item.padre_id) }}
        </template>
        <template v-slot:item.acciones="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="abrirDialogo(item)">
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="bottom">Editar</v-tooltip>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo Nueva/Editar Cuenta -->
    <v-dialog v-model="dialogoVisible" max-width="600px" persistent scrollable>
      <v-card>
        <v-card-title :class="'text-h5 ' + (editando ? 'bg-info' : 'bg-primary') + ' text-white pa-4'">
          <v-icon class="mr-2">{{ editando ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ editando ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form ref="form">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="formData.codigo" label="Código *" variant="outlined" density="compact" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="formData.nombre" label="Nombre *" variant="outlined" density="compact" required />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.tipo"
                  :items="tiposDisponibles"
                  label="Tipo *"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="formData.nivel" label="Nivel" type="number" variant="outlined" density="compact" min="1" max="6" />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.naturaleza"
                  :items="['deudora', 'acreedora']"
                  label="Naturaleza"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  v-model="formData.padre_id"
                  :items="cuentas"
                  item-title="nombre"
                  item-value="id"
                  label="Cuenta Padre"
                  variant="outlined"
                  density="compact"
                  clearable
                  :return-object="false"
                  no-data-text="No hay cuentas disponibles"
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.codigo" />
                  </template>
                </v-autocomplete>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-switch v-model="formData.activo" label="Activo" color="success" density="compact" hide-details />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoVisible = false">Cancelar</v-btn>
          <v-btn color="primary" prepend-icon="mdi-content-save" :loading="guardando" @click="guardar">
            {{ editando ? 'Actualizar' : 'Guardar' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import apiClient from '@/plugins/axios'

const loading = ref(false)
const errorMsg = ref('')
const guardando = ref(false)
const cuentas = ref([])
const dialogoVisible = ref(false)
const editando = ref(false)
const cuentaEditando = ref(null)
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const tiposDisponibles = ['mayor', 'control', 'detalle']

const columnas = [
  { title: 'Código', key: 'codigo', sortable: true, width: '100px' },
  { title: 'Nombre', key: 'nombre', sortable: true },
  { title: 'Tipo', key: 'tipo', sortable: true, width: '100px' },
  { title: 'Nivel', key: 'nivel', sortable: true, width: '70px' },
  { title: 'Naturaleza', key: 'naturaleza', sortable: true, width: '110px' },
  { title: 'Cuenta Padre', key: 'padre_id', sortable: false },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center', width: '80px' },
]

const formData = ref({
  codigo: '',
  nombre: '',
  tipo: 'detalle',
  nivel: 1,
  naturaleza: 'deudora',
  padre_id: null,
  activo: true,
})

function colorTipo(tipo) {
  const colores = { mayor: 'primary', control: 'secondary', detalle: 'success' }
  return colores[tipo] || 'grey'
}

function nombrePadre(padreId) {
  if (!padreId) return '—'
  const padre = cuentas.value.find(c => c.id === padreId)
  return padre ? `${padre.codigo} - ${padre.nombre}` : '—'
}

async function cargarCuentas() {
  loading.value = true
  errorMsg.value = ''
  cuentas.value = []
  try {
    const res = await apiClient.get('/api/v1/cuentas-contables')
    // El endpoint devuelve el array directamente
    cuentas.value = Array.isArray(res.data) ? res.data : (res.data?.datos || [])
  } catch (err) {
    console.error('Error al cargar cuentas:', err)
    errorMsg.value = err.response?.data?.error || err.message || 'Error al cargar cuentas contables'
    cuentas.value = []
  } finally {
    loading.value = false
  }
}

function abrirDialogo(item) {
  editando.value = !!item
  cuentaEditando.value = item
  if (item) {
    formData.value = {
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      tipo: item.tipo || 'detalle',
      nivel: item.nivel || 1,
      naturaleza: item.naturaleza || 'deudora',
      padre_id: item.padre_id || null,
      activo: item.activo !== false,
    }
  } else {
    formData.value = {
      codigo: '',
      nombre: '',
      tipo: 'detalle',
      nivel: 1,
      naturaleza: 'deudora',
      padre_id: null,
      activo: true,
    }
  }
  dialogoVisible.value = true
}

async function guardar() {
  if (!formData.value.codigo || !formData.value.nombre || !formData.value.tipo) {
    snackbar.value = { show: true, mensaje: 'Código, nombre y tipo son requeridos', color: 'warning' }
    return
  }

  guardando.value = true
  try {
    const payload = {
      codigo: formData.value.codigo,
      nombre: formData.value.nombre,
      tipo: formData.value.tipo,
      nivel: parseInt(formData.value.nivel) || 1,
      naturaleza: formData.value.naturaleza || null,
      padre_id: formData.value.padre_id || null,
      activo: formData.value.activo !== false,
    }

    if (editando.value && cuentaEditando.value) {
      await apiClient.put(`/api/v1/cuentas-contables/${cuentaEditando.value.id}`, payload)
      snackbar.value = { show: true, mensaje: 'Cuenta actualizada exitosamente', color: 'success' }
    } else {
      await apiClient.post('/api/v1/cuentas-contables', payload)
      snackbar.value = { show: true, mensaje: 'Cuenta creada exitosamente', color: 'success' }
    }

    dialogoVisible.value = false
    await cargarCuentas()
  } catch (err) {
    console.error('Error al guardar cuenta:', err)
    snackbar.value = { show: true, mensaje: err.response?.data?.error || err.message || 'Error al guardar', color: 'error' }
  } finally {
    guardando.value = false
  }
}

onMounted(() => cargarCuentas())
</script>
