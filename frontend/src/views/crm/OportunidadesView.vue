<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="orange" size="36" class="mr-3">mdi-chart-line</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Oportunidades</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="dialogoNuevo = true">Nueva Oportunidad</v-btn>
    </div>
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" sm="4"><v-select v-model="filtroEtapa" :items="etapas" label="Etapa" clearable variant="outlined" density="compact" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="filtroBusqueda" label="Buscar" variant="outlined" density="compact" clearable /></v-col>
      </v-row>
    </v-card>
    <v-data-table :headers="headers" :items="oportunidades" :loading="loading" :items-per-page="15" class="elevation-1">
      <template v-slot:item.monto_estimado="{ item }">${{ (item.monto_estimado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</template>
      <template v-slot:item.probabilidad="{ item }">{{ item.probabilidad }}%</template>
      <template v-slot:item.etapa="{ item }">
        <v-chip :color="item.etapa === 'ganado' ? 'success' : item.etapa === 'perdido' ? 'error' : 'warning'" size="small">{{ item.etapa }}</v-chip>
      </template>
      <template v-slot:item.fecha_cierre="{ item }">{{ item.fecha_cierre ? new Date(item.fecha_cierre).toLocaleDateString('es-MX') : 'N/A' }}</template>
      <template v-slot:item.acciones="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="editar(item)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="eliminar(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialogoNuevo" max-width="600" persistent>
      <v-card>
        <v-card-title class="text-h5">{{ editando ? 'Editar' : 'Nueva' }} Oportunidad</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12"><v-autocomplete v-model="form.entidad_id" :items="clientes" item-title="razon_social" item-value="id" label="Cliente *" variant="outlined" /></v-col>
            <v-col cols="12"><v-text-field v-model="form.nombre" label="Nombre de oportunidad *" variant="outlined" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="form.monto_estimado" label="Monto estimado" type="number" prefix="$" variant="outlined" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="form.probabilidad" label="Probabilidad (%)" type="number" min="0" max="100" variant="outlined" /></v-col>
            <v-col cols="12" sm="6"><v-select v-model="form.etapa" :items="etapas" label="Etapa" variant="outlined" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="form.fecha_cierre" label="Fecha cierre" type="date" variant="outlined" /></v-col>
            <v-col cols="12"><v-autocomplete v-model="form.vendedor_entidad_id" :items="vendedores" item-title="razon_social" item-value="id" label="Vendedor" variant="outlined" /></v-col>
            <v-col cols="12"><v-textarea v-model="form.descripcion" label="Descripción" variant="outlined" rows="3" /></v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer /><v-btn variant="text" @click="cerrarDialogo">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" @click="guardar" :disabled="!form.entidad_id || !form.nombre">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.mensaje }}<template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template></v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false); const guardando = ref(false)
const oportunidades = ref([]); const clientes = ref([]); const vendedores = ref([])
const dialogoNuevo = ref(false); const editando = ref(false)
const filtroEtapa = ref(null); const filtroBusqueda = ref('')
const etapas = ['nuevo', 'calificado', 'propuesta', 'negociacion', 'ganado', 'perdido']
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const headers = [
  { title: 'Nombre', key: 'nombre', sortable: true }, { title: 'Cliente', key: 'entidad_nombre', sortable: true },
  { title: 'Monto', key: 'monto_estimado', sortable: true }, { title: 'Prob.', key: 'probabilidad', sortable: true },
  { title: 'Etapa', key: 'etapa', sortable: true }, { title: 'Cierre', key: 'fecha_cierre', sortable: true },
  { title: 'Vendedor', key: 'vendedor_nombre', sortable: true }, { title: 'Acciones', key: 'acciones', sortable: false },
]

const form = ref({ entidad_id: null, nombre: '', monto_estimado: 0, probabilidad: 0, etapa: 'nuevo', fecha_cierre: '', vendedor_entidad_id: null, descripcion: '' })

function cerrarDialogo() {
  dialogoNuevo.value = false; editando.value = false
  form.value = { entidad_id: null, nombre: '', monto_estimado: 0, probabilidad: 0, etapa: 'nuevo', fecha_cierre: '', vendedor_entidad_id: null, descripcion: '' }
}

async function cargarDatos() {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    const params = {}
    if (filtroEtapa.value) params.etapa = filtroEtapa.value
    if (filtroBusqueda.value) params.search = filtroBusqueda.value
    const [r, c, v] = await Promise.all([
      axios.get('/api/v1/oportunidades', { params, headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/entidades?rol=cliente', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/entidades?rol=vendedor', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    oportunidades.value = r.data.datos || []; clientes.value = c.data.datos || []; vendedores.value = v.data.datos || []
  } catch (err) { snackbar.value = { show: true, mensaje: 'Error al cargar', color: 'error' } }
  finally { loading.value = false }
}

async function guardar() {
  guardando.value = true
  const token = localStorage.getItem('token')
  try {
    if (editando.value) {
      await axios.put(`/api/v1/oportunidades/${form.value.id}`, form.value, { headers: { Authorization: `Bearer ${token}` } })
      snackbar.value = { show: true, mensaje: 'Oportunidad actualizada', color: 'success' }
    } else {
      await axios.post('/api/v1/oportunidades', form.value, { headers: { Authorization: `Bearer ${token}` } })
      snackbar.value = { show: true, mensaje: 'Oportunidad creada', color: 'success' }
    }
    cerrarDialogo(); await cargarDatos()
  } catch (err) { snackbar.value = { show: true, mensaje: err.response?.data?.error || 'Error', color: 'error' } }
  finally { guardando.value = false }
}

function editar(item) {
  form.value = { ...item }; editando.value = true; dialogoNuevo.value = true
}

async function eliminar(item) {
  if (!confirm(`¿Eliminar la oportunidad "${item.nombre}"?`)) return
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/v1/oportunidades/${item.id}`, { headers: { Authorization: `Bearer ${token}` } })
    snackbar.value = { show: true, mensaje: 'Oportunidad eliminada', color: 'success' }; await cargarDatos()
  } catch (err) { snackbar.value = { show: true, mensaje: 'Error al eliminar', color: 'error' } }
}

onMounted(() => cargarDatos())
</script>
