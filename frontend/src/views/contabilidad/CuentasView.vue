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
      <h3 class="text-h6 text-medium-emphasis">No hay cuentas contables</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">El catálogo de cuentas está vacío</p>
    </v-card>

    <!-- Tree View -->
    <v-row v-else>
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="pa-4">
          <v-treeview
            :items="cuentas"
            item-key="id"
            item-title="nombre"
            item-children="children"
            density="compact"
            hoverable
            activatable
            @update:activated="seleccionarCuenta"
          >
            <template v-slot:prepend="{ item }">
              <v-icon size="small" class="mr-2">{{ item.tipo === 'detalle' ? 'mdi-currency-usd' : 'mdi-folder' }}</v-icon>
            </template>
            <template v-slot:title="{ item }">
              <span class="text-caption">{{ item.codigo }}</span> {{ item.nombre }}
            </template>
          </v-treeview>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card v-if="cuentaSeleccionada" variant="outlined" class="pa-4">
          <v-card-title>{{ cuentaSeleccionada.codigo }} - {{ cuentaSeleccionada.nombre }}</v-card-title>
          <v-card-text>
            <p><strong>Tipo:</strong> {{ cuentaSeleccionada.tipo }}</p>
            <p><strong>Naturaleza:</strong> {{ cuentaSeleccionada.naturaleza || '—' }}</p>
            <p><strong>Nivel:</strong> {{ cuentaSeleccionada.nivel }}</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" variant="tonal" @click="verAsientos">Ver Asientos</v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-else variant="outlined" class="text-center pa-8">
          <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-cursor-default-click</v-icon>
          <p class="text-body-2 text-medium-emphasis">Seleccione una cuenta del árbol para ver sus detalles</p>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
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
const errorMsg = ref('')
const cuentas = ref([])
const cuentaSeleccionada = ref(null)
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

async function cargarCuentas() {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/v1/contabilidad/cuentas', { headers: { Authorization: `Bearer ${token}` } })
    cuentas.value = res.data?.datos || res.data || []
    if (!Array.isArray(cuentas.value)) cuentas.value = []
  } catch (err) {
    console.error('Error al cargar cuentas:', err)
    errorMsg.value = err.response?.data?.error || err.message || 'Error al cargar cuentas'
    cuentas.value = []
  } finally {
    loading.value = false
  }
}

function seleccionarCuenta(ids) {
  if (ids.length > 0) {
    const id = ids[0]
    const buscar = (items) => {
      for (const item of items) {
        if (item.id === id) return item
        if (item.children) { const r = buscar(item.children); if (r) return r }
      }
      return null
    }
    cuentaSeleccionada.value = buscar(cuentas.value)
  }
}

function verAsientos() {
  if (cuentaSeleccionada.value) {
    router.push(`/dashboard/contabilidad/asientos?cuenta_id=${cuentaSeleccionada.value.id}`)
  }
}

onMounted(() => cargarCuentas())
</script>
