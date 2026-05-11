<template>
  <div>
    <!-- HERO SECTION -->
    <section id="inicio" class="hero-section d-flex align-center">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h1 class="text-h2 font-weight-bold text-white mb-4">
              Sistema de Planeación Integral
            </h1>
            <p class="text-h5 text-white text-medium-emphasis mb-6">
              La solución completa para la gestión administrativa, fiscal y operativa
              de tu empresa. Un ERP moderno, escalable y 100% en la nube.
            </p>
            <v-btn
              color="accent"
              size="x-large"
              variant="flat"
              @click="scrollToModulos"
              class="mr-4"
            >
              Conocer más
              <v-icon end>mdi-arrow-down</v-icon>
            </v-btn>
            <v-btn
              color="white"
              size="x-large"
              variant="outlined"
              @click="$emit('abrir-login')"
            >
              Acceder al Sistema
              <v-icon end>mdi-login</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- MÓDULOS SECTION -->
    <section id="modulos" class="pa-8">
      <v-container>
        <div class="text-center mb-8">
          <h2 class="text-h3 font-weight-bold mb-2">Módulos del Sistema</h2>
          <p class="text-h6 text-medium-emphasis">
            Todo lo que necesitas para administrar tu negocio en un solo lugar
          </p>
        </div>

        <v-row>
          <v-col v-for="(modulo, i) in modulos" :key="i" cols="12" sm="6" md="4" lg="3">
            <v-card
              class="pa-4 text-center h-100"
              variant="tonal"
              :color="modulo.color"
              hover
              :elevation="2"
            >
              <v-icon size="56" :color="modulo.color" class="mb-3">
                {{ modulo.icono }}
              </v-icon>
              <v-card-title class="text-h6 pa-0 mb-2">{{ modulo.titulo }}</v-card-title>
              <v-card-text class="pa-0 text-body-2 text-medium-emphasis">
                {{ modulo.descripcion }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- SERVICIOS / CARACTERÍSTICAS -->
    <section id="servicios" class="pa-8 bg-grey-lighten-4">
      <v-container>
        <div class="text-center mb-8">
          <h2 class="text-h3 font-weight-bold mb-2">¿Por qué elegir SPI ERP?</h2>
          <p class="text-h6 text-medium-emphasis">
            Características que hacen la diferencia
          </p>
        </div>

        <v-row>
          <v-col v-for="(servicio, i) in servicios" :key="i" cols="12" md="6">
            <v-card variant="outlined" class="pa-4" hover>
              <div class="d-flex align-start">
                <v-avatar :color="servicio.color" variant="tonal" class="mr-4" size="56">
                  <v-icon :color="servicio.color" size="28">{{ servicio.icono }}</v-icon>
                </v-avatar>
                <div>
                  <h4 class="text-h6 mb-1">{{ servicio.titulo }}</h4>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ servicio.descripcion }}
                  </p>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CONTACTO SECTION -->
    <section id="contacto" class="pa-8">
      <v-container>
        <div class="text-center mb-8">
          <h2 class="text-h3 font-weight-bold mb-2">Contáctanos</h2>
          <p class="text-h6 text-medium-emphasis">
            Solicita una demostración o más información
          </p>
        </div>

        <v-row justify="center">
          <v-col cols="12" md="6">
            <v-card variant="tonal" class="pa-6">
              <v-form @submit.prevent="enviarContacto">
                <v-text-field
                  v-model="contacto.nombre"
                  label="Nombre completo"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-account"
                  class="mb-3"
                  :rules="[v => !!v || 'Nombre requerido']"
                />

                <v-text-field
                  v-model="contacto.email"
                  label="Correo electrónico"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-email"
                  type="email"
                  class="mb-3"
                  :rules="[v => !!v || 'Email requerido', v => /.+@.+\..+/.test(v) || 'Email inválido']"
                />

                <v-textarea
                  v-model="contacto.mensaje"
                  label="Mensaje"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-message-text"
                  rows="4"
                  class="mb-3"
                  :rules="[v => !!v || 'Mensaje requerido']"
                />

                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  block
                  :loading="cargando"
                >
                  <v-icon start>mdi-send</v-icon>
                  Enviar mensaje
                </v-btn>
              </v-form>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.mensaje }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

defineEmits(['abrir-login'])

const cargando = ref(false)

const contacto = reactive({
  nombre: '',
  email: '',
  mensaje: '',
})

const snackbar = ref({
  show: false,
  mensaje: '',
  color: 'success',
})

const modulos = [
  { titulo: 'Ventas', icono: 'mdi-cart-outline', color: 'primary', descripcion: 'Cotizaciones, órdenes de venta y facturación electrónica CFDI 4.0' },
  { titulo: 'Compras', icono: 'mdi-truck-delivery', color: 'success', descripcion: 'Órdenes de compra, recepciones y gestión de proveedores' },
  { titulo: 'Inventarios', icono: 'mdi-package-variant', color: 'warning', descripcion: 'Control de existencias, movimientos, series y almacenes' },
  { titulo: 'Contabilidad', icono: 'mdi-book-account', color: 'info', descripcion: 'Cuentas contables, asientos, pólizas y balanza' },
  { titulo: 'Facturación CFDI', icono: 'mdi-file-document', color: 'error', descripcion: 'Facturas, complementos de pago y cancelación ante el SAT' },
  { titulo: 'CRM', icono: 'mdi-account-group', color: 'purple', descripcion: 'Oportunidades, actividades y gestión de clientes' },
  { titulo: 'Punto de Venta', icono: 'mdi-cash-register', color: 'orange', descripcion: 'POS rápido e intuitivo para ventas en mostrador' },
  { titulo: 'Reportes', icono: 'mdi-chart-bar', color: 'teal', descripcion: 'Dashboard ejecutivo, reportes personalizados y exportación' },
]

const servicios = [
  { titulo: 'Multiempresa', icono: 'mdi-domain', color: 'primary', descripcion: 'Administra múltiples empresas desde una misma plataforma con datos separados.' },
  { titulo: 'CFDI 4.0', icono: 'mdi-file-certificate', color: 'success', descripcion: 'Facturación electrónica 100% conforme a la última versión del SAT.' },
  { titulo: 'Control de Acceso', icono: 'mdi-shield-account', color: 'warning', descripcion: 'Sistema de roles y permisos granulares para cada usuario del sistema.' },
  { titulo: 'Portal de Clientes', icono: 'mdi-account-circle', color: 'info', descripcion: 'Tus clientes pueden consultar sus facturas y estado de cuenta en línea.' },
  { titulo: 'Auditoría', icono: 'mdi-history', color: 'error', descripcion: 'Registro detallado de todos los cambios realizados en el sistema.' },
  { titulo: 'API Abierta', icono: 'mdi-api', color: 'purple', descripcion: 'API REST documentada para integraciones con otros sistemas.' },
]

function scrollToModulos() {
  const el = document.getElementById('modulos')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function enviarContacto() {
  if (!contacto.nombre || !contacto.email || !contacto.mensaje) return

  cargando.value = true

  // Simular envío
  setTimeout(() => {
    cargando.value = false
    snackbar.value = {
      show: true,
      mensaje: 'Gracias por contactarnos. Te responderemos a la brevedad.',
      color: 'success',
    }
    contacto.nombre = ''
    contacto.email = ''
    contacto.mensaje = ''
  }, 1000)
}
</script>

<style lang="scss" scoped>
.hero-section {
  min-height: 90vh;
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 30%, #1565c0 60%, #1976D2 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    opacity: 0.5;
  }
}

.h-100 {
  height: 100%;
}

section {
  scroll-margin-top: 80px;
}
</style>
