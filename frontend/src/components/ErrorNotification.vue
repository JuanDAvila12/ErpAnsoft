<template>
  <div class="error-notification-container">
    <!-- Botón flotante siempre visible -->
    <v-fab-transition>
      <v-btn
        v-if="!isExpanded"
        :color="hasErrors ? 'error' : 'grey-lighten-1'"
        :variant="hasErrors ? 'elevated' : 'flat'"
        class="error-fab"
        size="small"
        icon
        :style="hasErrors ? {} : { opacity: 0.4 }"
        @click="isExpanded = true"
      >
        <v-icon>{{ hasErrors ? 'mdi-alert-circle' : 'mdi-check-circle-outline' }}</v-icon>
        <v-badge
          v-if="hasErrors"
          :content="errorCount"
          color="red-accent-4"
          inline
          class="error-badge"
        />
      </v-btn>
    </v-fab-transition>

    <!-- Panel de notificaciones expandido -->
    <v-expand-transition>
      <v-card
        v-if="isExpanded"
        class="error-panel"
        elevation="8"
        max-width="420"
        width="100%"
      >
        <!-- Cabecera del panel -->
        <v-card-title class="d-flex align-center pa-3 bg-error text-white">
          <v-icon class="mr-2">mdi-alert-circle</v-icon>
          <span class="text-subtitle-1 font-weight-bold">Notificaciones de Error</span>
          <v-spacer />
          <v-btn
            v-if="hasErrors"
            variant="text"
            color="white"
            size="small"
            class="mr-1"
            @click="handleClearAll"
          >
            <v-icon size="small">mdi-close-all</v-icon>
            <v-tooltip activator="parent" location="bottom">Ocultar todas</v-tooltip>
          </v-btn>
          <v-btn
            variant="text"
            color="white"
            size="small"
            @click="isExpanded = false"
          >
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </v-card-title>

        <!-- Lista de errores -->
        <v-card-text class="pa-0 error-list">
          <v-slide-y-reverse-transition group>
            <div
              v-for="error in errors"
              :key="error.id"
              class="error-item"
            >
              <v-list-item
                :class="{ 'error-item-expanded': error.expanded }"
                @click="handleToggleExpand(error.id)"
                class="error-list-item"
              >
                <template v-slot:prepend>
                  <v-icon
                    :color="getErrorColor(error.codigo)"
                    class="mr-2"
                  >
                    mdi-alert-circle-outline
                  </v-icon>
                </template>

                <v-list-item-title class="text-body-2 font-weight-medium">
                  <span class="error-code">{{ error.codigo }}</span>
                  <span class="text-caption text-medium-emphasis ml-1">| {{ error.modulo }}</span>
                </v-list-item-title>

                <v-list-item-subtitle class="text-caption mt-1">
                  {{ error.mensaje }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    variant="text"
                    size="x-small"
                    color="grey"
                    @click.stop="handleRemoveError(error.id)"
                  >
                    <v-icon size="small">mdi-close</v-icon>
                  </v-btn>
                </template>
              </v-list-item>

              <!-- Detalle expandido -->
              <v-expand-transition>
                <div v-if="error.expanded" class="error-detail pa-3 bg-grey-lighten-4">
                  <div class="text-caption">
                    <strong>Detalle técnico:</strong>
                    <p class="mt-1 mb-2 text-body-2">{{ error.detalle || 'Sin detalle disponible' }}</p>
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    <strong>Timestamp:</strong>
                    <span class="ml-1">{{ formatTimestamp(error.timestamp) }}</span>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    <strong>Código:</strong>
                    <span class="ml-1">{{ error.codigo }}</span>
                  </div>
                </div>
              </v-expand-transition>

              <v-divider v-if="!error.expanded" />
            </div>
          </v-slide-y-reverse-transition>

          <!-- Mensaje cuando no hay errores -->
          <div v-if="!hasErrors" class="pa-6 text-center">
            <v-icon size="48" color="success" class="mb-2">mdi-check-circle-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis">Sin errores</p>
          </div>
        </v-card-text>
      </v-card>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useErrorStore } from '@/stores/errorStore'
import apiClient from '@/plugins/axios'

const {
  errors,
  hasErrors,
  errorCount,
  addError,
  removeError,
  clearAll,
  toggleExpand,
} = useErrorStore()

const isExpanded = ref(false)

// Timers para auto-eliminación de errores (15 segundos)
const timers = new Map()

// Observar nuevos errores para iniciar timers y enviarlos al backend
import { watch } from 'vue'

watch(
  () => errors.value.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      // Hay nuevos errores, iniciar timer para el más reciente
      const latestError = errors.value[0]
      if (latestError) {
        startAutoRemoveTimer(latestError.id)
        // Enviar el error al backend para persistencia
        enviarErrorAlBackend(latestError)
      }
    }
  }
)

/**
 * Envía el error al backend para almacenamiento persistente
 */
async function enviarErrorAlBackend(error) {
  try {
    const token = localStorage.getItem('token')
    if (!token) return // No enviar si no hay sesión

    // Obtener usuario_id desde localStorage
    let usuario_id = null
    const usuarioStr = localStorage.getItem('usuario')
    if (usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr)
        usuario_id = usuario.id || null
      } catch {
        // Ignorar error de parseo
      }
    }
    
    await apiClient.post('/api/v1/log-errores', {
      codigo: error.codigo,
      mensaje: error.mensaje,
      modulo: error.modulo,
      detalle: error.detalle,
      ruta: window.location.href,
      usuario_id,
    })
  } catch (err) {
    // Silently fail - no queremos un loop de errores
    console.warn('No se pudo registrar el error en el servidor:', err.message)
  }
}

function startAutoRemoveTimer(errorId) {
  // Limpiar timer existente si lo hay
  if (timers.has(errorId)) {
    clearTimeout(timers.get(errorId))
  }

  const timer = setTimeout(() => {
    removeError(errorId)
    timers.delete(errorId)
  }, 15000) // 15 segundos

  timers.set(errorId, timer)
}

function handleRemoveError(id) {
  // Limpiar timer si existe
  if (timers.has(id)) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }
  removeError(id)
}

function handleClearAll() {
  // Limpiar todos los timers
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  clearAll()
  isExpanded.value = false
}

function handleToggleExpand(id) {
  toggleExpand(id)
}

function getErrorColor(codigo) {
  if (!codigo) return 'error'
  const prefix = codigo.split('-')[0]
  switch (prefix) {
    case 'ART': return 'orange'
    case 'VENT': return 'red'
    case 'TRANS': return 'purple'
    case 'ENT': return 'blue'
    case 'INV': return 'amber'
    case 'COMP': return 'deep-orange'
    case 'AUTH': return 'red-darken-4'
    case 'CONF': return 'grey'
    case 'REP': return 'teal'
    case 'FISC': return 'indigo'
    case 'SYS': return 'red'
    default: return 'error'
  }
}

function formatTimestamp(ts) {
  if (!ts) return ''
  try {
    const date = new Date(ts)
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ts
  }
}

// Limpiar timers al desmontar el componente
onUnmounted(() => {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
})
</script>

<style scoped>
.error-notification-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.error-fab {
  position: relative;
}

.error-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.error-panel {
  border-radius: 8px;
  overflow: hidden;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.error-list {
  overflow-y: auto;
  max-height: calc(70vh - 56px);
}

.error-list-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.error-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.error-item-expanded {
  background-color: rgba(0, 0, 0, 0.02);
}

.error-code {
  font-family: 'Consolas', 'Courier New', monospace;
  font-weight: 700;
  color: #d32f2f;
}

.error-detail {
  border-left: 3px solid #d32f2f;
  margin: 0 8px 8px 8px;
  border-radius: 4px;
}

/* Scrollbar personalizada */
.error-list::-webkit-scrollbar {
  width: 6px;
}

.error-list::-webkit-scrollbar-track {
  background: transparent;
}

.error-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
</style>
