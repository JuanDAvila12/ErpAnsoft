/**
 * Rutas para el registro y consulta de log de errores
 * POST /api/v1/log-errores - Registrar un error (protegido)
 * GET  /api/v1/log-errores - Consultar errores (solo admin)
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { auditLog } = require('../utils/auditContext');

/**
 * POST /api/v1/log-errores
 * Registra un error desde el frontend
 * Protegido: cualquier usuario autenticado puede registrar errores
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { codigo, mensaje, modulo, detalle, usuario_id: bodyUsuarioId } = req.body;
    // Priorizar usuario_id del body, si no, del JWT
    const usuario_id = bodyUsuarioId || req.usuario?.id || null;
    const ruta = req.body.ruta || req.headers.referer || '';
    const ip = req.ip || req.connection?.remoteAddress || '';

    if (!codigo || !mensaje) {
      return res.status(400).json({
        codigo: 'SYS-003',
        mensaje: 'Código y mensaje son requeridos',
        modulo: 'Sistema',
        detalle: 'Los campos codigo y mensaje son obligatorios para registrar un error',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await pool.query(
      `INSERT INTO log_errores (codigo, mensaje, modulo, detalle, usuario_id, ruta, ip, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [codigo, mensaje, modulo || 'Sistema', detalle || null, usuario_id, ruta, ip]
    );

    res.status(201).json({
      datos: result.rows[0],
      mensaje: 'Error registrado exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/log-errores
 * Consulta todos los errores registrados (solo admin)
 * Filtros: fecha_desde, fecha_hasta, modulo, codigo
 */
router.get('/', authMiddleware, checkPermission('admin.configurar'), async (req, res, next) => {
  try {
    const { fecha_desde, fecha_hasta, modulo, codigo, limite = 100, pagina = 1 } = req.query;
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    let query = `
      SELECT le.*, u.nombre AS usuario_nombre
      FROM log_errores le
      LEFT JOIN usuarios u ON u.id = le.usuario_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (fecha_desde) {
      query += ` AND le.fecha >= $${paramIndex++}`;
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND le.fecha <= $${paramIndex++}`;
      params.push(fecha_hasta);
    }
    if (modulo) {
      query += ` AND le.modulo ILIKE $${paramIndex++}`;
      params.push(`%${modulo}%`);
    }
    if (codigo) {
      query += ` AND le.codigo ILIKE $${paramIndex++}`;
      params.push(`%${codigo}%`);
    }

    // Query count
    const countResult = await pool.query(
      query.replace(/SELECT le\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM'),
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);

    query += ` ORDER BY le.fecha DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limite), offset);

    const result = await pool.query(query, params);

    res.json({
      datos: result.rows,
      total,
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      total_paginas: Math.ceil(total / parseInt(limite)),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
