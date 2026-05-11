<template>
  <div>
    <h2 class="text-h4 mb-2">Bienvenido, {{ usuario?.nombre || 'Usuario' }}</h2>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Panel de control del sistema SPI ERP
    </p>

    <!-- Tarjetas de acceso rápido -->
    <v-row>
      <v-col cols="12" sm="6" md="4" lg="3" v-for="(card, i) in cardsAcceso" :key="i">
        <v-card
          class="pa-4 text-center"
          variant="tonal"
          :color="card.color"
          hover
          @click="card.ruta ? irA(card.ruta) : null"
        >
          <v-icon size="48" :color="card.color" class="mb-2">{{ card.icono }}</v-icon>
          <v-card-title class="text-h6 pa-0">{{ card.titulo }}</v-card-title>
          <v-card-text class="pa-0 mt-1 text-medium-emphasis">
            {{ card.descripcion }}
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
                <template v-slot:prepend><v-icon>mdi-email</v-icon></template>
                <v-list-item-title>Email</v-list-item-title>
                <v-list-item-subtitle>{{ usuario?.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-shield-account</v-icon></template>
                <v-list-item-title>Rol</v-list-item-title>
                <v-list-item-subtitle>{{ usuario?.rol_nombre }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="usuario?.entidad_razon_social">
                <template v-slot:prepend><v-icon>mdi-domain</v-icon></template>
                <v-list-item-title>Entidad</v-list-item-title>
                <v-list-item-subtitle>{{ usuario?.entidad_razon_social }}</v-list-item-subtitle>
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
                <template v-slot:prepend><v-icon color="success">mdi-check-circle</v-icon></template>
                <v-list-item-title>API Node.js</v-list-item-title>
                <v-list-item-subtitle>Conectado</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon color="success">mdi-check-circle</v-icon></template>
                <v-list-item-title>API Python</v-list-item-title>
                <v-list-item-subtitle>Conectado</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon color="success">mdi-check-circle</v-icon></template>
                <v-list-item-title>PostgreSQL</v-list-item-title>
                <v-list-item-subtitle>Conectado</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const usuario = ref({})

const cardsAcceso = [
  { titulo: 'Nueva Venta', icono: 'mdi-cart-plus', color: 'primary', descripcion: 'Registrar una nueva venta', ruta: '/dashboard/pos' },
  { titulo: 'Cotizaciones', icono: 'mdi-file-document-outline', color: 'primary', descripcion: 'Administrar cotizaciones', ruta: '/dashboard/ventas/cotizaciones' },
  { titulo: 'Facturación CFDI', icono: 'mdi-file-invoice', color: 'error', descripcion: 'Generar facturas electrónicas', ruta: '/dashboard/ventas/facturas' },
  { titulo: 'Inventario', icono: 'mdi-package-variant', color: 'warning', descripcion: 'Control de existencias', ruta: '/dashboard/inventario/articulos' },
  { titulo: 'Punto de Venta', icono: 'mdi-cash-register', color: 'orange', descripcion: 'POS rápido', ruta: '/dashboard/pos' },
  { titulo: 'Configuración', icono: 'mdi-cog-outline', color: 'grey', descripcion: 'Catálogos del sistema', ruta: '/dashboard/configuracion/catalogos' },
]

onMounted(() => {
  const stored = localStorage.getItem('usuario')
  if (stored) {
    usuario.value = JSON.parse(stored)
  }
})

function irA(ruta) {
  router.push(ruta)
}
</script>
