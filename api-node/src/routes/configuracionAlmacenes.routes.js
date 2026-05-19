const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const pool = require('../db');

/**
 * ============================================
 * CONFIGURACIÓN DE ALMACENES (EXTENDIDA)
 * ============================================
 */

/**
 * GET /api/v1/configuracion/almacenes
 * Listar almacenes con sus series y formatos
 */
router.get('/almacenes', authMiddleware, async (req, res) => {
  try {
    const almacenes = await pool.query(
      `SELECT a.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', sd.id, 'tipo', sd.tipo, 'serie', sd.serie,
                  'codigo', sd.codigo, 'descripcion', sd.descripcion, 'activo', sd.activo
                )) FROM series_documentos sd WHERE sd.almacen_id = a.id AND sd.activo = true),
                '[]'::json
              ) AS series,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', af.id, 'tipo_documento', af.tipo_documento,
                  'tamano_papel', af.tamano_papel, 'orientacion', af.orientacion,
                  'margen_superior', af.margen_superior, 'margen_inferior', af.margen_inferior,
                  'margen_izquierdo', af.margen_izquierdo, 'margen_derecho', af.margen_derecho
                )) FROM almacenes_formatos af WHERE af.almacen_id = a.id AND af.activo = true),
                '[]'::json
              ) AS formatos
       FROM almacenes a
       ORDER BY a.nombre`
    );
    res.json({ exito: true, datos: almacenes.rows });
  } catch (err) {
    console.error('Error al listar almacenes config:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/configuracion/almacenes/:id
 * Obtener almacén con series y formatos
 */
router.get('/almacenes/:id', authMiddleware, async (req, res) => {
  try {
    const almacen = await pool.query(
      `SELECT a.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', sd.id, 'tipo', sd.tipo, 'serie', sd.serie,
                  'codigo', sd.codigo, 'descripcion', sd.descripcion, 'activo', sd.activo
                )) FROM series_documentos sd WHERE sd.almacen_id = a.id),
                '[]'::json
              ) AS series,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', af.id, 'tipo_documento', af.tipo_documento,
                  'tamano_papel', af.tamano_papel, 'orientacion', af.orientacion,
                  'margen_superior', af.margen_superior, 'margen_inferior', af.margen_inferior,
                  'margen_izquierdo', af.margen_izquierdo, 'margen_derecho', af.margen_derecho
                )) FROM almacenes_formatos af WHERE af.almacen_id = a.id),
                '[]'::json
              ) AS formatos
       FROM almacenes a WHERE a.id = $1`,
      [req.params.id]
    );
    if (almacen.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Almacén no encontrado' });
    }
    res.json({ exito: true, datos: almacen.rows[0] });
  } catch (err) {
    console.error('Error al obtener almacén:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/configuracion/almacenes/:id
 * Actualizar almacén con series y formatos
 */
router.put('/almacenes/:id', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, ubicacion, activo, series, formatos } = req.body;

    await client.query('BEGIN');

    // Actualizar datos básicos del almacén
    const result = await client.query(
      `UPDATE almacenes SET
        nombre = COALESCE($1, nombre),
        ubicacion = COALESCE($2, ubicacion),
        activo = COALESCE($3, activo),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [nombre, ubicacion, activo, req.params.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ exito: false, error: 'Almacén no encontrado' });
    }

    // Actualizar series si se proporcionan
    if (series && Array.isArray(series)) {
      for (const s of series) {
        if (s.id) {
          await client.query(
            `UPDATE series_documentos SET
              serie = COALESCE($1, serie),
              codigo = COALESCE($2, codigo),
              descripcion = COALESCE($3, descripcion),
              activo = COALESCE($4, activo),
              updated_at = NOW()
             WHERE id = $5 AND almacen_id = $6`,
            [s.serie, s.codigo, s.descripcion, s.activo, s.id, req.params.id]
          );
        } else if (s.tipo && s.serie) {
          await client.query(
            `INSERT INTO series_documentos (tipo, serie, codigo, descripcion, almacen_id, activo)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [s.tipo, s.serie, s.codigo || null, s.descripcion || null, req.params.id, s.activo !== false]
          );
        }
      }
    }

    // Actualizar formatos si se proporcionan
    if (formatos && Array.isArray(formatos)) {
      for (const f of formatos) {
        if (f.id) {
          await client.query(
            `UPDATE almacenes_formatos SET
              tamano_papel = COALESCE($1, tamano_papel),
              orientacion = COALESCE($2, orientacion),
              margen_superior = COALESCE($3, margen_superior),
              margen_inferior = COALESCE($4, margen_inferior),
              margen_izquierdo = COALESCE($5, margen_izquierdo),
              margen_derecho = COALESCE($6, margen_derecho),
              activo = COALESCE($7, activo),
              updated_at = NOW()
             WHERE id = $8 AND almacen_id = $9`,
            [f.tamano_papel, f.orientacion, f.margen_superior, f.margen_inferior,
             f.margen_izquierdo, f.margen_derecho, f.activo, f.id, req.params.id]
          );
        } else if (f.tipo_documento) {
          await client.query(
            `INSERT INTO almacenes_formatos (almacen_id, tipo_documento, tamano_papel, orientacion,
              margen_superior, margen_inferior, margen_izquierdo, margen_derecho)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (almacen_id, tipo_documento) DO UPDATE SET
              tamano_papel = EXCLUDED.tamano_papel,
              orientacion = EXCLUDED.orientacion,
              updated_at = NOW()`,
            [req.params.id, f.tipo_documento, f.tamano_papel || 'carta',
             f.orientacion || 'vertical', f.margen_superior || 2.54,
             f.margen_inferior || 2.54, f.margen_izquierdo || 2.54, f.margen_derecho || 2.54]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Retornar almacén actualizado completo
    const updated = await pool.query(
      `SELECT a.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', sd.id, 'tipo', sd.tipo, 'serie', sd.serie,
                  'codigo', sd.codigo, 'descripcion', sd.descripcion, 'activo', sd.activo
                )) FROM series_documentos sd WHERE sd.almacen_id = a.id),
                '[]'::json
              ) AS series,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', af.id, 'tipo_documento', af.tipo_documento,
                  'tamano_papel', af.tamano_papel, 'orientacion', af.orientacion,
                  'margen_superior', af.margen_superior, 'margen_inferior', af.margen_inferior,
                  'margen_izquierdo', af.margen_izquierdo, 'margen_derecho', af.margen_derecho
                )) FROM almacenes_formatos af WHERE af.almacen_id = a.id),
                '[]'::json
              ) AS formatos
       FROM almacenes a WHERE a.id = $1`,
      [req.params.id]
    );
    res.json({ exito: true, datos: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar almacén config:', err);
    res.status(500).json({ exito: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/v1/configuracion/almacenes/:id
 * Soft delete de almacén
 */
router.delete('/almacenes/:id', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE almacenes SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Almacén no encontrado' });
    }
    res.json({ exito: true, mensaje: 'Almacén desactivado', datos: result.rows[0] });
  } catch (err) {
    console.error('Error al desactivar almacén:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
