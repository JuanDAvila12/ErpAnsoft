const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const TransaccionesModel = require('../models/transacciones.model');
const pool = require('../db');

/**
 * @swagger
 * /api/v1/documentos-venta:
 *   Compatibilidad hacia atrás.
 *   Redirige internamente a TransaccionesModel (tablas unificadas).
 *   Los endpoints antiguos siguen funcionando sin cambios en el frontend.
 */

// GET / - Listar documentos de venta con filtros
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, estado } = req.query;
    const docs = await TransaccionesModel.findAll({ tipo, estado });
    // Mapear respuesta al formato antiguo para compatibilidad
    const mapeados = docs.map(d => ({
      id: d.id,
      tipo: d.tipo,
      estado: d.estado,
      folio: d.folio,
      fecha: d.fecha,
      fecha_vencimiento: d.fecha_vencimiento,
      total: d.total,
      entidad_cliente_id: d.entidad_cliente_id,
      entidad_vendedor_id: d.entidad_vendedor_id,
      metodo_pago: d.metodo_pago,
      forma_pago_id: d.forma_pago_id,
      terminos_pago_id: d.terminos_pago_id,
      serie_id: d.serie_id,
      documento_origen_id: d.documento_origen_id,
      created_at: d.created_at,
      updated_at: d.updated_at,
      cliente_nombre: d.cliente_nombre,
      cliente_rfc: d.cliente_rfc,
      vendedor_nombre: d.vendedor_nombre,
      serie: d.serie,
      detalles: d.detalles || [],
    }));
    res.json(mapeados);
  } catch (err) {
    console.error('Error al listar documentos de venta:', err);
    res.status(500).json({ error: 'Error al obtener documentos de venta' });
  }
});

// GET /:id - Obtener un documento de venta por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await TransaccionesModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    // Mapear respuesta al formato antiguo
    const mapeado = {
      id: doc.id,
      tipo: doc.tipo,
      estado: doc.estado,
      folio: doc.folio,
      fecha: doc.fecha,
      fecha_vencimiento: doc.fecha_vencimiento,
      total: doc.total,
      moneda_id: doc.moneda_id,
      entidad_cliente_id: doc.entidad_cliente_id,
      entidad_vendedor_id: doc.entidad_vendedor_id,
      almacen_id: doc.almacen_id,
      metodo_pago: doc.metodo_pago,
      forma_pago_id: doc.forma_pago_id,
      terminos_pago_id: doc.terminos_pago_id,
      serie_id: doc.serie_id,
      documento_origen_id: doc.documento_origen_id,
      comentario: doc.comentario,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      cliente_nombre: doc.cliente_nombre,
      cliente_rfc: doc.cliente_rfc,
      vendedor_nombre: doc.vendedor_nombre,
      serie: doc.serie,
      terminos_pago_nombre: doc.terminos_pago_nombre,
      terminos_pago_dias_credito: doc.dias_credito,
      detalles: (doc.detalles || []).map(d => ({
        id: d.id,
        articulo_id: d.articulo_id,
        articulo_nombre: d.articulo_nombre,
        articulo_sku: d.articulo_sku,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal,
      })),
      origen: doc.origen,
      destino: doc.destino,
    };
    res.json(mapeado);
  } catch (err) {
    console.error('Error al obtener documento de venta:', err);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

// POST / - Crear un documento de venta (redirige a TransaccionesModel)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, ...datos } = req.body;
    if (!tipo || !['cotizacion', 'orden_venta', 'venta'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de documento inválido. Use: cotizacion, orden_venta, venta' });
    }
    if (!datos.entidad_cliente_id || !datos.articulos?.length) {
      return res.status(400).json({ error: 'entidad_cliente_id y articulos son requeridos' });
    }
    // Mapear datos al formato unificado (el modelo acepta los mismos nombres)
    const doc = await TransaccionesModel.crearTransaccion(tipo, datos, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al crear documento de venta:', err);
    res.status(500).json({ error: err.message || 'Error al crear documento' });
  }
});

// POST /convertir/:origenId - Convertir un documento
router.post('/convertir/:origenId', authMiddleware, async (req, res) => {
  try {
    const { origenId } = req.params;
    const { nuevo_tipo } = req.body;

    if (!nuevo_tipo || !['orden_venta', 'venta'].includes(nuevo_tipo)) {
      return res.status(400).json({ error: 'nuevo_tipo inválido. Use: orden_venta, venta' });
    }

    const doc = await TransaccionesModel.convertirTransaccion(origenId, nuevo_tipo, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al convertir documento:', err);
    res.status(500).json({ error: err.message || 'Error al convertir documento' });
  }
});

// POST /:id/cancelar - Cancelar un documento de venta
router.post('/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const resultado = await TransaccionesModel.cancelarTransaccion(req.params.id, req);
    res.json(resultado);
  } catch (err) {
    console.error('Error al cancelar documento:', err);
    res.status(500).json({ error: err.message || 'Error al cancelar documento' });
  }
});

module.exports = router;
