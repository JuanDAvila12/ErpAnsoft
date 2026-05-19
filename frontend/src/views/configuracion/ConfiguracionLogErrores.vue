<template>
  <v-container fluid>
    <!-- Encabezado -->
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-icon size="36" class="mr-3" color="error">mdi-alert-circle-outline</v-icon>
          <div>
            <h1 class="text-h5 font-weight-bold">Log de Errores</h1>
            <p class="text-caption text-medium-emphasis">Historial de errores del sistema</p>
          </div>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-refresh"
            @click="cargarErrores"
            :loading="loading"
          >
            Refrescar
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="pa-4">
        <v-row dense align="end">
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filtros.codigo"
              label="Código"
              placeholder="Ej: ART-001"
              density="compact"
              hide-details
              clearable
              variant="outlined"
              prepend-inner-icon="mdi-code-tags"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filtros.modulo"
              label="Módulo"
              placeholder="Ej: Artículos"
              density="compact"
              hide-details
              clearable
              variant="outlined"
              prepend-inner-icon="mdi-puzzle"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filtros.fecha_desde"
              label="Fecha desde"
              type="date"
              density="compact"
              hide-details
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filtros.fecha_hasta"
              label="Fecha hasta"
              type="date"
              density="compact"
              hide-details
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" class="mt-2">
            <v-btn color="primary" variant="tonal" @click="aplicarFiltros" :loading="loading">
              <v-icon class="mr-1">mdi-filter</v-icon>
              Filtrar
            </v-btn>
            <v-btn variant="text" class="ml-2" @click="limpiarFiltros">
              Limpiar filtros
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Mensaje cuando no hay errores -->
    <v-card v-if="!loading && errores.length === 0" variant="outlined" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-alert-circle-outline</v-icon>
      <h3 class="text-h6 font-weight-medium text-medium-emphasis mb-2">No hay errores registrados</h3>
      <p class="text-body-2 text-medium-emphasis">Cuando ocurra un error en el sistema, aparecerá registrado aquí.</p>
    </v-card>

    <!-- Tabla de errores -->
    <v-card v-else variant="outlined">
      <v-data-table
        :headers="columnas"
        :items="errores"
        :loading="loading"
        :items-length="total"
        :page="pagina"
        :items-per-page="limite"
        @update:page="pagina = $event; cargarErrores()"
        class="elevation-0"
        hover
      >

        <!-- Personalización de columnas -->
        <template v-slot:item.codigo="{ item }">
          <v-chip
            size="small"
            :color="getColorPorModulo(item.modulo)"
            variant="tonal"
            class="font-weight-bold"
          >
            {{ item.codigo }}
          </v-chip>
        </template>

        <template v-slot:item.modulo="{ item }">
          <v-chip size="small" variant="flat" :color="getColorPorModulo(item.modulo)">
            {{ item.modulo }}
          </v-chip>
        </template>

        <template v-slot:item.mensaje="{ item }">
          <div class="text-body-2" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ item.mensaje }}
          </div>
        </template>

        <template v-slot:item.detalle="{ item }">
          <div v-if="item.detalle" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <v-tooltip :text="item.detalle" location="top">
              <template v-slot:activator="{ props }">
                <span v-bind="props" class="text-caption text-medium-emphasis">{{ item.detalle }}</span>
              </template>
            </v-tooltip>
          </div>
          <span v-else class="text-caption text-disabled">—</span>
        </template>

        <template v-slot:item.usuario_nombre="{ item }">
          <span v-if="item.usuario_nombre" class="text-body-2">{{ item.usuario_nombre }}</span>
          <span v-else class="text-caption text-disabled">Sistema</span>
        </template>

        <template v-slot:item.fecha="{ item }">
          <span class="text-caption">{{ formatFecha(item.fecha) }}</span>
        </template>

        <template v-slot:item.acciones="{ item }">
          <v-btn
            variant="text"
            size="small"
            color="primary"
            @click="verDetalle(item)"
          >
            <v-icon size="small">mdi-eye</v-icon>
            <v-tooltip activator="parent" location="bottom">Ver detalle</v-tooltip>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo de detalle -->
    <v-dialog v-model="dialogoDetalle" max-width="600px">
      <v-card v-if="errorSeleccionado">
        <v-card-title class="bg-error text-white pa-4 d-flex align-center">
          <v-icon class="mr-2">mdi-alert-circle</v-icon>
          <span class="text-subtitle-1 font-weight-bold">Detalle del Error</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list density="compact" class="pa-0">
            <v-list-item>
              <template v-slot:prepend><v-icon color="error" size="small">mdi-code-tags</v-icon></template>
              <v-list-item-title class="text-caption">Código</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip size="small" :color="getColorPorModulo(errorSeleccionado.modulo)" variant="tonal">
                  {{ errorSeleccionado.codigo }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item>
              <template v-slot:prepend><v-icon color="primary" size="small">mdi-puzzle</v-icon></template>
              <v-list-item-title class="text-caption">Módulo</v-list-item-title>
              <v-list-item-subtitle>{{ errorSeleccionado.modulo }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item>
              <template v-slot:prepend><v-icon color="warning" size="small">mdi-message-alert</v-icon></template>
              <v-list-item-title class="text-caption">Mensaje</v-list-item-title>
              <v-list-item-subtitle>{{ errorSeleccionado.mensaje }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item>
              <template v-slot:prepend><v-icon color="grey" size="small">mdi-text-long</v-icon></template>
              <v-list-item-title class="text-caption">Detalle Técnico</v-list-item-title>
              <v-list-item-subtitle>
                <pre class="text-body-2 mt-1 pa-2 bg-grey-lighten-3 rounded" style="white-space: pre-wrap; font-family: Consolas, monospace;">{{ errorSeleccionado.detalle || 'Sin detalle' }}</pre>
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item>
              <template v-slot:prepend><v-icon color="info" size="small">mdi-account</v-icon></template>
              <v-list-item-title class="text-caption">Usuario</v-list-item-title>
              <v-list-item-subtitle>{{ errorSeleccionado.usuario_nombre || 'Sistema' }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item>
              <template v-slot:prepend><v-icon color="grey" size="small">mdi-calendar-clock</v-icon></template>
              <v-list-item-title class="text-caption">Fecha</v-list-item-title>
              <v-list-item-subtitle>{{ formatFecha(errorSeleccionado.fecha) }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="errorSeleccionado.ruta" />
            <v-list-item v-if="errorSeleccionado.ruta">
              <template v-slot:prepend><v-icon color="grey" size="small">mdi-link-variant</v-icon></template>
              <v-list-item-title class="text-caption">Ruta</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ errorSeleccionado.ruta }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="errorSeleccionado.ip" />
            <v-list-item v-if="errorSeleccionado.ip">
              <template v-slot:prepend><v-icon color="grey" size="small">mdi-ip-network</v-icon></template>
              <v-list-item-title class="text-caption">IP</v-list-item-title>
              <v-list-item-subtitle>{{ errorSeleccionado.ip }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="dialogoDetalle = false">Cerrar</v-btn>
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

const errores = ref([])
const loading = ref(false)
const total = ref(0)
const pagina = ref(1)
const limite = ref(25)

const dialogoDetalle = ref(false)
const errorSeleccionado = ref(null)

const snackbar = ref({ show: false, text: '', color: 'success' })

const filtros = ref({
  codigo: '',
  modulo: '',
  fecha_desde: '',
  fecha_hasta: '',
})

const columnas = [
  { title: 'Código', key: 'codigo', sortable: true, width: '100px' },
  { title: 'Módulo', key: 'modulo', sortable: true, width: '120px' },
  { title: 'Mensaje', key: 'mensaje', sortable: true },
  { title: 'Detalle', key: 'detalle', sortable: false },
  { title: 'Usuario', key: 'usuario_nombre', sortable: true, width: '120px' },
  { title: 'Fecha', key: 'fecha', sortable: true, width: '160px' },
  { title: 'Acciones', key: 'acciones', sortable: false, width: '60px', align: 'center' },
]

function getColorPorModulo(modulo) {
  const map = {
    'Artículos': 'orange',
    'Ventas': 'red',
    'Transacciones': 'purple',
    'Entidades': 'blue',
    'Inventario': 'amber',
    'Compras': 'deep-orange',
    'Autenticación': 'red-darken-4',
    'Configuración': 'grey',
    'Reportes': 'teal',
    'Fiscal': 'indigo',
    'Sistema': 'red',
  }
  return map[modulo] || 'grey'
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  try {
    return new Date(fecha).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return fecha
  }
}

function verDetalle(error) {
  errorSeleccionado.value = error
  dialogoDetalle.value = true
}

async function cargarErrores() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.append('pagina', pagina.value)
    params.append('limite', limite.value)
    
    if (filtros.value.codigo) params.append('codigo', filtros.value.codigo)
    if (filtros.value.modulo) params.append('modulo', filtros.value.modulo)
    if (filtros.value.fecha_desde) params.append('fecha_desde', filtros.value.fecha_desde)
    if (filtros.value.fecha_hasta) params.append('fecha_hasta', filtros.value.fecha_hasta)

    const res = await apiClient.get(`/api/v1/log-errores?${params.toString()}`)
    errores.value = res.data.datos || []
    total.value = res.data.total || 0
    // Si la API devuelve paginación
    if (res.data.pagina) pagina.value = res.data.pagina
  } catch (err) {
    console.error('Error al cargar log de errores:', err)
    snackbar.value = { show: true, text: 'Error al cargar el log de errores', color: 'error' }
  } finally {
    loading.value = false
  }
}

function aplicarFiltros() {
  pagina.value = 1
  cargarErrores()
}

function limpiarFiltros() {
  filtros.value = { codigo: '', modulo: '', fecha_desde: '', fecha_hasta: '' }
  pagina.value = 1
  cargarErrores()
}

onMounted(() => {
  cargarErrores()
})
</script>
