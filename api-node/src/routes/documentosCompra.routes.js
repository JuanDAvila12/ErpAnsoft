const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth'); // ✅ Esto es la función correcta
const DocumentosCompraModel = require('../models/documentosCompra.model');

/**
 * @swagger
 * /api/v1/documentos-compra:
 *   get:
 *     summary: Listar documentos de compra
 *     tags: [DocumentosCompra]
 *   post:
 *     summary: Crear un documento de compra
 *     tags: [DocumentosCompra]
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, estado } = req.query;
    const docs = await DocumentosCompraModel.findAll({ tipo, estado });
    res.json(docs);
  } catch (err) {
    console.error('Error al listar documentos de compra:', err);
    res.status(500).json({ error: 'Error al obtener documentos de compra' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await DocumentosCompraModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento de compra no encontrado' });
    res.json(doc);
  } catch (err) {
    console.error('Error al obtener documento de compra:', err);
    res.status(500).json({ error: 'Error al obtener documento de compra' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, ...datos } = req.body;
    if (!tipo || !['orden_compra', 'compra'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use: orden_compra, compra' });
    }
    if (!datos.proveedor_entidad_id || !datos.articulos?.length) {
      return res.status(400).json({ error: 'proveedor_entidad_id y articulos son requeridos' });
    }
    const doc = await DocumentosCompraModel.crearDocumento(tipo, datos, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al crear documento de compra:', err);
    res.status(500).json({ error: err.message || 'Error al crear documento de compra' });
  }
});

/**
 * @swagger
 * /api/v1/documentos-compra/{id}/cancelar:
 *   post:
 *     summary: Cancelar un documento de compra
 *     tags: [DocumentosCompra]
 */
router.post('/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const resultado = await DocumentosCompraModel.cancelar(req.params.id, req);
    res.json(resultado);
  } catch (err) {
    console.error('Error al cancelar documento de compra:', err);
    res.status(500).json({ error: err.message || 'Error al cancelar documento de compra' });
  }
});

module.exports = router;
