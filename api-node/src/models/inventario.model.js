const pool = require('../db');

const InventarioModel = {
  /**
   * Obtiene el stock actual de todos los artículos calculado
   * como la suma de movimientos de inventario.
   */
  async getStockActual() {
    const result = await pool.query(
      `SELECT a.id,
              a.sku,
              a.nombre,
              a.precio_venta,
              a.costo_promedio,
              a.clave_sat,
              a.stock_minimo,
              a.usa_serie,
              um.nombre AS unidad_medida,
              cat.nombre AS categoria,
              m.nombre AS marca,
              COALESCE(SUM(CASE WHEN im.tipo_movimiento IN ('entrada', 'inicial') THEN im.cantidad
                                WHEN im.tipo_movimiento = 'salida' THEN -im.cantidad
                                ELSE 0 END), 0) AS stock_actual
       FROM articulos a
       LEFT JOIN inventario_movimientos im ON im.articulo_id = a.id
       LEFT JOIN unidades_medida um ON um.id = a.unidad_medida_id
       LEFT JOIN categorias_producto cat ON cat.id = a.categoria_id
       LEFT JOIN marcas m ON m.id = a.marca_id
       GROUP BY a.id, um.nombre, cat.nombre, m.nombre
       ORDER BY a.nombre`
    );
    return result.rows;
  },

  /**
   * Obtiene el stock actual de un artículo específico.
   */
  async getStockByArticuloId(articuloId) {
    const result = await pool.query(
      `SELECT a.id,
              a.sku,
              a.nombre,
              a.precio_venta,
              a.costo_promedio,
              a.clave_sat,
              a.stock_minimo,
              a.usa_serie,
              COALESCE(SUM(CASE WHEN im.tipo_movimiento IN ('entrada', 'inicial') THEN im.cantidad
                                WHEN im.tipo_movimiento = 'salida' THEN -im.cantidad
                                ELSE 0 END), 0) AS stock_actual
       FROM articulos a
       LEFT JOIN inventario_movimientos im ON im.articulo_id = a.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [articuloId]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene todos los movimientos de inventario.
   */
  async getMovimientos(articuloId = null) {
    let query = `
      SELECT im.*, a.sku, a.nombre as articulo_nombre,
             al.nombre as almacen_nombre
      FROM inventario_movimientos im
      JOIN articulos a ON a.id = im.articulo_id
      LEFT JOIN almacenes al ON al.id = im.almacen_id
    `;
    const params = [];

    if (articuloId) {
      query += ' WHERE im.articulo_id = $1';
      params.push(articuloId);
    }

    query += ' ORDER BY im.creado_en DESC';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Registra un movimiento de inventario con vínculo a línea de documento.
   */
  async insertarMovimiento({ articulo_id, cantidad, tipo_movimiento, almacen_id,
                             referencia_tipo, referencia_id,
                             documento_detalle_tipo, documento_detalle_id }) {
    const result = await pool.query(
      `INSERT INTO inventario_movimientos
       (articulo_id, cantidad, tipo_movimiento, almacen_id,
        referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [articulo_id, cantidad, tipo_movimiento, almacen_id,
       referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id]
    );
    return result.rows[0];
  },

  /**
   * Obtiene movimientos filtrados por documento detalle.
   */
  async getMovimientosPorDocumentoDetalle(documentoDetalleTipo, documentoDetalleId) {
    const result = await pool.query(
      `SELECT im.*, a.sku, a.nombre as articulo_nombre
       FROM inventario_movimientos im
       JOIN articulos a ON a.id = im.articulo_id
       WHERE im.documento_detalle_tipo = $1 AND im.documento_detalle_id = $2`,
      [documentoDetalleTipo, documentoDetalleId]
    );
    return result.rows;
  },
};

module.exports = InventarioModel;
