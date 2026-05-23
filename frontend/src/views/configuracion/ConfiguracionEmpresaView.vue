<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5 font-weight-bold primary--text">
            <v-icon left large color="primary">mdi-domain</v-icon>
            Configuración de Empresa
          </v-card-title>
          <v-divider></v-divider>

          <v-tabs v-model="tab" background-color="primary" dark grow>
            <v-tab key="generales">
              <v-icon left>mdi-information-outline</v-icon>
              Datos Generales
            </v-tab>
            <v-tab key="fiscales">
              <v-icon left>mdi-file-document-outline</v-icon>
              Datos Fiscales
            </v-tab>
            <v-tab key="formatos">
              <v-icon left>mdi-file-document-edit-outline</v-icon>
              Formatos de Documentos
            </v-tab>
            <v-tab key="csd">
              <v-icon left>mdi-lock-outline</v-icon>
              Certificados (CSD)
            </v-tab>
            <v-tab key="cuentas">
              <v-icon left>mdi-book-account-outline</v-icon>
              Cuentas Contables Default
            </v-tab>
          </v-tabs>

          <v-tabs-items v-model="tab">
            <!-- ========== PESTAÑA 1: DATOS GENERALES ========== -->
            <v-tab-item key="generales">
              <v-card flat>
                <v-card-text>
                  <v-form ref="formGenerales" v-model="validoGenerales">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-card outlined class="pa-4 mb-4">
                          <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                            <v-icon small color="primary" class="mr-2">mdi-domain</v-icon>
                            Identificación de la Empresa
                          </v-card-title>
                          <v-text-field
                            v-model="empresa.razon_social"
                            label="Razón Social"
                            :rules="[v => !!v || 'La razón social es requerida']"
                            outlined dense
                          ></v-text-field>
                          <v-text-field
                            v-model="empresa.nombre_comercial"
                            label="Nombre Comercial"
                            outlined dense
                          ></v-text-field>
                          <v-text-field
                            v-model="empresa.rfc"
                            label="RFC"
                            :rules="[v => !!v || 'El RFC es requerido']"
                            outlined dense
                            maxlength="13"
                          ></v-text-field>
                          <v-select
                            v-model="empresa.regimen_fiscal"
                            :items="regimenesFiscales"
                            label="Régimen Fiscal"
                            outlined dense
                          ></v-select>
                        </v-card>
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-card outlined class="pa-4 mb-4">
                          <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                            <v-icon small color="primary" class="mr-2">mdi-map-marker</v-icon>
                            Dirección y Contacto
                          </v-card-title>
                          <v-text-field
                            v-model="empresa.direccion"
                            label="Dirección"
                            outlined dense
                            textarea
                            rows="2"
                          ></v-text-field>
                          <v-row>
                            <v-col cols="6">
                              <v-text-field
                                v-model="empresa.codigo_postal"
                                label="Código Postal"
                                outlined dense
                                maxlength="5"
                              ></v-text-field>
                            </v-col>
                            <v-col cols="6">
                              <v-text-field
                                v-model="empresa.telefono"
                                label="Teléfono"
                                outlined dense
                              ></v-text-field>
                            </v-col>
                          </v-row>
                          <v-text-field
                            v-model="empresa.email"
                            label="Correo Electrónico"
                            type="email"
                            outlined dense
                          ></v-text-field>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-tab-item>

            <!-- ========== PESTAÑA 2: DATOS FISCALES ========== -->
            <v-tab-item key="fiscales">
              <v-card flat>
                <v-card-text>
                  <v-form ref="formFiscales">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-card outlined class="pa-4 mb-4">
                          <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                            <v-icon small color="primary" class="mr-2">mdi-file-document-outline</v-icon>
                            Configuración Fiscal
                          </v-card-title>
                          <v-select
                            v-model="empresa.regimen_fiscal"
                            :items="regimenesFiscales"
                            label="Régimen Fiscal"
                            outlined dense
                          ></v-select>
                          <v-text-field
                            v-model="empresa.lugar_expedicion"
                            label="Lugar de Expedición (CP)"
                            outlined dense
                            maxlength="5"
                          ></v-text-field>
                          <v-text-field
                            v-model="empresa.certificado_csd_numero"
                            label="Número de Certificado CSD"
                            outlined dense
                          ></v-text-field>
                          <v-text-field
                            v-model="empresa.regimen_fiscal_letra"
                            label="Letra del Régimen"
                            outlined dense
                          ></v-text-field>
                        </v-card>
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-card outlined class="pa-4 mb-4">
                          <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                            <v-icon small color="primary" class="mr-2">mdi-calculator</v-icon>
                            Impuestos y Moneda
                          </v-card-title>
                          <v-text-field
                            v-model="empresa.iva_porcentaje"
                            label="Porcentaje de IVA (%)"
                            type="number"
                            outlined dense
                            suffix="%"
                          ></v-text-field>
                          <v-select
                            v-model="empresa.moneda_default"
                            :items="['MXN', 'USD', 'EUR']"
                            label="Moneda por Defecto"
                            outlined dense
                          ></v-select>
                          <v-text-field
                            v-model="empresa.dias_credito_default"
                            label="Días de Crédito por Defecto"
                            type="number"
                            outlined dense
                          ></v-text-field>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-tab-item>

            <!-- ========== PESTAÑA 3: FORMATOS DE DOCUMENTOS ========== -->
            <v-tab-item key="formatos">
              <v-card flat>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-card outlined class="pa-4 mb-4">
                        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                          <v-icon small color="primary" class="mr-2">mdi-image</v-icon>
                          Logo y Personalización
                        </v-card-title>
                        <v-text-field
                          v-model="empresa.logo_url"
                          label="URL del Logo"
                          outlined dense
                          placeholder="https://ejemplo.com/logo.png"
                        ></v-text-field>
                        <v-img
                          v-if="empresa.logo_url"
                          :src="empresa.logo_url"
                          max-height="100"
                          max-width="200"
                          contain
                          class="mb-3"
                        ></v-img>
                        <v-text-field
                          v-model="empresa.pie_pagina"
                          label="Texto de Pie de Página"
                          outlined dense
                          textarea
                          rows="2"
                        ></v-text-field>
                      </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-card outlined class="pa-4 mb-4">
                        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                          <v-icon small color="primary" class="mr-2">mdi-scale-balance</v-icon>
                          Términos Legales
                        </v-card-title>
                        <v-textarea
                          v-model="empresa.terminos_legales"
                          label="Términos y Condiciones / Notas Legales"
                          outlined dense
                          rows="4"
                        ></v-textarea>
                        <v-text-field
                          v-model="empresa.formato_folio"
                          label="Formato de Folio"
                          outlined dense
                          placeholder="SERIE-{NUMERO}"
                        ></v-text-field>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-tab-item>

            <!-- ========== PESTAÑA 4: CERTIFICADOS CSD ========== -->
            <v-tab-item key="csd">
              <v-card flat>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-card outlined class="pa-4 mb-4">
                        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                          <v-icon small color="primary" class="mr-2">mdi-file-certificate</v-icon>
                          Certificado (.cer)
                        </v-card-title>
                        <v-file-input
                          v-model="archivoCer"
                          label="Seleccionar archivo .cer"
                          accept=".cer"
                          outlined dense
                          show-size
                          @change="onArchivoCerChange"
                        ></v-file-input>
                        <v-text-field
                          v-model="empresa.certificado_csd_numero"
                          label="Número de Certificado"
                          outlined dense
                          readonly
                        ></v-text-field>
                        <v-text-field
                          v-model="empresa.certificado_csd_vigencia"
                          label="Vigencia"
                          outlined dense
                          readonly
                        ></v-text-field>
                      </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-card outlined class="pa-4 mb-4">
                        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                          <v-icon small color="primary" class="mr-2">mdi-key-variant</v-icon>
                          Llave Privada (.key) y Contraseña
                        </v-card-title>
                        <v-file-input
                          v-model="archivoKey"
                          label="Seleccionar archivo .key"
                          accept=".key"
                          outlined dense
                          show-size
                        ></v-file-input>
                        <v-text-field
                          v-model="empresa.csd_contrasena"
                          label="Contraseña de la Llave Privada"
                          outlined dense
                          :append-icon="mostrarContrasena ? 'mdi-eye' : 'mdi-eye-off'"
                          :type="mostrarContrasena ? 'text' : 'password'"
                          @click:append="mostrarContrasena = !mostrarContrasena"
                        ></v-text-field>
                        <v-alert type="info" dense text class="mt-2">
                          <small>Los archivos .cer y .key se almacenan de forma segura y se usan para el timbrado de CFDI.</small>
                        </v-alert>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-tab-item>

            <!-- ========== PESTAÑA 5: CUENTAS CONTABLES DEFAULT ========== -->
            <v-tab-item key="cuentas">
              <v-card flat>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-card outlined class="pa-4 mb-4">
                        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                          <v-icon small color="primary" class="mr-2">mdi-account-cash</v-icon>
                          Cuentas de Clientes y Proveedores
                        </v-card-title>
                        <v-text-field
                          v-model="cuentasContables.cuenta_cxc_default"
                          label="CxC (Clientes) - Default: 1104"
                          outlined dense
                          placeholder="1104"
                        ></v-text-field>
                        <v-text-field
                          v-model="cuentasContables.cuenta_cxp_default"
                          label="CxP (Proveedores) - Default: 2101"
                          outlined dense
                          placeholder="2101"
                        ></v-text-field>
                        <v-text-field
                          v-model="cuentasContables.cuenta_caja_default"
                          label="Caja/Bancos - Default: 1101"
                          outlined dense
                          placeholder="1101"
                        ></v-text-field>
                      </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-card outlined class="pa-4 mb-4">
                        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-3">
                          <v-icon small color="primary" class="mr-2">mdi-cash-register</v-icon>
                          Cuentas de Resultados e Impuestos
                        </v-card-title>
                        <v-text-field
                          v-model="cuentasContables.cuenta_ventas_default"
                          label="Ventas (Ingresos) - Default: 4100"
                          outlined dense
                          placeholder="4100"
                        ></v-text-field>
                        <v-text-field
                          v-model="cuentasContables.cuenta_compras_default"
                          label="Compras (Gastos) - Default: 5300"
                          outlined dense
                          placeholder="5300"
                        ></v-text-field>
                        <v-text-field
                          v-model="cuentasContables.cuenta_iva_trasladado"
                          label="IVA Trasladado (por pagar) - Default: 2104"
                          outlined dense
                          placeholder="2104"
                        ></v-text-field>
                        <v-text-field
                          v-model="cuentasContables.cuenta_iva_acreditable"
                          label="IVA Acreditable - Default: 1107"
                          outlined dense
                          placeholder="1107"
                        ></v-text-field>
                      </v-card>
                    </v-col>
                  </v-row>
                  <v-alert type="info" dense text class="mt-2">
                    <small>Estas cuentas se usan por defecto al generar asientos contables automáticos en ventas, compras, cobros y pagos. Los códigos deben coincidir con el catálogo de cuentas contables.</small>
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-tab-item>
          </v-tabs-items>

          <v-divider></v-divider>
          <v-card-actions class="pa-4">
            <v-spacer></v-spacer>
            <v-btn color="grey darken-1" text @click="cargarDatos" :loading="cargando">
              <v-icon left>mdi-refresh</v-icon>
              Restaurar
            </v-btn>
            <v-btn color="primary" @click="guardarDatos" :loading="guardando" large>
              <v-icon left>mdi-content-save</v-icon>
              Guardar Cambios
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar global -->
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
  name: 'ConfiguracionEmpresaView',
  data() {
    return {
      tab: 0,
      cargando: false,
      guardando: false,
      validoGenerales: false,
      mostrarContrasena: false,
      archivoCer: null,
      archivoKey: null,
      empresa: {
        razon_social: '',
        nombre_comercial: '',
        rfc: '',
        regimen_fiscal: '601',
        direccion: '',
        codigo_postal: '',
        telefono: '',
        email: '',
        lugar_expedicion: '',
        logo_url: '',
        pie_pagina: '',
        terminos_legales: '',
        formato_folio: '',
        iva_porcentaje: 16,
        moneda_default: 'MXN',
        dias_credito_default: 30,
        certificado_csd_numero: '',
        certificado_csd_vigencia: '',
        csd_contrasena: '',
        regimen_fiscal_letra: '',
      },
      regimenesFiscales: [
        { text: '601 - General de Ley Personas Morales', value: '601' },
        { text: '603 - Personas Morales con Fines no Lucrativos', value: '603' },
        { text: '605 - Sueldos y Salarios e Ingresos Asimilados', value: '605' },
        { text: '606 - Arrendamiento', value: '606' },
        { text: '607 - Régimen de Enajenación o Adquisición de Bienes', value: '607' },
        { text: '608 - Demás ingresos', value: '608' },
        { text: '609 - Consolidación', value: '609' },
        { text: '610 - Residentes en el Extranjero', value: '610' },
        { text: '611 - Ingresos por Dividendos (socios y accionistas)', value: '611' },
        { text: '612 - Personas Físicas con Actividades Empresariales y Profesionales', value: '612' },
        { text: '614 - Ingresos por intereses', value: '614' },
        { text: '615 - Régimen de los ingresos por obtención de premios', value: '615' },
        { text: '616 - Sin obligaciones fiscales', value: '616' },
        { text: '620 - Sociedades Cooperativas de Producción', value: '620' },
        { text: '621 - Incorporación Fiscal', value: '621' },
        { text: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', value: '622' },
        { text: '623 - Opcional para Grupos de Sociedades', value: '623' },
        { text: '624 - Coordinados', value: '624' },
        { text: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', value: '625' },
        { text: '626 - Régimen Simplificado de Confianza', value: '626' },
      ],
      cuentasContables: {
        cuenta_cxc_default: '',
        cuenta_cxp_default: '',
        cuenta_caja_default: '',
        cuenta_ventas_default: '',
        cuenta_compras_default: '',
        cuenta_iva_trasladado: '',
        cuenta_iva_acreditable: '',
      },
      snackbar: {
        show: false,
        text: '',
        color: 'success',
        icon: 'mdi-check-circle',
      },
    }
  },
  mounted() {
    this.cargarDatos()
  },
  methods: {
    async cargarDatos() {
      this.cargando = true
      try {
        const res = await axios.get('/api/v1/configuracion/empresa')
        if (res.data.exito && res.data.datos) {
          Object.assign(this.empresa, res.data.datos)
        }
        // Cargar configuración de cuentas contables
        try {
          const confRes = await axios.get('/api/v1/configuracion-sistema')
          const confs = confRes.data?.datos || confRes.data || []
          if (Array.isArray(confs)) {
            confs.forEach(c => {
              if (this.cuentasContables.hasOwnProperty(c.clave)) {
                this.cuentasContables[c.clave] = c.valor
              }
            })
          }
        } catch (e) {
          console.log('No se pudieron cargar las cuentas contables config:', e)
        }
      } catch (err) {
        this.mostrarSnackbar('Error al cargar datos de la empresa', 'error')
      } finally {
        this.cargando = false
      }
    },
    async guardarDatos() {
      this.guardando = true
      try {
        const res = await axios.put('/api/v1/configuracion/empresa', this.empresa)
        if (res.data.exito) {
          // Guardar configuración de cuentas contables
          try {
            const updates = Object.entries(this.cuentasContables)
              .filter(([k, v]) => v && v.trim())
              .map(([clave, valor]) => ({ clave, valor }))
            if (updates.length > 0) {
              await axios.post('/api/v1/configuracion-sistema', { configuraciones: updates })
            }
          } catch (e) {
            console.log('Error al guardar cuentas contables:', e)
          }
          this.mostrarSnackbar('Datos de empresa guardados correctamente', 'success')
        }
      } catch (err) {
        this.mostrarSnackbar('Error al guardar datos: ' + (err.response?.data?.error || err.message), 'error')
      } finally {
        this.guardando = false
      }
    },
    onArchivoCerChange(file) {
      if (file) {
        // Simular lectura del certificado
        this.empresa.certificado_csd_numero = 'Lectura pendiente...'
      }
    },
    mostrarSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
        icon: color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle',
      }
    },
  },
}
</script>

<style scoped>
.v-card--outlined {
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
