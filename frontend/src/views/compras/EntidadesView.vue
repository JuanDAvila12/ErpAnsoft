<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon size="36" color="primary" class="mr-3">mdi-account-multiple</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Entidades</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Gestión de clientes, proveedores y contactos</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogo(null)">
          Nueva Entidad
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
            <v-select
              v-model="filtros.rol"
              :items="rolesDisponibles"
              label="Rol"
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
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Error Alert -->
    <v-alert
      v-if="errorMsg"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="errorMsg = ''"
    >
      {{ errorMsg }}
    </v-alert>

    <!-- Data Table -->
    <v-card variant="outlined">
      <!-- Mensaje cuando no hay datos -->
      <template v-if="!loading && entidades.length === 0">
        <v-card-text class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-multiple-off</v-icon>
          <h3 class="text-h6 text-medium-emphasis">No hay entidades registradas</h3>
          <p class="text-body-2 text-medium-emphasis mt-1">Cree una nueva entidad usando el botón "Nueva Entidad"</p>
        </v-card-text>
      </template>
      <v-data-table
        v-else
        :headers="columnas"
        :items="entidades"
        :loading="loading"
        loading-text="Cargando entidades..."
        :items-per-page="20"
        class="elevation-0"
      >

        <template v-slot:item.razon_social="{ item }">
          <strong>{{ item.razon_social }}</strong>
          <div v-if="item.nombre_comercial" class="text-caption text-medium-emphasis">{{ item.nombre_comercial }}</div>
        </template>
        <template v-slot:item.roles="{ item }">
          <v-chip
            v-for="rol in (item.roles || [])"
            :key="rol"
            size="x-small"
            :color="rol === 'proveedor' ? 'success' : rol === 'cliente' ? 'primary' : 'grey'"
            variant="tonal"
            class="mr-1"
          >
            {{ rol }}
          </v-chip>
          <span v-if="!item.roles || item.roles.length === 0" class="text-medium-emphasis">—</span>
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
        <v-card-title :class="'text-h5 d-flex align-center ' + (editando ? 'bg-info' : 'bg-primary') + ' text-white pa-4'">
          <v-icon class="mr-2">{{ editando ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          <span class="flex-grow-1">{{ editando ? 'Editar Entidad' : 'Nueva Entidad' }}</span>
          <v-btn icon variant="text" color="white" @click="dialogoVisible = false" size="small">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-4">
          <v-form ref="form">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.razon_social"
                  label="Razón Social *"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.nombre_comercial"
                  label="Nombre Comercial"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.rfc"
                  label="RFC *"
                  variant="outlined"
                  density="compact"
                  required
                  :maxlength="13"
                  :rules="[v => !v || v.length >= 12 || 'RFC inválido']"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.email"
                  label="Email"
                  variant="outlined"
                  density="compact"
                  type="email"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.telefono"
                  label="Teléfono"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.contacto_nombre"
                  label="Nombre de Contacto"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.regimen_fiscal"
                  :items="regimenesFiscales"
                  item-title="descripcion"
                  item-value="clave_sat"
                  label="Régimen Fiscal"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="formData.direccion"
                  label="Dirección"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.cp"
                  label="Código Postal"
                  variant="outlined"
                  density="compact"
                  :maxlength="5"
                />
              </v-col>
            </v-row>

            <v-divider class="my-3" />
            <h4 class="text-subtitle-1 font-weight-bold mb-2">Roles</h4>
            <v-row>
              <v-col v-for="rol in rolesDisponibles" :key="rol" cols="6" md="3">
                <v-checkbox
                  v-model="formData.roles"
                  :label="capitalize(rol)"
                  :value="rol"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="formData.activo"
                  label="Activo"
                  color="success"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoVisible = false">Cancelar</v-btn>
          <v-btn
            color="primary"
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
import apiClient from '@/plugins/axios'

const loading = ref(false)
const guardando = ref(false)
const entidades = ref([])
const regimenesFiscales = ref([])
const dialogoVisible = ref(false)
const editando = ref(false)
const entidadEditando = ref(null)
const errorMsg = ref('')

const rolesDisponibles = ['cliente', 'proveedor', 'vendedor', 'contacto', 'empleado']

const filtros = ref({ search: '', rol: '' })

const snackbar = ref({ show: false, text: '', color: 'success' })


const columnas = [
  { title: 'Razón Social', key: 'razon_social', sortable: true },
  { title: 'RFC', key: 'rfc', sortable: true },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Teléfono', key: 'telefono', sortable: false },
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
  roles: [],
  activo: true,
})

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

async function cargarCatalogos() {
  try {
    const res = await apiClient.get('/api/v1/catalogos/regimenes-fiscales')
    regimenesFiscales.value = res.data?.datos || res.data || []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
  }
}

async function cargarDatos() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = {}
    if (filtros.value.search) params.search = filtros.value.search
    if (filtros.value.rol) params.rol = filtros.value.rol

    const res = await apiClient.get('/api/v1/entidades', { params })
    entidades.value = res.data?.datos || res.data || []
  } catch (err) {
    console.error('Error al cargar entidades:', err)
    errorMsg.value = err.response?.data?.error || 'Error al cargar entidades. Verifique la conexión con el servidor.'
    snackbar.value = { show: true, text: 'Error al cargar entidades', color: 'error' }
  } finally {
    loading.value = false
  }
}


function abrirDialogo(item) {
  editando.value = !!item
  entidadEditando.value = item
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
      roles: item.roles || [],
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
      roles: [],
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
    const payload = { ...formData.value }

    if (editando.value && entidadEditando.value) {
      await apiClient.put(`/api/v1/entidades/${entidadEditando.value.id}`, payload)
      snackbar.value = { show: true, text: 'Entidad actualizada exitosamente', color: 'success' }
    } else {
      await apiClient.post('/api/v1/entidades', payload)
      snackbar.value = { show: true, text: 'Entidad creada exitosamente', color: 'success' }
    }


    dialogoVisible.value = false
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar entidad:', err)
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
