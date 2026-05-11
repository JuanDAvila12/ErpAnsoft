<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon :color="color" size="36" class="mr-3">{{ icono }}</v-icon>
      <div>
        <h2 class="text-h4 font-weight-bold mb-0">{{ titulo }}</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">{{ descripcion }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="accion" color="primary" variant="flat" @click="accion.callback">
        <v-icon start>mdi-plus</v-icon>
        {{ accion.texto }}
      </v-btn>
    </div>

    <v-card variant="tonal">
      <v-data-table
        :headers="headers"
        :items="[]"
        no-data-text="No hay registros disponibles"
        class="elevation-1"
      >
        <template v-slot:no-data>
          <v-alert type="info" variant="tonal" class="ma-4">
            Módulo en desarrollo. Próximamente podrás gestionar {{ titulo.toLowerCase() }} aquí.
          </v-alert>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
defineProps({
  titulo: { type: String, required: true },
  icono: { type: String, default: 'mdi-view-grid' },
  color: { type: String, default: 'primary' },
  descripcion: { type: String, default: '' },
  headers: { type: Array, default: () => [
    { title: 'ID', key: 'id', sortable: true },
    { title: 'Folio', key: 'folio', sortable: true },
    { title: 'Fecha', key: 'fecha', sortable: true },
    { title: 'Total', key: 'total', sortable: true },
    { title: 'Estado', key: 'estado', sortable: true },
  ]},
  accion: { type: Object, default: null },
})
</script>
