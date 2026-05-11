<template>
  <ModuloPlaceholder
    titulo="Órdenes de Venta"
    icono="mdi-receipt"
    color="primary"
    descripcion="Gestión de órdenes de venta, cotizaciones y facturación"
    :columnas="columnas"
  />
</template>

<script setup>
import ModuloPlaceholder from '../../components/ModuloPlaceholder.vue'

const columnas = [
  { text: 'Folio', value: 'folio' },
  { text: 'Cliente', value: 'entidad_cliente_rs' },
  { text: 'Fecha', value: 'fecha_documento' },
  { text: 'Monto', value: 'total' },
  { text: 'Estado', value: 'estado' },
]
</script>
