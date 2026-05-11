<template>
  <v-app>
    <v-app-bar color="success" density="compact" elevation="2">
      <template v-slot:prepend>
        <v-icon class="ml-4">mdi-account-circle</v-icon>
        <v-app-bar-title class="ml-2 font-weight-bold">
          Portal de Clientes - SPI ERP
        </v-app-bar-title>
      </template>

      <template v-slot:append>
        <v-chip class="mr-2" color="white" variant="text" prepend-icon="mdi-domain">
          {{ cliente?.razon_social || 'Cliente' }}
        </v-chip>
        <v-btn icon @click="handleLogout" class="mr-2">
          <v-icon>mdi-logout</v-icon>
          <v-tooltip activator="parent" location="bottom">Cerrar sesión</v-tooltip>
        </v-btn>
      </template>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" color="grey-lighten-4" width="250">
      <template v-slot:prepend>
        <v-list-item class="pt-4 pb-2">
          <template v-slot:prepend>
            <v-avatar color="success" size="40" class="mr-3">
              <v-icon color="white">mdi-account-circle</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-bold">{{ cliente?.razon_social || 'Cliente' }}</v-list-item-title>
          <v-list-item-subtitle>{{ cliente?.rfc || '' }}</v-list-item-subtitle>
        </v-list-item>
      </template>

      <v-divider />

      <v-list density="compact" nav>
        <v-list-item
          prepend-icon="mdi-file-invoice"
          title="Mis Facturas"
          @click="irA('/portal/facturas')"
          color="success"
        />
        <v-list-item
          prepend-icon="mdi-account-cash"
          title="Estado de Cuenta"
          @click="irA('/portal/estado-cuenta')"
          color="info"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const drawer = ref(true)
const cliente = ref({})

onMounted(() => {
  const stored = localStorage.getItem('portalCliente')
  if (stored) {
    cliente.value = JSON.parse(stored)
  }
})

function irA(ruta) {
  router.push(ruta)
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('portalCliente')
  router.push('/')
}
</script>
