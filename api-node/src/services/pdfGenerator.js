const pool = require('../db');
const TransaccionesModel = require('../models/transacciones.model');

let puppeteer;

/**
 * Carga puppeteer de forma diferida (viene en desarrollo como dependencia).
 */
async function getPuppeteer() {
  if (!puppeteer) {
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      throw new Error('Puppeteer no está instalado. Ejecute: npm install puppeteer');
    }
  }
  return puppeteer;
}

/**
 * Obtiene la configuración de la empresa desde la BD
 * Los datos están en configuracion_sistema como clave-valor
 */
async function getEmpresaConfig() {
  try {
    const result = await pool.query(
      "SELECT clave, valor FROM configuracion_sistema WHERE clave LIKE 'empresa_%'"
    );
    const config = {};
    result.rows.forEach(row => {
      const key = row.clave.replace('empresa_', '');
      config[key] = row.valor;
    });
    return {
      razon_social: config.nombre || 'Mi Empresa',
      rfc: config.rfc || 'XAXX010101000',
      direccion: config.direccion || '—',
      telefono: config.telefono || '',
      email: config.email || '',
      logo_url: config.logo_url || '',
      pie_pagina: config.pie_pagina || 'Gracias por su preferencia',
      terminos_legales: config.terminos_legales || '',
    };
  } catch (err) {
    console.error('[PDF] Error al obtener config empresa:', err.message);
    return {
      razon_social: 'Mi Empresa',
      rfc: 'XAXX010101000',
      direccion: '—',
      telefono: '',
      email: '',
      logo_url: '',
      pie_pagina: 'Gracias por su preferencia',
      terminos_legales: '',
    };
  }
}

/**
 * Obtiene una plantilla activa de la BD
 */
async function getPlantillaActiva(tipo) {
  const result = await pool.query(
    'SELECT * FROM plantillas_pdf WHERE tipo = $1 AND activo = true LIMIT 1',
    [tipo]
  );
  return result.rows[0] || null;
}

/**
 * Formatea un número a moneda mexicana
 */
function fmtMoneda(valor) {
  return Number(valor || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea una fecha ISO a string legible
 */
function fmtFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Reemplaza las variables {{...}} en el HTML de la plantilla con datos reales.
 */
function reemplazarVariables(html, transaccion, detalles, empresa) {
  const tipoDocMap = {
    venta: 'FACTURA',
    cotizacion: 'COTIZACIÓN',
    orden_venta: 'ORDEN DE VENTA',
    compra: 'COMPRA',
    orden_compra: 'ORDEN DE COMPRA',
    cotizacion_compra: 'COTIZACIÓN DE COMPRA',
    recepcion_compra: 'RECEPCIÓN DE COMPRA',
    traspaso: 'TRASPASO',
    cobro: 'RECIBO DE COBRO',
    pago: 'COMPROBANTE DE PAGO',
    asiento_manual: 'ASIENTO CONTABLE MANUAL',
  };

  const tipo = transaccion?.tipo || 'venta';
  const tipoDocumento = tipoDocMap[tipo] || tipo.toUpperCase();

  const isEntidadCliente = ['venta', 'cotizacion', 'orden_venta', 'cobro'].includes(tipo);
  const isEntidadProveedor = ['compra', 'orden_compra', 'cotizacion_compra', 'recepcion_compra', 'pago'].includes(tipo);

  const entidadNombre = isEntidadCliente
    ? (transaccion?.cliente_nombre || transaccion?.entidad_cliente_nombre || '')
    : isEntidadProveedor
    ? (transaccion?.proveedor_nombre || transaccion?.entidad_proveedor_nombre || '')
    : '';

  const entidadRfc = isEntidadCliente
    ? (transaccion?.cliente_rfc || '')
    : isEntidadProveedor
    ? (transaccion?.proveedor_rfc || '')
    : '';

  const entidadDireccion = isEntidadCliente
    ? (transaccion?.cliente_direccion || '')
    : isEntidadProveedor
    ? (transaccion?.proveedor_direccion || '')
    : '';

  const entidadTelefono = isEntidadCliente
    ? (transaccion?.cliente_telefono || '')
    : isEntidadProveedor
    ? (transaccion?.proveedor_telefono || '')
    : '';

  const entidadEmail = isEntidadCliente
    ? (transaccion?.cliente_email || '')
    : isEntidadProveedor
    ? (transaccion?.proveedor_email || '')
    : '';

  // Logo HTML
  const empresaLogoHtml = empresa.logo_url
    ? `<img src="${empresa.logo_url}" alt="Logo" class="logo" />`
    : `<h2 style="color:#1a237e;margin:0;">${empresa.razon_social || 'Mi Empresa'}</h2>`;

  // Generar filas de tabla de artículos
  let tablaArticulos = '';
  if (detalles && detalles.length > 0) {
    tablaArticulos = detalles
      .map(
        (d, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${d.articulo_nombre || '—'}</td>
      <td class="center">${d.articulo_sku || '—'}</td>
      <td class="center">${d.cantidad}</td>
      <td class="right">$${fmtMoneda(d.precio_unitario)}</td>
      <td class="right">$${fmtMoneda(d.subtotal)}</td>
    </tr>`
      )
      .join('');
  } else {
    tablaArticulos = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">Sin artículos</td></tr>`;
  }

  // Generar filas de asiento contable (para asiento_manual)
  let tablaLineasContables = '';
  const asientos = transaccion?.asientos_contables || [];
  if (asientos.length > 0) {
    let totalDebe = 0;
    let totalHaber = 0;
    tablaLineasContables = asientos
      .map((a) => {
        const debe = parseFloat(a.debe || 0);
        const haber = parseFloat(a.haber || 0);
        totalDebe += debe;
        totalHaber += haber;
        const clase = debe > 0 ? 'cargo' : 'abono';
        return `
    <tr class="${clase}">
      <td>${a.cuenta_codigo || '—'}</td>
      <td>${a.cuenta_nombre || '—'}</td>
      <td class="right">${debe > 0 ? '$' + fmtMoneda(debe) : '—'}</td>
      <td class="right">${haber > 0 ? '$' + fmtMoneda(haber) : '—'}</td>
    </tr>`;
      })
      .join('');
  }

  const subtotal = detalles.reduce((s, d) => s + parseFloat(d.subtotal || 0), 0);
  const iva = subtotal * 0.16;
  const total = subtotal * 1.16;

  // Variables para reemplazar
  const vars = {
    '{{folio}}': transaccion?.folio || '—',
    '{{fecha}}': fmtFecha(transaccion?.fecha),
    '{{tipo_documento}}': tipoDocumento,
    '{{empresa_nombre}}': empresa.razon_social || 'Mi Empresa',
    '{{empresa_rfc}}': empresa.rfc || '—',
    '{{empresa_direccion}}': empresa.direccion || '—',
    '{{empresa_telefono}}': empresa.telefono || '—',
    '{{empresa_email}}': empresa.email || '—',
    '{{empresa_logo_html}}': empresaLogoHtml,
    '{{empresa_pie_pagina}}': empresa.pie_pagina || 'Gracias por su preferencia',
    '{{empresa_terminos_legales}}': empresa.terminos_legales || '',
    '{{entidad_nombre}}': entidadNombre || '—',
    '{{entidad_rfc}}': entidadRfc || '—',
    '{{entidad_direccion}}': entidadDireccion || '—',
    '{{entidad_telefono}}': entidadTelefono || '—',
    '{{entidad_email}}': entidadEmail || '—',
    '{{serie}}': transaccion?.serie || '—',
    '{{metodo_pago}}': transaccion?.metodo_pago || '—',
    '{{almacen_nombre}}': transaccion?.almacen_nombre || '—',
    '{{almacen_destino_nombre}}': transaccion?.almacen_destino_nombre || '—',
    '{{fecha_vencimiento}}': fmtFecha(transaccion?.fecha_vencimiento),
    '{{comentario}}': transaccion?.comentario || '',
    '{{tabla_articulos}}': tablaArticulos,
    '{{tabla_lineas_contables}}': tablaLineasContables,
    '{{subtotal}}': fmtMoneda(subtotal),
    '{{iva}}': fmtMoneda(iva),
    '{{total}}': fmtMoneda(total),
    '{{total_debe}}': fmtMoneda(asientos.reduce((s, a) => s + parseFloat(a.debe || 0), 0)),
    '{{total_haber}}': fmtMoneda(asientos.reduce((s, a) => s + parseFloat(a.haber || 0), 0)),
    '{{folio_origen}}': transaccion?.origen?.folio || '—',
    '{{folio_factura}}': transaccion?.origen?.folio || '—',
    '{{numero_pagina}}': '<span class="pageNumber"></span>',
  };

  // Reemplazar variables en el HTML
  let resultado = html;
  for (const [key, value] of Object.entries(vars)) {
    resultado = resultado.split(key).join(value);
  }

  return resultado;
}

/**
 * Genera un PDF para una transacción usando Puppeteer y la plantilla activa.
 * @param {string} tipo - Tipo de transacción (venta, cotizacion, etc.)
 * @param {number} transaccionId - ID de la transacción
 * @returns {Buffer} Buffer del PDF generado
 */
async function generarPDF(tipo, transaccionId) {
  // 1. Obtener datos completos de la transacción
  const transaccion = await TransaccionesModel.findById(transaccionId);
  if (!transaccion) {
    throw new Error(`Transacción con ID ${transaccionId} no encontrada`);
  }

  // 2. Obtener detalles (también vienen en findById)
  const detalles = transaccion.detalles || [];

  // 3. Buscar la plantilla activa
  let plantilla = await getPlantillaActiva(tipo);

  // Si no hay plantilla para el tipo exacto, intentar con 'venta' como fallback
  if (!plantilla) {
    plantilla = await getPlantillaActiva('venta');
  }

  if (!plantilla) {
    // Fallback: generar HTML básico
    const empresa = await getEmpresaConfig();
    plantilla = {
      contenido_html: generarHtmlFallback(tipo, transaccion, detalles, empresa),
    };
  }

  // 4. Obtener empresa config
  const empresa = await getEmpresaConfig();

  // 5. Reemplazar variables
  let html = reemplazarVariables(plantilla.contenido_html, transaccion, detalles, empresa);

  // 6. Generar PDF con Puppeteer
  const puppeteerMod = await getPuppeteer();
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };
  // Usar chromium del sistema si está disponible (Alpine Linux)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  console.log(`[PDF] Launching Puppeteer with headless: true, executable: ${launchOptions.executablePath || 'default'}`);
  const browser = await puppeteerMod.launch(launchOptions);

  try {
    const page = await browser.newPage();

    // Configurar contenido HTML
    console.log(`[PDF] Setting HTML content (${html.length} chars)...`);
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    console.log(`[PDF] HTML content loaded`);

    // Reemplazar números de página
    await page.evaluate(() => {
      const pageNumbers = document.querySelectorAll('.pageNumber');
      pageNumbers.forEach(el => {
        el.textContent = '1';
      });
    });

    // Generar PDF
    console.log(`[PDF] Generating PDF with puppeteer...`);
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%;text-align:center;font-size:8px;color:#aaa;padding:5px 20px;">
          <span style="float:left;">${empresa.razon_social || ''}</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          <span style="float:right;">${new Date().toLocaleDateString('es-MX')}</span>
        </div>
      `,
    });

    console.log(`[PDF] PDF generated successfully, buffer size: ${pdfBuffer.length} bytes`);

    // Verify PDF header
    if (pdfBuffer.length < 50 || pdfBuffer[0] !== 0x25) {
      console.error(`[PDF] WARNING: Generated buffer doesn't look like a valid PDF. First bytes: ${pdfBuffer.slice(0, 10).toString('hex')}`);
    } else {
    console.log(`[PDF] PDF header verified OK (starts with %PDF)`);
    }

    // Puppeteer v24+ devuelve Uint8Array, no Buffer.
    // Convertir explícitamente a Buffer para que Express lo envíe como binario y no como JSON.
    const bufferFinal = Buffer.from(pdfBuffer);
    console.log(`[PDF] Converted to Buffer: ${Buffer.isBuffer(bufferFinal)}, size: ${bufferFinal.length} bytes`);

    return bufferFinal;
  } finally {
    await browser.close();
    console.log(`[PDF] Browser closed`);
  }
}

/**
 * Genera un HTML básico de respaldo si no hay plantilla configurada
 */
function generarHtmlFallback(tipo, transaccion, detalles, empresa) {
  const logoHtml = empresa.logo_url
    ? `<img src="${empresa.logo_url}" alt="Logo" style="max-height:80px;" />`
    : `<h2 style="color:#1976D2;">${empresa.razon_social || 'Mi Empresa'}</h2>`;

  const detalleRows = detalles
    .map(
      (d, i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;">${d.articulo_nombre || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${d.articulo_sku || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${d.cantidad}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">$${fmtMoneda(d.precio_unitario)}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">$${fmtMoneda(d.subtotal)}</td>
    </tr>`
    )
    .join('');

  const subtotal = detalles.reduce((s, d) => s + parseFloat(d.subtotal || 0), 0);
  const total = subtotal * 1.16;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; }
  h1 { color: #1976D2; border-bottom: 3px solid #1976D2; padding-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #1976D2; color: white; padding: 10px; text-align: left; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
</style></head>
<body>
  <h1>${tipo.toUpperCase()} - ${transaccion.folio}</h1>
  <p><strong>Fecha:</strong> ${fmtFecha(transaccion.fecha)}</p>
  <table>
    <thead><tr><th>#</th><th>Artículo</th><th>SKU</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
    <tbody>${detalleRows || '<tr><td colspan="6" style="text-align:center;">Sin artículos</td></tr>'}</tbody>
  </table>
  <div class="total">Total: $${fmtMoneda(total)}</div>
</body></html>`;
}

module.exports = {
  generarPDF,
  reemplazarVariables,
};
