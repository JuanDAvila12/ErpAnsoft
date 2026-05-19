const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const pool = require('../db');

/**
 * ============================================
 * REPORTES CONFIGURABLES
 * ============================================
 */

/**
 * GET /api/v1/reportes-configuracion
 * Listar reportes configurados
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { modulo, activo } = req.query;
    let query = `
      SELECT rc.*, u.nombre AS creador_nombre
      FROM reportes_configuracion rc
      LEFT JOIN usuarios u ON u.id = rc.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (modulo) {
      query += ` AND rc.modulo = $${idx}`;
      params.push(modulo);
      idx++;
    }
    if (activo !== undefined) {
      query += ` AND rc.activo = $${idx}`;
      params.push(activo === 'true');
      idx++;
    }

    query += ' ORDER BY rc.modulo, rc.nombre';
    const result = await pool.query(query, params);
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al listar reportes:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/reportes-configuracion/:id
 * Obtener un reporte por ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rc.*, u.nombre AS creador_nombre
       FROM reportes_configuracion rc
       LEFT JOIN usuarios u ON u.id = rc.created_by
       WHERE rc.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Reporte no encontrado' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener reporte:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/reportes-configuracion
 * Crear un nuevo reporte configurable
 */
router.post('/', authMiddleware, checkPermission('reportes.editar'), async (req, res) => {
  try {
    const { nombre, descripcion, modulo, consulta_sql, parametros, columnas } = req.body;

    if (!nombre || !consulta_sql) {
      return res.status(400).json({ exito: false, error: 'nombre y consulta_sql son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO reportes_configuracion (nombre, descripcion, modulo, consulta_sql, parametros, columnas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, descripcion || null, modulo || 'general', consulta_sql,
       JSON.stringify(parametros || []), JSON.stringify(columnas || []),
       req.usuario?.id || null]
    );
    res.status(201).json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al crear reporte:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/reportes-configuracion/:id
 * Actualizar un reporte configurable
 */
router.put('/:id', authMiddleware, checkPermission('reportes.editar'), async (req, res) => {
  try {
    const { nombre, descripcion, modulo, consulta_sql, parametros, columnas, activo } = req.body;

    const result = await pool.query(
      `UPDATE reportes_configuracion SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        modulo = COALESCE($3, modulo),
        consulta_sql = COALESCE($4, consulta_sql),
        parametros = COALESCE($5, parametros),
        columnas = COALESCE($6, columnas),
        activo = COALESCE($7, activo),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [nombre, descripcion, modulo, consulta_sql,
       parametros ? JSON.stringify(parametros) : null,
       columnas ? JSON.stringify(columnas) : null,
       activo, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Reporte no encontrado' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar reporte:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/reportes-configuracion/:id
 * Eliminar un reporte configurable
 */
router.delete('/:id', authMiddleware, checkPermission('reportes.editar'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM reportes_configuracion WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Reporte no encontrado' });
    }
    res.json({ exito: true, mensaje: 'Reporte eliminado' });
  } catch (err) {
    console.error('Error al eliminar reporte:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/reportes-configuracion/:id/ejecutar
 * Ejecutar un reporte y devolver resultados
 */
router.post('/:id/ejecutar', authMiddleware, checkPermission('reportes.ejecutar'), async (req, res) => {
  try {
    // Obtener el reporte
    const reporteResult = await pool.query(
      'SELECT * FROM reportes_configuracion WHERE id = $1 AND activo = true',
      [req.params.id]
    );
    if (reporteResult.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Reporte no encontrado o inactivo' });
    }
    const reporte = reporteResult.rows[0];

    // Reemplazar parámetros en la consulta SQL
    let sql = reporte.consulta_sql;
    const parametros = reporte.parametros || [];
    const valoresParams = req.body.parametros || {};
    const queryParams = [];

    for (const param of parametros) {
      const nombre = param.nombre || param;
      const valor = valoresParams[nombre];
      if (valor !== undefined && valor !== null) {
        // Reemplazar :nombre por $1, $2, etc.
        const idx = queryParams.length + 1;
        sql = sql.replace(new RegExp(`:${nombre}`, 'g'), `$${idx}`);
        queryParams.push(valor);
      }
    }

    // Ejecutar la consulta
    const result = await pool.query(sql, queryParams);
    res.json({
      exito: true,
      datos: result.rows,
      columnas: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      total: result.rows.length,
    });
  } catch (err) {
    console.error('Error al ejecutar reporte:', err);
    res.status(500).json({ exito: false, error: `Error al ejecutar consulta: ${err.message}` });
  }
});

/**
 * POST /api/v1/reportes-configuracion/:id/duplicar
 * Duplicar un reporte
 */
router.post('/:id/duplicar', authMiddleware, checkPermission('reportes.editar'), async (req, res) => {
  try {
    const original = await pool.query(
      'SELECT * FROM reportes_configuracion WHERE id = $1',
      [req.params.id]
    );
    if (original.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Reporte no encontrado' });
    }
    const o = original.rows[0];
    const result = await pool.query(
      `INSERT INTO reportes_configuracion (nombre, descripcion, modulo, consulta_sql, parametros, columnas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [`${o.nombre} (copia)`, o.descripcion, o.modulo, o.consulta_sql, o.parametros, o.columnas, req.usuario?.id || null]
    );
    res.status(201).json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al duplicar reporte:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
