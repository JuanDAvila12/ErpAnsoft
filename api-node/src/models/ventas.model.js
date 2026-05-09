const pool = require('../db');

const VentasModel = {
  /**
   * Crea una venta completa usando una transacción SQL.
   * Inserta en ventas, ventas_detalle, inventario_movimientos y asientos_contables.
   */
  async crearVenta({ cliente_id, metodo_pago, articulos }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Generar folio único
      const folioResult = await client.query(
        `SELECT 'VTA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                LPAD(COALESCE(MAX(id), 0)::TEXT, 4, '0') AS folio
         FROM ventas`
      );
      const folio = folioResult.rows[0].folio;

      // 2. Calcular total de la venta
      let total = 0;
      for (const art of articulos) {
        const artResult = await client.query(
          'SELECT precio_venta FROM articulos WHERE id = $1',
          [art.articulo_id]
        );
        if (artResult.rows.length === 0) {
          throw new Error(`Artículo con ID ${art.articulo_id} no encontrado`);
        }
        const precio = parseFloat(artResult.rows[0].precio_venta);
        total += precio * art.cantidad;
      }

      // 3. Insertar en ventas
      const ventaResult = await client.query(
        `INSERT INTO ventas (cliente_id, folio, total, metodo_pago, estatus)
         VALUES ($1, $2, $3, $4, 'completada')
         RETURNING *`,
        [cliente_id || null, folio, total, metodo_pago || 'efectivo']
      );
      const venta = ventaResult.rows[0];

      // 4. Insertar detalle de ventas y movimientos de inventario
      for (const art of articulos) {
        const artResult = await client.query(
          'SELECT precio_venta, costo_promedio FROM articulos WHERE id = $1',
          [art.articulo_id]
        );
        const precio = parseFloat(artResult.rows[0].precio_venta);
        const subtotal = precio * art.cantidad;

        // Insertar detalle
        await client.query(
          `INSERT INTO ventas_detalle (venta_id, articulo_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [venta.id, art.articulo_id, art.cantidad, precio, subtotal]
        );

        // Insertar movimiento de inventario (salida)
        await client.query(
          `INSERT INTO inventario_movimientos (articulo_id, cantidad, tipo_movimiento)
           VALUES ($1, $2, 'salida')`,
          [art.articulo_id, art.cantidad]
        );
      }

      // 5. Insertar asientos contables
      // Obtener el porcentaje de IVA de la configuración
      const ivaConfig = await client.query(
        "SELECT valor FROM configuracion_sistema WHERE clave = 'iva_porcentaje'"
      );
      const ivaPorcentaje = parseFloat(ivaConfig.rows[0]?.valor || '16') / 100;
      const iva = total - (total / (1 + ivaPorcentaje));
      const subtotalSinIVA = total - iva;

      // Asiento 1: Cargo a Caja (Deudora)
      await client.query(
        `INSERT INTO asientos_contables (referencia_tipo, referencia_id, cuenta_contable, debe, haber, fecha)
         VALUES ('venta', $1, '1101-CAJA', $2, 0, NOW())`,
        [venta.id, total]
      );

      // Asiento 2: Abono a Ventas (Acreedora)
      await client.query(
        `INSERT INTO asientos_contables (referencia_tipo, referencia_id, cuenta_contable, debe, haber, fecha)
         VALUES ('venta', $1, '4101-VENTAS', 0, $2, NOW())`,
        [venta.id, subtotalSinIVA]
      );

      // Asiento 3: Abono a IVA por Pagar (Acreedora)
      await client.query(
        `INSERT INTO asientos_contables (referencia_tipo, referencia_id, cuenta_contable, debe, haber, fecha)
         VALUES ('venta', $1, '2101-IVA-POR-PAGAR', 0, $2, NOW())`,
        [venta.id, iva]
      );

      await client.query('COMMIT');

      // Retornar la venta completa con detalles
      const ventaCompleta = await client.query(
        `SELECT v.*, 
                json_agg(json_build_object(
                  'id', vd.id,
                  'articulo_id', vd.articulo_id,
                  'articulo_nombre', a.nombre,
                  'articulo_sku', a.sku,
                  'cantidad', vd.cantidad,
                  'precio_unitario', vd.precio_unitario,
                  'subtotal', vd.subtotal
                )) AS detalles
         FROM ventas v
         LEFT JOIN ventas_detalle vd ON vd.venta_id = v.id
         LEFT JOIN articulos a ON a.id = vd.articulo_id
         WHERE v.id = $1
         GROUP BY v.id`,
        [venta.id]
      );

      return ventaCompleta.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Obtiene todas las ventas.
   */
  async findAll() {
    const result = await pool.query(
      `SELECT v.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', vd.id,
                  'articulo_id', vd.articulo_id,
                  'articulo_nombre', a.nombre,
                  'articulo_sku', a.sku,
                  'cantidad', vd.cantidad,
                  'precio_unitario', vd.precio_unitario,
                  'subtotal', vd.subtotal
                ))
                FROM ventas_detalle vd
                LEFT JOIN articulos a ON a.id = vd.articulo_id
                WHERE vd.venta_id = v.id),
                '[]'::json
              ) AS detalles
       FROM ventas v
       ORDER BY v.fecha DESC`
    );
    return result.rows;
  },

  /**
   * Obtiene una venta por ID.
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT v.*,
              json_agg(json_build_object(
                'id', vd.id,
                'articulo_id', vd.articulo_id,
                'articulo_nombre', a.nombre,
                'articulo_sku', a.sku,
                'cantidad', vd.cantidad,
                'precio_unitario', vd.precio_unitario,
                'subtotal', vd.subtotal
              )) AS detalles
       FROM ventas v
       LEFT JOIN ventas_detalle vd ON vd.venta_id = v.id
       LEFT JOIN articulos a ON a.id = vd.articulo_id
       WHERE v.id = $1
       GROUP BY v.id`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = VentasModel;
