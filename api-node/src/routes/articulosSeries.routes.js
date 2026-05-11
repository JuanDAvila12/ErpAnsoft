const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth'); // ✅ Esto es la función correcta
const ArticulosSeriesModel = require('../models/articulosSeries.model');

/**
 * @swagger
 * tags:
 *   name: ArticulosSeries
 *   description: Control de series de artículos
 */

/**
 * GET /api/v1/articulos-series/articulo/:articuloId
 * Obtiene todas las series de un artículo.
 */
router.get('/articulo/:articuloId', authMiddleware, async (req, res) => {
  try {
    const series = await ArticulosSeriesModel.findByArticuloId(req.params.articuloId);
    res.json(series);
  } catch (err) {
    console.error('Error al obtener series del artículo:', err);
    res.status(500).json({ error: 'Error al obtener series' });
  }
});

/**
 * GET /api/v1/articulos-series/disponibles/:articuloId
 * Obtiene series disponibles de un artículo.
 */
router.get('/disponibles/:articuloId', authMiddleware, async (req, res) => {
  try {
    const series = await ArticulosSeriesModel.findDisponibles(req.params.articuloId);
    res.json(series);
  } catch (err) {
    console.error('Error al obtener series disponibles:', err);
    res.status(500).json({ error: 'Error al obtener series disponibles' });
  }
});

/**
 * POST /api/v1/articulos-series
 * Crea una nueva serie para un artículo.
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { articulo_id, numero_serie, inventario_movimiento_id } = req.body;
    if (!articulo_id || !numero_serie) {
      return res.status(400).json({ error: 'articulo_id y numero_serie son requeridos' });
    }
    const serie = await ArticulosSeriesModel.create({ articulo_id, numero_serie, inventario_movimiento_id }, req);
    res.status(201).json(serie);
  } catch (err) {
    console.error('Error al crear serie:', err);
    res.status(500).json({ error: err.message || 'Error al crear serie' });
  }
});

/**
 * GET /api/v1/articulos-series/:id
 * Obtiene una serie por ID.
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const serie = await ArticulosSeriesModel.findById(req.params.id);
    if (!serie) return res.status(404).json({ error: 'Serie no encontrada' });
    res.json(serie);
  } catch (err) {
    console.error('Error al obtener serie:', err);
    res.status(500).json({ error: 'Error al obtener serie' });
  }
});

/**
 * PUT /api/v1/articulos-series/:id/estado
 * Actualiza el estado de una serie.
 */
router.put('/:id/estado', authMiddleware, async (req, res) => {
  try {
    const { estado, inventario_movimiento_id } = req.body;
    if (!estado || !['disponible', 'vendido', 'reservado', 'baja'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const serie = await ArticulosSeriesModel.actualizarEstado(
      req.params.id, estado, inventario_movimiento_id, req
    );
    if (!serie) return res.status(404).json({ error: 'Serie no encontrada o dada de baja' });
    res.json(serie);
  } catch (err) {
    console.error('Error al actualizar estado de serie:', err);
    res.status(500).json({ error: err.message || 'Error al actualizar estado' });
  }
});

/**
 * GET /api/v1/articulos-series/buscar/:numeroSerie
 * Busca series por número de serie.
 */
router.get('/buscar/:numeroSerie', authMiddleware, async (req, res) => {
  try {
    const { articulo_id } = req.query;
    const series = await ArticulosSeriesModel.findByNumeroSerie(
      req.params.numeroSerie, articulo_id || null
    );
    res.json(series);
  } catch (err) {
    console.error('Error al buscar series:', err);
    res.status(500).json({ error: 'Error al buscar series' });
  }
});

module.exports = router;
