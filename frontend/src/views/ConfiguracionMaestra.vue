<template>
  <v-app-bar color="primary" density="compact" elevation="2">
    <template v-slot:prepend>
      <v-icon class="ml-4">mdi-cog-outline</v-icon>
    </template>

    <v-app-bar-title>
      SPI ERP - Configuración Maestra
    </v-app-bar-title>

    <template v-slot:append>
      <v-chip class="mr-2" color="white" variant="text" prepend-icon="mdi-account">
        {{ usuario?.nombre || 'Usuario' }}
      </v-chip>
      <v-btn icon @click="irAlDashboard" class="mr-2">
        <v-icon>mdi-view-dashboard</v-icon>
        <v-tooltip activator="parent" location="bottom">Dashboard</v-tooltip>
      </v-btn>
      <v-btn icon @click="handleLogout" class="mr-2">
        <v-icon>mdi-logout</v-icon>
        <v-tooltip activator="parent" location="bottom">Cerrar sesión</v-tooltip>
      </v-btn>
    </template>
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-6">
      <!-- Selector de catálogo -->
      <v-row class="mb-4">
        <v-col cols="12" sm="6" md="4">
          <v-select
            v-model="catalogoSeleccionado"
            :items="catalogosDisponibles"
            item-title="nombre"
            item-value="clave"
            label="Seleccionar Catálogo"
            variant="outlined"
            density="compact"
            return-object
            clearable
            @update:model-value="cargarDatos"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                v-bind="props"
                :subtitle="item.raw.descripcion"
              />
            </template>
          </v-select>
        </v-col>

        <v-col cols="12" sm="6" md="4" v-if="catalogoSeleccionado">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Buscar..."
            variant="outlined"
            density="compact"
            hide-details
            single-line
            @input="buscarDatos"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4" v-if="catalogoSeleccionado" class="d-flex align-center">
          <v-switch
            v-model="incluirInactivos"
            label="Incluir inactivos"
            density="compact"
            hide-details
            @update:model-value="cargarDatos"
          />
        </v-col>
      </v-row>

      <!-- Tabla de datos del catálogo -->
      <v-card v-if="catalogoSeleccionado">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2">{{ catalogoSeleccionado.icono }}</v-icon>
          <span class="text-h6">{{ catalogoSeleccionado.nombre }}</span>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            @click="abrirDialogoNuevo"
            prepend-icon="mdi-plus"
          >
            Nuevo
          </v-btn>
        </v-card-title>

        <v-data-table
          :headers="headersDinamicos"
          :items="datosCatalogo"
          :loading="loading"
          :search="search"
          loading-text="Cargando datos..."
          no-data-text="No hay registros"
          class="elevation-1"
          hover
        >
          <!-- Columna de acciones -->
          <template v-slot:item.acciones="{ item }">
            <v-btn
              icon
              size="small"
              color="primary"
              variant="text"
              @click="abrirDialogoEditar(item)"
              class="mr-1"
            >
              <v-icon>mdi-pencil</v-icon>
              <v-tooltip activator="parent" location="bottom">Editar</v-tooltip>
            </v-btn>
            <v-btn
              icon
              size="small"
              :color="item.activo !== false ? 'error' : 'success'"
              variant="text"
              @click="toggleActivo(item)"
            >
              <v-icon>{{ item.activo !== false ? 'mdi-delete' : 'mdi-restore' }}</v-icon>
              <v-tooltip activator="parent" location="bottom">
                {{ item.activo !== false ? 'Desactivar' : 'Activar' }}
              </v-tooltip>
            </v-btn>
          </template>

          <!-- Formateo de booleanos -->
          <template v-slot:item.activo="{ item }">
            <v-chip
              :color="item.activo !== false ? 'success' : 'error'"
              size="x-small"
              variant="flat"
            >
              {{ item.activo !== false ? 'Sí' : 'No' }}
            </v-chip>
          </template>

          <!-- Formateo de fechas -->
          <template v-slot:item.created_at="{ item }">
            <span class="text-caption">{{ formatDate(item.created_at) }}</span>
          </template>
          <template v-slot:item.updated_at="{ item }">
            <span class="text-caption">{{ formatDate(item.updated_at) }}</span>
          </template>
        </v-data-table>
      </v-card>

      <!-- Mensaje cuando no hay catálogo seleccionado -->
      <v-card v-else class="d-flex align-center justify-center pa-12" variant="tonal">
        <div class="text-center">
          <v-icon size="64" color="primary" class="mb-4">mdi-database-cog</v-icon>
          <h3 class="text-h5 mb-2">Configuración Maestra</h3>
          <p class="text-body-1 text-medium-emphasis">
            Seleccione un catálogo del menú desplegable para administrar sus datos.
          </p>
        </div>
      </v-card>

      <!-- Diálogo de edición/creación -->
      <v-dialog v-model="dialogoVisible" max-width="600px" persistent>
        <v-card>
          <v-card-title class="pa-4">
            <v-icon class="mr-2">{{ dialogoEditando ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
            <span>{{ dialogoEditando ? 'Editar' : 'Nuevo' }} {{ catalogoSeleccionado?.nombre }}</span>
          </v-card-title>

          <v-card-text class="pa-4">
            <v-form ref="formRef">
              <v-row>
                <v-col
                  v-for="campo in camposFormulario"
                  :key="campo.key"
                  :cols="campo.cols || 12"
                >
                  <!-- Campo de texto -->
                  <v-text-field
                    v-if="campo.tipo === 'text' || campo.tipo === 'number' || campo.tipo === 'email'"
                    v-model="formulario[campo.key]"
                    :label="campo.label"
                    :type="campo.tipo || 'text'"
                    variant="outlined"
                    density="compact"
                    :rules="campo.required ? [v => !!v || `${campo.label} es requerido`] : []"
                    :disabled="campo.disabled"
                  />

                  <!-- Campo select -->
                  <v-select
                    v-if="campo.tipo === 'select'"
                    v-model="formulario[campo.key]"
                    :items="campo.items || []"
                    :label="campo.label"
                    variant="outlined"
                    density="compact"
                    :rules="campo.required ? [v => !!v || `${campo.label} es requerido`] : []"
                    item-title="text"
                    item-value="value"
                    clearable
                  />

                  <!-- Campo switch -->
                  <v-switch
                    v-if="campo.tipo === 'switch'"
                    v-model="formulario[campo.key]"
                    :label="campo.label"
                    density="compact"
                    hide-details
                  />

                  <!-- Campo textarea -->
                  <v-textarea
                    v-if="campo.tipo === 'textarea'"
                    v-model="formulario[campo.key]"
                    :label="campo.label"
                    variant="outlined"
                    density="compact"
                    rows="2"
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions class="pa-4">
            <v-spacer />
            <v-btn variant="outlined" @click="cerrarDialogo">
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :loading="guardando"
              @click="guardar"
            >
              {{ dialogoEditando ? 'Actualizar' : 'Crear' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar -->
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        :timeout="3000"
      >
        {{ snackbar.mensaje }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const usuario = ref(JSON.parse(localStorage.getItem('usuario') || '{}'))

// Estado
const catalogoSeleccionado = ref(null)
const datosCatalogo = ref([])
const loading = ref(false)
const search = ref('')
const incluirInactivos = ref(false)
const dialogoVisible = ref(false)
const dialogoEditando = ref(false)
const guardando = ref(false)
const formRef = ref(null)
const formulario = ref({})

const snackbar = ref({
  show: false,
  mensaje: '',
  color: 'success',
})

// Definición de catálogos disponibles
const catalogosDisponibles = [
  { clave: 'monedas', nombre: 'Monedas', icono: 'mdi-currency-usd', descripcion: 'Catálogo de monedas' },
  { clave: 'paises', nombre: 'Países', icono: 'mdi-earth', descripcion: 'Catálogo de países' },
  { clave: 'impuestos', nombre: 'Impuestos', icono: 'mdi-percent', descripcion: 'Catálogo de impuestos (IVA, IEPS, etc.)' },
  { clave: 'formas-pago', nombre: 'Formas de Pago', icono: 'mdi-credit-card', descripcion: 'Formas de pago (claves SAT)' },
  { clave: 'listas-precios', nombre: 'Listas de Precios', icono: 'mdi-tag', descripcion: 'Listas de precios con factor de descuento' },
  { clave: 'almacenes', nombre: 'Almacenes', icono: 'mdi-warehouse', descripcion: 'Catálogo de almacenes' },
  { clave: 'bancos', nombre: 'Bancos', icono: 'mdi-bank', descripcion: 'Catálogo de instituciones bancarias' },
  { clave: 'cuentas-contables', nombre: 'Cuentas Contables', icono: 'mdi-book-account', descripcion: 'Plan de cuentas contable (estructura de árbol)' },
  { clave: 'unidades-transporte', nombre: 'Unidades de Transporte', icono: 'mdi-truck', descripcion: 'Vehículos de transporte' },
  { clave: 'entidades', nombre: 'Entidades', icono: 'mdi-account-group', descripcion: 'Personas físicas/morales (clientes, proveedores, etc.)' },
  { clave: 'cuentas-bancarias', nombre: 'Cuentas Bancarias', icono: 'mdi-account-cash', descripcion: 'Cuentas bancarias de entidades' },
]

// Mapeo de campos por catálogo para el formulario dinámico
const camposPorCatalogo = {
  monedas: [
    { key: 'codigo', label: 'Código', tipo: 'text', required: true, cols: 6 },
    { key: 'nombre', label: 'Nombre', tipo: 'text', required: true, cols: 6 },
    { key: 'simbolo', label: 'Símbolo', tipo: 'text', cols: 6 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 6 },
  ],
  paises: [
    { key: 'codigo', label: 'Código (ISO)', tipo: 'text', required: true, cols: 4 },
    { key: 'nombre', label: 'Nombre', tipo: 'text', required: true, cols: 4 },
    { key: 'nacionalidad', label: 'Nacionalidad', tipo: 'text', cols: 4 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
  impuestos: [
    { key: 'nombre', label: 'Nombre', tipo: 'text', required: true, cols: 6 },
    { key: 'tasa', label: 'Tasa (%)', tipo: 'number', required: true, cols: 3 },
    { key: 'tipo', label: 'Tipo', tipo: 'select', required: true, cols: 3, items: [
      { text: 'IVA', value: 'IVA' },
      { text: 'IEPS', value: 'IEPS' },
      { text: 'ISR', value: 'ISR' },
      { text: 'Otro', value: 'Otro' },
    ]},
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
  'formas-pago': [
    { key: 'clave_sat', label: 'Clave SAT', tipo: 'text', required: true, cols: 4 },
    { key: 'nombre', label: 'Nombre', tipo: 'text', required: true, cols: 8 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
  'listas-precios': [
    { key: 'nombre', label: 'Nombre', tipo: 'text', required: true, cols: 6 },
    { key: 'factor_descuento', label: 'Factor Descuento (%)', tipo: 'number', cols: 6 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
  almacenes: [
    { key: 'nombre', label: 'Nombre', tipo: 'text', required: true, cols: 6 },
    { key: 'ubicacion', label: 'Ubicación', tipo: 'text', cols: 6 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
  bancos: [
    { key: 'nombre_corto', label: 'Nombre Corto', tipo: 'text', required: true, cols: 4 },
    { key: 'razon_social', label: 'Razón Social', tipo: 'text', required: true, cols: 8 },
    { key: 'clave_institucion', label: 'Clave Institución', tipo: 'text', required: true, cols: 4 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 8 },
  ],
  'cuentas-contables': [
    { key: 'codigo', label: 'Código', tipo: 'text', required: true, cols: 4 },
    { key: 'nombre', label: 'Nombre', tipo: 'text', required: true, cols: 8 },
    { key: 'nivel', label: 'Nivel', tipo: 'number', required: true, cols: 3 },
    { key: 'tipo', label: 'Tipo', tipo: 'select', required: true, cols: 3, items: [
      { text: 'Activo', value: 'Activo' },
      { text: 'Pasivo', value: 'Pasivo' },
      { text: 'Capital', value: 'Capital' },
      { text: 'Ingreso', value: 'Ingreso' },
      { text: 'Gasto', value: 'Gasto' },
      { text: 'Otro', value: 'Otro' },
    ]},
    { key: 'naturaleza', label: 'Naturaleza', tipo: 'select', required: true, cols: 3, items: [
      { text: 'Deudora', value: 'Deudora' },
      { text: 'Acreedora', value: 'Acreedora' },
    ]},
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 3 },
  ],
  'unidades-transporte': [
    { key: 'placa', label: 'Placa', tipo: 'text', required: true, cols: 4 },
    { key: 'modelo', label: 'Modelo', tipo: 'text', cols: 4 },
    { key: 'chofer_entidad_id', label: 'ID Chofer (Entidad)', tipo: 'number', cols: 4 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
  entidades: [
    { key: 'razon_social', label: 'Razón Social', tipo: 'text', required: true, cols: 6 },
    { key: 'nombre_comercial', label: 'Nombre Comercial', tipo: 'text', cols: 6 },
    { key: 'rfc', label: 'RFC', tipo: 'text', required: true, cols: 4 },
    { key: 'regimen_fiscal', label: 'Régimen Fiscal', tipo: 'text', cols: 4 },
    { key: 'cp', label: 'Código Postal', tipo: 'text', cols: 4 },
    { key: 'direccion', label: 'Dirección', tipo: 'textarea', cols: 12 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
  'cuentas-bancarias': [
    { key: 'entidad_id', label: 'ID Entidad', tipo: 'number', required: true, cols: 4 },
    { key: 'banco_id', label: 'ID Banco', tipo: 'number', required: true, cols: 4 },
    { key: 'moneda_id', label: 'ID Moneda', tipo: 'number', required: true, cols: 4 },
    { key: 'clabe', label: 'CLABE', tipo: 'text', required: true, cols: 6 },
    { key: 'numero_cuenta', label: 'Número de Cuenta', tipo: 'text', required: true, cols: 6 },
    { key: 'activo', label: 'Activo', tipo: 'switch', cols: 12 },
  ],
}

// Headers dinámicos para la tabla
const headersDinamicos = computed(() => {
  if (!catalogoSeleccionado.value) return []

  const campos = camposPorCatalogo[catalogoSeleccionado.value.clave]
  if (!campos) return [{ title: 'ID', key: 'id' }, { title: 'Acciones', key: 'acciones', sortable: false }]

  const headers = [{ title: 'ID', key: 'id', sortable: true, width: '80px' }]

  campos.forEach(campo => {
    if (campo.key !== 'activo') {
      headers.push({
        title: campo.label,
        key: campo.key,
        sortable: true,
      })
    }
  })

  headers.push({ title: 'Activo', key: 'activo', sortable: true, width: '100px' })
  headers.push({ title: 'Acciones', key: 'acciones', sortable: false, width: '120px' })

  return headers
})

// Campos del formulario para el catálogo seleccionado
const camposFormulario = computed(() => {
  if (!catalogoSeleccionado.value) return []
  return camposPorCatalogo[catalogoSeleccionado.value.clave] || []
})

// Funciones
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

async function cargarDatos() {
  if (!catalogoSeleccionado.value) return

  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = {}
    if (incluirInactivos.value) params.incluir_inactivos = 'true'
    if (search.value) params.search = search.value

    const response = await axios.get(`/api/v1/catalogos/${catalogoSeleccionado.value.clave}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    datosCatalogo.value = response.data.datos
  } catch (err) {
    console.error('Error al cargar datos:', err)
    mostrarSnackbar('Error al cargar datos', 'error')
    if (err.response?.status === 401) handleLogout()
  } finally {
    loading.value = false
  }
}

function buscarDatos() {
  // Debounce simple
  clearTimeout(window._searchTimeout)
  window._searchTimeout = setTimeout(() => {
    cargarDatos()
  }, 300)
}

function abrirDialogoNuevo() {
  dialogoEditando.value = false
  formulario.value = {}
  // Valores por defecto
  if (camposFormulario.value.some(c => c.key === 'activo')) {
    formulario.value.activo = true
  }
  dialogoVisible.value = true
}

function abrirDialogoEditar(item) {
  dialogoEditando.value = true
  formulario.value = { ...item }
  dialogoVisible.value = true
}

function cerrarDialogo() {
  dialogoVisible.value = false
  formulario.value = {}
  dialogoEditando.value = false
}

async function guardar() {
  if (!catalogoSeleccionado.value) return

  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    const clave = catalogoSeleccionado.value.clave

    if (dialogoEditando.value) {
      // Actualizar
      await axios.put(`/api/v1/catalogos/${clave}/${formulario.value.id}`, formulario.value, {
        headers: { Authorization: `Bearer ${token}` },
      })
      mostrarSnackbar('Registro actualizado exitosamente', 'success')
    } else {
      // Crear
      await axios.post(`/api/v1/catalogos/${clave}`, formulario.value, {
        headers: { Authorization: `Bearer ${token}` },
      })
      mostrarSnackbar('Registro creado exitosamente', 'success')
    }

    cerrarDialogo()
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar:', err)
    mostrarSnackbar(err.response?.data?.mensaje || 'Error al guardar', 'error')
  } finally {
    guardando.value = false
  }
}

async function toggleActivo(item) {
  try {
    const token = localStorage.getItem('token')
    const clave = catalogoSeleccionado.value.clave
    const nuevoEstado = item.activo !== false ? false : true

    await axios.put(`/api/v1/catalogos/${clave}/${item.id}`, { activo: nuevoEstado }, {
      headers: { Authorization: `Bearer ${token}` },
    })

    mostrarSnackbar(
      nuevoEstado ? 'Registro activado' : 'Registro desactivado',
      'success'
    )
    await cargarDatos()
  } catch (err) {
    console.error('Error al cambiar estado:', err)
    mostrarSnackbar('Error al cambiar estado', 'error')
  }
}

function mostrarSnackbar(mensaje, color = 'success') {
  snackbar.value = { show: true, mensaje, color }
}

function irAlDashboard() {
  router.push('/dashboard')
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  router.push('/login')
}
</script>

<style lang="scss" scoped>
</style>
