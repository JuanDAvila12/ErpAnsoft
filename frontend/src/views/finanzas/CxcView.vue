<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-icon color="primary" size="36" class="mr-3">mdi-account-cash</v-icon>
      <h2 class="text-h4 font-weight-bold mb-0">Cuentas por Cobrar</h2>
    </div>

    <v-row>
      <!-- Buscador de clientes -->
      <v-col cols="12" md="4">
        <v-autocomplete
          v-model="clienteSeleccionado"
          :items="clientes"
          item-title="razon_social"
          item-value="id"
          label="Seleccionar Cliente"
          variant="outlined"
          density="compact"
          clearable
          @update:model-value="cargarEstadoCuenta"
        />
      </v-col>
    </v-row>

    <div v-if="estadoCuenta" class="mb-4">
      <v-card class="mb-4">
        <v-card-text>
          <div class="d-flex justify-space-between align-center">
            <span class="text-h6">Saldo Total Pendiente</span>
            <span class="text-h5 font-weight-bold" :class="estadoCuenta.saldo_total > 0 ? 'text-error' : 'text-success'">
              ${{ parseFloat(estadoCuenta.saldo_total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
            </span>
          </div>
        </v-card-text>
      </v-card>

      <!-- Facturas pendientes -->
      <v-card variant="tonal" class="mb-4">
        <v-card-title>
          <v-icon class="mr-2">mdi-file-document</v-icon>
          Facturas Pendientes ({{ estadoCuenta.facturas.length }})
        </v-card-title>
        <v-card-text v-if="estadoCuenta.facturas.length === 0" class="text-center text-medium-emphasis py-6">
          No hay facturas pendientes para este cliente.
        </v-card-text>
        <v-table v-else density="compact">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Vencimiento</th>
              <th class="text-right">Total</th>
              <th class="text-right">Saldo Restante</th>
              <th>Estado</th>
              <th>Abonos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="factura in estadoCuenta.facturas" :key="factura.id">
              <td>{{ factura.folio }}</td>
              <td>{{ formatFecha(factura.fecha) }}</td>
              <td>{{ formatFecha(factura.fecha_vencimiento) }}</td>
              <td class="text-right">${{ parseFloat(factura.total).toFixed(2) }}</td>
              <td class="text-right font-weight-medium" :class="parseFloat(factura.saldo_restante) > 0 ? 'text-error' : ''">
                ${{ parseFloat(factura.saldo_restante).toFixed(2) }}
              </td>
              <td>
                <v-chip :color="chipColor(factura.estado_saldo)" size="x-small" class="font-weight-medium text-caption">
                  {{ factura.estado_saldo }}
                </v-chip>
              </td>
              <td>
                <v-btn variant="text" icon="mdi-chevron-down" size="x-small" @click="toggleAbonos(factura.id)" />
                <div v-if="abonosVisibles[factura.id]" class="mt-1">
                  <div v-for="abono in factura.abonos" :key="abono.id" class="text-caption">
                    <v-chip size="x-small" color="success" variant="tonal">
                      ${{ parseFloat(abono.monto).toFixed(2) }}
                    </v-chip>
                    <span class="ml-1">{{ abono.cobro_folio || '' }}</span>
                  </div>
                  <div v-if="!factura.abonos || factura.abonos.length === 0" class="text-caption text-medium-emphasis">
                    Sin abonos registrados
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Cobros registrados -->
      <v-card variant="tonal">
        <v-card-title>
          <v-icon class="mr-2">mdi-cash-multiple</v-icon>
          Cobros Registrados ({{ estadoCuenta.cobros.length }})
        </v-card-title>
        <v-card-text v-if="estadoCuenta.cobros.length === 0" class="text-center text-medium-emphasis py-6">
          No hay cobros registrados.
        </v-card-text>
        <v-table v-else density="compact">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Comentario</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cobro in estadoCuenta.cobros" :key="cobro.id">
              <td>{{ cobro.folio }}</td>
              <td>{{ formatFecha(cobro.fecha) }}</td>
              <td>{{ cobro.comentario || '-' }}</td>
              <td class="text-right">${{ parseFloat(cobro.total).toFixed(2) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <div v-else>
      <v-card>
        <v-card-text class="text-center py-8 text-medium-emphasis">
          <v-icon size="48" class="mb-2">mdi-account-search</v-icon>
          <p>Selecciona un cliente para ver su estado de cuenta</p>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const clienteSeleccionado = ref(null)
const clientes = ref([])
const estadoCuenta = ref(null)
const abonosVisibles = ref({})

function formatFecha(fecha) {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleDateString('es-MX')
}

function chipColor(estado) {
  if (estado === 'pendiente') return 'warning'
  if (estado === 'parcial') return 'info'
  if (estado === 'liquidado') return 'success'
  return 'default'
}

function toggleAbonos(facturaId) {
  abonosVisibles.value[facturaId] = !abonosVisibles.value[facturaId]
}

async function cargarEstadoCuenta() {
  if (!clienteSeleccionado.value) {
    estadoCuenta.value = null
    return
  }
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/cxc/estado-cuenta/${clienteSeleccionado.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    estadoCuenta.value = res.data.datos
  } catch (err) {
    console.error('Error al cargar estado de cuenta:', err)
  }
}

async function cargarClientes() {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/entidades?tipo=cliente', {
      headers: { Authorization: `Bearer ${token}` },
    })
    clientes.value = res.data.datos || res.data || []
  } catch (err) {
    console.error('Error al cargar clientes:', err)
  }
}

cargarClientes()
</script>
