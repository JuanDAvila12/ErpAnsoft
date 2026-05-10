const pool = require('../db');

const VentasModel = {
  /**
   * Valida que una entidad tenga un rol específico.
   */
  async _validarEntidadConRol(entidadId, rolEsperado) {
    const result = await pool.query(
      `SELECT e.id, e.razon_social, e.rfc
       FROM entidades e
       JOIN entidad_roles er ON er.entidad_id = e.id
       WHERE e.id = $1 AND e.activo = true AND er.rol = $2::entidad_rol_enum`,
      [entidadId, rolEsperado]
    );
    return result.rows[0] || null;
  },

  /**
   * Crea una venta completa usando una transacción SQL.
   * Inserta en ventas, ventas_detalle, inventario_movimientos y asientos_contables.
   */
  async crearVenta({ entidad_cliente_id, entidad_vendedor_id, almacen_id, metodo_pago, articulos }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Validar que entidad_cliente_id exista y tenga rol 'cliente'
      const cliente = await this._validarEntidadConRol(entidad_cliente_id, 'cliente');
      if (!cliente) {
        throw new Error(`La entidad con ID ${entidad_cliente_id} no existe como cliente activo o no tiene el rol 'cliente'.`);
      }

      // 2. Si se envía entidad_vendedor_id, validar que tenga rol 'vendedor'
      if (entidad_vendedor_id) {
        const vendedor = await this._validarEntidadConRol(entidad_vendedor_id, 'vendedor');
        if (!vendedor) {
          throw new Error(`La entidad con ID ${entidad_vendedor_id} no existe como vendedor activo o no tiene el rol 'vendedor'.`);
        }
      }

      // 3. Si se envía almacen_id, validar que exista
      const almacenId = almacen_id || 1; // Default: Almacén General (id=1)
      if (almacen_id) {
        const almacenResult = await client.query(
          'SELECT id FROM almacenes WHERE id = $1 AND activo = true',
          [almacen_id]
        );
        if (almacenResult.rows.length === 0) {
          throw new Error(`Almacén con ID ${almacen_id} no encontrado o inactivo.`);
        }
      }

      // 4. Generar folio único
      const folioResult = await client.query(
        `SELECT 'VTA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                LPAD(COALESCE(MAX(id), 0)::TEXT, 4, '0') AS folio
         FROM ventas`
      );
      const folio = folioResult.rows[0].folio;

      // 5. Calcular total de la venta
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

      // 6. Insertar en ventas (con modelo de entidades)
      const ventaResult = await client.query(
        `INSERT INTO ventas (entidad_cliente_id, entidad_vendedor_id, folio, total, metodo_pago, estatus)
         VALUES ($1, $2, $3, $4, $5, 'completada')
         RETURNING *`,
        [entidad_cliente_id, entidad_vendedor_id || null, folio, total, metodo_pago || 'efectivo']
      );
      const venta = ventaResult.rows[0];

      // 7. Insertar detalle de ventas y movimientos de inventario
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

        // Insertar movimiento de inventario (salida) con almacén y referencia a la venta
        await client.query(
          `INSERT INTO inventario_movimientos (articulo_id, cantidad, tipo_movimiento, almacen_id, referencia_tipo, referencia_id)
           VALUES ($1, $2, 'salida', $3, 'venta', $4)`,
          [art.articulo_id, art.cantidad, almacenId, venta.id]
        );
      }

      // 8. Insertar asientos contables
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

      // Retornar la venta completa con detalles y datos de entidades
      const ventaCompleta = await client.query(
        `SELECT v.*, 
                ec.razon_social AS cliente_nombre,
                ec.rfc AS cliente_rfc,
                ev.razon_social AS vendedor_nombre,
                a.razon_social AS almacen_nombre,
                json_agg(json_build_object(
                  'id', vd.id,
                  'articulo_id', vd.articulo_id,
                  'articulo_nombre', art.nombre,
                  'articulo_sku', art.sku,
                  'cantidad', vd.cantidad,
                  'precio_unitario', vd.precio_unitario,
                  'subtotal', vd.subtotal
                )) AS detalles
         FROM ventas v
         LEFT JOIN ventas_detalle vd ON vd.venta_id = v.id
         LEFT JOIN articulos art ON art.id = vd.articulo_id
         LEFT JOIN entidades ec ON ec.id = v.entidad_cliente_id
         LEFT JOIN entidades ev ON ev.id = v.entidad_vendedor_id
         LEFT JOIN almacenes a ON a.id = $2
         WHERE v.id = $1
         GROUP BY v.id, ec.razon_social, ec.rfc, ev.razon_social, a.razon_social`,
        [venta.id, almacenId]
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
   * Obtiene todas las ventas con JOIN a entidades.
   */
  async findAll() {
    const result = await pool.query(
      `SELECT v.*,
              ec.razon_social AS cliente_nombre,
              ec.rfc AS cliente_rfc,
              ev.razon_social AS vendedor_nombre,
              alm.nombre AS almacen_nombre,
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
       LEFT JOIN entidades ec ON ec.id = v.entidad_cliente_id
       LEFT JOIN entidades ev ON ev.id = v.entidad_vendedor_id
       LEFT JOIN LATERAL (
         SELECT al.nombre
         FROM inventario_movimientos im
         JOIN almacenes al ON al.id = im.almacen_id
         WHERE im.referencia_tipo = 'venta'
           AND im.referencia_id = v.id
           AND im.tipo_movimiento = 'salida'
         LIMIT 1
       ) alm ON true
       ORDER BY v.fecha DESC`
    );
    return result.rows;
  },

  /**
   * Obtiene una venta por ID con JOIN a entidades.
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT v.*,
              ec.razon_social AS cliente_nombre,
              ec.rfc AS cliente_rfc,
              ev.razon_social AS vendedor_nombre,
              alm.nombre AS almacen_nombre,
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
       LEFT JOIN entidades ec ON ec.id = v.entidad_cliente_id
       LEFT JOIN entidades ev ON ev.id = v.entidad_vendedor_id
       LEFT JOIN LATERAL (
         SELECT al.nombre
         FROM inventario_movimientos im
         JOIN almacenes al ON al.id = im.almacen_id
         WHERE im.referencia_tipo = 'venta'
           AND im.referencia_id = v.id
           AND im.tipo_movimiento = 'salida'
         LIMIT 1
       ) alm ON true
       WHERE v.id = $1
       GROUP BY v.id, ec.razon_social, ec.rfc, ev.razon_social, alm.nombre`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = VentasModel;
