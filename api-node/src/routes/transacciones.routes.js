const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const TransaccionesModel = require('../models/transacciones.model');
const pool = require('../db');

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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, estado, entidad_cliente_id, entidad_proveedor_id, fecha_desde, fecha_hasta } = req.query;
    const docs = await TransaccionesModel.findAll({
      tipo, estado, entidad_cliente_id, entidad_proveedor_id, fecha_desde, fecha_hasta,
    });
    res.json(docs);
  } catch (err) {
    console.error('Error al listar transacciones:', err);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// GET /:id - Obtener una transacción por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await TransaccionesModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json(doc);
  } catch (err) {
    console.error('Error al obtener transacción:', err);
    res.status(500).json({ error: 'Error al obtener transacción' });
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
    res.status(500).json({ error: 'Error al obtener historial de la transacción' });
  }
});

// POST / - Crear una transacción
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, ...datos } = req.body;
    const tiposValidos = [
      'cotizacion', 'orden_venta', 'venta',
      'orden_compra', 'compra',
      'ajuste_inventario', 'entrada_inventario', 'salida_inventario',
      'pago', 'cobro',
    ];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: `Tipo inválido. Use uno de: ${tiposValidos.join(', ')}`,
      });
    }
    if (!datos.articulos?.length) {
      return res.status(400).json({ error: 'articulos es requerido (array no vacío)' });
    }
    const doc = await TransaccionesModel.crearTransaccion(tipo, datos, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al crear transacción:', err);
    res.status(500).json({ error: err.message || 'Error al crear transacción' });
  }
});

// POST /convertir/:origenId - Convertir una transacción (ej: cotizacion → orden_venta → venta)
router.post('/convertir/:origenId', authMiddleware, async (req, res) => {
  try {
    const { origenId } = req.params;
    const { nuevo_tipo } = req.body;

    if (!nuevo_tipo) {
      return res.status(400).json({ error: 'nuevo_tipo es requerido' });
    }

    const doc = await TransaccionesModel.convertirTransaccion(origenId, nuevo_tipo, req);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Error al convertir transacción:', err);
    res.status(500).json({ error: err.message || 'Error al convertir transacción' });
  }
});

// POST /:id/cancelar - Cancelar una transacción
router.post('/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const resultado = await TransaccionesModel.cancelarTransaccion(req.params.id, req);
    res.json(resultado);
  } catch (err) {
    console.error('Error al cancelar transacción:', err);
    res.status(500).json({ error: err.message || 'Error al cancelar transacción' });
  }
});

module.exports = router;
