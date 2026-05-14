const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const TransaccionesModel = require('../models/transacciones.model');
const pool = require('../db');

/**
 * @swagger
 * /api/v1/documentos-compra:
 *   Compatibilidad hacia atrás.
 *   Redirige internamente a TransaccionesModel (tablas unificadas).
 *   Los endpoints antiguos siguen funcionando sin cambios en el frontend.
 */

// GET / - Listar documentos de compra con filtros
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, estado, proveedor } = req.query;
    const docs = await TransaccionesModel.findAll({
      tipo,
      estado,
      entidad_proveedor_id: proveedor,
    });
    // Mapear respuesta al formato antiguo para compatibilidad
    const mapeados = docs.map(d => ({
      id: d.id,
      tipo: d.tipo,
      estado: d.estado,
      folio: d.folio,
      fecha: d.fecha,
      fecha_vencimiento: d.fecha_vencimiento,
      total: d.total,
      proveedor_entidad_id: d.entidad_proveedor_id,
      entidad_comprador_id: d.entidad_vendedor_id,
      metodo_pago: d.metodo_pago,
      forma_pago_id: d.forma_pago_id,
      terminos_pago_id: d.terminos_pago_id,
      almacen_id: d.almacen_id,
      serie_id: d.serie_id,
      documento_origen_id: d.documento_origen_id,
      created_at: d.created_at,
      updated_at: d.updated_at,
      proveedor_nombre: d.proveedor_nombre,
      proveedor_rfc: d.proveedor_rfc,
      serie: d.serie,
      detalles: d.detalles || [],
    }));
    res.json(mapeados);
  } catch (err) {
    console.error('Error al listar documentos de compra:', err);
    res.status(500).json({ error: 'Error al obtener documentos de compra' });
  }
});

// GET /:id - Obtener un documento de compra por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await TransaccionesModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento de compra no encontrado' });
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
      proveedor_entidad_id: doc.entidad_proveedor_id,
      entidad_comprador_id: doc.entidad_vendedor_id,
      almacen_id: doc.almacen_id,
      metodo_pago: doc.metodo_pago,
      forma_pago_id: doc.forma_pago_id,
      terminos_pago_id: doc.terminos_pago_id,
      serie_id: doc.serie_id,
      documento_origen_id: doc.documento_origen_id,
      comentario: doc.comentario,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      proveedor_nombre: doc.proveedor_nombre,
      proveedor_rfc: doc.proveedor_rfc,
      serie: doc.serie,
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
    console.error('Error al obtener documento de compra:', err);
    res.status(500).json({ error: 'Error al obtener documento de compra' });
  }
});

// GET /:id/historial - Obtener historial de auditoría (CHATTER)
router.get('/:id/historial', authMiddleware, async (req, res) => {
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
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error al obtener historial del documento' });
  }
});

// POST / - Crear un documento de compra (redirige a TransaccionesModel)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, ...datos } = req.body;
    if (!tipo || !['orden_compra', 'compra'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use: orden_compra, compra' });
    }

    // Mapear campos del formato antiguo al nuevo
    const datosUnificados = {
      entidad_cliente_id: datos.entidad_cliente_id,
      entidad_proveedor_id: datos.proveedor_entidad_id,
      entidad_vendedor_id: datos.entidad_comprador_id,
      almacen_id: datos.almacen_id,
      metodo_pago: datos.metodo_pago,
      forma_pago_id: datos.forma_pago_id,
      terminos_pago_id: datos.terminos_pago_id,
      serie_id: datos.serie_id,
      fecha_vencimiento: datos.fecha_vencimiento,
      comentario: datos.comentario,
      articulos: datos.articulos,
    };

    if (!datosUnificados.entidad_proveedor_id || !datos.articulos?.length) {
      return res.status(400).json({ error: 'proveedor_entidad_id y articulos son requeridos' });
    }

    const doc = await TransaccionesModel.crearTransaccion(tipo, datosUnificados, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al crear documento de compra:', err);
    res.status(500).json({ error: err.message || 'Error al crear documento de compra' });
  }
});

// POST /convertir/:origenId - Convertir un documento (ej: orden_compra → compra)
router.post('/convertir/:origenId', authMiddleware, async (req, res) => {
  try {
    const { nuevo_tipo } = req.body;
    if (!nuevo_tipo || !['compra'].includes(nuevo_tipo)) {
      return res.status(400).json({ error: 'nuevo_tipo inválido. Use: compra' });
    }
    const doc = await TransaccionesModel.convertirTransaccion(
      req.params.origenId, nuevo_tipo, req
    );
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al convertir documento de compra:', err);
    res.status(500).json({ error: err.message || 'Error al convertir documento de compra' });
  }
});

// POST /:id/cancelar - Cancelar un documento de compra
router.post('/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const resultado = await TransaccionesModel.cancelarTransaccion(req.params.id, req);
    res.json(resultado);
  } catch (err) {
    console.error('Error al cancelar documento de compra:', err);
    res.status(500).json({ error: err.message || 'Error al cancelar documento de compra' });
  }
});

module.exports = router;
