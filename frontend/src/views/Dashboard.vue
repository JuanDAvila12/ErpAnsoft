<template>
  <v-app-bar color="primary" density="compact" elevation="2">
    <template v-slot:prepend>
      <v-icon class="ml-4">mdi-view-dashboard</v-icon>
    </template>

    <v-app-bar-title>
      SPI ERP - Dashboard
    </v-app-bar-title>

    <template v-slot:append>
      <v-chip class="mr-2" color="white" variant="text" prepend-icon="mdi-account">
        {{ usuario?.nombre || 'Usuario' }}
      </v-chip>
      <v-btn icon @click="handleLogout" class="mr-2">
        <v-icon>mdi-logout</v-icon>
        <v-tooltip activator="parent" location="bottom">Cerrar sesión</v-tooltip>
      </v-btn>
    </template>
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-6">
      <v-row>
        <v-col cols="12">
          <h2 class="text-h4 mb-2">Bienvenido, {{ usuario?.nombre || 'Usuario' }}</h2>
          <p class="text-body-1 text-medium-emphasis mb-6">
            Panel de control del sistema SPI ERP
          </p>
        </v-col>
      </v-row>

      <!-- Tarjetas de acceso rápido -->
      <v-row>
        <v-col cols="12" sm="6" md="4" lg="3">
          <v-card
            class="pa-4 text-center"
            variant="tonal"
            color="primary"
            hover
            @click="irANuevaVenta"
          >
            <v-icon size="48" color="primary" class="mb-2">mdi-cart-plus</v-icon>
            <v-card-title class="text-h6 pa-0">Nueva Venta</v-card-title>
            <v-card-text class="pa-0 mt-1 text-medium-emphasis">
              Registrar una nueva venta
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <v-card
            class="pa-4 text-center"
            variant="tonal"
            color="success"
            hover
            @click="irAConfiguracion"
          >
            <v-icon size="48" color="success" class="mb-2">mdi-cog-outline</v-icon>
            <v-card-title class="text-h6 pa-0">Configuración Maestra</v-card-title>
            <v-card-text class="pa-0 mt-1 text-medium-emphasis">
              Administrar catálogos del sistema
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <v-card
            class="pa-4 text-center"
            variant="tonal"
            color="info"
            hover
          >
            <v-icon size="48" color="info" class="mb-2">mdi-file-document-outline</v-icon>
            <v-card-title class="text-h6 pa-0">Facturación CFDI</v-card-title>
            <v-card-text class="pa-0 mt-1 text-medium-emphasis">
              Generar facturas electrónicas
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <v-card
            class="pa-4 text-center"
            variant="tonal"
            color="warning"
            hover
          >
            <v-icon size="48" color="warning" class="mb-2">mdi-package-variant</v-icon>
            <v-card-title class="text-h6 pa-0">Inventario</v-card-title>
            <v-card-text class="pa-0 mt-1 text-medium-emphasis">
              Control de existencias
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Información del usuario -->
      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <v-card variant="tonal">
            <v-card-title class="text-h6">
              <v-icon class="mr-2">mdi-account-circle</v-icon>
              Información del Usuario
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-email</v-icon>
                  </template>
                  <v-list-item-title>Email</v-list-item-title>
                  <v-list-item-subtitle>{{ usuario?.email }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-shield-account</v-icon>
                  </template>
                  <v-list-item-title>Rol</v-list-item-title>
                  <v-list-item-subtitle>{{ usuario?.rol_nombre }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="usuario?.entidad_razon_social">
                  <template v-slot:prepend>
                    <v-icon>mdi-domain</v-icon>
                  </template>
                  <v-list-item-title>Entidad</v-list-item-title>
                  <v-list-item-subtitle>{{ usuario?.entidad_razon_social }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="usuario?.entidad_roles?.length">
                  <template v-slot:prepend>
                    <v-icon>mdi-badge-account</v-icon>
                  </template>
                  <v-list-item-title>Roles de Entidad</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                      v-for="er in usuario.entidad_roles"
                      :key="er.rol"
                      size="x-small"
                      class="mr-1"
                      color="primary"
                      variant="flat"
                    >
                      {{ er.rol }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="tonal">
            <v-card-title class="text-h6">
              <v-icon class="mr-2">mdi-information-outline</v-icon>
              Estado del Sistema
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>API Node.js</v-list-item-title>
                  <v-list-item-subtitle>Conectado</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>API Python</v-list-item-title>
                  <v-list-item-subtitle>Conectado</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>PostgreSQL</v-list-item-title>
                  <v-list-item-subtitle>Conectado</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const usuario = ref({})

onMounted(() => {
  const stored = localStorage.getItem('usuario')
  if (stored) {
    usuario.value = JSON.parse(stored)
  }
})

function irANuevaVenta() {
  router.push('/ventas/nueva')
}

function irAConfiguracion() {
  router.push('/configuracion')
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.v-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
