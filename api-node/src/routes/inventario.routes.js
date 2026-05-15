const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const pool = require('../db');
const ReportesModel = require('../models/reportes.model');

/**
 * ============================================
 * ALMACENES
 * ============================================
 */

/**
 * GET /api/v1/inventario/almacenes
 * Listar todos los almacenes.
 */
router.get('/almacenes', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM almacenes ORDER BY nombre'
    );
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al listar almacenes:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/inventario/almacenes/:id
 * Obtener un almacén por ID.
 */
router.get('/almacenes/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM almacenes WHERE id = $1', [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Almacén no encontrado' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener almacén:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/inventario/almacenes
 * Crear un nuevo almacén.
 */
router.post('/almacenes', verificarToken, async (req, res) => {
  try {
    const { nombre, ubicacion, activo } = req.body;
    if (!nombre) {
      return res.status(400).json({ exito: false, error: 'El nombre es requerido' });
    }
    const result = await pool.query(
      `INSERT INTO almacenes (nombre, ubicacion, activo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, ubicacion || null, activo !== false]
    );
    res.status(201).json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al crear almacén:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/inventario/almacenes/:id
 * Actualizar un almacén.
 */
router.put('/almacenes/:id', verificarToken, async (req, res) => {
  try {
    const { nombre, ubicacion, activo } = req.body;
    const result = await pool.query(
      `UPDATE almacenes
       SET nombre = COALESCE($1, nombre),
           ubicacion = COALESCE($2, ubicacion),
           activo = COALESCE($3, activo),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nombre, ubicacion, activo, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Almacén no encontrado' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar almacén:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * ============================================
 * ENTIDADES (Clientes / Proveedores)
 * ============================================
 */

/**
 * GET /api/v1/entidades
 * Listar entidades con filtros opcionales.
 * Query params: rol, search, activo
 */
router.get('/entidades', verificarToken, async (req, res) => {
  try {
    const { rol, search, activo } = req.query;
    let query = `
      SELECT DISTINCT e.id, e.razon_social, e.nombre_comercial, e.rfc,
             e.regimen_fiscal, e.email, e.telefono, e.contacto_nombre,
             e.direccion, e.cp, e.pais_id, e.activo, e.created_at,
             (SELECT json_agg(er.rol) FROM entidad_roles er WHERE er.entidad_id = e.id) AS roles
      FROM entidades e
      LEFT JOIN entidad_roles er ON er.entidad_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (rol) {
      query += ` AND er.rol = $${idx}::entidad_rol_enum`;
      params.push(rol);
      idx++;
    }
    if (search) {
      query += ` AND (e.razon_social ILIKE $${idx} OR e.rfc ILIKE $${idx} OR e.nombre_comercial ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (activo !== undefined) {
      query += ` AND e.activo = $${idx}`;
      params.push(activo === 'true');
      idx++;
    }

    query += ' ORDER BY e.razon_social';

    const result = await pool.query(query, params);
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al listar entidades:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/entidades/:id
 * Obtener entidad por ID.
 */
router.get('/entidades/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*,
              (SELECT json_agg(er.rol) FROM entidad_roles er WHERE er.entidad_id = e.id) AS roles
       FROM entidades e WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Entidad no encontrada' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener entidad:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/entidades
 * Crear una nueva entidad con sus roles.
 */
router.post('/entidades', verificarToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razon_social, nombre_comercial, rfc, email, telefono,
            contacto_nombre, regimen_fiscal, direccion, cp, pais_id,
            activo, roles } = req.body;

    if (!razon_social || !rfc) {
      return res.status(400).json({ exito: false, error: 'Razón social y RFC son requeridos' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO entidades (razon_social, nombre_comercial, rfc, email, telefono,
        contacto_nombre, regimen_fiscal, direccion, cp, pais_id, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [razon_social, nombre_comercial || null, rfc, email || null, telefono || null,
       contacto_nombre || null, regimen_fiscal || '601', direccion || null,
       cp || null, pais_id || null, activo !== false]
    );
    const entidad = result.rows[0];

    // Insertar roles
    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (const rol of roles) {
        await client.query(
          `INSERT INTO entidad_roles (entidad_id, rol) VALUES ($1, $2::entidad_rol_enum)
           ON CONFLICT (entidad_id, rol) DO NOTHING`,
          [entidad.id, rol]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ exito: true, datos: entidad });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear entidad:', err);
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ exito: false, error: 'El RFC ya existe' });
    }
    res.status(500).json({ exito: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/v1/entidades/:id
 * Actualizar entidad y sus roles.
 */
router.put('/entidades/:id', verificarToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razon_social, nombre_comercial, rfc, email, telefono,
            contacto_nombre, regimen_fiscal, direccion, cp, pais_id,
            activo, roles } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE entidades
       SET razon_social = COALESCE($1, razon_social),
           nombre_comercial = COALESCE($2, nombre_comercial),
           rfc = COALESCE($3, rfc),
           email = COALESCE($4, email),
           telefono = COALESCE($5, telefono),
           contacto_nombre = COALESCE($6, contacto_nombre),
           regimen_fiscal = COALESCE($7, regimen_fiscal),
           direccion = COALESCE($8, direccion),
           cp = COALESCE($9, cp),
           pais_id = COALESCE($10, pais_id),
           activo = COALESCE($11, activo),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [razon_social, nombre_comercial, rfc, email, telefono,
       contacto_nombre, regimen_fiscal, direccion, cp, pais_id,
       activo, req.params.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ exito: false, error: 'Entidad no encontrada' });
    }

    // Actualizar roles si se especifican
    if (roles && Array.isArray(roles)) {
      await client.query('DELETE FROM entidad_roles WHERE entidad_id = $1', [req.params.id]);
      for (const rol of roles) {
        await client.query(
          `INSERT INTO entidad_roles (entidad_id, rol) VALUES ($1, $2::entidad_rol_enum)
           ON CONFLICT (entidad_id, rol) DO NOTHING`,
          [req.params.id, rol]
        );
      }
    }

    await client.query('COMMIT');

    // Retornar entidad actualizada con roles
    const entidadFinal = await client.query(
      `SELECT e.*,
              (SELECT json_agg(er.rol) FROM entidad_roles er WHERE er.entidad_id = e.id) AS roles
       FROM entidades e WHERE e.id = $1`,
      [req.params.id]
    );

    res.json({ exito: true, datos: entidadFinal.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar entidad:', err);
    res.status(500).json({ exito: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * ============================================
 * ARTÍCULOS (Catálogo completo)
 * ============================================
 */

/**
 * GET /api/v1/articulos
 * Listar artículos con filtros opcionales.
 */
router.get('/articulos', verificarToken, async (req, res) => {
  try {
    const { search, categoria_id, marca_id, activo, limite } = req.query;
    let query = `
      SELECT a.*, um.nombre AS unidad_medida_nombre, um.clave_sat AS unidad_clave_sat,
             c.nombre AS categoria_nombre, m.nombre AS marca_nombre,
             imp.tasa AS impuesto_tasa, imp.nombre AS impuesto_nombre
      FROM articulos a
      LEFT JOIN unidades_medida um ON um.id = a.unidad_medida_id
      LEFT JOIN categorias_producto c ON c.id = a.categoria_id
      LEFT JOIN marcas m ON m.id = a.marca_id
      LEFT JOIN impuestos imp ON imp.id = a.impuesto_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND (a.nombre ILIKE $${idx} OR a.sku ILIKE $${idx} OR a.codigo_barras ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (categoria_id) {
      query += ` AND a.categoria_id = $${idx}`;
      params.push(categoria_id);
      idx++;
    }
    if (marca_id) {
      query += ` AND a.marca_id = $${idx}`;
      params.push(marca_id);
      idx++;
    }

    query += ' ORDER BY a.nombre';

    if (limite) {
      query += ` LIMIT $${idx}`;
      params.push(parseInt(limite));
    }

    const result = await pool.query(query, params);
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al listar artículos:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/articulos/:id
 * Obtener artículo por ID.
 */
router.get('/articulos/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, um.nombre AS unidad_medida_nombre, um.clave_sat AS unidad_clave_sat,
              c.nombre AS categoria_nombre, m.nombre AS marca_nombre,
              imp.tasa AS impuesto_tasa, imp.nombre AS impuesto_nombre
       FROM articulos a
       LEFT JOIN unidades_medida um ON um.id = a.unidad_medida_id
       LEFT JOIN categorias_producto c ON c.id = a.categoria_id
       LEFT JOIN marcas m ON m.id = a.marca_id
       LEFT JOIN impuestos imp ON imp.id = a.impuesto_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Artículo no encontrado' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener artículo:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * POST /api/v1/articulos
 * Crear un nuevo artículo.
 */
router.post('/articulos', verificarToken, async (req, res) => {
  try {
    const {
      sku, nombre, precio_venta, costo_promedio, clave_sat,
      unidad_medida_id, categoria_id, marca_id, codigo_barras,
      usa_serie, impuesto_id, stock_minimo, activo
    } = req.body;

    if (!sku || !nombre) {
      return res.status(400).json({ exito: false, error: 'SKU y nombre son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO articulos (sku, nombre, precio_venta, costo_promedio, clave_sat,
        unidad_medida_id, categoria_id, marca_id, codigo_barras,
        usa_serie, impuesto_id, stock_minimo, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        sku, nombre, precio_venta || 0, costo_promedio || 0,
        clave_sat || null, unidad_medida_id || null, categoria_id || null,
        marca_id || null, codigo_barras || null, usa_serie || false,
        impuesto_id || null, stock_minimo || 0, activo !== false
      ]
    );
    res.status(201).json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al crear artículo:', err);
    if (err.code === '23505') {
      return res.status(400).json({ exito: false, error: 'El SKU ya existe' });
    }
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * PUT /api/v1/articulos/:id
 * Actualizar un artículo.
 */
router.put('/articulos/:id', verificarToken, async (req, res) => {
  try {
    const {
      sku, nombre, precio_venta, costo_promedio, clave_sat,
      unidad_medida_id, categoria_id, marca_id, codigo_barras,
      usa_serie, impuesto_id, stock_minimo, activo
    } = req.body;

    const result = await pool.query(
      `UPDATE articulos
       SET sku = COALESCE($1, sku),
           nombre = COALESCE($2, nombre),
           precio_venta = COALESCE($3, precio_venta),
           costo_promedio = COALESCE($4, costo_promedio),
           clave_sat = COALESCE($5, clave_sat),
           unidad_medida_id = COALESCE($6, unidad_medida_id),
           categoria_id = COALESCE($7, categoria_id),
           marca_id = COALESCE($8, marca_id),
           codigo_barras = COALESCE($9, codigo_barras),
           usa_serie = COALESCE($10, usa_serie),
           impuesto_id = COALESCE($11, impuesto_id),
           stock_minimo = COALESCE($12, stock_minimo),
           activo = COALESCE($13, activo)
       WHERE id = $14
       RETURNING *`,
      [
        sku, nombre, precio_venta, costo_promedio, clave_sat,
        unidad_medida_id, categoria_id, marca_id, codigo_barras,
        usa_serie, impuesto_id, stock_minimo, activo, req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Artículo no encontrado' });
    }
    res.json({ exito: true, datos: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar artículo:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * ============================================
 * REPORTES DE INVENTARIO
 * ============================================
 */

/**
 * GET /api/v1/inventario/stock
 * Stock actual por artículo/almacén.
 */
router.get('/stock', verificarToken, async (req, res) => {
  try {
    const { almacen_id, articulo_id } = req.query;
    const datos = await ReportesModel.stockActual({
      almacen_id: almacen_id ? parseInt(almacen_id) : undefined,
      articulo_id: articulo_id ? parseInt(articulo_id) : undefined,
    });
    res.json({ exito: true, datos });
  } catch (err) {
    console.error('Error en stock actual:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/inventario/movimientos
 * Movimientos de inventario con filtros.
 */
router.get('/movimientos', verificarToken, async (req, res) => {
  try {
    const { articulo_id, almacen_id, fecha_desde, fecha_hasta, tipo_movimiento, limite } = req.query;
    const datos = await ReportesModel.movimientos({
      articulo_id: articulo_id ? parseInt(articulo_id) : undefined,
      almacen_id: almacen_id ? parseInt(almacen_id) : undefined,
      fecha_desde,
      fecha_hasta,
      tipo_movimiento,
      limite: limite ? parseInt(limite) : 100,
    });
    res.json({ exito: true, datos });
  } catch (err) {
    console.error('Error en movimientos:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/inventario/serie/:numero_serie
 * Trazabilidad de un número de serie.
 */
router.get('/serie/:numero_serie', verificarToken, async (req, res) => {
  try {
    const datos = await ReportesModel.trazabilidadSerie(req.params.numero_serie);
    if (datos.length === 0) {
      return res.status(404).json({
        exito: false,
        error: `No se encontraron registros para la serie ${req.params.numero_serie}`
      });
    }
    res.json({ exito: true, datos });
  } catch (err) {
    console.error('Error en trazabilidad de serie:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
