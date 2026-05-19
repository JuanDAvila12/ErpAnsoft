<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5 font-weight-bold primary--text">
            <v-icon left large color="primary">mdi-warehouse</v-icon>
            Configuración de Almacenes
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Buscar almacén..."
              single-line
              hide-details
              outlined
              dense
              class="mr-4"
              style="max-width:300px;"
            ></v-text-field>
            <v-btn color="primary" @click="abrirDialogo()">
              <v-icon left>mdi-plus</v-icon>
              Nuevo Almacén
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>

          <v-data-table
            :headers="headers"
            :items="almacenes"
            :search="search"
            :loading="cargando"
            loading-text="Cargando almacenes..."
            no-data-text="No hay almacenes configurados"
            class="elevation-0"
          >
            <template v-slot:item.activo="{ item }">
              <v-chip :color="item.activo ? 'success' : 'grey'" small dark>
                {{ item.activo ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </template>
            <template v-slot:item.series="{ item }">
              <v-chip small class="mr-1" v-for="s in (item.series || [])" :key="s.id" color="primary" outlined>
                {{ s.serie }}
              </v-chip>
              <span v-if="!item.series || item.series.length === 0" class="grey--text text-caption">Sin series</span>
            </template>
            <template v-slot:item.acciones="{ item }">
              <v-btn icon small color="primary" @click="abrirDialogo(item)" title="Editar">
                <v-icon small>mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon small color="error" @click="desactivarAlmacen(item)" title="Desactivar">
                <v-icon small>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo de edición de almacén -->
    <v-dialog v-model="dialogo" max-width="900px" persistent scrollable>
      <v-card>
        <v-card-title class="text-h5 font-weight-bold primary--text">
          <v-icon left color="primary">mdi-warehouse</v-icon>
          {{ editando ? 'Editar Almacén' : 'Nuevo Almacén' }}
        </v-card-title>
        <v-divider></v-divider>

        <v-tabs v-model="tabDialogo" background-color="primary" dark grow>
          <v-tab key="datos">
            <v-icon left>mdi-information-outline</v-icon>
            Datos Generales
          </v-tab>
          <v-tab key="series">
            <v-icon left>mdi-file-document-multiple-outline</v-icon>
            Secuencias de Documentos
          </v-tab>
          <v-tab key="formatos">
            <v-icon left>mdi-printer-outline</v-icon>
            Formatos de Impresión
          </v-tab>
        </v-tabs>

        <v-divider></v-divider>
        <v-card-text style="max-height:60vh;overflow-y:auto;">
          <v-tabs-items v-model="tabDialogo">
            <!-- Pestaña Datos Generales -->
            <v-tab-item key="datos">
              <v-row class="mt-2">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.nombre"
                    label="Nombre del Almacén"
                    :rules="[v => !!v || 'El nombre es requerido']"
                    outlined dense
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.codigo"
                    label="Código"
                    outlined dense
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="form.ubicacion"
                    label="Ubicación"
                    outlined dense
                    textarea
                    rows="2"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-switch
                    v-model="form.activo"
                    label="Almacén Activo"
                    color="primary"
                  ></v-switch>
                </v-col>
              </v-row>
            </v-tab-item>

            <!-- Pestaña Secuencias de Documentos -->
            <v-tab-item key="series">
              <v-row class="mt-2">
                <v-col cols="12">
                  <v-alert type="info" dense text class="mb-3">
                    Define las series de documentos para este almacén. Cada tipo de documento puede tener una serie diferente.
                  </v-alert>
                  <v-card outlined class="pa-3 mb-3" v-for="(serie, index) in form.series" :key="index">
                    <v-row align="center">
                      <v-col cols="12" md="3">
                        <v-select
                          v-model="serie.tipo"
                          :items="tiposDocumento"
                          label="Tipo Documento"
                          outlined dense
                          hide-details
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="2">
                        <v-text-field
                          v-model="serie.serie"
                          label="Serie"
                          outlined dense
                          hide-details
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="2">
                        <v-text-field
                          v-model="serie.codigo"
                          label="Código"
                          outlined dense
                          hide-details
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="3">
                        <v-text-field
                          v-model="serie.descripcion"
                          label="Descripción"
                          outlined dense
                          hide-details
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="1" class="text-center">
                        <v-switch v-model="serie.activo" hide-details dense></v-switch>
                      </v-col>
                      <v-col cols="12" md="1" class="text-center">
                        <v-btn icon small color="error" @click="eliminarSerie(index)">
                          <v-icon small>mdi-close</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card>
                  <v-btn color="primary" text @click="agregarSerie">
                    <v-icon left small>mdi-plus</v-icon>
                    Agregar Serie
                  </v-btn>
                </v-col>
              </v-row>
            </v-tab-item>

            <!-- Pestaña Formatos de Impresión -->
            <v-tab-item key="formatos">
              <v-row class="mt-2">
                <v-col cols="12">
                  <v-alert type="info" dense text class="mb-3">
                    Configura el tamaño de papel, orientación y márgenes para cada tipo de documento.
                  </v-alert>
                  <v-card outlined class="pa-3 mb-3" v-for="(formato, index) in form.formatos" :key="index">
                    <v-row align="center">
                      <v-col cols="12" md="3">
                        <v-select
                          v-model="formato.tipo_documento"
                          :items="tiposDocumento"
                          label="Tipo Documento"
                          outlined dense
                          hide-details
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="2">
                        <v-select
                          v-model="formato.tamano_papel"
                          :items="['carta', 'oficio', 'A4', 'ticket']"
                          label="Tamaño"
                          outlined dense
                          hide-details
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="2">
                        <v-select
                          v-model="formato.orientacion"
                          :items="['vertical', 'horizontal']"
                          label="Orientación"
                          outlined dense
                          hide-details
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="1">
                        <v-text-field
                          v-model="formato.margen_superior"
                          label="Sup."
                          type="number"
                          outlined dense
                          hide-details
                          suffix="cm"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="1">
                        <v-text-field
                          v-model="formato.margen_inferior"
                          label="Inf."
                          type="number"
                          outlined dense
                          hide-details
                          suffix="cm"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="1">
                        <v-text-field
                          v-model="formato.margen_izquierdo"
                          label="Izq."
                          type="number"
                          outlined dense
                          hide-details
                          suffix="cm"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="1">
                        <v-text-field
                          v-model="formato.margen_derecho"
                          label="Der."
                          type="number"
                          outlined dense
                          hide-details
                          suffix="cm"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="1" class="text-center">
                        <v-btn icon small color="error" @click="eliminarFormato(index)">
                          <v-icon small>mdi-close</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card>
                  <v-btn color="primary" text @click="agregarFormato">
                    <v-icon left small>mdi-plus</v-icon>
                    Agregar Formato
                  </v-btn>
                </v-col>
              </v-row>
            </v-tab-item>
          </v-tabs-items>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="dialogo = false">Cancelar</v-btn>
          <v-btn color="primary" @click="guardarAlmacen" :loading="guardando">
            <v-icon left>mdi-content-save</v-icon>
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" top right>
      <v-icon left>{{ snackbar.icon }}</v-icon>
      {{ snackbar.text }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from '@/plugins/axios'

export default {
  name: 'ConfiguracionAlmacenesView',
  data() {
    return {
      search: '',
      cargando: false,
      guardando: false,
      almacenes: [],
      dialogo: false,
      editando: false,
      tabDialogo: 0,
      form: {
        nombre: '',
        codigo: '',
        ubicacion: '',
        activo: true,
        series: [],
        formatos: [],
      },
      tiposDocumento: [
        { text: 'Cotización', value: 'cotizacion' },
        { text: 'Orden de Venta', value: 'orden_venta' },
        { text: 'Factura', value: 'factura' },
        { text: 'Cotización Compra', value: 'cotizacion_compra' },
        { text: 'Orden de Compra', value: 'orden_compra' },
        { text: 'Compra', value: 'compra' },
        { text: 'Traspaso', value: 'traspaso' },
        { text: 'Nota de Crédito', value: 'nota_credito' },
        { text: 'Nota de Cargo', value: 'nota_cargo' },
      ],
      headers: [
        { text: 'Nombre', value: 'nombre', sortable: true },
        { text: 'Código', value: 'codigo', sortable: true },
        { text: 'Ubicación', value: 'ubicacion' },
        { text: 'Series', value: 'series', sortable: false },
        { text: 'Estado', value: 'activo', sortable: true },
        { text: 'Acciones', value: 'acciones', sortable: false, align: 'center' },
      ],
      snackbar: {
        show: false,
        text: '',
        color: 'success',
        icon: 'mdi-check-circle',
      },
    }
  },
  mounted() {
    this.cargarAlmacenes()
  },
  methods: {
    async cargarAlmacenes() {
      this.cargando = true
      try {
        const res = await axios.get('/api/v1/configuracion/almacenes')
        if (res.data.exito) {
          this.almacenes = res.data.datos
        }
      } catch (err) {
        this.mostrarSnackbar('Error al cargar almacenes', 'error')
      } finally {
        this.cargando = false
      }
    },
    abrirDialogo(item = null) {
      this.editando = !!item
      this.tabDialogo = 0
      if (item) {
        this.form = {
          id: item.id,
          nombre: item.nombre || '',
          codigo: item.codigo || '',
          ubicacion: item.ubicacion || '',
          activo: item.activo !== false,
          series: (item.series || []).map(s => ({ ...s })),
          formatos: (item.formatos || []).map(f => ({ ...f })),
        }
      } else {
        this.form = {
          nombre: '',
          codigo: '',
          ubicacion: '',
          activo: true,
          series: [],
          formatos: [],
        }
      }
      this.dialogo = true
    },
    agregarSerie() {
      this.form.series.push({
        tipo: 'factura',
        serie: '',
        codigo: '',
        descripcion: '',
        activo: true,
      })
    },
    eliminarSerie(index) {
      this.form.series.splice(index, 1)
    },
    agregarFormato() {
      this.form.formatos.push({
        tipo_documento: 'factura',
        tamano_papel: 'carta',
        orientacion: 'vertical',
        margen_superior: 2.54,
        margen_inferior: 2.54,
        margen_izquierdo: 2.54,
        margen_derecho: 2.54,
      })
    },
    eliminarFormato(index) {
      this.form.formatos.splice(index, 1)
    },
    async guardarAlmacen() {
      if (!this.form.nombre) {
        this.mostrarSnackbar('El nombre del almacén es requerido', 'warning')
        return
      }
      this.guardando = true
      try {
        if (this.editando) {
          const res = await axios.put(`/api/v1/configuracion/almacenes/${this.form.id}`, this.form)
          if (res.data.exito) {
            this.mostrarSnackbar('Almacén actualizado correctamente', 'success')
            this.dialogo = false
            this.cargarAlmacenes()
          }
        } else {
          // Crear nuevo almacén
          const res = await axios.post('/api/v1/almacenes', {
            nombre: this.form.nombre,
            codigo: this.form.codigo,
            ubicacion: this.form.ubicacion,
            activo: true,
          })
          if (res.data.exito || res.data.datos) {
            this.mostrarSnackbar('Almacén creado correctamente', 'success')
            this.dialogo = false
            this.cargarAlmacenes()
          }
        }
      } catch (err) {
        this.mostrarSnackbar('Error al guardar: ' + (err.response?.data?.error || err.message), 'error')
      } finally {
        this.guardando = false
      }
    },
    async desactivarAlmacen(item) {
      if (!confirm(`¿Desactivar el almacén "${item.nombre}"?`)) return
      try {
        const res = await axios.delete(`/api/v1/configuracion/almacenes/${item.id}`)
        if (res.data.exito) {
          this.mostrarSnackbar('Almacén desactivado', 'success')
          this.cargarAlmacenes()
        }
      } catch (err) {
        this.mostrarSnackbar('Error al desactivar almacén', 'error')
      }
    },
    mostrarSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
        icon: color === 'success' ? 'mdi-check-circle' : color === 'warning' ? 'mdi-alert' : 'mdi-alert-circle',
      }
    },
  },
}
</script>
