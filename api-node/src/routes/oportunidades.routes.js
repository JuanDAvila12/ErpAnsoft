const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const pool = require('../db');

/**
 * ============================================
 * CRM - Oportunidades CRUD
 * ============================================
 */

/**
 * GET /api/v1/oportunidades
 * Listar oportunidades con filtros
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { etapa, entidad_id, vendedor_entidad_id, search } = req.query;
    let query = `
      SELECT o.*, e.razon_social AS entidad_nombre, e.rfc AS entidad_rfc,
             v.razon_social AS vendedor_nombre
      FROM oportunidades o
      LEFT JOIN entidades e ON e.id = o.entidad_id
      LEFT JOIN entidades v ON v.id = o.vendedor_entidad_id
      WHERE o.activo = true
    `;
    const params = [];
    let idx = 1;

    if (etapa) {
      query += ` AND o.etapa = $${idx}`;
      params.push(etapa);
      idx++;
    }
    if (entidad_id) {
      query += ` AND o.entidad_id = $${idx}`;
      params.push(entidad_id);
      idx++;
    }
    if (vendedor_entidad_id) {
      query += ` AND o.vendedor_entidad_id = $${idx}`;
      params.push(vendedor_entidad_id);
      idx++;
    }
    if (search) {
      query += ` AND (o.nombre ILIKE $${idx} OR e.razon_social ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al listar oportunidades:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/oportunidades/:id
 * Obtener oportunidad por ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, e.razon_social AS entidad_nombre, e.rfc AS entidad_rfc,
              v.razon_social AS vendedor_nombre
       FROM oportunidades o
       LEFT JOIN entidades e ON e.id = o.entidad_id
       LEFT JOIN entidades v ON v.id = o.vendedor_entidad_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Oportunidad no encontrada' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener oportunidad:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/oportunidades
 * Crear nueva oportunidad
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { entidad_id, nombre, monto_estimado, probabilidad, etapa, fecha_cierre, vendedor_entidad_id, descripcion } = req.body;

    if (!entidad_id || !nombre) {
      return res.status(400).json({ exito: false, error: 'entidad_id y nombre son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO oportunidades (entidad_id, nombre, monto_estimado, probabilidad, etapa, fecha_cierre, vendedor_entidad_id, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [entidad_id, nombre, monto_estimado || 0, probabilidad || 0, etapa || 'nuevo', fecha_cierre || null, vendedor_entidad_id || null, descripcion || null]
    );
    res.status(201).json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al crear oportunidad:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/oportunidades/:id
 * Actualizar oportunidad
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { nombre, monto_estimado, probabilidad, etapa, fecha_cierre, vendedor_entidad_id, descripcion, activo } = req.body;

    const result = await pool.query(
      `UPDATE oportunidades
       SET nombre = COALESCE($1, nombre),
           monto_estimado = COALESCE($2, monto_estimado),
           probabilidad = COALESCE($3, probabilidad),
           etapa = COALESCE($4, etapa),
           fecha_cierre = COALESCE($5, fecha_cierre),
           vendedor_entidad_id = COALESCE($6, vendedor_entidad_id),
           descripcion = COALESCE($7, descripcion),
           activo = COALESCE($8, activo),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [nombre, monto_estimado, probabilidad, etapa, fecha_cierre, vendedor_entidad_id, descripcion, activo, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Oportunidad no encontrada' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar oportunidad:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/oportunidades/:id
 * Eliminar (desactivar) oportunidad
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE oportunidades SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Oportunidad no encontrada' });
    }
    res.json({ exito: true, mensaje: 'Oportunidad eliminada', datos: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar oportunidad:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
