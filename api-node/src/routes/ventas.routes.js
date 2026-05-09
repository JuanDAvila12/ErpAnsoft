const express = require('express');
const router = express.Router();
const VentasModel = require('../models/ventas.model');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/v1/ventas
 * Registra una nueva venta con transacción SQL.
 * Body esperado:
 * {
 *   cliente_id: number (opcional),
 *   metodo_pago: string (opcional, default 'efectivo'),
 *   articulos: [
 *     { articulo_id: number, cantidad: number }
 *   ]
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { cliente_id, metodo_pago, articulos } = req.body;

    // Validaciones
    if (!articulos || !Array.isArray(articulos) || articulos.length === 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        mensaje: 'Debe proporcionar al menos un artículo en la venta',
      });
    }

    for (const art of articulos) {
      if (!art.articulo_id || !art.cantidad || art.cantidad <= 0) {
        return res.status(400).json({
          error: 'Datos inválidos',
          mensaje: 'Cada artículo debe tener articulo_id y cantidad mayor a 0',
        });
      }
    }

    const venta = await VentasModel.crearVenta({
      cliente_id,
      metodo_pago,
      articulos,
    });

    res.status(201).json({
      mensaje: 'Venta registrada exitosamente',
      datos: venta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Ventas] Error al crear venta:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: err.message || 'Ocurrió un error al registrar la venta',
    });
  }
});

/**
 * GET /api/v1/ventas
 * Obtiene todas las ventas registradas.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ventas = await VentasModel.findAll();

    res.json({
      datos: ventas,
      total: ventas.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Ventas] Error al obtener ventas:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar las ventas',
    });
  }
});

/**
 * GET /api/v1/ventas/:id
 * Obtiene una venta por ID.
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const venta = await VentasModel.findById(req.params.id);

    if (!venta) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: `Venta con ID ${req.params.id} no encontrada`,
      });
    }

    res.json({
      datos: venta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Ventas] Error al obtener venta:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar la venta',
    });
  }
});

module.exports = router;
