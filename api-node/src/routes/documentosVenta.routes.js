const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth'); // ✅ Esto es la función correcta
const DocumentosVentaModel = require('../models/documentosVenta.model');

/**
 * @swagger
 * /api/v1/documentos-venta:
 *   get:
 *     summary: Listar documentos de venta (cotizaciones, órdenes, facturas)
 *     tags: [DocumentosVenta]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema: { type: string }
 *         description: Filtrar por tipo (cotizacion, orden_venta, venta)
 *       - in: query
 *         name: estado
 *         schema: { type: string }
 *         description: Filtrar por estado (borrador, pendiente, confirmado, facturado, cancelado)
 *   post:
 *     summary: Crear un nuevo documento de venta
 *     tags: [DocumentosVenta]
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, estado } = req.query;
    const documentos = await DocumentosVentaModel.findAll({ tipo, estado });
    res.json(documentos);
  } catch (err) {
    console.error('Error al listar documentos de venta:', err);
    res.status(500).json({ error: 'Error al obtener documentos de venta' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await DocumentosVentaModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(doc);
  } catch (err) {
    console.error('Error al obtener documento de venta:', err);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, ...datos } = req.body;
    if (!tipo || !['cotizacion', 'orden_venta', 'venta'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de documento inválido. Use: cotizacion, orden_venta, venta' });
    }
    if (!datos.entidad_cliente_id || !datos.articulos?.length) {
      return res.status(400).json({ error: 'entidad_cliente_id y articulos son requeridos' });
    }
    const doc = await DocumentosVentaModel.crearDocumento(tipo, datos, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al crear documento de venta:', err);
    res.status(500).json({ error: err.message || 'Error al crear documento' });
  }
});

/**
 * @swagger
 * /api/v1/documentos-venta/convertir/{origenId}:
 *   post:
 *     summary: Convertir un documento a otro tipo (cotizacion→orden_venta→venta)
 *     tags: [DocumentosVenta]
 *     parameters:
 *       - in: path
 *         name: origenId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nuevo_tipo:
 *                 type: string
 *                 enum: [orden_venta, venta]
 */
router.post('/convertir/:origenId', authMiddleware, async (req, res) => {
  try {
    const { origenId } = req.params;
    const { nuevo_tipo } = req.body;

    if (!nuevo_tipo || !['orden_venta', 'venta'].includes(nuevo_tipo)) {
      return res.status(400).json({ error: 'nuevo_tipo inválido. Use: orden_venta, venta' });
    }

    const doc = await DocumentosVentaModel.convertirDocumento(origenId, nuevo_tipo, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al convertir documento:', err);
    res.status(500).json({ error: err.message || 'Error al convertir documento' });
  }
});

/**
 * @swagger
 * /api/v1/documentos-venta/{id}/cancelar:
 *   post:
 *     summary: Cancelar un documento de venta
 *     tags: [DocumentosVenta]
 */
router.post('/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const resultado = await DocumentosVentaModel.cancelar(req.params.id, req);
    res.json(resultado);
  } catch (err) {
    console.error('Error al cancelar documento:', err);
    res.status(500).json({ error: err.message || 'Error al cancelar documento' });
  }
});

module.exports = router;
