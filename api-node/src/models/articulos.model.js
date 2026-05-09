const pool = require('../db');

const ArticulosModel = {
  async findAll() {
    const result = await pool.query(
      `SELECT a.*,
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

  async findById(id) {
    const result = await pool.query(
      `SELECT a.*,
              COALESCE(SUM(CASE WHEN im.tipo_movimiento IN ('entrada', 'inicial') THEN im.cantidad
                                WHEN im.tipo_movimiento = 'salida' THEN -im.cantidad
                                ELSE 0 END), 0) AS stock_actual
       FROM articulos a
       LEFT JOIN inventario_movimientos im ON im.articulo_id = a.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findBySku(sku) {
    const result = await pool.query(
      'SELECT * FROM articulos WHERE sku = $1',
      [sku]
    );
    return result.rows[0] || null;
  },

  async create({ sku, nombre, precio_venta, costo_promedio, clave_sat, stock_minimo }) {
    const result = await pool.query(
      `INSERT INTO articulos (sku, nombre, precio_venta, costo_promedio, clave_sat, stock_minimo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [sku, nombre, precio_venta, costo_promedio, clave_sat, stock_minimo]
    );
    return result.rows[0];
  },

  async update(id, fields) {
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (['sku', 'nombre', 'precio_venta', 'costo_promedio', 'clave_sat', 'stock_minimo'].includes(key)) {
        setClauses.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE articulos SET ${setClauses.join(', ')} WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },
};

module.exports = ArticulosModel;
