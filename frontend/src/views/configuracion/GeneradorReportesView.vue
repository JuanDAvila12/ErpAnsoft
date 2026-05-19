<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5 font-weight-bold primary--text">
            <v-icon left large color="primary">mdi-chart-bar</v-icon>
            Generador de Reportes
            <v-spacer></v-spacer>
            <v-select
              v-model="filtroModulo"
              :items="modulos"
              label="Filtrar por módulo"
              outlined dense
              clearable
              class="mr-4"
              style="max-width:200px;"
              @change="cargarReportes"
            ></v-select>
            <v-btn color="primary" @click="abrirDialogo()">
              <v-icon left>mdi-plus</v-icon>
              Nuevo Reporte
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>

          <v-data-table
            :headers="headers"
            :items="reportes"
            :loading="cargando"
            loading-text="Cargando reportes..."
            no-data-text="No hay reportes configurados"
            class="elevation-0"
          >
            <template v-slot:item.activo="{ item }">
              <v-chip :color="item.activo ? 'success' : 'grey'" small dark>
                {{ item.activo ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </template>
            <template v-slot:item.modulo="{ item }">
              <v-chip small color="primary" outlined>{{ item.modulo }}</v-chip>
            </template>
            <template v-slot:item.acciones="{ item }">
              <v-btn icon small color="success" @click="ejecutarReporte(item)" title="Ejecutar">
                <v-icon small>mdi-play</v-icon>
              </v-btn>
              <v-btn icon small color="primary" @click="abrirDialogo(item)" title="Editar">
                <v-icon small>mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon small color="warning" @click="duplicarReporte(item)" title="Duplicar">
                <v-icon small>mdi-content-copy</v-icon>
              </v-btn>
              <v-btn icon small color="error" @click="eliminarReporte(item)" title="Eliminar">
                <v-icon small>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo de edición de reporte -->
    <v-dialog v-model="dialogo" max-width="900px" persistent scrollable>
      <v-card>
        <v-card-title class="text-h5 font-weight-bold primary--text">
          <v-icon left color="primary">mdi-chart-bar</v-icon>
          {{ editando ? 'Editar Reporte' : 'Nuevo Reporte' }}
        </v-card-title>
        <v-divider></v-divider>

        <v-tabs v-model="tabDialogo" background-color="primary" dark grow>
          <v-tab key="diseno">
            <v-icon left>mdi-palette</v-icon>
            Diseño
          </v-tab>
          <v-tab key="sql">
            <v-icon left>mdi-code-tags</v-icon>
            Consulta SQL
          </v-tab>
          <v-tab key="parametros">
            <v-icon left>mdi-tune</v-icon>
            Parámetros y Columnas
          </v-tab>
        </v-tabs>

        <v-divider></v-divider>
        <v-card-text style="max-height:60vh;overflow-y:auto;">
          <v-tabs-items v-model="tabDialogo">
            <!-- Pestaña Diseño -->
            <v-tab-item key="diseno">
              <v-row class="mt-2">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.nombre"
                    label="Nombre del Reporte"
                    :rules="[v => !!v || 'El nombre es requerido']"
                    outlined dense
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.modulo"
                    :items="modulos"
                    label="Módulo"
                    outlined dense
                  ></v-select>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="form.descripcion"
                    label="Descripción"
                    outlined dense
                    rows="3"
                  ></v-textarea>
                </v-col>
                <v-col cols="12">
                  <v-switch v-model="form.activo" label="Reporte Activo" color="primary"></v-switch>
                </v-col>
              </v-row>
            </v-tab-item>

            <!-- Pestaña Consulta SQL -->
            <v-tab-item key="sql">
              <v-row class="mt-2">
                <v-col cols="12">
                  <v-alert type="info" dense text class="mb-3">
                    Escribe tu consulta SQL. Usa <code>:nombre_parametro</code> para parámetros dinámicos.
                    Ejemplo: <code>SELECT * FROM transacciones WHERE fecha BETWEEN :fecha_desde AND :fecha_hasta</code>
                  </v-alert>
                  <v-textarea
                    v-model="form.consulta_sql"
                    label="Consulta SQL"
                    outlined
                    rows="12"
                    class="code-editor"
                    spellcheck="false"
                    :rules="[v => !!v || 'La consulta SQL es requerida']"
                  ></v-textarea>
                </v-col>
              </v-row>
            </v-tab-item>

            <!-- Pestaña Parámetros y Columnas -->
            <v-tab-item key="parametros">
              <v-row class="mt-2">
                <v-col cols="12" md="6">
                  <v-card outlined class="pa-3 mb-3">
                    <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                      <v-icon small color="primary" class="mr-2">mdi-tune</v-icon>
                      Parámetros
                    </v-card-title>
                    <v-card outlined class="pa-2 mb-2" v-for="(param, index) in form.parametros" :key="'p'+index">
                      <v-row align="center" dense>
                        <v-col cols="5">
                          <v-text-field v-model="param.nombre" label="Nombre" outlined dense hide-details></v-text-field>
                        </v-col>
                        <v-col cols="4">
                          <v-select v-model="param.tipo" :items="['texto', 'numero', 'fecha', 'booleano']" label="Tipo" outlined dense hide-details></v-select>
                        </v-col>
                        <v-col cols="2">
                          <v-text-field v-model="param.default" label="Default" outlined dense hide-details></v-text-field>
                        </v-col>
                        <v-col cols="1" class="text-center">
                          <v-btn icon small color="error" @click="form.parametros.splice(index, 1)">
                            <v-icon small>mdi-close</v-icon>
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-card>
                    <v-btn color="primary" text small @click="form.parametros.push({nombre:'', tipo:'texto', default:''})">
                      <v-icon left small>mdi-plus</v-icon>
                      Agregar Parámetro
                    </v-btn>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card outlined class="pa-3 mb-3">
                    <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                      <v-icon small color="primary" class="mr-2">mdi-table</v-icon>
                      Columnas
                    </v-card-title>
                    <v-card outlined class="pa-2 mb-2" v-for="(col, index) in form.columnas" :key="'c'+index">
                      <v-row align="center" dense>
                        <v-col cols="5">
                          <v-text-field v-model="col.campo" label="Campo SQL" outlined dense hide-details></v-text-field>
                        </v-col>
                        <v-col cols="5">
                          <v-text-field v-model="col.alias" label="Alias (título)" outlined dense hide-details></v-text-field>
                        </v-col>
                        <v-col cols="2" class="text-center">
                          <v-btn icon small color="error" @click="form.columnas.splice(index, 1)">
                            <v-icon small>mdi-close</v-icon>
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-card>
                    <v-btn color="primary" text small @click="form.columnas.push({campo:'', alias:''})">
                      <v-icon left small>mdi-plus</v-icon>
                      Agregar Columna
                    </v-btn>
                  </v-card>
                </v-col>
              </v-row>
            </v-tab-item>
          </v-tabs-items>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="dialogo = false">Cancelar</v-btn>
          <v-btn color="primary" @click="guardarReporte" :loading="guardando">
            <v-icon left>mdi-content-save</v-icon>
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de vista previa / ejecución -->
    <v-dialog v-model="dialogoVistaPrevia" max-width="1200px" scrollable>
      <v-card>
        <v-card-title class="text-h5 font-weight-bold primary--text">
          <v-icon left color="primary">mdi-play-circle</v-icon>
          Vista Previa: {{ reporteActual?.nombre }}
          <v-spacer></v-spacer>
          <v-btn color="success" @click="exportarExcel" :disabled="!resultados.length">
            <v-icon left>mdi-file-excel</v-icon>
            Excel
          </v-btn>
          <v-btn color="error" class="ml-2" @click="exportarPDF" :disabled="!resultados.length">
            <v-icon left>mdi-file-pdf</v-icon>
            PDF
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-row v-if="reporteActual?.parametros?.length" class="mb-4">
            <v-col cols="12">
              <v-card outlined class="pa-3">
                <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-2">Parámetros</v-card-title>
                <v-row>
                  <v-col cols="auto" v-for="(param, i) in reporteActual.parametros" :key="i">
                    <v-text-field
                      v-if="param.tipo === 'fecha'"
                      v-model="parametrosEjecucion[param.nombre]"
                      :label="param.nombre"
                      type="date"
                      outlined dense
                    ></v-text-field>
                    <v-text-field
                      v-else
                      v-model="parametrosEjecucion[param.nombre]"
                      :label="param.nombre"
                      outlined dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="auto">
                    <v-btn color="primary" @click="ejecutarConsulta" :loading="ejecutando">
                      <v-icon left>mdi-play</v-icon>
                      Ejecutar
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
          </v-row>

          <v-data-table
            :headers="columnasResultado"
            :items="resultados"
            :loading="ejecutando"
            loading-text="Ejecutando consulta..."
            no-data-text="Ejecuta la consulta para ver resultados"
            dense
            class="elevation-1"
          >
            <template v-slot:no-data>
              <v-alert type="info" dense text>
                Haz clic en "Ejecutar" para ver los resultados de este reporte.
              </v-alert>
            </template>
          </v-data-table>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <span class="grey--text text-caption" v-if="resultados.length">
            {{ resultados.length }} registro(s) encontrado(s)
          </span>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="dialogoVistaPrevia = false">Cerrar</v-btn>
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
  name: 'GeneradorReportesView',
  data() {
    return {
      cargando: false,
      guardando: false,
      ejecutando: false,
      reportes: [],
      filtroModulo: null,
      dialogo: false,
      editando: false,
      tabDialogo: 0,
      dialogoVistaPrevia: false,
      reporteActual: null,
      parametrosEjecucion: {},
      resultados: [],
      columnasResultado: [],
      form: {
        nombre: '',
        descripcion: '',
        modulo: 'general',
        consulta_sql: '',
        parametros: [],
        columnas: [],
        activo: true,
      },
      modulos: [
        { text: 'General', value: 'general' },
        { text: 'Ventas', value: 'ventas' },
        { text: 'Compras', value: 'compras' },
        { text: 'Inventario', value: 'inventario' },
        { text: 'Contabilidad', value: 'contabilidad' },
        { text: 'Fiscal', value: 'fiscal' },
        { text: 'CRM', value: 'crm' },
      ],
      headers: [
        { text: 'Nombre', value: 'nombre', sortable: true },
        { text: 'Descripción', value: 'descripcion' },
        { text: 'Módulo', value: 'modulo', sortable: true },
        { text: 'Estado', value: 'activo', sortable: true },
        { text: 'Creado por', value: 'creador_nombre' },
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
    this.cargarReportes()
  },
  methods: {
    async cargarReportes() {
      this.cargando = true
      try {
        const params = {}
        if (this.filtroModulo) params.modulo = this.filtroModulo
        const res = await axios.get('/api/v1/reportes-configuracion', { params })
        if (res.data.exito) {
          this.reportes = res.data.datos
        }
      } catch (err) {
        this.mostrarSnackbar('Error al cargar reportes', 'error')
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
          descripcion: item.descripcion || '',
          modulo: item.modulo || 'general',
          consulta_sql: item.consulta_sql || '',
          parametros: (item.parametros || []).map(p => ({ ...p })),
          columnas: (item.columnas || []).map(c => ({ ...c })),
          activo: item.activo !== false,
        }
      } else {
        this.form = {
          nombre: '',
          descripcion: '',
          modulo: 'general',
          consulta_sql: '',
          parametros: [],
          columnas: [],
          activo: true,
        }
      }
      this.dialogo = true
    },
    async guardarReporte() {
      if (!this.form.nombre || !this.form.consulta_sql) {
        this.mostrarSnackbar('Nombre y consulta SQL son requeridos', 'warning')
        return
      }
      this.guardando = true
      try {
        if (this.editando) {
          const res = await axios.put(`/api/v1/reportes-configuracion/${this.form.id}`, this.form)
          if (res.data.exito) {
            this.mostrarSnackbar('Reporte actualizado correctamente', 'success')
            this.dialogo = false
            this.cargarReportes()
          }
        } else {
          const res = await axios.post('/api/v1/reportes-configuracion', this.form)
          if (res.data.exito) {
            this.mostrarSnackbar('Reporte creado correctamente', 'success')
            this.dialogo = false
            this.cargarReportes()
          }
        }
      } catch (err) {
        this.mostrarSnackbar('Error al guardar: ' + (err.response?.data?.error || err.message), 'error')
      } finally {
        this.guardando = false
      }
    },
    async ejecutarReporte(item) {
      this.reporteActual = { ...item }
      this.parametrosEjecucion = {}
      if (item.parametros) {
        item.parametros.forEach(p => {
          this.parametrosEjecucion[p.nombre] = p.default || ''
        })
      }
      this.resultados = []
      this.columnasResultado = []
      this.dialogoVistaPrevia = true

      // Si no tiene parámetros, ejecutar automáticamente
      if (!item.parametros || item.parametros.length === 0) {
        await this.ejecutarConsulta()
      }
    },
    async ejecutarConsulta() {
      if (!this.reporteActual) return
      this.ejecutando = true
      try {
        const res = await axios.post(`/api/v1/reportes-configuracion/${this.reporteActual.id}/ejecutar`, {
          parametros: this.parametrosEjecucion,
        })
        if (res.data.exito) {
          this.resultados = res.data.datos
          // Construir headers desde las columnas configuradas o desde los campos
          if (this.reporteActual.columnas && this.reporteActual.columnas.length > 0) {
            this.columnasResultado = this.reporteActual.columnas.map(c => ({
              text: c.alias || c.campo,
              value: c.campo,
            }))
          } else if (res.data.columnas) {
            this.columnasResultado = res.data.columnas.map(c => ({
              text: c.name,
              value: c.name,
            }))
          } else if (res.data.datos.length > 0) {
            this.columnasResultado = Object.keys(res.data.datos[0]).map(k => ({
              text: k,
              value: k,
            }))
          }
        }
      } catch (err) {
        this.mostrarSnackbar('Error al ejecutar: ' + (err.response?.data?.error || err.message), 'error')
      } finally {
        this.ejecutando = false
      }
    },
    async duplicarReporte(item) {
      try {
        const res = await axios.post(`/api/v1/reportes-configuracion/${item.id}/duplicar`)
        if (res.data.exito) {
          this.mostrarSnackbar('Reporte duplicado correctamente', 'success')
          this.cargarReportes()
        }
      } catch (err) {
        this.mostrarSnackbar('Error al duplicar reporte', 'error')
      }
    },
    async eliminarReporte(item) {
      if (!confirm(`¿Eliminar el reporte "${item.nombre}"?`)) return
      try {
        const res = await axios.delete(`/api/v1/reportes-configuracion/${item.id}`)
        if (res.data.exito) {
          this.mostrarSnackbar('Reporte eliminado', 'success')
          this.cargarReportes()
        }
      } catch (err) {
        this.mostrarSnackbar('Error al eliminar reporte', 'error')
      }
    },
    exportarExcel() {
      // Convertir resultados a CSV y descargar
      if (!this.resultados.length) return
      const headers = this.columnasResultado.map(c => c.text).join(',')
      const rows = this.resultados.map(r =>
        this.columnasResultado.map(c => {
          const val = r[c.value]
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        }).join(',')
      ).join('\n')
      const csv = `${headers}\n${rows}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${this.reporteActual?.nombre || 'reporte'}.csv`
      link.click()
      this.mostrarSnackbar('Reporte exportado como CSV', 'success')
    },
    exportarPDF() {
      this.mostrarSnackbar('Función de exportación PDF próximamente', 'info')
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

<style scoped>
.code-editor textarea {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #1e1e1e;
  color: #d4d4d4;
}
</style>
