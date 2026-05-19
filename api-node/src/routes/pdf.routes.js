const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const pool = require('../db');

/**
 * ============================================
 * GENERACIÓN DE PDF
 * ============================================
 */

/**
 * POST /api/v1/generar-pdf
 * Generar PDF de una transacción
 * Recibe: { tipo, id }
 * Devuelve: HTML renderizado para convertir a PDF
 */
router.post('/', authMiddleware, checkPermission('pdf.generar'), async (req, res) => {
  try {
    const { tipo, id } = req.body;
    if (!tipo || !id) {
      return res.status(400).json({ exito: false, error: 'tipo e id son requeridos' });
    }

    // Obtener datos de la transacción
    const transResult = await pool.query(
      `SELECT t.*,
              ec.razon_social AS cliente_nombre, ec.rfc AS cliente_rfc, ec.direccion AS cliente_direccion,
              ep.razon_social AS proveedor_nombre, ep.rfc AS proveedor_rfc, ep.direccion AS proveedor_direccion,
              sd.serie, a.nombre AS almacen_nombre
       FROM transacciones t
       LEFT JOIN entidades ec ON ec.id = t.entidad_cliente_id
       LEFT JOIN entidades ep ON ep.id = t.entidad_proveedor_id
       LEFT JOIN series_documentos sd ON sd.id = t.serie_id
       LEFT JOIN almacenes a ON a.id = t.almacen_id
       WHERE t.id = $1`,
      [id]
    );
    if (transResult.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Transacción no encontrada' });
    }
    const transaccion = transResult.rows[0];

    // Obtener detalles
    const detResult = await pool.query(
      `SELECT td.*, art.nombre AS articulo_nombre, art.sku AS articulo_sku
       FROM transacciones_detalle td
       LEFT JOIN articulos art ON art.id = td.articulo_id
       WHERE td.transaccion_id = $1
       ORDER BY td.id`,
      [id]
    );
    const detalles = detResult.rows;

    // Obtener configuración de la empresa
    const empResult = await pool.query('SELECT * FROM empresa_configuracion ORDER BY id DESC LIMIT 1');
    const empresa = empResult.rows[0] || {};

    // Generar HTML según el tipo
    const html = generarPlantillaHTML(tipo, transaccion, detalles, empresa);

    res.json({
      exito: true,
      datos: {
        html,
        titulo: `${tipo.toUpperCase()} - ${transaccion.folio}`,
        filename: `${transaccion.folio}.pdf`,
      }
    });
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/generar-pdf/plantilla/:tipo
 * Obtener plantilla HTML de ejemplo para un tipo de documento
 */
router.get('/plantilla/:tipo', authMiddleware, async (req, res) => {
  try {
    const { tipo } = req.params;
    const empResult = await pool.query('SELECT * FROM empresa_configuracion ORDER BY id DESC LIMIT 1');
    const empresa = empResult.rows[0] || {};

    const html = generarPlantillaHTML(tipo, null, [], empresa);
    res.json({ exito: true, datos: { html } });
  } catch (err) {
    console.error('Error al obtener plantilla:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * Genera la plantilla HTML para un tipo de documento
 */
function generarPlantillaHTML(tipo, transaccion, detalles, empresa) {
  const logoHtml = empresa.logo_url
    ? `<img src="${empresa.logo_url}" alt="Logo" style="max-height:80px;max-width:200px;" />`
    : '<h2 style="color:#1976D2;">' + (empresa.razon_social || 'Mi Empresa') + '</h2>';

  const empresaInfo = `
    <div style="font-size:11px;color:#555;">
      ${empresa.razon_social || ''}<br/>
      RFC: ${empresa.rfc || ''}<br/>
      ${empresa.direccion || ''}<br/>
      Tel: ${empresa.telefono || ''} | Email: ${empresa.email || ''}
    </div>
  `;

  let tipoDoc = '';
  let entidadLabel = '';
  let entidadNombre = '';
  let entidadRfc = '';
  let entidadDireccion = '';

  switch (tipo) {
    case 'cotizacion':
    case 'orden_venta':
    case 'venta':
      tipoDoc = tipo === 'cotizacion' ? 'COTIZACIÓN' : tipo === 'orden_venta' ? 'ORDEN DE VENTA' : 'FACTURA';
      entidadLabel = 'Cliente';
      entidadNombre = transaccion?.cliente_nombre || '';
      entidadRfc = transaccion?.cliente_rfc || '';
      entidadDireccion = transaccion?.cliente_direccion || '';
      break;
    case 'cotizacion_compra':
    case 'orden_compra':
    case 'compra':
      tipoDoc = tipo === 'cotizacion_compra' ? 'COTIZACIÓN DE COMPRA' : tipo === 'orden_compra' ? 'ORDEN DE COMPRA' : 'COMPRA';
      entidadLabel = 'Proveedor';
      entidadNombre = transaccion?.proveedor_nombre || '';
      entidadRfc = transaccion?.proveedor_rfc || '';
      entidadDireccion = transaccion?.proveedor_direccion || '';
      break;
    case 'traspaso':
      tipoDoc = 'TRASPASO';
      entidadLabel = 'Almacén Origen';
      entidadNombre = transaccion?.almacen_nombre || '';
      break;
    default:
      tipoDoc = tipo.toUpperCase();
      entidadLabel = 'Entidad';
  }

  const detalleRows = detalles.map((d, i) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;">${d.articulo_nombre || '—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;">${d.articulo_sku || '—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;">${d.cantidad}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">$${Number(d.precio_unitario).toLocaleString('es-MX', {minimumFractionDigits:2})}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">$${Number(d.subtotal).toLocaleString('es-MX', {minimumFractionDigits:2})}</td>
    </tr>
  `).join('');

  const total = detalles.reduce((s, d) => s + Number(d.subtotal || 0), 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 2.54cm; }
    body { font-family: 'Arial', sans-serif; font-size: 12px; color: #333; margin: 0; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1976D2; }
    .header-left { flex: 1; }
    .header-right { text-align: right; }
    .titulo-documento { font-size: 24px; font-weight: bold; color: #1976D2; margin: 10px 0; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { width: 48%; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    .info-box h4 { margin: 0 0 8px 0; color: #1976D2; font-size: 13px; }
    .info-box p { margin: 3px 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #1976D2; color: white; padding: 10px 8px; text-align: left; font-size: 11px; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .totales { width: 300px; margin-left: auto; margin-top: 20px; }
    .totales td { padding: 6px 10px; border: none; }
    .totales .total-final { font-size: 18px; font-weight: bold; color: #1976D2; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #888; }
    .firmas { display: flex; justify-content: space-between; margin-top: 60px; }
    .firma { text-align: center; width: 45%; }
    .firma-linea { border-top: 1px solid #333; margin-top: 40px; padding-top: 8px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      ${empresaInfo}
    </div>
    <div class="header-right">
      <div class="titulo-documento">${tipoDoc}</div>
      <div style="font-size:14px;font-weight:bold;color:#333;">${transaccion ? transaccion.folio : 'FOLIO-0000'}</div>
      <div style="font-size:11px;color:#666;margin-top:5px;">
        ${transaccion ? new Date(transaccion.fecha).toLocaleDateString('es-MX', {year:'numeric',month:'long',day:'numeric'}) : ''}
      </div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>${entidadLabel}</h4>
      <p><strong>${entidadNombre || '—'}</strong></p>
      <p>RFC: ${entidadRfc || '—'}</p>
      <p>${entidadDireccion || ''}</p>
    </div>
    <div class="info-box">
      <h4>Datos del Documento</h4>
      <p>Serie: ${transaccion?.serie || '—'}</p>
      <p>Método de Pago: ${transaccion?.metodo_pago || '—'}</p>
      <p>Almacén: ${transaccion?.almacen_nombre || '—'}</p>
      ${transaccion?.fecha_vencimiento ? `<p>Vencimiento: ${new Date(transaccion.fecha_vencimiento).toLocaleDateString('es-MX')}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center;">#</th>
        <th>Artículo</th>
        <th style="width:80px;">SKU</th>
        <th style="width:60px;text-align:center;">Cant.</th>
        <th style="width:100px;text-align:right;">Precio</th>
        <th style="width:100px;text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${detalleRows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">Sin artículos</td></tr>'}
    </tbody>
  </table>

  <table class="totales">
    <tr><td style="text-align:right;font-weight:bold;">Subtotal:</td><td style="text-align:right;">$${total.toLocaleString('es-MX', {minimumFractionDigits:2})}</td></tr>
    <tr><td style="text-align:right;font-weight:bold;">IVA (16%):</td><td style="text-align:right;">$${(total * 0.16).toLocaleString('es-MX', {minimumFractionDigits:2})}</td></tr>
    <tr><td style="text-align:right;font-weight:bold;" class="total-final">Total:</td><td style="text-align:right;" class="total-final">$${(total * 1.16).toLocaleString('es-MX', {minimumFractionDigits:2})}</td></tr>
  </table>

  <div class="firmas">
    <div class="firma">
      <div class="firma-linea">Recibió</div>
    </div>
    <div class="firma">
      <div class="firma-linea">Autorizó</div>
    </div>
  </div>

  <div class="footer">
    <p>${empresa.pie_pagina || empresa.razon_social || 'Gracias por su preferencia'}</p>
    <p>${empresa.terminos_legales || ''}</p>
  </div>
</body>
</html>`;
}

module.exports = router;
