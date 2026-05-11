<template>
  <v-app>
    <!-- App Bar Superior -->
    <v-app-bar color="primary" elevation="2" density="comfortable">
      <template v-slot:prepend>
        <v-icon class="ml-4" size="36">mdi-chart-box-outline</v-icon>
      </template>

      <v-app-bar-title class="text-h5 font-weight-bold">
        SPI ERP
      </v-app-bar-title>

      <template v-slot:append>
        <v-btn variant="text" class="mr-1" @click="scrollTo('inicio')">
          Inicio
        </v-btn>
        <v-btn variant="text" class="mr-1" @click="scrollTo('modulos')">
          Módulos
        </v-btn>
        <v-btn variant="text" class="mr-1" @click="scrollTo('servicios')">
          Servicios
        </v-btn>
        <v-btn variant="text" class="mr-1" @click="scrollTo('contacto')">
          Contacto
        </v-btn>
        <v-btn
          color="white"
          variant="outlined"
          class="ml-2 mr-4"
          @click="mostrarModalLogin = true"
          prepend-icon="mdi-login"
        >
          Acceso
        </v-btn>
      </template>
    </v-app-bar>

    <!-- Contenido principal -->
    <v-main>
      <router-view @abrir-login="mostrarModalLogin = true" />
    </v-main>

    <!-- Footer -->
    <v-footer color="grey-darken-4" class="text-white pa-6">
      <v-container>
        <v-row>
          <v-col cols="12" md="4">
            <h4 class="text-h6 mb-2">SPI ERP</h4>
            <p class="text-body-2 text-grey-lighten-1">
              Sistema de Planeación Integral. Soluciones empresariales en la nube.
            </p>
          </v-col>
          <v-col cols="12" md="4">
            <h4 class="text-h6 mb-2">Contacto</h4>
            <p class="text-body-2 text-grey-lighten-1">
              <v-icon size="small" class="mr-1">mdi-email</v-icon> contacto@spierp.com<br />
              <v-icon size="small" class="mr-1">mdi-phone</v-icon> +52 (55) 1234 5678<br />
              <v-icon size="small" class="mr-1">mdi-map-marker</v-icon> Ciudad de México
            </p>
          </v-col>
          <v-col cols="12" md="4">
            <h4 class="text-h6 mb-2">Síguenos</h4>
            <v-btn icon variant="text" color="white" class="mr-2">
              <v-icon>mdi-facebook</v-icon>
            </v-btn>
            <v-btn icon variant="text" color="white" class="mr-2">
              <v-icon>mdi-linkedin</v-icon>
            </v-btn>
            <v-btn icon variant="text" color="white">
              <v-icon>mdi-twitter</v-icon>
            </v-btn>
          </v-col>
        </v-row>
        <v-divider class="my-4" color="grey-darken-2" />
        <p class="text-center text-body-2 text-grey">
          &copy; {{ new Date().getFullYear() }} SPI ERP. Todos los derechos reservados.
        </p>
      </v-container>
    </v-footer>

    <!-- Modal de Login -->
    <LoginModal v-model="mostrarModalLogin" />
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import LoginModal from '../components/LoginModal.vue'

const mostrarModalLogin = ref(false)

function scrollTo(section) {
  mostrarModalLogin.value = false // cerrar modal si está abierto
  const el = document.getElementById(section)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style lang="scss" scoped>
.v-app-bar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
