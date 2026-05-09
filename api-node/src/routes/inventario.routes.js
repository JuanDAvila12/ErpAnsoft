const express = require('express');
const router = express.Router();
const InventarioModel = require('../models/inventario.model');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/v1/inventario
 * Devuelve el stock calculado (suma de movimientos) de todos los artículos.
 * Requiere autenticación.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const stock = await InventarioModel.getStockActual();

    res.json({
      datos: stock,
      total: stock.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Inventario] Error al obtener stock:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar el inventario',
    });
  }
});

/**
 * GET /api/v1/inventario/movimientos
 * Devuelve todos los movimientos de inventario.
 * Opcional: ?articulo_id=1 para filtrar por artículo.
 */
router.get('/movimientos', authMiddleware, async (req, res) => {
  try {
    const articuloId = req.query.articulo_id || null;
    const movimientos = await InventarioModel.getMovimientos(articuloId);

    res.json({
      datos: movimientos,
      total: movimientos.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Inventario] Error al obtener movimientos:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar los movimientos',
    });
  }
});

module.exports = router;
