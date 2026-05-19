const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const ReportesModel = require('../models/reportes.model');

/**
 * GET /api/v1/reportes/compras-por-articulo
 * Reporte de compras agrupadas por artículo.
 * Query params: fecha_desde, fecha_hasta, articulo_id
 */
router.get('/compras-por-articulo', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, articulo_id } = req.query;
    const datos = await ReportesModel.comprasPorArticulo({
      fecha_desde,
      fecha_hasta,
      articulo_id: articulo_id ? parseInt(articulo_id) : undefined,
    });
    res.json({ exito: true, datos });
  } catch (err) {
    console.error('Error en reporte compras-por-articulo:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/reportes/compras-por-proveedor
 * Reporte de compras agrupadas por proveedor.
 * Query params: fecha_desde, fecha_hasta, proveedor_id
 */
router.get('/compras-por-proveedor', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, proveedor_id } = req.query;
    const datos = await ReportesModel.comprasPorProveedor({
      fecha_desde,
      fecha_hasta,
      proveedor_id: proveedor_id ? parseInt(proveedor_id) : undefined,
    });
    res.json({ exito: true, datos });
  } catch (err) {
    console.error('Error en reporte compras-por-proveedor:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
