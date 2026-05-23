const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const pool = require('../db');

/**
 * ============================================
 * PLANTILLAS PDF - CRUD (Admin)
 * ============================================
 */

/**
 * GET /api/v1/plantillas-pdf
 * Listar todas las plantillas PDF
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM plantillas_pdf ORDER BY tipo'
    );
    res.json({ datos: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/plantillas-pdf/:id
 * Obtener una plantilla por ID
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM plantillas_pdf WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Plantilla no encontrada' });
    }
    res.json({ datos: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/plantillas-pdf/:id
 * Actualizar contenido_html y nombre de una plantilla
 */
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, contenido_html, activo } = req.body;

    if (!contenido_html) {
      return res.status(400).json({ exito: false, error: 'contenido_html es requerido' });
    }

    const result = await pool.query(
      `UPDATE plantillas_pdf
       SET nombre = COALESCE($1, nombre),
           contenido_html = $2,
           activo = COALESCE($3, activo),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nombre || null, contenido_html, activo !== undefined ? activo : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Plantilla no encontrada' });
    }

    res.json({ datos: result.rows[0], mensaje: 'Plantilla actualizada exitosamente' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/plantillas-pdf
 * Crear una nueva plantilla
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { tipo, nombre, contenido_html, activo } = req.body;

    if (!tipo || !nombre || !contenido_html) {
      return res.status(400).json({
        exito: false,
        error: 'tipo, nombre y contenido_html son requeridos',
      });
    }

    const result = await pool.query(
      `INSERT INTO plantillas_pdf (tipo, nombre, contenido_html, activo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tipo, nombre, contenido_html, activo !== false]
    );

    res.status(201).json({ datos: result.rows[0], mensaje: 'Plantilla creada exitosamente' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        exito: false,
        error: `Ya existe una plantilla con el tipo '${req.body.tipo}'`,
      });
    }
    next(err);
  }
});

module.exports = router;
