<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon size="36" color="success" class="mr-3">mdi-account</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Proveedores</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Catálogo de proveedores registrados</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="success" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogo(null)">
          Nuevo Proveedor
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" sm="4" md="3">
            <v-text-field
              v-model="filtros.search"
              label="Buscar"
              placeholder="Razón social, RFC..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3" md="2">
            <v-btn variant="outlined" prepend-icon="mdi-filter" @click="cargarDatos()" class="mr-2">
              Filtrar
            </v-btn>
            <v-btn variant="text" prepend-icon="mdi-refresh" @click="limpiarFiltros()">
              Limpiar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loader -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="success" size="48" width="4" />
      <p class="text-body-1 text-medium-emphasis mt-4">Cargando proveedores...</p>
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
      <template v-slot:title>Error al cargar proveedores</template>
      {{ errorMsg }}
      <template v-slot:append>
        <v-btn variant="text" color="error" @click="cargarDatos()">
          <v-icon left>mdi-refresh</v-icon> Reintentar
        </v-btn>
      </template>
    </v-alert>

    <!-- Empty state -->
    <v-card v-else-if="proveedores.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-outline</v-icon>
      <h3 class="text-h6 text-medium-emphasis">No se encontraron proveedores</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">No hay proveedores registrados en el sistema</p>
      <v-btn color="success" variant="tonal" prepend-icon="mdi-plus" class="mt-2" @click="abrirDialogo(null)">
        Agregar primer proveedor
      </v-btn>
    </v-card>

    <!-- Data Table -->
    <v-card v-else variant="outlined">
      <v-data-table
        :headers="columnas"
        :items="proveedores"
        :loading="loading"
        loading-text="Cargando proveedores..."
        :items-per-page="20"
        class="elevation-0"
      >
        <template v-slot:item.razon_social="{ item }">
          <strong>{{ item.razon_social }}</strong>
          <div v-if="item.nombre_comercial" class="text-caption text-medium-emphasis">{{ item.nombre_comercial }}</div>
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
    <v-dialog v-model="dialogoVisible" max-width="700px" persistent scrollable>
      <v-card>
        <v-card-title :class="'text-h5 ' + (editando ? 'bg-info' : 'bg-success') + ' text-white pa-4'">
          <v-icon class="mr-2">{{ editando ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ editando ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form ref="form">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="formData.razon_social" label="Razón Social *" variant="outlined" density="compact" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="formData.nombre_comercial" label="Nombre Comercial" variant="outlined" density="compact" />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field v-model="formData.rfc" label="RFC *" variant="outlined" density="compact" required :maxlength="13" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="formData.email" label="Email" variant="outlined" density="compact" type="email" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="formData.telefono" label="Teléfono" variant="outlined" density="compact" />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="formData.contacto_nombre" label="Nombre de Contacto" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="formData.regimen_fiscal" :items="regimenesFiscales" item-title="descripcion" item-value="clave_sat" label="Régimen Fiscal" variant="outlined" density="compact" clearable />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-textarea v-model="formData.direccion" label="Dirección" variant="outlined" density="compact" rows="2" />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field v-model="formData.cp" label="Código Postal" variant="outlined" density="compact" :maxlength="5" />
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
          <v-btn color="success" prepend-icon="mdi-content-save" :loading="guardando" @click="guardar">
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
const errorMsg = ref('')
const guardando = ref(false)
const proveedores = ref([])
const regimenesFiscales = ref([])
const dialogoVisible = ref(false)
const editando = ref(false)
const proveedorEditando = ref(null)

const filtros = ref({ search: '' })
const snackbar = ref({ show: false, text: '', color: 'success' })

const columnas = [
  { title: 'Razón Social', key: 'razon_social', sortable: true },
  { title: 'RFC', key: 'rfc', sortable: true },
  { title: 'Teléfono', key: 'telefono', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Activo', key: 'activo', sortable: true },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center', width: '80px' },
]

const formData = ref({
  razon_social: '',
  nombre_comercial: '',
  rfc: '',
  email: '',
  telefono: '',
  contacto_nombre: '',
  regimen_fiscal: '601',
  direccion: '',
  cp: '',
  activo: true,
})

async function cargarCatalogos() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/v1/catalogos/regimenes-fiscales', {
      headers: { Authorization: `Bearer ${token}` }
    })
    regimenesFiscales.value = res.data?.datos || res.data || []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
  }
}

async function cargarDatos() {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const params = { rol: 'proveedor' }
    if (filtros.value.search) params.search = filtros.value.search

    const res = await axios.get('/api/v1/entidades', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    proveedores.value = res.data?.datos || res.data || []
    if (!Array.isArray(proveedores.value)) proveedores.value = []
  } catch (err) {
    console.error('Error al cargar proveedores:', err)
    errorMsg.value = err.response?.data?.error || err.message || 'Error al cargar proveedores'
    proveedores.value = []
  } finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  filtros.value = { search: '' }
  cargarDatos()
}

function abrirDialogo(item) {
  editando.value = !!item
  proveedorEditando.value = item
  if (item) {
    formData.value = {
      razon_social: item.razon_social || '',
      nombre_comercial: item.nombre_comercial || '',
      rfc: item.rfc || '',
      email: item.email || '',
      telefono: item.telefono || '',
      contacto_nombre: item.contacto_nombre || '',
      regimen_fiscal: item.regimen_fiscal || '601',
      direccion: item.direccion || '',
      cp: item.cp || '',
      activo: item.activo !== false,
    }
  } else {
    formData.value = {
      razon_social: '',
      nombre_comercial: '',
      rfc: '',
      email: '',
      telefono: '',
      contacto_nombre: '',
      regimen_fiscal: '601',
      direccion: '',
      cp: '',
      activo: true,
    }
  }
  dialogoVisible.value = true
}

async function guardar() {
  if (!formData.value.razon_social || !formData.value.rfc) {
    snackbar.value = { show: true, text: 'Razón social y RFC son requeridos', color: 'warning' }
    return
  }

  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    const payload = {
      ...formData.value,
      roles: ['proveedor'],
    }

    if (editando.value && proveedorEditando.value) {
      await axios.put(`/api/v1/entidades/${proveedorEditando.value.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      snackbar.value = { show: true, text: 'Proveedor actualizado exitosamente', color: 'success' }
    } else {
      await axios.post('/api/v1/entidades', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      snackbar.value = { show: true, text: 'Proveedor creado exitosamente', color: 'success' }
    }

    dialogoVisible.value = false
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar proveedor:', err)
    snackbar.value = { show: true, text: err.response?.data?.error || 'Error al guardar', color: 'error' }
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarDatos()
  cargarCatalogos()
})
</script>
