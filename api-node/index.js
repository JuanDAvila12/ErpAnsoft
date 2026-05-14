const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./src/db');

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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inventario', inventarioRoutes);

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

/**
 * GET /api/v1/articulos?search=
 * Endpoint público/protegido para buscar artículos (usado por POS)
 */
app.get('/api/v1/articulos', async (req, res) => {
  try {
    const { search, limite = 20 } = req.query;

    let query = `
      SELECT a.id, a.sku, a.nombre, a.precio_venta, a.costo_promedio, 
             a.clave_sat, a.stock_minimo,
             COALESCE(SUM(im.cantidad) FILTER (WHERE im.tipo_movimiento = 'entrada'), 0) -
             COALESCE(SUM(im.cantidad) FILTER (WHERE im.tipo_movimiento = 'salida'), 0) AS stock_actual
      FROM articulos a
      LEFT JOIN inventario_movimientos im ON im.articulo_id = a.id
    `;

    const params = [];
    if (search) {
      query += ` WHERE a.activo IS NOT FALSE AND (a.nombre ILIKE $1 OR a.sku ILIKE $1 OR a.codigo_barras ILIKE $1)`;
      params.push(`%${search}%`);
    } else {
      query += ` WHERE a.activo IS NOT FALSE`;
    }

    query += ` GROUP BY a.id ORDER BY a.nombre LIMIT $${params.length + 1}`;
    params.push(limite);

    const result = await pool.query(query, params);

    res.json({
      datos: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    console.error('[Artículos] Error al buscar:', err);
    res.status(500).json({ error: 'Error al buscar artículos' });
  }
});

/**
 * GET /api/v1/entidades?search=&rol=
 * Endpoint para buscar entidades (clientes, proveedores)
 */
app.get('/api/v1/entidades', async (req, res) => {
  try {
    const { search, rol, limite = 20 } = req.query;

    let query = `
      SELECT DISTINCT e.id, e.razon_social, e.nombre_comercial, e.rfc, e.telefono, e.email
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

    res.json({ datos: result.rows });
  } catch (err) {
    console.error('[Entidades] Error al buscar:', err);
    res.status(500).json({ error: 'Error al buscar entidades' });
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`[API-Node] Servidor corriendo en puerto ${PORT}`);
});
