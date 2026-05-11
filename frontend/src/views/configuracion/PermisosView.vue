<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="grey" size="36" class="mr-3">mdi-shield-account</v-icon>
      <div>
        <h2 class="text-h4 font-weight-bold mb-0">Roles y Permisos</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">Asignación de permisos por rol de usuario</p>
      </div>
    </div>

    <v-alert v-if="errorMsg" type="error" closable class="mb-4" @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>
    <v-alert v-if="successMsg" type="success" closable class="mb-4" @click:close="successMsg = ''">
      {{ successMsg }}
    </v-alert>

    <!-- Selector de Rol -->
    <v-card variant="tonal" class="pa-4 mb-4">
      <v-select
        v-model="rolSeleccionado"
        :items="roles"
        item-title="nombre"
        item-value="id"
        label="Seleccionar Rol"
        variant="outlined"
        density="compact"
        return-object
        @update:model-value="cargarPermisosRol"
      />
    </v-card>

    <!-- Permisos (checkboxes agrupados por módulo) -->
    <v-card v-if="rolSeleccionado" variant="tonal">
      <v-card-title class="text-h6">
        Permisos para: <strong>{{ rolSeleccionado.nombre }}</strong>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          @click="guardarPermisos"
          :loading="guardando"
          :disabled="guardando"
        >
          <v-icon start>mdi-content-save</v-icon>
          Guardar Cambios
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col
            v-for="(grupo, modulo) in permisosAgrupados"
            :key="modulo"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card variant="outlined" class="pa-3">
              <h4 class="text-subtitle-1 font-weight-bold mb-2 text-capitalize">
                {{ modulo }}
              </h4>
              <v-checkbox
                v-for="permiso in grupo"
                :key="permiso.id"
                v-model="permisosAsignados"
                :label="permiso.descripcion"
                :value="permiso.id"
                hide-details
                density="compact"
                class="my-1"
              />
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const roles = ref([])
const todosPermisos = ref([])
const permisosAsignados = ref([])
const rolSeleccionado = ref(null)
const guardando = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Agrupar permisos por módulo
const permisosAgrupados = computed(() => {
  const grupos = {}
  for (const p of todosPermisos.value) {
    const modulo = p.modulo || 'general'
    if (!grupos[modulo]) grupos[modulo] = []
    grupos[modulo].push(p)
  }
  return grupos
})

async function cargarRoles() {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/v1/permisos/roles', {
      headers: { Authorization: `Bearer ${token}` },
    })
    roles.value = response.data.roles || []
  } catch (err) {
    errorMsg.value = 'Error al cargar roles'
  }
}

async function cargarTodosPermisos() {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/v1/permisos', {
      headers: { Authorization: `Bearer ${token}` },
    })
    todosPermisos.value = response.data.datos || []
  } catch (err) {
    errorMsg.value = 'Error al cargar permisos'
  }
}

async function cargarPermisosRol() {
  if (!rolSeleccionado.value) return
  try {
    const token = localStorage.getItem('token')
    // El endpoint devuelve los permisos del rol
    const response = await axios.get(`/api/v1/permisos/roles/${rolSeleccionado.value.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    permisosAsignados.value = (response.data.permisos || []).map(p => p.id)
  } catch (err) {
    errorMsg.value = 'Error al cargar permisos del rol'
  }
}

async function guardarPermisos() {
  if (!rolSeleccionado.value) return
  guardando.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const token = localStorage.getItem('token')
    await axios.put(`/api/v1/permisos/roles/${rolSeleccionado.value.id}/permisos`, {
      permisos: permisosAsignados.value,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    })
    successMsg.value = `Permisos actualizados para el rol "${rolSeleccionado.value.nombre}"`
  } catch (err) {
    errorMsg.value = 'Error al guardar permisos'
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarRoles()
  cargarTodosPermisos()
})
</script>
