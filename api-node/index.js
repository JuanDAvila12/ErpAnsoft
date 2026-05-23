const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./src/db');
const { authMiddleware } = require('./src/middleware/auth');
const { errorHandler, AppError } = require('./src/middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validación crítica: JWT_SECRET debe estar definida en producción
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no está definida en el entorno. El servidor no puede iniciar de forma segura.');
  process.exit(1);
}

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const authRoutes = require('./src/routes/auth.routes');
const inventarioRoutes = require('./src/routes/inventario.routes');
const ventasRoutes = require('./src/routes/ventas.routes');
const catalogosRoutes = require('./src/routes/catalogos.routes');
const auditoriaRoutes = require('./src/routes/auditoria.routes');
const documentosVentaRoutes = require('./src/routes/documentosVenta.routes');
const documentosCompraRoutes = require('./src/routes/documentosCompra.routes');
const articulosSeriesRoutes = require('./src/routes/articulosSeries.routes');
const comprobantesFiscalesRoutes = require('./src/routes/comprobantesFiscales.routes');
const permisosRoutes = require('./src/routes/permisos.routes');
const transaccionesRoutes = require('./src/routes/transacciones.routes');
const reportesRoutes = require('./src/routes/reportes.routes');
const contabilidadRoutes = require('./src/routes/contabilidad.routes');
const oportunidadesRoutes = require('./src/routes/oportunidades.routes');
const configuracionRoutes = require('./src/routes/configuracion.routes');
const configuracionAlmacenesRoutes = require('./src/routes/configuracionAlmacenes.routes');
const cxcRoutes = require('./src/routes/cxc.routes');
const cxpRoutes = require('./src/routes/cxp.routes');
const reportesConfiguracionRoutes = require('./src/routes/reportesConfiguracion.routes');
const pdfRoutes = require('./src/routes/pdf.routes');
const logErroresRoutes = require('./src/routes/logErrores.routes');
const plantillasPdfRoutes = require('./src/routes/plantillasPdf.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/plantillas-pdf', plantillasPdfRoutes);
app.use('/api/v1/contabilidad', contabilidadRoutes);
app.use('/api/v1/oportunidades', oportunidadesRoutes);
app.use('/api/v1/inventario', inventarioRoutes);
app.use('/api/v1/configuracion', configuracionRoutes);
app.use('/api/v1/configuracion', configuracionAlmacenesRoutes);
app.use('/api/v1/reportes-configuracion', reportesConfiguracionRoutes);
app.use('/api/v1/generar-pdf', pdfRoutes);

// Compatibilidad hacia atrás: /api/v1/ventas mantiene ruta anterior
app.use('/api/v1/ventas', ventasRoutes);

app.use('/api/v1/catalogos', catalogosRoutes);
app.use('/api/v1/auditoria', auditoriaRoutes);
app.use('/api/v1/documentos-venta', documentosVentaRoutes);
app.use('/api/v1/documentos-compra', documentosCompraRoutes);
app.use('/api/v1/articulos-series', articulosSeriesRoutes);
app.use('/api/v1/comprobantes-fiscales', comprobantesFiscalesRoutes);
app.use('/api/v1/permisos', permisosRoutes);
app.use('/api/v1/transacciones', transaccionesRoutes);
app.use('/api/v1/reportes', reportesRoutes);
app.use('/api/v1/log-errores', logErroresRoutes);

// CxC y CxP
app.use('/api/v1/cxc', cxcRoutes);
app.use('/api/v1/cxp', cxpRoutes);

/**
 * GET /api/v1/articulos?search=
 * Endpoint para buscar artículos (usado por POS y vistas de inventario)
 * Ahora incluye authMiddleware y devuelve más campos para la vista de Artículos
 */
app.get('/api/v1/articulos', authMiddleware, async (req, res, next) => {
  try {
    const { search, limite = 50 } = req.query;

    let query = `
      SELECT a.id, a.sku, a.nombre, a.precio_venta, a.costo_promedio, 
             a.clave_sat, a.stock_minimo, a.codigo_barras, a.usa_serie,
             a.unidad_medida_id, a.categoria_id, a.marca_id,
             a.impuesto_id,
             um.nombre AS unidad_medida_nombre,
             c.nombre AS categoria_nombre,
             m.nombre AS marca_nombre,
             COALESCE(SUM(im.cantidad) FILTER (WHERE im.tipo_movimiento = 'entrada'), 0) -
             COALESCE(SUM(im.cantidad) FILTER (WHERE im.tipo_movimiento = 'salida'), 0) AS stock_actual
      FROM articulos a
      LEFT JOIN inventario_movimientos im ON im.articulo_id = a.id
      LEFT JOIN unidades_medida um ON um.id = a.unidad_medida_id
      LEFT JOIN categorias_producto c ON c.id = a.categoria_id
      LEFT JOIN marcas m ON m.id = a.marca_id
    `;

    const params = [];
    if (search) {
      query += ` WHERE (a.nombre ILIKE $1 OR a.sku ILIKE $1 OR a.codigo_barras ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY a.id, um.nombre, c.nombre, m.nombre ORDER BY a.nombre LIMIT $${params.length + 1}`;
    params.push(limite);

    const result = await pool.query(query, params);

    res.json({
      datos: result.rows || [],
      total: result.rows.length,
    });
  } catch (err) {
    next(new AppError('ART-006', err.message));
  }
});

/**
 * GET /api/v1/entidades?search=&rol=
 * Endpoint para buscar entidades (clientes, proveedores, etc.)
 * Incluye roles agregados como array desde entidad_roles
 */
app.get('/api/v1/entidades', authMiddleware, async (req, res, next) => {
  try {
    const { search, rol, limite = 200 } = req.query;

    let query = `
      SELECT DISTINCT e.id, e.razon_social, e.nombre_comercial, e.rfc,
             e.telefono, e.email, e.contacto_nombre,
             e.regimen_fiscal, e.direccion, e.cp, e.activo,
             COALESCE(
               (SELECT array_agg(er2.rol::text ORDER BY er2.rol)
                FROM entidad_roles er2
                WHERE er2.entidad_id = e.id),
               ARRAY[]::text[]
             ) AS roles
      FROM entidades e
    `;

    const params = [];
    const conditions = [];

    if (rol) {
      query += ` JOIN entidad_roles er ON er.entidad_id = e.id`;
      conditions.push(`er.rol = $${params.length + 1}`);
      params.push(rol);
    }

    if (search) {
      conditions.push(`(e.razon_social ILIKE $${params.length + 1} OR e.rfc ILIKE $${params.length + 1} OR e.nombre_comercial ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    conditions.push(`e.activo IS NOT FALSE`);

    if (conditions.length) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY e.razon_social LIMIT $${params.length + 1}`;
    params.push(limite);

    const result = await pool.query(query, params);

    // Siempre devolver un array, aunque esté vacío
    res.json({ datos: result.rows || [] });
  } catch (err) {
    next(new AppError('ENT-004', err.message));
  }
});

/**
 * POST /api/v1/entidades
 * Crear una nueva entidad con sus roles
 */
app.post('/api/v1/entidades', authMiddleware, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { razon_social, nombre_comercial, rfc, email, telefono, contacto_nombre,
            regimen_fiscal, direccion, cp, roles, activo } = req.body;

    if (!razon_social || !rfc) {
      return res.status(400).json({
        codigo: 'ENT-006',
        mensaje: 'Razón social y RFC son requeridos',
        modulo: 'Entidades',
        detalle: 'Ambos campos son obligatorios para crear una entidad',
        timestamp: new Date().toISOString(),
      });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO entidades (razon_social, nombre_comercial, rfc, email, telefono, contacto_nombre,
                              regimen_fiscal, direccion, cp, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [razon_social, nombre_comercial || null, rfc, email || null, telefono || null,
       contacto_nombre || null, regimen_fiscal || '601', direccion || null, cp || null,
       activo !== false]
    );

    const entidad = result.rows[0];

    // Insertar roles si se proporcionaron
    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (const rol of roles) {
        await client.query(
          `INSERT INTO entidad_roles (entidad_id, rol) VALUES ($1, $2)
           ON CONFLICT (entidad_id, rol) DO NOTHING`,
          [entidad.id, rol]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ datos: entidad, mensaje: 'Entidad creada exitosamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({
        codigo: 'ENT-005',
        mensaje: 'RFC duplicado',
        modulo: 'Entidades',
        detalle: 'Ya existe una entidad con ese RFC',
        timestamp: new Date().toISOString(),
      });
    }
    next(new AppError('ENT-001', err.message));
  } finally {
    client.release();
  }
});

/**
 * PUT /api/v1/entidades/:id
 * Actualizar una entidad existente y sus roles
 */
app.put('/api/v1/entidades/:id', authMiddleware, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { razon_social, nombre_comercial, rfc, email, telefono, contacto_nombre,
            regimen_fiscal, direccion, cp, roles, activo } = req.body;

    if (!razon_social || !rfc) {
      return res.status(400).json({
        codigo: 'ENT-006',
        mensaje: 'Razón social y RFC son requeridos',
        modulo: 'Entidades',
        detalle: 'Ambos campos son obligatorios para actualizar una entidad',
        timestamp: new Date().toISOString(),
      });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE entidades SET razon_social = $1, nombre_comercial = $2, rfc = $3,
              email = $4, telefono = $5, contacto_nombre = $6,
              regimen_fiscal = $7, direccion = $8, cp = $9, activo = $10,
              updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [razon_social, nombre_comercial || null, rfc, email || null, telefono || null,
       contacto_nombre || null, regimen_fiscal || '601', direccion || null, cp || null,
       activo !== false, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        codigo: 'ENT-003',
        mensaje: 'Entidad no encontrada',
        modulo: 'Entidades',
        detalle: `No se encontró entidad con ID ${id}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Reemplazar roles: eliminar existentes e insertar nuevos
    await client.query('DELETE FROM entidad_roles WHERE entidad_id = $1', [id]);

    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (const rol of roles) {
        await client.query(
          `INSERT INTO entidad_roles (entidad_id, rol) VALUES ($1, $2)
           ON CONFLICT (entidad_id, rol) DO NOTHING`,
          [id, rol]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ datos: result.rows[0], mensaje: 'Entidad actualizada exitosamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({
        codigo: 'ENT-005',
        mensaje: 'RFC duplicado',
        modulo: 'Entidades',
        detalle: 'Ya existe otra entidad con ese RFC',
        timestamp: new Date().toISOString(),
      });
    }
    next(new AppError('ENT-002', err.message));
  } finally {
    client.release();
  }
});

/**
 * GET /api/v1/entidades/:id/contabilidad
 * Obtener la configuración contable de una entidad
 */
app.get('/api/v1/entidades/:id/contabilidad', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ecc.*, cc.codigo AS cuenta_codigo, cc.nombre AS cuenta_nombre
       FROM entidad_cuentas_contables ecc
       LEFT JOIN cuentas_contables cc ON cc.id = ecc.cuenta_contable_id
       WHERE ecc.entidad_id = $1 AND ecc.activo = true
       ORDER BY ecc.rol_contable`,
      [id]
    );
    res.json({ datos: result.rows });
  } catch (err) {
    next(new AppError('ENT-007', err.message));
  }
});

/**
 * PUT /api/v1/entidades/:id/contabilidad
 * Guardar la configuración contable de una entidad
 */
app.put('/api/v1/entidades/:id/contabilidad', authMiddleware, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { cuentas } = req.body; // Array de { rol_contable, cuenta_contable_id }

    if (!Array.isArray(cuentas)) {
      return res.status(400).json({
        codigo: 'ENT-008',
        mensaje: 'Se requiere un array de configuraciones contables',
        modulo: 'Entidades',
        detalle: 'El campo cuentas debe ser un array de {rol_contable, cuenta_contable_id}',
        timestamp: new Date().toISOString(),
      });
    }

    await client.query('BEGIN');

    // Eliminar configuraciones existentes para esta entidad
    await client.query('DELETE FROM entidad_cuentas_contables WHERE entidad_id = $1', [id]);

    // Insertar nuevas configuraciones
    for (const c of cuentas) {
      if (c.rol_contable && c.cuenta_contable_id) {
        await client.query(
          `INSERT INTO entidad_cuentas_contables (entidad_id, rol_contable, cuenta_contable_id, activo)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (entidad_id, rol_contable)
           DO UPDATE SET cuenta_contable_id = $3, activo = true`,
          [id, c.rol_contable, c.cuenta_contable_id]
        );
      }
    }

    await client.query('COMMIT');

    // Devolver las configuraciones guardadas
    const result = await pool.query(
      `SELECT ecc.*, cc.codigo AS cuenta_codigo, cc.nombre AS cuenta_nombre
       FROM entidad_cuentas_contables ecc
       LEFT JOIN cuentas_contables cc ON cc.id = ecc.cuenta_contable_id
       WHERE ecc.entidad_id = $1
       ORDER BY ecc.rol_contable`,
      [id]
    );

    res.json({ datos: result.rows, mensaje: 'Configuración contable guardada exitosamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(new AppError('ENT-009', err.message));
  } finally {
    client.release();
  }
});

/**
 * GET /api/v1/almacenes
 * Listar todos los almacenes. Devuelve un array JSON.
 */
app.get('/api/v1/almacenes', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM almacenes ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (err) {
    next(new AppError('INV-001', err.message));
  }
});

/**
 * POST /api/v1/almacenes
 * Crear un nuevo almacén. Requiere nombre (obligatorio) y ubicacion (opcional).
 */
app.post('/api/v1/almacenes', authMiddleware, async (req, res, next) => {
  try {
    const { nombre, ubicacion } = req.body;

    // Validar nombre obligatorio
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(400).json({
        codigo: 'ALM-001',
        mensaje: 'El nombre del almacén es obligatorio',
        modulo: 'Almacenes',
        detalle: 'Debe proporcionar un nombre no vacío para el almacén',
        timestamp: new Date().toISOString(),
      });
    }

    const nombreTrim = nombre.trim();

    // Validar que no se duplique el nombre
    const dupCheck = await pool.query(
      'SELECT id FROM almacenes WHERE LOWER(nombre) = LOWER($1)',
      [nombreTrim]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        codigo: 'ALM-002',
        mensaje: 'Ya existe un almacén con ese nombre',
        modulo: 'Almacenes',
        detalle: `El nombre "${nombreTrim}" ya está registrado en el sistema`,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await pool.query(
      `INSERT INTO almacenes (nombre, ubicacion, activo)
       VALUES ($1, $2, true)
       RETURNING *`,
      [nombreTrim, ubicacion || null]
    );

    res.status(201).json({ datos: result.rows[0], mensaje: 'Almacén creado exitosamente' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        codigo: 'ALM-002',
        mensaje: 'Ya existe un almacén con ese nombre',
        modulo: 'Almacenes',
        detalle: 'El nombre proporcionado ya está registrado',
        timestamp: new Date().toISOString(),
      });
    }
    next(new AppError('ALM-003', err.message));
  }
});

/**
 * PUT /api/v1/almacenes/:id
 * Actualizar un almacén existente.
 */
app.put('/api/v1/almacenes/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, activo } = req.body;

    // Validar nombre obligatorio
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(400).json({
        codigo: 'ALM-001',
        mensaje: 'El nombre del almacén es obligatorio',
        modulo: 'Almacenes',
        detalle: 'Debe proporcionar un nombre no vacío para el almacén',
        timestamp: new Date().toISOString(),
      });
    }

    const nombreTrim = nombre.trim();

    // Validar que no se duplique el nombre (excluyendo el mismo registro)
    const dupCheck = await pool.query(
      'SELECT id FROM almacenes WHERE LOWER(nombre) = LOWER($1) AND id != $2',
      [nombreTrim, id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        codigo: 'ALM-002',
        mensaje: 'Ya existe otro almacén con ese nombre',
        modulo: 'Almacenes',
        detalle: `El nombre "${nombreTrim}" ya está registrado en otro almacén`,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await pool.query(
      `UPDATE almacenes SET
        nombre = $1,
        ubicacion = $2,
        activo = COALESCE($3, activo),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [nombreTrim, ubicacion || null, activo !== false ? true : false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        codigo: 'ALM-004',
        mensaje: 'Almacén no encontrado',
        modulo: 'Almacenes',
        detalle: `No se encontró un almacén con ID ${id}`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ datos: result.rows[0], mensaje: 'Almacén actualizado exitosamente' });
  } catch (err) {
    next(new AppError('ALM-005', err.message));
  }
});
/**
 * GET /api/v1/cuentas-contables
 * Listar todas las cuentas contables. Devuelve un array JSON plano.
 */
app.get('/api/v1/cuentas-contables', authMiddleware, async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM cuentas_contables';
    const params = [];
    if (search) {
      query += ` WHERE nombre ILIKE $1 OR codigo::text ILIKE $1`;
      params.push(`%${search}%`);
    }
    query += ' ORDER BY codigo';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(new AppError('CTB-001', err.message));
  }
});

/**
 * POST /api/v1/cuentas-contables
 * Crear una nueva cuenta contable.
 */
app.post('/api/v1/cuentas-contables', authMiddleware, async (req, res, next) => {
  try {
    const { codigo, nombre, nivel, padre_id, tipo, naturaleza, activo } = req.body;
    if (!codigo || !nombre || !tipo) {
      return res.status(400).json({
        exito: false, error: 'Código, nombre y tipo son requeridos'
      });
    }
    const result = await pool.query(
      `INSERT INTO cuentas_contables (codigo, nombre, nivel, padre_id, tipo, naturaleza, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [codigo, nombre, parseInt(nivel) || 1, padre_id || null, tipo, naturaleza || null, activo !== false]
    );
    res.status(201).json({ datos: result.rows[0], mensaje: 'Cuenta creada exitosamente' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        exito: false, error: 'El código de cuenta ya existe'
      });
    }
    next(new AppError('CTB-002', err.message));
  }
});

/**
 * PUT /api/v1/cuentas-contables/:id
 * Actualizar una cuenta contable existente.
 */
app.put('/api/v1/cuentas-contables/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, nivel, padre_id, tipo, naturaleza, activo } = req.body;
    if (!codigo || !nombre || !tipo) {
      return res.status(400).json({
        exito: false, error: 'Código, nombre y tipo son requeridos'
      });
    }
    const result = await pool.query(
      `UPDATE cuentas_contables SET codigo = $1, nombre = $2, nivel = $3, padre_id = $4,
              tipo = $5, naturaleza = $6, activo = $7, updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [codigo, nombre, parseInt(nivel) || 1, padre_id || null, tipo, naturaleza || null, activo !== false, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        exito: false, error: 'Cuenta contable no encontrada'
      });
    }
    res.json({ datos: result.rows[0], mensaje: 'Cuenta actualizada exitosamente' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        exito: false, error: 'El código de cuenta ya existe'
      });
    }
    next(new AppError('CTB-003', err.message));
  }
});

// Ruta de salud / health check

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'api-node',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    entorno: process.env.NODE_ENV || 'development',
  });
});

// Middleware de manejo de errores (DEBE IR AL FINAL DE TODAS LAS RUTAS)
app.use(errorHandler);

// Iniciar servidor - escuchar en 0.0.0.0 para Docker
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API-Node] Servidor corriendo en puerto ${PORT}`);
});
