<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="elevation-12" rounded="lg">
          <v-card-item class="text-center pt-6">
            <v-icon size="64" color="primary" class="mb-4">
              mdi-shield-lock
            </v-icon>
            <v-card-title class="text-h4 font-weight-bold text-primary">
              SPI ERP
            </v-card-title>
            <v-card-subtitle class="text-h6 mt-2">
              Iniciar Sesión
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pa-6">
            <v-alert
              v-if="errorMessage"
              type="error"
              closable
              class="mb-4"
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>

            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                label="Correo electrónico"
                prepend-inner-icon="mdi-email"
                type="email"
                variant="outlined"
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
                class="mt-2"
                :loading="loading"
                :disabled="loading"
              >
                <v-icon start>mdi-login</v-icon>
                Iniciar Sesión
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-text class="text-center text-caption text-medium-emphasis pb-4">
            <p>Demo: admin@spierp.com / admin123</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const rules = {
  required: (v) => !!v || 'Este campo es requerido',
  email: (v) => /.+@.+\..+/.test(v) || 'Correo electrónico inválido',
}

async function handleLogin() {
  if (!email.value || !password.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await axios.post('/api/v1/auth/login', {
      email: email.value,
      password: password.value,
    })

    const { token, usuario } = response.data

    // Guardar token y datos del usuario
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))

    // Redirigir al dashboard
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
</script>

<style lang="scss" scoped>
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
