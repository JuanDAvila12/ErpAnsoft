const pool = require('../db');

/**
 * Modelo de Reportes
 * Consultas para reportes de compras e inventario.
 */
const ReportesModel = {
  /**
   * Reporte de compras agrupadas por artículo.
   */
  async comprasPorArticulo({ fecha_desde, fecha_hasta, articulo_id } = {}) {
    const result = await pool.query(
      'SELECT * FROM fn_compras_por_articulo($1, $2, $3)',
      [fecha_desde || null, fecha_hasta || null, articulo_id || null]
    );
    return result.rows;
  },

  /**
   * Reporte de compras agrupadas por proveedor.
   */
  async comprasPorProveedor({ fecha_desde, fecha_hasta, proveedor_id } = {}) {
    const result = await pool.query(
      'SELECT * FROM fn_compras_por_proveedor($1, $2, $3)',
      [fecha_desde || null, fecha_hasta || null, proveedor_id || null]
    );
    return result.rows;
  },

  /**
   * Stock actual por artículo/almacén.
   * Si no se especifica almacén, suma todos.
   */
  async stockActual({ almacen_id, articulo_id } = {}) {
    let query = `
      SELECT
        v.articulo_id,
        v.sku,
        v.articulo_nombre,
        v.costo_promedio,
        v.precio_venta,
        v.almacen_id,
        v.almacen_nombre,
        v.cantidad_disponible
      FROM v_stock_actual v
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (almacen_id) {
      query += ` AND v.almacen_id = $${idx}`;
      params.push(almacen_id);
      idx++;
    }
    if (articulo_id) {
      query += ` AND v.articulo_id = $${idx}`;
      params.push(articulo_id);
      idx++;
    }

    query += ' ORDER BY v.almacen_nombre, v.articulo_nombre';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Movimientos de inventario con filtros.
   */
  async movimientos({ articulo_id, almacen_id, fecha_desde, fecha_hasta, tipo_movimiento, limite = 100 } = {}) {
    let query = `
      SELECT
        v.*
      FROM v_movimientos_inventario v
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (articulo_id) {
      query += ` AND v.articulo_id = $${idx}`;
      params.push(articulo_id);
      idx++;
    }
    if (almacen_id) {
      query += ` AND v.almacen_id = $${idx}`;
      params.push(almacen_id);
      idx++;
    }
    if (fecha_desde) {
      query += ` AND v.transaccion_fecha >= $${idx}`;
      params.push(fecha_desde);
      idx++;
    }
    if (fecha_hasta) {
      query += ` AND v.transaccion_fecha <= $${idx}`;
      params.push(fecha_hasta);
      idx++;
    }
    if (tipo_movimiento) {
      query += ` AND v.tipo_movimiento = $${idx}`;
      params.push(tipo_movimiento);
      idx++;
    }

    query += ` ORDER BY v.transaccion_fecha DESC LIMIT $${idx}`;
    params.push(limite);

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Trazabilidad de un número de serie.
   * Busca en transacciones_series y devuelve todas las transacciones asociadas.
   */
  async trazabilidadSerie(numeroSerie) {
    const result = await pool.query(
      `SELECT
         ts.id AS serie_trazabilidad_id,
         ts.numero_serie,
         ts.estado AS serie_estado,
         ts.created_at AS serie_creado_en,
         td.id AS detalle_id,
         td.articulo_id,
         a.sku,
         a.nombre AS articulo_nombre,
         td.cantidad,
         td.precio_unitario,
         td.tipo_movimiento,
         td.almacen_id,
         al.nombre AS almacen_nombre,
         t.id AS transaccion_id,
         t.tipo AS transaccion_tipo,
         t.folio AS transaccion_folio,
         t.fecha AS transaccion_fecha,
         t.estado AS transaccion_estado,
         COALESCE(ec.razon_social, ep.razon_social, '—') AS entidad_nombre
       FROM transacciones_series ts
       JOIN transacciones_detalle td ON td.id = ts.transaccion_detalle_id
       JOIN transacciones t ON t.id = td.transaccion_id
       JOIN articulos a ON a.id = td.articulo_id
       LEFT JOIN almacenes al ON al.id = td.almacen_id
       LEFT JOIN entidades ec ON ec.id = t.entidad_cliente_id
       LEFT JOIN entidades ep ON ep.id = t.entidad_proveedor_id
       WHERE ts.numero_serie = $1
       ORDER BY t.fecha DESC`,
      [numeroSerie]
    );
    return result.rows;
  },
};

module.exports = ReportesModel;
