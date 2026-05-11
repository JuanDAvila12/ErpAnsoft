const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission, refrescarPermisos } = require('../middleware/permissions');

/**
 * GET /api/v1/permisos
 * Lista todos los permisos del sistema (solo admin)
 */
router.get('/', authMiddleware, checkPermission('admin.roles'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
              COALESCE(
                json_agg(
                  json_build_object('rol_id', r.id, 'rol_nombre', r.nombre)
                ) FILTER (WHERE r.id IS NOT NULL),
                '[]'::json
              ) AS roles_asignados
       FROM permisos p
       LEFT JOIN rol_permisos rp ON rp.permiso_id = p.id
       LEFT JOIN roles r ON r.id = rp.rol_id
       GROUP BY p.id
       ORDER BY p.modulo, p.codigo`
    );

    res.json({ datos: result.rows });
  } catch (err) {
    console.error('[Permisos] Error al listar:', err);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
});

/**
 * GET /api/v1/permisos/roles
 * Lista todos los roles con sus permisos (solo admin)
 */
router.get('/roles', authMiddleware, checkPermission('admin.roles'), async (req, res) => {
  try {
    const rolesResult = await pool.query(
      `SELECT r.*, 
              COALESCE(
                json_agg(
                  json_build_object('id', p.id, 'codigo', p.codigo, 'modulo', p.modulo)
                ) FILTER (WHERE p.id IS NOT NULL),
                '[]'::json
              ) AS permisos
       FROM roles r
       LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
       LEFT JOIN permisos p ON p.id = rp.permiso_id
       GROUP BY r.id
       ORDER BY r.nombre`
    );

    // Obtener todos los permisos para referencia
    const permisosResult = await pool.query(
      'SELECT * FROM permisos ORDER BY modulo, codigo'
    );

    res.json({
      roles: rolesResult.rows,
      permisos: permisosResult.rows,
    });
  } catch (err) {
    console.error('[Permisos] Error al listar roles:', err);
    res.status(500).json({ error: 'Error al obtener roles y permisos' });
  }
});

/**
 * PUT /api/v1/permisos/roles/:rolId/permisos
 * Actualiza los permisos de un rol (solo admin)
 * Body: { permisos: [1, 2, 3] } (array de IDs de permisos)
 */
router.put('/roles/:rolId/permisos', authMiddleware, checkPermission('admin.roles'), async (req, res) => {
  try {
    const { rolId } = req.params;
    const { permisos } = req.body; // Array de IDs de permisos

    if (!Array.isArray(permisos)) {
      return res.status(400).json({ error: 'permisos debe ser un array de IDs' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Eliminar permisos actuales del rol
      await client.query('DELETE FROM rol_permisos WHERE rol_id = $1', [rolId]);

      // Insertar nuevos permisos
      for (const permisoId of permisos) {
        await client.query(
          'INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [rolId, permisoId]
        );
      }

      await client.query('COMMIT');

      // Refrescar cache de permisos
      await refrescarPermisos();

      res.json({ mensaje: 'Permisos actualizados exitosamente' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Permisos] Error al actualizar permisos:', err);
    res.status(500).json({ error: 'Error al actualizar permisos' });
  }
});

/**
 * POST /api/v1/permisos
 * Crea un nuevo permiso (solo admin)
 */
router.post('/', authMiddleware, checkPermission('admin.roles'), async (req, res) => {
  try {
    const { codigo, descripcion, modulo } = req.body;

    if (!codigo || !modulo) {
      return res.status(400).json({ error: 'codigo y modulo son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO permisos (codigo, descripcion, modulo) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [codigo, descripcion, modulo]
    );

    await refrescarPermisos();

    res.status(201).json({ datos: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El código de permiso ya existe' });
    }
    console.error('[Permisos] Error al crear:', err);
    res.status(500).json({ error: 'Error al crear permiso' });
  }
});

/**
 * GET /api/v1/permisos/verificar/:codigo
 * Verifica si el usuario actual tiene un permiso específico
 */
router.get('/verificar/:codigo', authMiddleware, async (req, res) => {
  try {
    const { codigo } = req.params;
    const { checkPermission } = require('../middleware/permissions');

    if (!req.usuario || !req.usuario.rol_id) {
      return res.json({ tienePermiso: false });
    }

    const result = await pool.query(
      `SELECT COUNT(*) AS tiene
       FROM rol_permisos rp
       JOIN permisos p ON p.id = rp.permiso_id
       WHERE rp.rol_id = $1 AND p.codigo = $2`,
      [req.usuario.rol_id, codigo]
    );

    res.json({
      permiso: codigo,
      tienePermiso: parseInt(result.rows[0].tiene) > 0,
    });
  } catch (err) {
    console.error('[Permisos] Error al verificar:', err);
    res.status(500).json({ error: 'Error al verificar permiso' });
  }
});

module.exports = router;
