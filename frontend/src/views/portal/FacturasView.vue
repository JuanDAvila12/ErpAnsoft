<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="success" size="36" class="mr-3">mdi-file-invoice</v-icon>
      <div>
        <h2 class="text-h4 font-weight-bold mb-0">Mis Facturas</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">Facturas electrónicas emitidas a tu empresa</p>
      </div>
    </div>

    <v-card variant="tonal">
      <v-data-table
        :headers="headers"
        :items="facturas"
        :loading="loading"
        loading-text="Cargando facturas..."
        no-data-text="No hay facturas disponibles"
      >
        <template v-slot:item.total="{ value }">
          ${{ (value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </template>
        <template v-slot:item.estado="{ value }">
          <v-chip :color="value === 'activo' ? 'success' : 'warning'" size="small">
            {{ value === 'activo' ? 'Vigente' : 'Cancelado' }}
          </v-chip>
        </template>
        <template v-slot:item.fecha_emision="{ value }">
          {{ value ? new Date(value).toLocaleDateString('es-MX') : '' }}
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(true)
const facturas = ref([])

const headers = [
  { title: 'Folio', key: 'folio', sortable: true },
  { title: 'Fecha', key: 'fecha_emision', sortable: true },
  { title: 'RFC Receptor', key: 'rfc_receptor' },
  { title: 'Total', key: 'total', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true },
  { title: 'UUID', key: 'uuid' },
]

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const portalCliente = JSON.parse(localStorage.getItem('portalCliente') || '{}')
    const entidadId = portalCliente.entidad_id

    const response = await axios.get(`/api/v1/documentos-venta?tipo=venta&entidad_cliente_id=${entidadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    facturas.value = response.data.datos || []
  } catch (err) {
    console.error('Error al cargar facturas:', err)
  } finally {
    loading.value = false
  }
})
</script>
