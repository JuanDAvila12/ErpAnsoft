const pool = require('../db');
const { setAuditContext } = require('../utils/auditContext');

/**
 * Modelo para Series de Artículos (control de serialización por ítem)
 */
const ArticulosSeriesModel = {
  /**
   * Obtiene todas las series de un artículo.
   */
  async findByArticuloId(articuloId) {
    const result = await pool.query(
      `SELECT ars.*, im.tipo_movimiento, im.referencia_tipo, im.referencia_id
       FROM articulos_series ars
       LEFT JOIN inventario_movimientos im ON im.id = ars.inventario_movimiento_id
       WHERE ars.articulo_id = $1
       ORDER BY ars.created_at DESC`,
      [articuloId]
    );
    return result.rows;
  },

  /**
   * Obtiene una serie específica.
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT ars.*, a.nombre AS articulo_nombre, a.sku
       FROM articulos_series ars
       JOIN articulos a ON a.id = ars.articulo_id
       WHERE ars.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene series disponibles (no vendidas) de un artículo.
   */
  async findDisponibles(articuloId) {
    const result = await pool.query(
      `SELECT * FROM articulos_series
       WHERE articulo_id = $1 AND estado = 'disponible'
       ORDER BY numero_serie`,
      [articuloId]
    );
    return result.rows;
  },

  /**
   * Registra una nueva serie para un artículo.
   */
  async create({ articulo_id, numero_serie, inventario_movimiento_id }, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (req) {
        await setAuditContext(client, req.usuario?.id, req.ip, 'Registro de serie de artículo');
      }

      // Validar que el artículo permita series
      const art = await client.query(
        'SELECT id, nombre, usa_serie FROM articulos WHERE id = $1 AND activo = true',
        [articulo_id]
      );
      if (art.rows.length === 0) {
        throw new Error(`Artículo ${articulo_id} no encontrado`);
      }

      const result = await client.query(
        `INSERT INTO articulos_series (articulo_id, numero_serie, inventario_movimiento_id, estado)
         VALUES ($1, $2, $3, 'disponible')
         RETURNING *`,
        [articulo_id, numero_serie, inventario_movimiento_id || null]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Actualiza el estado de una serie (disponible → vendido, etc.)
   */
  async actualizarEstado(id, nuevoEstado, inventario_movimiento_id, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (req) {
        await setAuditContext(client, req.usuario?.id, req.ip, `Actualización de estado de serie a ${nuevoEstado}`);
      }

      const result = await client.query(
        `UPDATE articulos_series
         SET estado = $1, inventario_movimiento_id = COALESCE($2, inventario_movimiento_id)
         WHERE id = $3 AND estado != 'baja'
         RETURNING *`,
        [nuevoEstado, inventario_movimiento_id, id]
      );

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Valida y marca una serie como vendida en una transacción de venta.
   */
  async marcarVendido(articuloId, numeroSerie, inventarioMovimientoId) {
    const result = await pool.query(
      `UPDATE articulos_series
       SET estado = 'vendido', inventario_movimiento_id = $3
       WHERE articulo_id = $1 AND numero_serie = $2 AND estado = 'disponible'
       RETURNING *`,
      [articuloId, numeroSerie, inventarioMovimientoId]
    );
    return result.rows[0] || null;
  },

  /**
   * Busca una serie por número.
   */
  async findByNumeroSerie(numeroSerie, articuloId = null) {
    let query = `
      SELECT ars.*, a.nombre AS articulo_nombre, a.sku
      FROM articulos_series ars
      JOIN articulos a ON a.id = ars.articulo_id
      WHERE ars.numero_serie ILIKE $1
    `;
    const params = [`%${numeroSerie}%`];

    if (articuloId) {
      query += ' AND ars.articulo_id = $2';
      params.push(articuloId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  },
};

module.exports = ArticulosSeriesModel;
