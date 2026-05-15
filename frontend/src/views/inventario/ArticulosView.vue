<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-icon size="36" color="warning" class="mr-3">mdi-package</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-0">Artículos</h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-0">Catálogo de artículos y productos</p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-right d-flex align-center justify-end">
        <v-btn color="warning" variant="elevated" prepend-icon="mdi-plus-circle" @click="abrirDialogo(null)">
          Nuevo Artículo
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
              placeholder="Nombre, SKU o código de barras"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3" md="2">
            <v-btn variant="outlined" prepend-icon="mdi-filter" @click="cargarDatos()">
              Filtrar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-card variant="outlined">
      <v-data-table
        :headers="columnas"
        :items="articulos"
        :loading="loading"
        loading-text="Cargando artículos..."
        :items-per-page="20"
        class="elevation-0"
      >
        <template v-slot:item.sku="{ item }">
          <strong>{{ item.sku }}</strong>
        </template>
        <template v-slot:item.precio_venta="{ item }">
          ${{ Number(item.precio_venta).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
        <template v-slot:item.costo_promedio="{ item }">
          ${{ Number(item.costo_promedio).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
        <template v-slot:item.usa_serie="{ item }">
          <v-icon :color="item.usa_serie ? 'success' : 'grey'">
            {{ item.usa_serie ? 'mdi-check-circle' : 'mdi-close-circle' }}
          </v-icon>
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
        <v-card-title :class="'text-h5 ' + (editando ? 'bg-info' : 'bg-warning') + ' text-white pa-4'">
          <v-icon class="mr-2">{{ editando ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ editando ? 'Editar Artículo' : 'Nuevo Artículo' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form ref="form">
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.sku"
                  label="SKU *"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="formData.nombre"
                  label="Nombre *"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="formData.precio_venta"
                  label="Precio Venta"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  min="0"
                  step="0.01"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="formData.costo_promedio"
                  label="Costo Promedio"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  min="0"
                  step="0.01"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="formData.stock_minimo"
                  label="Stock Mínimo"
                  type="number"
                  variant="outlined"
                  density="compact"
                  min="0"
                  step="1"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="formData.clave_sat"
                  label="Clave SAT"
                  variant="outlined"
                  density="compact"
                  :maxlength="8"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.unidad_medida_id"
                  :items="unidadesMedida"
                  item-title="nombre"
                  item-value="id"
                  label="Unidad Medida"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.categoria_id"
                  :items="categorias"
                  item-title="nombre"
                  item-value="id"
                  label="Categoría"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.marca_id"
                  :items="marcas"
                  item-title="nombre"
                  item-value="id"
                  label="Marca"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.codigo_barras"
                  label="Código de Barras"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.impuesto_id"
                  :items="impuestos"
                  item-title="nombre"
                  item-value="id"
                  label="Impuesto"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-switch
                  v-model="formData.usa_serie"
                  label="Usa Serie"
                  color="warning"
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
const articulos = ref([])
const unidadesMedida = ref([])
const categorias = ref([])
const marcas = ref([])
const impuestos = ref([])
const dialogoVisible = ref(false)
const editando = ref(false)
const articuloEditando = ref(null)

const filtros = ref({ search: '' })

const snackbar = ref({ show: false, text: '', color: 'success' })

const columnas = [
  { title: 'SKU', key: 'sku', sortable: true },
  { title: 'Nombre', key: 'nombre', sortable: true },
  { title: 'Precio Venta', key: 'precio_venta', sortable: true, align: 'end' },
  { title: 'Costo Prom.', key: 'costo_promedio', sortable: true, align: 'end' },
  { title: 'Unidad', key: 'unidad_medida_nombre', sortable: true },
  { title: 'Categoría', key: 'categoria_nombre', sortable: true },
  { title: 'Marca', key: 'marca_nombre', sortable: true },
  { title: 'Usa Serie', key: 'usa_serie', sortable: true, align: 'center', width: '80px' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center', width: '80px' },
]

const formData = ref({
  sku: '',
  nombre: '',
  precio_venta: 0,
  costo_promedio: 0,
  clave_sat: '',
  unidad_medida_id: null,
  categoria_id: null,
  marca_id: null,
  codigo_barras: '',
  usa_serie: false,
  impuesto_id: null,
  stock_minimo: 0,
  activo: true,
})

async function cargarCatalogos() {
  try {
    const token = localStorage.getItem('token')
    const [umRes, catRes, marRes, impRes] = await Promise.all([
      axios.get('/api/v1/catalogos/unidades-medida', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/catalogos/categorias', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/catalogos/marcas', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/v1/catalogos/impuestos', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    unidadesMedida.value = umRes.data?.datos || umRes.data || []
    categorias.value = catRes.data?.datos || catRes.data || []
    marcas.value = marRes.data?.datos || marRes.data || []
    impuestos.value = impRes.data?.datos || impRes.data || []
  } catch (err) {
    console.error('Error al cargar catálogos:', err)
  }
}

async function cargarDatos() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = {}
    if (filtros.value.search) params.search = filtros.value.search

    const res = await axios.get('/api/v1/articulos', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    articulos.value = res.data?.datos || res.data || []
  } catch (err) {
    console.error('Error al cargar artículos:', err)
    snackbar.value = { show: true, text: 'Error al cargar artículos', color: 'error' }
  } finally {
    loading.value = false
  }
}

function abrirDialogo(item) {
  editando.value = !!item
  articuloEditando.value = item
  if (item) {
    formData.value = {
      sku: item.sku || '',
      nombre: item.nombre || '',
      precio_venta: item.precio_venta || 0,
      costo_promedio: item.costo_promedio || 0,
      clave_sat: item.clave_sat || '',
      unidad_medida_id: item.unidad_medida_id || null,
      categoria_id: item.categoria_id || null,
      marca_id: item.marca_id || null,
      codigo_barras: item.codigo_barras || '',
      usa_serie: item.usa_serie || false,
      impuesto_id: item.impuesto_id || null,
      stock_minimo: item.stock_minimo || 0,
      activo: item.activo !== false,
    }
  } else {
    formData.value = {
      sku: '',
      nombre: '',
      precio_venta: 0,
      costo_promedio: 0,
      clave_sat: '',
      unidad_medida_id: null,
      categoria_id: null,
      marca_id: null,
      codigo_barras: '',
      usa_serie: false,
      impuesto_id: null,
      stock_minimo: 0,
      activo: true,
    }
  }
  dialogoVisible.value = true
}

async function guardar() {
  if (!formData.value.sku || !formData.value.nombre) {
    snackbar.value = { show: true, text: 'SKU y nombre son requeridos', color: 'warning' }
    return
  }

  guardando.value = true
  try {
    const token = localStorage.getItem('token')
    const payload = { ...formData.value }
    payload.precio_venta = parseFloat(payload.precio_venta) || 0
    payload.costo_promedio = parseFloat(payload.costo_promedio) || 0
    payload.stock_minimo = parseFloat(payload.stock_minimo) || 0

    if (editando.value && articuloEditando.value) {
      await axios.put(`/api/v1/articulos/${articuloEditando.value.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      snackbar.value = { show: true, text: 'Artículo actualizado exitosamente', color: 'success' }
    } else {
      await axios.post('/api/v1/articulos', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      snackbar.value = { show: true, text: 'Artículo creado exitosamente', color: 'success' }
    }

    dialogoVisible.value = false
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar artículo:', err)
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
