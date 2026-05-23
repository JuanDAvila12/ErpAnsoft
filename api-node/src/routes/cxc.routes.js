const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const CxcModel = require('../models/cxc.model');

/**
 * GET /api/v1/cxc/estado-cuenta/:entidad_cliente_id
 * Obtiene el estado de cuenta de un cliente (facturas pendientes + cobros)
 */
router.get('/estado-cuenta/:entidad_cliente_id', authMiddleware, async (req, res, next) => {
  try {
    const { entidad_cliente_id } = req.params;
    const estado = await CxcModel.obtenerEstadoCuenta(entidad_cliente_id);
    res.json({ exito: true, datos: estado });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cxc/antiguedad/:entidad_cliente_id
 * Obtiene antigüedad de saldos del cliente
 */
router.get('/antiguedad/:entidad_cliente_id', authMiddleware, async (req, res, next) => {
  try {
    const { entidad_cliente_id } = req.params;
    const antiguedad = await CxcModel.obtenerAntiguedad(entidad_cliente_id);
    res.json({ exito: true, datos: antiguedad });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cxc/movimientos
 * Listar facturas pendientes (para seleccionar al registrar cobro)
 */
router.get('/movimientos', authMiddleware, async (req, res, next) => {
  try {
    const { entidad_cliente_id } = req.query;
    let query = `
      SELECT id, folio, total, saldo_restante, estado_saldo, fecha, fecha_vencimiento,
             entidad_cliente_id, ec.razon_social AS cliente_nombre
      FROM transacciones t
      LEFT JOIN entidades ec ON ec.id = t.entidad_cliente_id
      WHERE t.tipo = 'venta'
        AND t.estado = 'confirmado'
        AND t.estado_saldo IN ('pendiente', 'parcial')
    `;
    const params = [];
    let idx = 1;
    if (entidad_cliente_id) {
      query += ` AND t.entidad_cliente_id = $${idx}`;
      params.push(entidad_cliente_id);
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
