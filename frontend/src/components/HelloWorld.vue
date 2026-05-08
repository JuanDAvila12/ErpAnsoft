<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12" rounded="lg">
          <v-card-item class="text-center pt-6">
            <v-icon size="64" color="primary" class="mb-4">
              mdi-view-dashboard
            </v-icon>
            <v-card-title class="text-h4 font-weight-bold text-primary">
              SPI ERP
            </v-card-title>
            <v-card-subtitle class="text-h6 mt-2">
              Sistema de Gestión Empresarial
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="text-center">
            <p class="text-body-1 text-medium-emphasis mb-4">
              Módulos: Ventas · Compras · Inventario · Facturación Fiscal
            </p>
            <v-divider class="mb-4"></v-divider>
            <v-chip
              class="ma-1"
              color="primary"
              variant="outlined"
              size="small"
            >
              <v-icon start>mdi-nodejs</v-icon>
              Node.js
            </v-chip>
            <v-chip
              class="ma-1"
              color="info"
              variant="outlined"
              size="small"
            >
              <v-icon start>mdi-language-python</v-icon>
              Python
            </v-chip>
            <v-chip
              class="ma-1"
              color="success"
              variant="outlined"
              size="small"
            >
              <v-icon start>mdi-vuejs</v-icon>
              Vue 3
            </v-chip>
            <v-chip
              class="ma-1"
              color="warning"
              variant="outlined"
              size="small"
            >
              <v-icon start>mdi-database</v-icon>
              PostgreSQL
            </v-chip>
          </v-card-text>

          <v-card-actions class="justify-center pb-6">
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              prepend-icon="mdi-check-circle"
              @click="showMessage = !showMessage"
            >
              {{ showMessage ? 'Ocultar mensaje' : '¡Haz clic aquí!' }}
            </v-btn>
          </v-card-actions>

          <v-expand-transition>
            <v-alert
              v-if="showMessage"
              type="success"
              class="mx-4 mb-4"
              closable
              @click:close="showMessage = false"
            >
              ✅ ¡Vuetify funciona correctamente! El sistema ERP está listo para desarrollarse.
            </v-alert>
          </v-expand-transition>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'

const showMessage = ref(false)
</script>

<style lang="scss" scoped>
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
