const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const ComprobantesFiscalesModel = require('../models/comprobantesFiscales.model');

/**
 * @swagger
 * tags:
 *   name: ComprobantesFiscales
 *   description: CFDI 4.0 - Comprobantes fiscales timbrados
 */

/**
 * GET /api/v1/comprobantes-fiscales
 * Lista todos los comprobantes fiscales.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { estatus, documento_venta_id } = req.query;
    const comprobantes = await ComprobantesFiscalesModel.findAll({ estatus, documento_venta_id });
    res.json(comprobantes);
  } catch (err) {
    console.error('Error al listar comprobantes:', err);
    res.status(500).json({ error: 'Error al obtener comprobantes fiscales' });
  }
});

/**
 * GET /api/v1/comprobantes-fiscales/:id
 * Obtiene un comprobante por ID.
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const comprobante = await ComprobantesFiscalesModel.findById(req.params.id);
    if (!comprobante) return res.status(404).json({ error: 'Comprobante fiscal no encontrado' });
    res.json(comprobante);
  } catch (err) {
    console.error('Error al obtener comprobante:', err);
    res.status(500).json({ error: 'Error al obtener comprobante fiscal' });
  }
});

/**
 * GET /api/v1/comprobantes-fiscales/documento/:documentoVentaId
 * Obtiene comprobantes por documento de venta.
 */
router.get('/documento/:documentoVentaId', authMiddleware, async (req, res) => {
  try {
    const comprobantes = await ComprobantesFiscalesModel.findByDocumentoVentaId(req.params.documentoVentaId);
    res.json(comprobantes);
  } catch (err) {
    console.error('Error al obtener comprobantes por documento:', err);
    res.status(500).json({ error: 'Error al obtener comprobantes' });
  }
});

/**
 * GET /api/v1/comprobantes-fiscales/uuid/:uuid
 * Obtiene un comprobante por UUID.
 */
router.get('/uuid/:uuid', authMiddleware, async (req, res) => {
  try {
    const comprobante = await ComprobantesFiscalesModel.findByUUID(req.params.uuid);
    if (!comprobante) return res.status(404).json({ error: 'Comprobante no encontrado para este UUID' });
    res.json(comprobante);
  } catch (err) {
    console.error('Error al obtener comprobante por UUID:', err);
    res.status(500).json({ error: 'Error al obtener comprobante' });
  }
});

module.exports = router;
