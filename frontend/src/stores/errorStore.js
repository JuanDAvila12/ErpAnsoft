/**
 * Store reactivo de errores - Sistema de Notificación tipo SAP
 * 
 * Almacena una lista de errores con estructura:
 * { id, codigo, mensaje, modulo, detalle, timestamp, expanded }
 */

import { reactive, computed } from 'vue'

// Estado reactivo compartido
const state = reactive({
  errors: [],
  maxErrors: 50, // Límite máximo de errores en la lista
})

let errorIdCounter = 0

/**
 * Agrega un error a la lista de notificaciones
 * @param {Object} errorData - Datos del error
 * @param {string} errorData.codigo - Código del error (ej: ART-001)
 * @param {string} errorData.mensaje - Mensaje corto del error
 * @param {string} errorData.modulo - Módulo afectado
 * @param {string} [errorData.detalle] - Detalle técnico
 * @param {string} [errorData.timestamp] - Timestamp ISO
 */
function addError(errorData) {
  const id = ++errorIdCounter
  const error = {
    id,
    codigo: errorData.codigo || 'SYS-001',
    mensaje: errorData.mensaje || 'Error desconocido',
    modulo: errorData.modulo || 'Sistema',
    detalle: errorData.detalle || '',
    timestamp: errorData.timestamp || new Date().toISOString(),
    expanded: false,
    visible: true,
  }

  state.errors.unshift(error)

  // Limitar la cantidad de errores almacenados
  if (state.errors.length > state.maxErrors) {
    state.errors.pop()
  }

  return id
}

/**
 * Elimina un error específico por su ID
 * @param {number} id - ID del error a eliminar
 */
function removeError(id) {
  const index = state.errors.findIndex(e => e.id === id)
  if (index !== -1) {
    state.errors.splice(index, 1)
  }
}

/**
 * Oculta todas las notificaciones de error
 */
function clearAll() {
  state.errors.splice(0, state.errors.length)
}

/**
 * Alterna la expansión de un error para mostrar/ocultar detalle
 * @param {number} id - ID del error
 */
function toggleExpand(id) {
  const error = state.errors.find(e => e.id === id)
  if (error) {
    error.expanded = !error.expanded
  }
}

// Propiedades computadas
const errors = computed(() => state.errors)
const hasErrors = computed(() => state.errors.length > 0)
const errorCount = computed(() => state.errors.length)

export function useErrorStore() {
  return {
    // Estado
    state,
    errors,
    hasErrors,
    errorCount,

    // Acciones
    addError,
    removeError,
    clearAll,
    toggleExpand,
  }
}
