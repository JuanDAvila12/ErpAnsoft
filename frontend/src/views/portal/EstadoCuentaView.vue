<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="info" size="36" class="mr-3">mdi-account-cash</v-icon>
      <div>
        <h2 class="text-h4 font-weight-bold mb-0">Estado de Cuenta</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">Resumen de saldos pendientes</p>
      </div>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card variant="tonal" color="info" class="pa-4">
          <v-card-title class="text-h6 pa-0 mb-2">Total Facturado</v-card-title>
          <v-card-text class="pa-0">
            <span class="text-h4 font-weight-bold">${{ (resumen.total_facturado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="tonal" color="success" class="pa-4">
          <v-card-title class="text-h6 pa-0 mb-2">Total Pagado</v-card-title>
          <v-card-text class="pa-0">
            <span class="text-h4 font-weight-bold">${{ (resumen.total_pagado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="tonal" color="error" class="pa-4">
          <v-card-title class="text-h6 pa-0 mb-2">Saldo Pendiente</v-card-title>
          <v-card-text class="pa-0">
            <span class="text-h4 font-weight-bold">${{ (resumen.saldo_pendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Últimas facturas -->
    <v-card variant="tonal" class="mt-4">
      <v-card-title class="text-h6">
        <v-icon class="mr-2">mdi-file-invoice</v-icon>
        Últimas Facturas
      </v-card-title>
      <v-data-table
        :headers="headers"
        :items="ultimasFacturas"
        :loading="loading"
        no-data-text="No hay movimientos recientes"
      >
        <template v-slot:item.total="{ value }">
          ${{ (value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
        <template v-slot:item.saldo_pendiente="{ value }">
          ${{ (value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(true)
const resumen = ref({
  total_facturado: 0,
  total_pagado: 0,
  saldo_pendiente: 0,
})
const ultimasFacturas = ref([])

const headers = [
  { title: 'Folio', key: 'folio', sortable: true },
  { title: 'Fecha', key: 'fecha_emision', sortable: true },
  { title: 'Total', key: 'total' },
  { title: 'Saldo Pendiente', key: 'saldo_pendiente' },
]

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const portalCliente = JSON.parse(localStorage.getItem('portalCliente') || '{}')
    const entidadId = portalCliente.entidad_id

    // Cargar facturas del cliente
    const response = await axios.get(`/api/v1/documentos-venta?tipo=venta&entidad_cliente_id=${entidadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const docs = response.data.datos || []

    // Calcular resumen
    const totalFacturado = docs.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0)
    // Ejemplo: suponiendo que saldo_pendiente viene del backend
    const saldoPendiente = docs.reduce((sum, d) => sum + (parseFloat(d.saldo_pendiente || d.total || 0)), 0)

    resumen.value = {
      total_facturado: totalFacturado,
      total_pagado: totalFacturado - saldoPendiente,
      saldo_pendiente: saldoPendiente,
    }
    ultimasFacturas.value = docs.slice(0, 10)
  } catch (err) {
    console.error('Error al cargar estado de cuenta:', err)
  } finally {
    loading.value = false
  }
})
</script>
