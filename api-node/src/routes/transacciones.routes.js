const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const TransaccionesModel = require('../models/transacciones.model');
const pool = require('../db');
const { AppError } = require('../middleware/errorHandler');
const { generarPDF } = require('../services/pdfGenerator');

/**
 * @swagger
 * /api/v1/transacciones:
 *   get:
 *     summary: Listar transacciones con filtros
 *     tags: [Transacciones]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema: { type: string }
 *         description: Filtrar por tipo (cotizacion, orden_venta, venta, orden_compra, compra, ajuste_inventario, entrada_inventario, salida_inventario, pago, cobro)
 *       - in: query
 *         name: estado
 *         schema: { type: string }
 *         description: Filtrar por estado (borrador, pendiente, confirmado, facturado, cancelado)
 *       - in: query
 *         name: entidad_cliente_id
 *         schema: { type: integer }
 *       - in: query
 *         name: entidad_proveedor_id
 *         schema: { type: integer }
 *       - in: query
 *         name: fecha_desde
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fecha_hasta
 *         schema: { type: string, format: date }
 *   post:
 *     summary: Crear una nueva transacción
 *     tags: [Transacciones]
 */

// GET / - Listar transacciones con filtros
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { tipo, estado, entidad_cliente_id, entidad_proveedor_id, fecha_desde, fecha_hasta } = req.query;
    const docs = await TransaccionesModel.findAll({
      tipo, estado, entidad_cliente_id, entidad_proveedor_id, fecha_desde, fecha_hasta,
    });
    res.json(docs);
  } catch (err) {
    next(new AppError('TRANS-005', err.message));
  }
});

// POST / - Crear una transacción
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { tipo, ...datos } = req.body;
    const tiposValidos = [
      'cotizacion', 'orden_venta', 'venta',
      'orden_compra', 'compra',
      'ajuste_inventario', 'entrada_inventario', 'salida_inventario',
      'pago', 'cobro',
      'cotizacion_compra', 'recepcion_compra', 'traspaso', 'recepcion_traspaso',
      'asiento_manual',
    ];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json({
        codigo: 'TRANS-007',
        mensaje: 'Tipo de transacción inválido',
        modulo: 'Transacciones',
        detalle: `Use uno de: ${tiposValidos.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
    // Para asiento_manual, no se requieren artículos
    if (tipo !== 'asiento_manual' && tipo !== 'cobro' && tipo !== 'pago' && !datos.articulos?.length) {
      return res.status(400).json({
        codigo: 'TRANS-008',
        mensaje: 'Artículos requeridos',
        modulo: 'Transacciones',
        detalle: 'El array de artículos no puede estar vacío',
        timestamp: new Date().toISOString(),
      });
    }
    const doc = await TransaccionesModel.crearTransaccion(tipo, datos, req);
    res.status(201).json(doc);
  } catch (err) {
    next(new AppError('TRANS-001', err.message));
  }
});

// POST /convertir/:origenId - Convertir una transacción (ej: cotizacion → orden_venta → venta)
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar que Express interprete "convertir" como un ID
router.post('/convertir/:origenId', authMiddleware, async (req, res, next) => {
  try {
    const { origenId } = req.params;
    const { nuevo_tipo } = req.body;

    if (!nuevo_tipo) {
      return res.status(400).json({
        codigo: 'TRANS-007',
        mensaje: 'Tipo de transacción inválido',
        modulo: 'Transacciones',
        detalle: 'nuevo_tipo es requerido',
        timestamp: new Date().toISOString(),
      });
    }

    const doc = await TransaccionesModel.convertirTransaccion(origenId, nuevo_tipo, req);
    res.status(201).json(doc);
  } catch (err) {
    next(new AppError('TRANS-004', err.message));
  }
});

// POST /:id/convertir - Ruta alternativa para convertir (usada por vistas de listado)
router.post('/:id/convertir', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nuevo_tipo } = req.body;

    if (!nuevo_tipo) {
      return res.status(400).json({
        codigo: 'TRANS-007',
        mensaje: 'Tipo de transacción inválido',
        modulo: 'Transacciones',
        detalle: 'nuevo_tipo es requerido',
        timestamp: new Date().toISOString(),
      });
    }

    const doc = await TransaccionesModel.convertirTransaccion(id, nuevo_tipo, req);
    res.status(201).json(doc);
  } catch (err) {
    next(new AppError('TRANS-004', err.message));
  }
});

// POST /:id/cancelar - Cancelar una transacción
router.post('/:id/cancelar', authMiddleware, async (req, res, next) => {
  try {
    const resultado = await TransaccionesModel.cancelarTransaccion(req.params.id, req);
    res.json(resultado);
  } catch (err) {
    next(new AppError('TRANS-002', err.message));
  }
});

// GET /:id/historial - Obtener historial de auditoría (CHATTER)
router.get('/:id/historial', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT lc.id AS id_cabecera,
              lc.tipo_operacion,
              u.nombre AS usuario_nombre,
              u.email AS usuario_email,
              lc.fecha,
              lc.ip_origen,
              lc.comentario,
              COALESCE(
                json_agg(
                  json_build_object(
                    'campo_afectado', ld.campo_afectado,
                    'valor_anterior', ld.valor_anterior,
                    'valor_nuevo', ld.valor_nuevo
                  )
                  ORDER BY ld.id
                ) FILTER (WHERE ld.id IS NOT NULL),
                '[]'::json
              ) AS detalles
       FROM log_modificaciones_cabecera lc
       LEFT JOIN log_modificaciones_detalle ld ON ld.cabecera_id = lc.id
       LEFT JOIN usuarios u ON u.id = lc.usuario_id
       WHERE lc.tabla_afectada = 'transacciones' AND lc.registro_id = $1
       GROUP BY lc.id, u.nombre, u.email
       ORDER BY lc.fecha DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    next(new AppError('TRANS-006', err.message));
  }
});

// GET /:id/pdf - Generar PDF de la transacción (debe ir ANTES de /:id genérica)
router.get('/:id/pdf', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log(`[PDF-ROUTE] ===== INICIO generación PDF para transacción ID ${id} =====`);

    // Verificar que la transacción exista
    const transaccion = await TransaccionesModel.findById(id);
    if (!transaccion) {
      console.error(`[PDF-ROUTE] Transacción ID ${id} no encontrada`);
      return res.status(404).json({
        codigo: 'TRANS-003',
        mensaje: 'Transacción no encontrada',
        modulo: 'Transacciones',
        detalle: `No se encontró transacción con ID ${id}`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[PDF-ROUTE] Transacción encontrada: tipo="${transaccion.tipo}", folio="${transaccion.folio}"`);
    console.log(`[PDF-ROUTE] Llamando a generarPDF(tipo="${transaccion.tipo}", id=${id})`);

    const pdfBuffer = await generarPDF(transaccion.tipo, id);

    console.log(`[PDF-ROUTE] PDF generado, tamaño: ${pdfBuffer.length} bytes`);
    console.log(`[PDF-ROUTE] Primeros bytes del buffer: ${pdfBuffer.slice(0, 8).toString('hex')}`);
    console.log(`[PDF-ROUTE] Buffer es Buffer? ${Buffer.isBuffer(pdfBuffer)}`);

    if (pdfBuffer.length < 100) {
      console.error(`[PDF-ROUTE] ERROR: PDF demasiado pequeño (${pdfBuffer.length} bytes). Contenido: ${pdfBuffer.toString().substring(0, 200)}`);
      return res.status(500).json({
        exito: false,
        error: 'El PDF generado está vacío o corrupto',
        mensaje: 'Error al generar el PDF. El buffer generado es demasiado pequeño.',
      });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${transaccion.tipo}_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    console.log(`[PDF-ROUTE] Enviando PDF: Content-Length=${pdfBuffer.length}`);
    res.send(pdfBuffer);
    console.log(`[PDF-ROUTE] ===== FIN generación PDF exitosa =====`);
  } catch (err) {
    console.error('[PDF-ROUTE] Error al generar PDF:', err);
    console.error('[PDF-ROUTE] Stack:', err.stack);
    res.status(500).json({
      exito: false,
      error: err.message,
      mensaje: 'Error al generar el PDF. Verifique que Puppeteer esté instalado correctamente.',
    });
  }
});

// GET /:id - Obtener una transacción por ID (debe ir DESPUÉS de rutas específicas como /:id/historial)
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const doc = await TransaccionesModel.findById(req.params.id);
    if (!doc) return res.status(404).json({
      codigo: 'TRANS-003',
      mensaje: 'Transacción no encontrada',
      modulo: 'Transacciones',
      detalle: `No se encontró transacción con ID ${req.params.id}`,
      timestamp: new Date().toISOString(),
    });
    res.json(doc);
  } catch (err) {
    next(new AppError('TRANS-003', err.message));
  }
});

module.exports = router;
