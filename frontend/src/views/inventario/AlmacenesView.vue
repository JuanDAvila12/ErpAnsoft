<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon size="36" color="warning" class="mr-3">mdi-warehouse</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Almacenes</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Gestión de almacenes y ubicaciones</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="warning" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogo(null)">
          Nuevo Almacén
        </v-btn>
      </v-col>
    </v-row>

    <!-- Data Table -->
    <v-card variant="outlined">
      <v-data-table
        :headers="columnas"
        :items="almacenes"
        :loading="loading"
        loading-text="Cargando almacenes..."
        :items-per-page="20"
        class="elevation-0"
      >
        <template v-slot:item.nombre="{ item }">
          <strong>{{ item.nombre }}</strong>
        </template>
        <template v-slot:item.activo="{ item }">
          <v-chip :color="item.activo ? 'success' : 'error'" size="x-small" variant="tonal">
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </template>
        <template v-slot:item.acciones="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="abrirDialogo(item)">
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="bottom">Editar</v-tooltip>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo Crear/Editar -->
    <v-dialog v-model="dialogoVisible" max-width="500px" persistent>
      <v-card>
        <v-card-title :class="'text-h5 ' + (editando ? 'bg-info' : 'bg-warning') + ' text-white pa-4'">
          <v-icon class="mr-2">{{ editando ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ editando ? 'Editar Almacén' : 'Nuevo Almacén' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form ref="form">
            <v-text-field
              v-model="formData.nombre"
              label="Nombre *"
              variant="outlined"
              density="compact"
              required
              class="mb-3"
            />
            <v-text-field
              v-model="formData.ubicacion"
              label="Ubicación"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-switch
              v-model="formData.activo"
              label="Activo"
              color="success"
              density="compact"
              hide-details
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoVisible = false">Cancelar</v-btn>
          <v-btn
            color="warning"
            prepend-icon="mdi-content-save"
            :loading="guardando"
            @click="guardar"
          >
            {{ editando ? 'Actualizar' : 'Guardar' }}
          </v-btn>
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
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const guardando = ref(false)
const almacenes = ref([])
const dialogoVisible = ref(false)
const editando = ref(false)
const almacenEditando = ref(null)

const snackbar = ref({ show: false, text: '', color: 'success' })

const columnas = [
  { title: 'Nombre', key: 'nombre', sortable: true },
  { title: 'Ubicación', key: 'ubicacion', sortable: true },
  { title: 'Activo', key: 'activo', sortable: true },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center', width: '80px' },
]

const formData = ref({
  nombre: '',
  ubicacion: '',
  activo: true,
})

async function cargarDatos() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/v1/inventario/almacenes', {
      headers: { Authorization: `Bearer ${token}` }
    })
    almacenes.value = res.data?.datos || res.data || []
  } catch (err) {
    console.error('Error al cargar almacenes:', err)
    snackbar.value = { show: true, text: 'Error al cargar almacenes', color: 'error' }
  } finally {
    loading.value = false
  }
}

function abrirDialogo(item) {
  editando.value = !!item
  almacenEditando.value = item
  if (item) {
    formData.value = {
      nombre: item.nombre || '',
      ubicacion: item.ubicacion || '',
      activo: item.activo !== false,
    }
  } else {
    formData.value = { nombre: '', ubicacion: '', activo: true }
  }
  dialogoVisible.value = true
}

async function guardar() {
  if (!formData.value.nombre) {
    snackbar.value = { show: true, text: 'El nombre es requerido', color: 'warning' }
    return
  }

  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    const payload = { ...formData.value }

    if (editando.value && almacenEditando.value) {
      await axios.put(`/api/v1/inventario/almacenes/${almacenEditando.value.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      snackbar.value = { show: true, text: 'Almacén actualizado exitosamente', color: 'success' }
    } else {
      await axios.post('/api/v1/inventario/almacenes', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      snackbar.value = { show: true, text: 'Almacén creado exitosamente', color: 'success' }
    }

    dialogoVisible.value = false
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al guardar', color: 'error' }
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarDatos()
})
</script>
