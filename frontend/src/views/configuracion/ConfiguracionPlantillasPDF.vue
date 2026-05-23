<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="grey" size="36" class="mr-3">mdi-file-document-edit-outline</v-icon>
      <div>
        <h2 class="text-h4 font-weight-bold mb-0">Plantillas PDF</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">Configuración de plantillas HTML para generación de PDF</p>
      </div>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="dialogoNueva = true">Nueva Plantilla</v-btn>
    </div>

    <v-alert v-if="errorMsg" type="error" closable class="mb-4" @click:close="errorMsg = ''">{{ errorMsg }}</v-alert>
    <v-alert v-if="successMsg" type="success" closable class="mb-4" @click:close="successMsg = ''">{{ successMsg }}</v-alert>

    <!-- Tabla de plantillas -->
    <v-card variant="tonal" class="mb-4">
      <v-data-table
        :headers="columnas"
        :items="plantillas"
        :loading="loading"
        loading-text="Cargando plantillas..."
        :items-per-page="20"
        class="elevation-0"
        item-value="id"
        @click:row="seleccionarPlantilla"
      >
        <template v-slot:item.activo="{ item }">
          <v-chip :color="item.activo ? 'success' : 'grey'" size="small" variant="tonal">
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </template>
        <template v-slot:item.tipo="{ item }">
          <v-chip size="small" variant="tonal">{{ item.tipo }}</v-chip>
        </template>
        <template v-slot:item.acciones="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="seleccionarPlantilla(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Editor de plantilla -->
    <v-card v-if="plantillaEditando" variant="outlined">
      <v-card-title class="d-flex align-center pa-4">
        <v-icon class="mr-2">mdi-file-document-edit-outline</v-icon>
        <span class="text-h6">Editando: <strong>{{ plantillaEditando.nombre }}</strong></span>
        <v-chip size="small" variant="tonal" class="ml-2">{{ plantillaEditando.tipo }}</v-chip>
        <v-spacer />
        <v-btn color="info" variant="tonal" prepend-icon="mdi-eye" @click="vistaPrevia" :loading="generandoPreview" class="mr-2">
          Vista Previa
        </v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save" @click="guardarPlantilla" :loading="guardando">
          Guardar
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="plantillaEditando.nombre" label="Nombre de la plantilla" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="plantillaEditando.activo" :items="[{title:'Activo',value:true},{title:'Inactivo',value:false}]" item-title="title" item-value="value" label="Estado" variant="outlined" density="compact" />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-label class="text-body-2 font-weight-medium mb-1">Variables disponibles</v-label>
            <v-card variant="tonal" class="pa-2 mb-2" density="compact">
              <div class="text-caption" style="line-height:1.8;">
                <code class="mr-1">&#123;&#123;folio&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;fecha&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;tipo_documento&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;empresa_nombre&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;empresa_rfc&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;empresa_direccion&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;empresa_logo_html&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;entidad_nombre&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;entidad_rfc&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;entidad_direccion&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;serie&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;metodo_pago&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;almacen_nombre&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;fecha_vencimiento&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;tabla_articulos&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;subtotal&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;iva&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;total&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;comentario&#125;&#125;</code>
                <code class="mr-1">&#123;&#123;numero_pagina&#125;&#125;</code>
              </div>
            </v-card>

            <v-textarea
              v-model="plantillaEditando.contenido_html"
              label="Contenido HTML de la plantilla"
              variant="outlined"
              rows="25"
              auto-grow
              class="font-mono"
              style="font-family: 'Consolas', 'Courier New', monospace; font-size: 12px;"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Diálogo nueva plantilla -->
    <v-dialog v-model="dialogoNueva" max-width="600">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white pa-4">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>Nueva Plantilla PDF
        </v-card-title>
        <v-card-text class="pa-4">
          <v-select v-model="nuevaPlantilla.tipo" :items="tiposDisponibles" label="Tipo de documento" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="nuevaPlantilla.nombre" label="Nombre" variant="outlined" density="compact" class="mb-3" />
          <v-textarea v-model="nuevaPlantilla.contenido_html" label="Contenido HTML" variant="outlined" rows="15" auto-grow style="font-family: 'Consolas', 'Courier New', monospace; font-size: 12px;" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="dialogoNueva = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="creando" @click="crearPlantilla">Crear Plantilla</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de Vista Previa PDF -->
    <v-dialog v-model="pdfPreviewDialog" fullscreen>
      <v-card>
        <v-card-title class="d-flex align-center pa-4 bg-grey-lighten-3">
          <v-icon class="mr-2">mdi-file-pdf-box</v-icon>
          <span class="text-h6">Vista Previa de Plantilla PDF</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="pdfPreviewDialog = false" />
        </v-card-title>
        <v-card-text class="pa-0" style="height: calc(100vh - 64px);">
          <iframe v-if="pdfPreviewUrl" :src="pdfPreviewUrl" style="width:100%;height:100%;border:none;" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
      <template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import apiClient from '@/plugins/axios'

const loading = ref(false)
const guardando = ref(false)
const creando = ref(false)
const generandoPreview = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const plantillas = ref([])
const plantillaEditando = ref(null)
const dialogoNueva = ref(false)
const pdfPreviewDialog = ref(false)
const pdfPreviewUrl = ref('')
const snackbar = ref({ show: false, mensaje: '', color: 'success' })

const nuevaPlantilla = ref({
  tipo: '',
  nombre: '',
  contenido_html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Plantilla</title></head>
<body>
<h1>{{tipo_documento}}</h1>
<p>Folio: {{folio}}</p>
</body>
</html>`,
})

const TIPOS_TRANSACCION = [
  { title: 'Venta', value: 'venta' },
  { title: 'Cotización', value: 'cotizacion' },
  { title: 'Orden de Venta', value: 'orden_venta' },
  { title: 'Compra', value: 'compra' },
  { title: 'Orden de Compra', value: 'orden_compra' },
  { title: 'Cotización de Compra', value: 'cotizacion_compra' },
  { title: 'Recepción de Compra', value: 'recepcion_compra' },
  { title: 'Traspaso', value: 'traspaso' },
  { title: 'Cobro', value: 'cobro' },
  { title: 'Pago', value: 'pago' },
  { title: 'Asiento Manual', value: 'asiento_manual' },
]

const tiposDisponibles = computed(() => {
  const existentes = new Set(plantillas.value.map(p => p.tipo))
  return TIPOS_TRANSACCION.filter(t => !existentes.has(t.value))
})

const columnas = [
  { title: 'Tipo', key: 'tipo', sortable: true, width: '150' },
  { title: 'Nombre', key: 'nombre', sortable: true },
  { title: 'Estado', key: 'activo', sortable: true, width: '100' },
  { title: 'Actualizado', key: 'updated_at', sortable: true, width: '180' },
  { title: 'Acciones', key: 'acciones', sortable: false, width: '80' },
]

async function cargarPlantillas() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await apiClient.get('/api/v1/plantillas-pdf')
    plantillas.value = res.data.datos || []
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al cargar plantillas'
  } finally {
    loading.value = false
  }
}

function seleccionarPlantilla(item) {
  plantillaEditando.value = { ...item, activo: item.activo }
}

async function guardarPlantilla() {
  if (!plantillaEditando.value) return
  guardando.value = true
  try {
    await apiClient.put(`/api/v1/plantillas-pdf/${plantillaEditando.value.id}`, {
      nombre: plantillaEditando.value.nombre,
      contenido_html: plantillaEditando.value.contenido_html,
      activo: plantillaEditando.value.activo,
    })
    successMsg.value = 'Plantilla guardada exitosamente'
    await cargarPlantillas()
    const reload = await apiClient.get(`/api/v1/plantillas-pdf/${plantillaEditando.value.id}`)
    plantillaEditando.value = reload.data.datos
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al guardar plantilla'
  } finally {
    guardando.value = false
  }
}

async function crearPlantilla() {
  if (!nuevaPlantilla.value.tipo || !nuevaPlantilla.value.nombre || !nuevaPlantilla.value.contenido_html) {
    errorMsg.value = 'Todos los campos son requeridos'
    return
  }
  creando.value = true
  try {
    await apiClient.post('/api/v1/plantillas-pdf', nuevaPlantilla.value)
    snackbar.value = { show: true, mensaje: 'Plantilla creada exitosamente', color: 'success' }
    dialogoNueva.value = false
    nuevaPlantilla.value = { tipo: '', nombre: '', contenido_html: '' }
    await cargarPlantillas()
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al crear plantilla'
  } finally {
    creando.value = false
  }
}

async function vistaPrevia() {
  if (!plantillaEditando.value) return
  generandoPreview.value = true
  try {
    const res = await apiClient.post('/api/v1/generar-pdf/vista-previa', {
      tipo: plantillaEditando.value.tipo,
      contenido_html: plantillaEditando.value.contenido_html,
    }, {
      responseType: 'blob',
    })
    pdfPreviewUrl.value = URL.createObjectURL(res.data)
    pdfPreviewDialog.value = true
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al generar vista previa'
  } finally {
    generandoPreview.value = false
  }
}

onMounted(() => {
  cargarPlantillas()
})
</script>
