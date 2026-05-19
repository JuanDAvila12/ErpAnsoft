const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const pool = require('../db');

/**
 * ============================================
 * CONFIGURACIÓN DE EMPRESA
 * ============================================
 */

/**
 * GET /api/v1/configuracion/empresa
 * Obtener configuración de la empresa (datos generales + fiscales)
 */
router.get('/empresa', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  try {
    // Obtener de empresa_configuracion
    const empResult = await pool.query('SELECT * FROM empresa_configuracion ORDER BY id DESC LIMIT 1');
    const empresa = empResult.rows[0] || {};

    // Obtener configuraciones adicionales del sistema
    const cfgResult = await pool.query(
      "SELECT clave, valor FROM configuracion_sistema WHERE activo = true"
    );
    const configMap = {};
    for (const row of cfgResult.rows) {
      configMap[row.clave] = row.valor;
    }

    res.json({
      exito: true,
      datos: {
        ...empresa,
        ...configMap,
      }
    });
  } catch (err) {
    console.error('Error al obtener configuración empresa:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/configuracion/empresa
 * Actualizar configuración de la empresa
 */
router.put('/empresa', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      razon_social, nombre_comercial, rfc, regimen_fiscal,
      direccion, cp, telefono, email, lugar_expedicion,
      logo_url, certificado_cer, certificado_key, certificado_password,
      pie_pagina, terminos_legales
    } = req.body;

    await client.query('BEGIN');

    // Actualizar empresa_configuracion
    const existing = await client.query('SELECT id FROM empresa_configuracion LIMIT 1');
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE empresa_configuracion SET
          razon_social = COALESCE($1, razon_social),
          nombre_comercial = COALESCE($2, nombre_comercial),
          rfc = COALESCE($3, rfc),
          regimen_fiscal = COALESCE($4, regimen_fiscal),
          direccion = COALESCE($5, direccion),
          cp = COALESCE($6, cp),
          telefono = COALESCE($7, telefono),
          email = COALESCE($8, email),
          lugar_expedicion = COALESCE($9, lugar_expedicion),
          logo_url = COALESCE($10, logo_url),
          certificado_cer = COALESCE($11, certificado_cer),
          certificado_key = COALESCE($12, certificado_key),
          certificado_password = COALESCE($13, certificado_password),
          pie_pagina = COALESCE($14, pie_pagina),
          terminos_legales = COALESCE($15, terminos_legales),
          updated_at = NOW()
        WHERE id = $16`,
        [razon_social, nombre_comercial, rfc, regimen_fiscal,
         direccion, cp, telefono, email, lugar_expedicion,
         logo_url, certificado_cer, certificado_key, certificado_password,
         pie_pagina, terminos_legales, existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO empresa_configuracion
          (razon_social, nombre_comercial, rfc, regimen_fiscal, direccion, cp,
           telefono, email, lugar_expedicion, logo_url, certificado_cer,
           certificado_key, certificado_password, pie_pagina, terminos_legales)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [razon_social, nombre_comercial, rfc, regimen_fiscal,
         direccion, cp, telefono, email, lugar_expedicion,
         logo_url, certificado_cer, certificado_key, certificado_password,
         pie_pagina, terminos_legales]
      );
    }

    // También actualizar configuracion_sistema para compatibilidad
    const configMappings = {
      empresa_nombre: razon_social,
      empresa_rfc: rfc,
      empresa_regimen_fiscal: regimen_fiscal,
      empresa_cp: cp,
      empresa_direccion: direccion,
      lugar_expedicion: lugar_expedicion,
      certificado_sat_archivo: certificado_cer,
      certificado_sat_key: certificado_key,
      certificado_sat_password: certificado_password,
    };

    for (const [clave, valor] of Object.entries(configMappings)) {
      if (valor !== undefined && valor !== null) {
        await client.query(
          `UPDATE configuracion_sistema SET valor = $1, updated_at = NOW() WHERE clave = $2`,
          [valor, clave]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ exito: true, mensaje: 'Configuración actualizada exitosamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar configuración empresa:', err);
    res.status(500).json({ exito: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * ============================================
 * CONFIGURACIÓN GENERAL DEL SISTEMA
 * ============================================
 */

/**
 * GET /api/v1/configuracion/sistema
 * Obtener todas las configuraciones del sistema
 */
router.get('/sistema', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT clave, valor, descripcion, tipo_dato FROM configuracion_sistema WHERE activo = true ORDER BY clave'
    );
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al obtener configuraciones:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/configuracion/sistema
 * Actualizar configuraciones del sistema (batch)
 */
router.put('/sistema', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  try {
    const { configuraciones } = req.body;
    if (!configuraciones || !Array.isArray(configuraciones)) {
      return res.status(400).json({ exito: false, error: 'configuraciones debe ser un array de {clave, valor}' });
    }

    for (const cfg of configuraciones) {
      if (cfg.clave) {
        await pool.query(
          `UPDATE configuracion_sistema SET valor = $1, updated_at = NOW() WHERE clave = $2`,
          [cfg.valor, cfg.clave]
        );
      }
    }

    res.json({ exito: true, mensaje: 'Configuraciones actualizadas' });
  } catch (err) {
    console.error('Error al actualizar configuraciones:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * ============================================
 * SERIES DE DOCUMENTOS
 * ============================================
 */

/**
 * GET /api/v1/configuracion/series
 * Listar todas las series de documentos
 */
router.get('/series', authMiddleware, async (req, res) => {
  try {
    const { tipo } = req.query;
    let query = 'SELECT * FROM series_documentos WHERE activo = true';
    const params = [];
    if (tipo) {
      query += ' AND tipo = $1';
      params.push(tipo);
    }
    query += ' ORDER BY tipo, serie';
    const result = await pool.query(query, params);
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al listar series:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/configuracion/series
 * Crear nueva serie de documento
 */
router.post('/series', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  try {
    const { tipo, serie, codigo, descripcion } = req.body;
    if (!tipo || !serie) {
      return res.status(400).json({ exito: false, error: 'tipo y serie son requeridos' });
    }
    const result = await pool.query(
      `INSERT INTO series_documentos (tipo, serie, codigo, descripcion)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tipo, serie, codigo || null, descripcion || null]
    );
    res.status(201).json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ exito: false, error: 'La serie ya existe para este tipo' });
    }
    console.error('Error al crear serie:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/configuracion/series/:id
 * Actualizar serie de documento
 */
router.put('/series/:id', authMiddleware, checkPermission('admin.configurar'), async (req, res) => {
  try {
    const { serie, codigo, descripcion, activo } = req.body;
    const result = await pool.query(
      `UPDATE series_documentos SET
        serie = COALESCE($1, serie),
        codigo = COALESCE($2, codigo),
        descripcion = COALESCE($3, descripcion),
        activo = COALESCE($4, activo)
       WHERE id = $5 RETURNING *`,
      [serie, codigo, descripcion, activo, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Serie no encontrada' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar serie:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
