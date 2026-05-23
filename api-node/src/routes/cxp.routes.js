const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const CxpModel = require('../models/cxp.model');

/**
 * GET /api/v1/cxp/estado-cuenta/:entidad_proveedor_id
 * Obtiene el estado de cuenta de un proveedor
 */
router.get('/estado-cuenta/:entidad_proveedor_id', authMiddleware, async (req, res, next) => {
  try {
    const { entidad_proveedor_id } = req.params;
    const estado = await CxpModel.obtenerEstadoCuenta(entidad_proveedor_id);
    res.json({ exito: true, datos: estado });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cxp/antiguedad/:entidad_proveedor_id
 * Antigüedad de saldos
 */
router.get('/antiguedad/:entidad_proveedor_id', authMiddleware, async (req, res, next) => {
  try {
    const { entidad_proveedor_id } = req.params;
    const antiguedad = await CxpModel.obtenerAntiguedad(entidad_proveedor_id);
    res.json({ exito: true, datos: antiguedad });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cxp/movimientos
 * Listar facturas de compra pendientes
 */
router.get('/movimientos', authMiddleware, async (req, res, next) => {
  try {
    const { entidad_proveedor_id } = req.query;
    let query = `
      SELECT id, folio, total, saldo_restante, estado_saldo, fecha, fecha_vencimiento,
             entidad_proveedor_id, ep.razon_social AS proveedor_nombre
      FROM transacciones t
      LEFT JOIN entidades ep ON ep.id = t.entidad_proveedor_id
      WHERE t.tipo = 'compra'
        AND t.estado = 'confirmado'
        AND t.estado_saldo IN ('pendiente', 'parcial')
    `;
    const params = [];
    let idx = 1;
    if (entidad_proveedor_id) {
      query += ` AND t.entidad_proveedor_id = $${idx}`;
      params.push(entidad_proveedor_id);
      idx++;
    }
    query += ' ORDER BY t.fecha DESC';

    const result = await require('../db').query(query, params);
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
