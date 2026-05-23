-- ============================================================
-- MIGRACIÓN v15: Plantillas PDF configurables
-- ============================================================
-- Fecha: 2026-05-21
-- Descripción: Crea la tabla plantillas_pdf y sus registros
--              por defecto para cada tipo de transacción.
-- ============================================================

-- 1. Crear tabla plantillas_pdf
CREATE TABLE IF NOT EXISTS plantillas_pdf (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    contenido_html TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insertar plantillas por defecto
-- NOTA: Se usa INSERT ... ON CONFLICT (tipo) DO NOTHING para no duplicar si ya existen.

-- ============================================================
-- PLANTILLA GENÉRICA (base para todas)
-- ============================================================
-- Variables disponibles en todas las plantillas:
--   {{folio}}, {{fecha}}, {{tipo_documento}}
--   {{empresa_nombre}}, {{empresa_rfc}}, {{empresa_direccion}}, {{empresa_telefono}}, {{empresa_email}}
--   {{empresa_logo_html}}, {{empresa_pie_pagina}}, {{empresa_terminos_legales}}
--   {{entidad_nombre}}, {{entidad_rfc}}, {{entidad_direccion}}, {{entidad_telefono}}, {{entidad_email}}
--   {{serie}}, {{metodo_pago}}, {{almacen_nombre}}, {{fecha_vencimiento}}
--   {{comentario}}
--   {{tabla_articulos}}  → filas de la tabla de artículos (generadas automáticamente)
--   {{subtotal}}, {{iva}}, {{total}}
--   {{firmas_html}}
--   {{numero_pagina}}  → se reemplaza con el número de página (JS)
-- ============================================================

INSERT INTO plantillas_pdf (tipo, nombre, contenido_html) VALUES
('venta', 'Factura - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #1a237e; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #1a237e; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #1a237e; }
  .info-box h4 { margin: 0 0 6px 0; color: #1a237e; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #1a237e; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #fafafa; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #1a237e; border-top: 2px solid #1a237e; padding-top: 8px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Cliente</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
      <p>{{entidad_direccion}}</p>
      <p>{{entidad_telefono}}</p>
    </div>
    <div class="info-box">
      <h4>Datos del Documento</h4>
      <p>Serie: {{serie}}</p>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Almacén: {{almacen_nombre}}</p>
      <p>Vencimiento: {{fecha_vencimiento}}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant.</th>
        <th style="width:100px;" class="right">Precio Unit.</th>
        <th style="width:100px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  <table class="totales">
    <tr class="linea-subtotal">
      <td class="label">Subtotal:</td>
      <td class="amount">${{subtotal}}</td>
    </tr>
    <tr>
      <td class="label">IVA (16%):</td>
      <td class="amount">${{iva}}</td>
    </tr>
    <tr class="linea-total">
      <td class="label">Total:</td>
      <td class="amount">${{total}}</td>
    </tr>
  </table>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#fff8e1;border-radius:4px;font-size:9pt;">
    <strong>Comentario:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Recibió</div>
    </div>
    <div class="firma">
      <div class="linea">Entregó</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('cotizacion', 'Cotización - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .watermark { position: fixed; top: 40%; left: 25%; font-size: 60pt; color: rgba(255, 152, 0, 0.08); font-weight: bold; transform: rotate(-30deg); pointer-events: none; z-index: -1; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #f57c00; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #f57c00; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #f57c00; }
  .info-box h4 { margin: 0 0 6px 0; color: #f57c00; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #f57c00; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #fff8e1; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #f57c00; border-top: 2px solid #f57c00; padding-top: 8px; }
  .validez { margin-top: 15px; padding: 10px; background: #fff3e0; border-radius: 4px; font-size: 9pt; text-align: center; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="watermark">COTIZACIÓN</div>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Cliente</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
      <p>{{entidad_direccion}}</p>
    </div>
    <div class="info-box">
      <h4>Datos de la Cotización</h4>
      <p>Serie: {{serie}}</p>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Almacén: {{almacen_nombre}}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant.</th>
        <th style="width:100px;" class="right">Precio Unit.</th>
        <th style="width:100px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  <table class="totales">
    <tr class="linea-subtotal">
      <td class="label">Subtotal:</td>
      <td class="amount">${{subtotal}}</td>
    </tr>
    <tr>
      <td class="label">IVA (16%):</td>
      <td class="amount">${{iva}}</td>
    </tr>
    <tr class="linea-total">
      <td class="label">Total:</td>
      <td class="amount">${{total}}</td>
    </tr>
  </table>

  <div class="validez">
    <strong>Válido por 15 días a partir de la fecha de emisión.</strong>
  </div>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#fff8e1;border-radius:4px;font-size:9pt;">
    <strong>Comentario:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Cotizó</div>
    </div>
    <div class="firma">
      <div class="linea">Autorizó</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('orden_venta', 'Orden de Venta - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #1565c0; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #1565c0; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #1565c0; }
  .info-box h4 { margin: 0 0 6px 0; color: #1565c0; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #1565c0; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #e3f2fd; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #1565c0; border-top: 2px solid #1565c0; padding-top: 8px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Cliente</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
      <p>{{entidad_direccion}}</p>
    </div>
    <div class="info-box">
      <h4>Datos de la Orden</h4>
      <p>Serie: {{serie}}</p>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Almacén: {{almacen_nombre}}</p>
      <p>Fecha Entrega: {{fecha_vencimiento}}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant.</th>
        <th style="width:100px;" class="right">Precio Unit.</th>
        <th style="width:100px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  <table class="totales">
    <tr class="linea-subtotal">
      <td class="label">Subtotal:</td>
      <td class="amount">${{subtotal}}</td>
    </tr>
    <tr>
      <td class="label">IVA (16%):</td>
      <td class="amount">${{iva}}</td>
    </tr>
    <tr class="linea-total">
      <td class="label">Total:</td>
      <td class="amount">${{total}}</td>
    </tr>
  </table>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#e3f2fd;border-radius:4px;font-size:9pt;">
    <strong>Comentario:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Solicitó</div>
    </div>
    <div class="firma">
      <div class="linea">Autorizó</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('compra', 'Compra - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #2e7d32; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #2e7d32; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #2e7d32; }
  .info-box h4 { margin: 0 0 6px 0; color: #2e7d32; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #2e7d32; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #e8f5e9; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #2e7d32; border-top: 2px solid #2e7d32; padding-top: 8px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Proveedor</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
      <p>{{entidad_direccion}}</p>
    </div>
    <div class="info-box">
      <h4>Datos de la Compra</h4>
      <p>Serie: {{serie}}</p>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Almacén: {{almacen_nombre}}</p>
      <p>Vencimiento: {{fecha_vencimiento}}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant.</th>
        <th style="width:100px;" class="right">Precio Unit.</th>
        <th style="width:100px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  <table class="totales">
    <tr class="linea-subtotal">
      <td class="label">Subtotal:</td>
      <td class="amount">${{subtotal}}</td>
    </tr>
    <tr>
      <td class="label">IVA (16%):</td>
      <td class="amount">${{iva}}</td>
    </tr>
    <tr class="linea-total">
      <td class="label">Total:</td>
      <td class="amount">${{total}}</td>
    </tr>
  </table>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#e8f5e9;border-radius:4px;font-size:9pt;">
    <strong>Comentario:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Recibió</div>
    </div>
    <div class="firma">
      <div class="linea">Autorizó</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('orden_compra', 'Orden de Compra - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #0277bd; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #0277bd; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #0277bd; }
  .info-box h4 { margin: 0 0 6px 0; color: #0277bd; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #0277bd; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #e1f5fe; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #0277bd; border-top: 2px solid #0277bd; padding-top: 8px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Proveedor</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
      <p>{{entidad_direccion}}</p>
      <p>{{entidad_telefono}}</p>
    </div>
    <div class="info-box">
      <h4>Datos de la Orden</h4>
      <p>Serie: {{serie}}</p>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Almacén: {{almacen_nombre}}</p>
      <p>Fecha Entrega: {{fecha_vencimiento}}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant.</th>
        <th style="width:100px;" class="right">Precio Unit.</th>
        <th style="width:100px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  <table class="totales">
    <tr class="linea-subtotal">
      <td class="label">Subtotal:</td>
      <td class="amount">${{subtotal}}</td>
    </tr>
    <tr>
      <td class="label">IVA (16%):</td>
      <td class="amount">${{iva}}</td>
    </tr>
    <tr class="linea-total">
      <td class="label">Total:</td>
      <td class="amount">${{total}}</td>
    </tr>
  </table>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#e1f5fe;border-radius:4px;font-size:9pt;">
    <strong>Comentario:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Solicitó</div>
    </div>
    <div class="firma">
      <div class="linea">Autorizó</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('cotizacion_compra', 'Cotización de Compra - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #6a1b9a; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #6a1b9a; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #6a1b9a; }
  .info-box h4 { margin: 0 0 6px 0; color: #6a1b9a; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #6a1b9a; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #f3e5f5; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #6a1b9a; border-top: 2px solid #6a1b9a; padding-top: 8px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Proveedor</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
      <p>{{entidad_direccion}}</p>
    </div>
    <div class="info-box">
      <h4>Datos</h4>
      <p>Serie: {{serie}}</p>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Almacén: {{almacen_nombre}}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant.</th>
        <th style="width:100px;" class="right">Precio Unit.</th>
        <th style="width:100px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  <table class="totales">
    <tr class="linea-subtotal">
      <td class="label">Subtotal:</td>
      <td class="amount">${{subtotal}}</td>
    </tr>
    <tr>
      <td class="label">IVA (16%):</td>
      <td class="amount">${{iva}}</td>
    </tr>
    <tr class="linea-total">
      <td class="label">Total:</td>
      <td class="amount">${{total}}</td>
    </tr>
  </table>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#f3e5f5;border-radius:4px;font-size:9pt;">
    <strong>Comentario:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Solicitó</div>
    </div>
    <div class="firma">
      <div class="linea">Autorizó</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('recepcion_compra', 'Recepción de Compra - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #00838f; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #00838f; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #00838f; }
  .info-box h4 { margin: 0 0 6px 0; color: #00838f; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #00838f; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #e0f7fa; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #00838f; border-top: 2px solid #00838f; padding-top: 8px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Proveedor</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
    </div>
    <div class="info-box">
      <h4>Datos de Recepción</h4>
      <p>Serie: {{serie}}</p>
      <p>Almacén: {{almacen_nombre}}</p>
      <p>Folio Origen: {{folio_origen}}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant. Recibida</th>
        <th style="width:100px;" class="right">Precio Unit.</th>
        <th style="width:100px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  <table class="totales">
    <tr class="linea-subtotal">
      <td class="label">Subtotal:</td>
      <td class="amount">${{subtotal}}</td>
    </tr>
    <tr>
      <td class="label">IVA (16%):</td>
      <td class="amount">${{iva}}</td>
    </tr>
    <tr class="linea-total">
      <td class="label">Total:</td>
      <td class="amount">${{total}}</td>
    </tr>
  </table>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#e0f7fa;border-radius:4px;font-size:9pt;">
    <strong>Observaciones:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Recibió</div>
    </div>
    <div class="firma">
      <div class="linea">Almacén</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('traspaso', 'Traspaso entre Almacenes - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #e65100; }
  .header-left { flex: 1; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #e65100; letter-spacing: 1px; }
  .folio-text { font-size: 14pt; font-weight: bold; color: #333; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; margin-top: 3px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #e65100; }
  .info-box h4 { margin: 0 0 6px 0; color: #e65100; font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; line-height: 1.4; }
  table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.items thead th { background: #e65100; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; font-weight: 600; }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.items tbody td.right { text-align: right; }
  table.items tbody td.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #fff3e0; }
  .totales { width: 340px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totales td { padding: 5px 12px; font-size: 10pt; }
  .totales td.label { text-align: right; font-weight: 500; }
  .totales td.amount { text-align: right; width: 140px; }
  .totales .linea-subtotal td { border-top: 1px solid #ccc; }
  .totales .linea-total td { font-size: 14pt; font-weight: bold; color: #e65100; border-top: 2px solid #e65100; padding-top: 8px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; line-height: 1.4; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">
        {{empresa_nombre}}<br/>
        RFC: {{empresa_rfc}}<br/>
        {{empresa_direccion}}<br/>
        Tel: {{empresa_telefono}} | Email: {{empresa_email}}
      </div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Almacén Origen</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
    </div>
    <div class="info-box">
      <h4>Almacén Destino</h4>
      <p><strong>{{almacen_destino_nombre}}</strong></p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:40px;" class="center">#</th>
        <th>Artículo</th>
        <th style="width:80px;" class="center">SKU</th>
        <th style="width:60px;" class="center">Cant.</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_articulos}}
    </tbody>
  </table>

  {{#comentario}}
  <div style="margin-top:15px;padding:10px;background:#fff3e0;border-radius:4px;font-size:9pt;">
    <strong>Motivo:</strong> {{comentario}}
  </div>
  {{/comentario}}

  <div class="firmas">
    <div class="firma">
      <div class="linea">Surtió</div>
    </div>
    <div class="firma">
      <div class="linea">Recibió</div>
    </div>
  </div>

  <div class="footer">
    {{empresa_pie_pagina}}<br/>
    {{empresa_terminos_legales}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('cobro', 'Recibo de Cobro - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #00695c; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #00695c; }
  .folio-text { font-size: 14pt; font-weight: bold; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; }
  .recibo-box { margin: 30px 0; padding: 30px; background: #e0f2f1; border-radius: 8px; text-align: center; }
  .recibo-box .monto { font-size: 36pt; font-weight: bold; color: #00695c; }
  .recibo-box .concepto { font-size: 12pt; color: #555; margin-top: 10px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #00695c; }
  .info-box h4 { margin: 0 0 6px 0; color: #00695c; font-size: 10pt; font-weight: 600; text-transform: uppercase; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">{{empresa_nombre}}<br/>RFC: {{empresa_rfc}}<br/>{{empresa_direccion}}</div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="recibo-box">
    <div>RECIBÍ DE</div>
    <div style="font-size:16pt;font-weight:600;margin:10px 0;">{{entidad_nombre}}</div>
    <div>LA CANTIDAD DE</div>
    <div class="monto">${{total}}</div>
    <div class="concepto">Por concepto de pago a factura(s) pendiente(s)</div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Cliente</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
    </div>
    <div class="info-box">
      <h4>Detalle del Cobro</h4>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Factura(s): {{folio_factura}}</p>
    </div>
  </div>

  <div class="firmas">
    <div class="firma"><div class="linea">Entregó</div></div>
    <div class="firma"><div class="linea">Recibió</div></div>
  </div>

  <div class="footer">{{empresa_pie_pagina}}</div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('pago', 'Comprobante de Pago - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #b71c1c; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #b71c1c; }
  .folio-text { font-size: 14pt; font-weight: bold; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; }
  .pago-box { margin: 30px 0; padding: 30px; background: #fce4ec; border-radius: 8px; text-align: center; }
  .pago-box .monto { font-size: 36pt; font-weight: bold; color: #b71c1c; }
  .pago-box .concepto { font-size: 12pt; color: #555; margin-top: 10px; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #b71c1c; }
  .info-box h4 { margin: 0 0 6px 0; color: #b71c1c; font-size: 10pt; font-weight: 600; text-transform: uppercase; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; }
  .firmas { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #555; margin-top: 35px; padding-top: 6px; font-size: 9pt; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">{{empresa_nombre}}<br/>RFC: {{empresa_rfc}}<br/>{{empresa_direccion}}</div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="pago-box">
    <div>COMPROBANTE DE PAGO A</div>
    <div style="font-size:16pt;font-weight:600;margin:10px 0;">{{entidad_nombre}}</div>
    <div>POR LA CANTIDAD DE</div>
    <div class="monto">${{total}}</div>
    <div class="concepto">Por concepto de pago a factura(s) pendiente(s)</div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h4>Proveedor</h4>
      <p><strong>{{entidad_nombre}}</strong></p>
      <p>RFC: {{entidad_rfc}}</p>
    </div>
    <div class="info-box">
      <h4>Detalle del Pago</h4>
      <p>Método de Pago: {{metodo_pago}}</p>
      <p>Factura(s): {{folio_factura}}</p>
    </div>
  </div>

  <div class="firmas">
    <div class="firma"><div class="linea">Pagó</div></div>
    <div class="firma"><div class="linea">Recibió</div></div>
  </div>

  <div class="footer">{{empresa_pie_pagina}}</div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$),
('asiento_manual', 'Asiento Contable Manual - Default', $HTML$
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
  .page { width: 100%; padding: 20px 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #37474f; }
  .header-left .logo { max-height: 80px; max-width: 200px; }
  .empresa-info { font-size: 9pt; color: #555; margin-top: 5px; }
  .header-right { text-align: right; }
  .titulo-documento { font-size: 22pt; font-weight: bold; color: #37474f; }
  .folio-text { font-size: 14pt; font-weight: bold; margin-top: 4px; }
  .fecha-text { font-size: 9pt; color: #666; }
  .info-section { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 12px; background: #f5f7fa; border-radius: 6px; border-left: 4px solid #37474f; }
  .info-box h4 { margin: 0 0 6px 0; color: #37474f; font-size: 10pt; text-transform: uppercase; }
  .info-box p { margin: 2px 0; font-size: 9.5pt; }
  table.asiento { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table.asiento thead th { background: #37474f; color: white; padding: 10px 8px; font-size: 9pt; text-align: left; }
  table.asiento thead th.right { text-align: right; }
  table.asiento tbody td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.asiento tbody td.right { text-align: right; font-family: 'Courier New', monospace; }
  table.asiento tbody tr:nth-child(even) { background: #fafafa; }
  table.asiento tbody .cargo { background: #e8f5e9; }
  table.asiento tbody .abono { background: #fce4ec; }
  table.asiento tfoot td { font-weight: bold; border-top: 2px solid #37474f; padding: 8px; font-size: 10pt; }
  table.asiento tfoot td.right { text-align: right; }
  .comentario-box { margin-top: 15px; padding: 12px; background: #fff8e1; border-radius: 4px; font-size: 9pt; border-left: 4px solid #ffc107; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #999; }
  .page-number { text-align: center; font-size: 8pt; color: #aaa; margin-top: 15px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      {{empresa_logo_html}}
      <div class="empresa-info">{{empresa_nombre}}<br/>RFC: {{empresa_rfc}}</div>
    </div>
    <div class="header-right">
      <div class="titulo-documento">{{tipo_documento}}</div>
      <div class="folio-text">{{folio}}</div>
      <div class="fecha-text">{{fecha}}</div>
    </div>
  </div>

  <div class="comentario-box">
    <strong>Descripción:</strong> {{comentario}}
  </div>

  <table class="asiento">
    <thead>
      <tr>
        <th>Código</th>
        <th>Cuenta Contable</th>
        <th style="width:130px;" class="right">Débito</th>
        <th style="width:130px;" class="right">Crédito</th>
      </tr>
    </thead>
    <tbody>
      {{tabla_lineas_contables}}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="text-align:right;">T O T A L E S</td>
        <td class="right">${{total_debe}}</td>
        <td class="right">${{total_haber}}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    {{empresa_pie_pagina}}
  </div>
  <div class="page-number">Página <span class="pageNumber">{{numero_pagina}}</span></div>
</div>
</body>
</html>
$HTML$)
ON CONFLICT (tipo) DO NOTHING;
