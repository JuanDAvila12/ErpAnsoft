<template>
  <v-dialog v-model="dialogVisible" max-width="480px" persistent>
    <v-card rounded="xl">
      <!-- Tabs: ERP / Portal Clientes -->
      <v-tabs
        v-model="tabActivo"
        color="primary"
        align-tabs="center"
        class="pt-4"
        grow
      >
        <v-tab value="erp">
          <v-icon start>mdi-shield-account</v-icon>
          ERP
        </v-tab>
        <v-tab value="portal">
          <v-icon start>mdi-account-circle</v-icon>
          Portal de Clientes
        </v-tab>
      </v-tabs>

      <v-card-text class="pa-6">
        <v-alert
          v-if="errorMessage"
          type="error"
          closable
          class="mb-4"
          @click:close="errorMessage = ''"
          density="compact"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- Tab ERP -->
        <v-window v-model="tabActivo">
          <v-window-item value="erp">
            <v-form @submit.prevent="handleLoginERP">
              <v-text-field
                v-model="email"
                label="Correo electrónico"
                prepend-inner-icon="mdi-email"
                type="email"
                variant="outlined"
                density="compact"
                class="mb-3"
                :rules="[rules.required, rules.email]"
                required
              />

              <v-text-field
                v-model="password"
                label="Contraseña"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                density="compact"
                class="mb-3"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                :rules="[rules.required]"
                required
              />

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                :disabled="loading"
              >
                <v-icon start>mdi-login</v-icon>
                Iniciar Sesión
              </v-btn>
            </v-form>

            <p class="text-center text-caption text-medium-emphasis mt-4">
              Demo: admin@spierp.com / admin123
            </p>
          </v-window-item>

          <!-- Tab Portal de Clientes -->
          <v-window-item value="portal">
            <v-form @submit.prevent="handleLoginCliente">
              <v-text-field
                v-model="clienteEmail"
                label="Correo electrónico"
                prepend-inner-icon="mdi-email"
                type="email"
                variant="outlined"
                density="compact"
                class="mb-3"
                :rules="[rules.required, rules.email]"
                required
              />

              <v-text-field
                v-model="clientePassword"
                label="Contraseña"
                prepend-inner-icon="mdi-lock"
                :type="showClientePassword ? 'text' : 'password'"
                variant="outlined"
                density="compact"
                class="mb-3"
                :append-inner-icon="showClientePassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showClientePassword = !showClientePassword"
                :rules="[rules.required]"
                required
              />

              <v-btn
                type="submit"
                color="success"
                size="large"
                block
                :loading="loadingCliente"
                :disabled="loadingCliente"
              >
                <v-icon start>mdi-account-circle</v-icon>
                Acceder al Portal
              </v-btn>
            </v-form>

            <p class="text-center text-caption text-medium-emphasis mt-4">
              Accede a tus facturas y estado de cuenta
            </p>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="cerrar">
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()

// Estado del diálogo
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Tabs
const tabActivo = ref('erp')

// Formulario ERP
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// Formulario Portal Cliente
const clienteEmail = ref('')
const clientePassword = ref('')
const showClientePassword = ref(false)
const loadingCliente = ref(false)

const rules = {
  required: (v) => !!v || 'Este campo es requerido',
  email: (v) => /.+@.+\..+/.test(v) || 'Correo electrónico inválido',
}

function cerrar() {
  emit('update:modelValue', false)
  errorMessage.value = ''
}

async function handleLoginERP() {
  if (!email.value || !password.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await axios.post('/api/v1/auth/login', {
      email: email.value,
      password: password.value,
    })

    const { token } = response.data

    // Guardar el token
    localStorage.setItem('token', token)

    // Obtener perfil del usuario
    try {
      const perfilResponse = await axios.get('/api/v1/auth/perfil', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const usuario = perfilResponse.data.datos
      localStorage.setItem('usuario', JSON.stringify(usuario))
    } catch (e) {
      console.warn('No se pudo obtener perfil inmediatamente')
    }

    cerrar()
    router.push('/dashboard')
  } catch (err) {
    if (err.response && err.response.data && err.response.data.mensaje) {
      errorMessage.value = err.response.data.mensaje
    } else {
      errorMessage.value = 'Error de conexión con el servidor'
    }
  } finally {
    loading.value = false
  }
}

async function handleLoginCliente() {
  if (!clienteEmail.value || !clientePassword.value) return

  loadingCliente.value = true
  errorMessage.value = ''

  try {
    const response = await axios.post('/api/v1/auth/login-cliente', {
      email: clienteEmail.value,
      password: clientePassword.value,
    })

    const { token, datos } = response.data

    // Guardar token y datos del cliente
    localStorage.setItem('token', token)
    localStorage.setItem('portalCliente', JSON.stringify(datos))

    cerrar()
    router.push('/portal')
  } catch (err) {
    if (err.response && err.response.data && err.response.data.mensaje) {
      errorMessage.value = err.response.data.mensaje
    } else {
      errorMessage.value = 'Error de conexión con el servidor'
    }
  } finally {
    loadingCliente.value = false
  }
}
</script>
