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
              COALESCE(SUM(CASE WHEN im.tipo_movimiento IN ('entrada', 'inicial') THEN im.cantidad
                                WHEN im.tipo_movimiento = 'salida' THEN -im.cantidad
                                ELSE 0 END), 0) AS stock_actual
       FROM articulos a
       LEFT JOIN inventario_movimientos im ON im.articulo_id = a.id
       GROUP BY a.id
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
      SELECT im.*, a.sku, a.nombre as articulo_nombre
      FROM inventario_movimientos im
      JOIN articulos a ON a.id = im.articulo_id
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
   * Registra un movimiento de inventario.
   */
  async crearMovimiento({ articulo_id, cantidad, tipo_movimiento }) {
    const result = await pool.query(
      `INSERT INTO inventario_movimientos (articulo_id, cantidad, tipo_movimiento)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [articulo_id, cantidad, tipo_movimiento]
    );
    return result.rows[0];
  },
};

module.exports = InventarioModel;
