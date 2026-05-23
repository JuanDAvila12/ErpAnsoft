const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { generarPDF } = require('../services/pdfGenerator');

/**
 * ============================================
 * GENERACIÓN DE PDF (con Puppeteer)
 * ============================================
 *
 * POST /api/v1/generar-pdf
 * Recibe: { tipo, id }
 * Devuelve: application/pdf (buffer del PDF generado)
 */
/**
 * GET /api/v1/generar-pdf
 * Alternativa GET que acepta token como query param para visualizar PDF en nueva pestaña
 */
router.get('/', async (req, res, next) => {
  try {
    const { tipo, id, token } = req.query;
    if (!tipo || !id) {
      return res.status(400).json({ exito: false, error: 'tipo e id son requeridos' });
    }

    // Validar token desde query param
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'spi_erp_jwt_secret_key_2026';
    try {
      jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ exito: false, error: 'Token inválido o expirado' });
    }

    console.log(`[PDF-GET] Generando PDF para tipo="${tipo}" id=${id}`);

    const pdfBuffer = await generarPDF(tipo, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${tipo}_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF-GET] Error al generar PDF:', err);
    res.status(500).json({
      exito: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/v1/generar-pdf
 * Recibe: { tipo, id }
 * Devuelve: application/pdf (buffer del PDF generado)
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { tipo, id } = req.body;
    if (!tipo || !id) {
      return res.status(400).json({ exito: false, error: 'tipo e id son requeridos' });
    }

    console.log(`[PDF] Generando PDF para tipo="${tipo}" id=${id}`);

    const pdfBuffer = await generarPDF(tipo, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${tipo}_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF] Error al generar PDF:', err);
    res.status(500).json({
      exito: false,
      error: err.message,
      mensaje: 'Error al generar el PDF. Verifique que Puppeteer esté instalado correctamente.',
    });
  }
});

/**
 * GET /api/v1/generar-pdf/vista-previa
 * Alternativa GET para vista previa, acepta token y html como query params
 */
router.get('/vista-previa', async (req, res, next) => {
  try {
    const { tipo, html, token } = req.query;
    if (!tipo || !html) {
      return res.status(400).json({ exito: false, error: 'tipo y html son requeridos' });
    }

    // Validar token
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'spi_erp_jwt_secret_key_2026';
    try {
      jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ exito: false, error: 'Token inválido o expirado' });
    }

    const contenido_html = decodeURIComponent(html);

    // Datos de ejemplo para vista previa
    const datosEjemplo = {
      folio: 'PREVIEW-001',
      fecha: new Date().toISOString(),
      tipo,
      serie: 'A',
      metodo_pago: 'Transferencia',
      almacen_nombre: 'Almacén Principal',
      fecha_vencimiento: new Date(Date.now() + 15 * 86400000).toISOString(),
      comentario: 'Esta es una vista previa con datos de ejemplo.',
      cliente_nombre: 'Cliente Ejemplo S.A. de C.V.',
      cliente_rfc: 'XAXA010101XXX',
      cliente_direccion: 'Av. Ejemplo #123, Col. Centro, CDMX',
      cliente_telefono: '55-1234-5678',
      cliente_email: 'cliente@ejemplo.com',
      asientos_contables: [],
      origen: null,
    };

    const detallesEjemplo = [
      { articulo_nombre: 'Artículo de Prueba 1', articulo_sku: 'SKU001', cantidad: 5, precio_unitario: 150.00, subtotal: 750.00 },
      { articulo_nombre: 'Artículo de Prueba 2', articulo_sku: 'SKU002', cantidad: 3, precio_unitario: 250.50, subtotal: 751.50 },
    ];

    const empresaEjemplo = {
      razon_social: 'Mi Empresa S.A. de C.V.',
      rfc: 'EMP-123456-XYZ',
      direccion: 'Calle Principal #456, Col. Centro',
      telefono: '55-9876-5432',
      email: 'info@miempresa.com',
      logo_url: null,
      pie_pagina: 'Gracias por su preferencia',
      terminos_legales: 'Este documento es una representación preliminar.',
    };

    const { reemplazarVariables } = require('../services/pdfGenerator');
    const htmlContent = reemplazarVariables(contenido_html, datosEjemplo, detallesEjemplo, empresaEjemplo);

    // Generar PDF con Puppeteer
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      return res.status(500).json({ exito: false, error: 'Puppeteer no está instalado.' });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
      const page = await browser.newPage();
      console.log(`[PDF-VISTA] Setting HTML content (${htmlContent.length} chars)...`);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
      console.log(`[PDF-VISTA] HTML content loaded`);

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `
          <div style="width:100%;text-align:center;font-size:8px;color:#aaa;padding:5px 20px;">
            <span>Vista Previa - Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        `,
      });

      console.log(`[PDF-VISTA] PDF generated, size: ${pdfBuffer.length} bytes`);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="vista-previa.pdf"',
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('[PDF-GET] Error al generar vista previa:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/generar-pdf/vista-previa
 * Genera PDF de vista previa para una plantilla (con datos de ejemplo)
 * Recibe: { tipo, contenido_html }
 * Devuelve: application/pdf
 */
router.post('/vista-previa', authMiddleware, async (req, res, next) => {
  try {
    const { tipo, contenido_html } = req.body;
    if (!tipo || !contenido_html) {
      return res.status(400).json({ exito: false, error: 'tipo y contenido_html son requeridos' });
    }

    // Datos de ejemplo para vista previa
    const datosEjemplo = {
      folio: 'PREVIEW-001',
      fecha: new Date().toISOString(),
      tipo,
      serie: 'A',
      metodo_pago: 'Transferencia',
      almacen_nombre: 'Almacén Principal',
      fecha_vencimiento: new Date(Date.now() + 15 * 86400000).toISOString(),
      comentario: 'Esta es una vista previa con datos de ejemplo.',
      cliente_nombre: 'Cliente Ejemplo S.A. de C.V.',
      cliente_rfc: 'XAXA010101XXX',
      cliente_direccion: 'Av. Ejemplo #123, Col. Centro, CDMX',
      cliente_telefono: '55-1234-5678',
      cliente_email: 'cliente@ejemplo.com',
      asientos_contables: [],
      origen: null,
    };

    const detallesEjemplo = [
      {
        articulo_nombre: 'Artículo de Prueba 1',
        articulo_sku: 'SKU001',
        cantidad: 5,
        precio_unitario: 150.00,
        subtotal: 750.00,
      },
      {
        articulo_nombre: 'Artículo de Prueba 2',
        articulo_sku: 'SKU002',
        cantidad: 3,
        precio_unitario: 250.50,
        subtotal: 751.50,
      },
    ];

    const empresaEjemplo = {
      razon_social: 'Mi Empresa S.A. de C.V.',
      rfc: 'EMP-123456-XYZ',
      direccion: 'Calle Principal #456, Col. Centro',
      telefono: '55-9876-5432',
      email: 'info@miempresa.com',
      logo_url: null,
      pie_pagina: 'Gracias por su preferencia',
      terminos_legales: 'Este documento es una representación preliminar.',
    };

    const { reemplazarVariables } = require('../services/pdfGenerator');
    const html = reemplazarVariables(contenido_html, datosEjemplo, detallesEjemplo, empresaEjemplo);

    // Generar PDF con Puppeteer
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      return res.status(500).json({ exito: false, error: 'Puppeteer no está instalado. Ejecute: npm install puppeteer' });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `
          <div style="width:100%;text-align:center;font-size:8px;color:#aaa;padding:5px 20px;">
            <span>Vista Previa - Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        `,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="vista-previa.pdf"',
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('[PDF] Error al generar vista previa:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
