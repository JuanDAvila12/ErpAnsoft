const pool = require('../db');
const { setAuditContext } = require('../utils/auditContext');

/**
 * Modelo para Documentos de Venta (capas: cotizacion → orden_venta → venta)
 * Maneja el ciclo de vida completo con folio atómico, auditoría e inventario.
 */
const DocumentosVentaModel = {
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
   * Obtiene la serie_id por defecto según el tipo de documento.
   */
  async _getSeriePorDefecto(client, tipo) {
    const tipoMap = {
      cotizacion: 'cotizacion',
      orden_venta: 'orden_venta',
      venta: 'venta',
    };
    const tipoDoc = tipoMap[tipo] || 'venta';
    const result = await client.query(
      'SELECT id, serie FROM series_documentos WHERE tipo = $1 AND activo = true LIMIT 1',
      [tipoDoc]
    );
    return result.rows[0] || null;
  },

  /**
   * Crea un documento de venta con transacción ACID.
   * @param {string} tipo - 'cotizacion', 'orden_venta', 'venta'
   * @param {Object} datos - Datos del documento
   * @param {Object} req - Request de Express (para auditoría)
   */
  async crearDocumento(tipo, datos, req) {
    const {
      entidad_cliente_id, entidad_vendedor_id, almacen_id, metodo_pago,
      forma_pago_id, terminos_pago_id, fecha_vencimiento, serie_id,
      articulos
    } = datos;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Creación de ${tipo}`);

      // Validar cliente
      const cliente = await this._validarEntidadConRol(entidad_cliente_id, 'cliente');
      if (!cliente) {
        throw new Error(`La entidad con ID ${entidad_cliente_id} no existe como cliente activo`);
      }

      if (entidad_vendedor_id) {
        const vendedor = await this._validarEntidadConRol(entidad_vendedor_id, 'vendedor');
        if (!vendedor) {
          throw new Error(`La entidad con ID ${entidad_vendedor_id} no existe como vendedor activo`);
        }
      }

      // Obtener serie
      let serie = serie_id;
      if (!serie) {
        const serieDefault = await this._getSeriePorDefecto(client, tipo);
        serie = serieDefault?.id || null;
      }

      // Generar folio atómico
      const tipoFolioMap = { cotizacion: 'COT', orden_venta: 'OV', venta: 'FAC' };
      const tipoFolio = tipoFolioMap[tipo] || 'FAC';
      const folioResult = await client.query(
        'SELECT obtener_folio($1) AS folio', [tipoFolio]
      );
      const folio = folioResult.rows[0].folio;

      // Calcular total
      let total = 0;
      for (const art of articulos) {
        const artResult = await client.query(
          'SELECT precio_venta FROM articulos WHERE id = $1', [art.articulo_id]
        );
        if (artResult.rows.length === 0) {
          throw new Error(`Artículo con ID ${art.articulo_id} no encontrado`);
        }
        const precio = parseFloat(artResult.rows[0].precio_venta);
        total += precio * art.cantidad;
      }

      // Insertar documento
      const docResult = await client.query(
        `INSERT INTO documentos_venta
         (entidad_cliente_id, entidad_vendedor_id, folio, total, tipo, estado,
          metodo_pago, forma_pago_id, terminos_pago_id, fecha_vencimiento, serie_id)
         VALUES ($1, $2, $3, $4, $5, 'confirmado', $6, $7, $8, $9, $10)
         RETURNING *`,
        [entidad_cliente_id, entidad_vendedor_id || null, folio, total,
         tipo, metodo_pago || 'efectivo', forma_pago_id || null,
         terminos_pago_id || null, fecha_vencimiento || null, serie]
      );
      const documento = docResult.rows[0];

      // Insertar detalle y movimientos de inventario (solo para venta)
      for (const art of articulos) {
        const artResult = await client.query(
          'SELECT precio_venta, costo_promedio, usa_serie FROM articulos WHERE id = $1',
          [art.articulo_id]
        );
        const precio = parseFloat(artResult.rows[0].precio_venta);
        const subtotal = precio * art.cantidad;

        // Insertar detalle
        const detResult = await client.query(
          `INSERT INTO documentos_venta_detalle
           (documento_venta_id, articulo_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [documento.id, art.articulo_id, art.cantidad, precio, subtotal]
        );
        const detalleId = detResult.rows[0].id;

        // Solo para ventas: mover inventario
        if (tipo === 'venta') {
          const almacenId = almacen_id || 1;
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
             VALUES ($1, $2, 'salida', $3, 'documento_venta', $4, 'documentos_venta_detalle', $5)`,
            [art.articulo_id, art.cantidad, almacenId, documento.id, detalleId]
          );

          // Si el artículo usa series, validar y actualizar
          if (artResult.rows[0].usa_serie && art.numero_serie) {
            const serieResult = await client.query(
              `UPDATE articulos_series
               SET estado = 'vendido', inventario_movimiento_id = (
                 SELECT MAX(id) FROM inventario_movimientos WHERE referencia_id = $1
               )
               WHERE articulo_id = $2 AND numero_serie = $3 AND estado = 'disponible'
               RETURNING id`,
              [documento.id, art.articulo_id, art.numero_serie]
            );
            if (serieResult.rows.length === 0) {
              throw new Error(`Serie ${art.numero_serie} no disponible para artículo ${art.articulo_id}`);
            }
          }
        }
      }

      await client.query('COMMIT');

      // Retornar documento completo
      const docCompleto = await client.query(
        `SELECT dv.*,
                ec.razon_social AS cliente_nombre,
                ec.rfc AS cliente_rfc,
                ev.razon_social AS vendedor_nombre,
                sd.serie,
                tp.nombre AS terminos_pago_nombre,
                json_agg(json_build_object(
                  'id', dvd.id,
                  'articulo_id', dvd.articulo_id,
                  'articulo_nombre', art.nombre,
                  'articulo_sku', art.sku,
                  'cantidad', dvd.cantidad,
                  'precio_unitario', dvd.precio_unitario,
                  'subtotal', dvd.subtotal
                )) AS detalles
         FROM documentos_venta dv
         LEFT JOIN documentos_venta_detalle dvd ON dvd.documento_venta_id = dv.id
         LEFT JOIN articulos art ON art.id = dvd.articulo_id
         LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
         LEFT JOIN entidades ev ON ev.id = dv.entidad_vendedor_id
         LEFT JOIN series_documentos sd ON sd.id = dv.serie_id
         LEFT JOIN terminos_pago tp ON tp.id = dv.terminos_pago_id
         WHERE dv.id = $1
         GROUP BY dv.id, ec.razon_social, ec.rfc, ev.razon_social, sd.serie, tp.nombre`,
        [documento.id]
      );

      return docCompleto.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Convierte un documento de origen a un nuevo tipo (ej: cotizacion → orden_venta → venta).
   * @param {number} origenId - ID del documento origen
   * @param {string} nuevoTipo - 'orden_venta' o 'venta'
   * @param {Object} req - Request de Express
   */
  async convertirDocumento(origenId, nuevoTipo, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Conversión a ${nuevoTipo}`);

      // Obtener documento origen
      const origen = await client.query(
        'SELECT * FROM documentos_venta WHERE id = $1 AND estado NOT IN (\'cancelado\', \'facturado\')',
        [origenId]
      );
      if (origen.rows.length === 0) {
        throw new Error(`Documento origen ID ${origenId} no encontrado o cancelado`);
      }
      const docOrigen = origen.rows[0];

      // Obtener detalles del origen
      const detalles = await client.query(
        'SELECT * FROM documentos_venta_detalle WHERE documento_venta_id = $1',
        [origenId]
      );

      // Armar datos para nuevo documento
      const datosNuevo = {
        entidad_cliente_id: docOrigen.entidad_cliente_id,
        entidad_vendedor_id: docOrigen.entidad_vendedor_id,
        metodo_pago: docOrigen.metodo_pago,
        forma_pago_id: docOrigen.forma_pago_id,
        terminos_pago_id: docOrigen.terminos_pago_id,
        articulos: detalles.rows.map(d => ({
          articulo_id: d.articulo_id,
          cantidad: d.cantidad,
        })),
      };

      // Generar nuevo tipo
      const tipoFolioMap = { orden_venta: 'OV', venta: 'FAC' };
      const tipoFolio = tipoFolioMap[nuevoTipo];
      const folioResult = await client.query(
        'SELECT obtener_folio($1) AS folio', [tipoFolio]
      );
      const folio = folioResult.rows[0].folio;

      // Obtener serie
      const serieDefault = await this._getSeriePorDefecto(client, nuevoTipo);

      // Calcular total
      let total = 0;
      for (const art of datosNuevo.articulos) {
        const artResult = await client.query(
          'SELECT precio_venta FROM articulos WHERE id = $1', [art.articulo_id]
        );
        const precio = parseFloat(artResult.rows[0]?.precio_venta || 0);
        total += precio * art.cantidad;
      }

      // Insertar nuevo documento con referencia al origen
      const docResult = await client.query(
        `INSERT INTO documentos_venta
         (entidad_cliente_id, entidad_vendedor_id, folio, total, tipo, estado,
          documento_origen_id, metodo_pago, forma_pago_id, terminos_pago_id, serie_id)
         VALUES ($1, $2, $3, $4, $5, 'confirmado', $6, $7, $8, $9, $10)
         RETURNING *`,
        [docOrigen.entidad_cliente_id, docOrigen.entidad_vendedor_id, folio, total,
         nuevoTipo, origenId, docOrigen.metodo_pago, docOrigen.forma_pago_id,
         docOrigen.terminos_pago_id, serieDefault?.id || null]
      );
      const nuevoDoc = docResult.rows[0];

      // Insertar detalles
      for (const det of detalles.rows) {
        const detResult = await client.query(
          `INSERT INTO documentos_venta_detalle
           (documento_venta_id, articulo_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [nuevoDoc.id, det.articulo_id, det.cantidad, det.precio_unitario, det.subtotal]
        );
        const detalleId = detResult.rows[0].id;

        // Si es venta, generar movimiento de inventario
        if (nuevoTipo === 'venta') {
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
             VALUES ($1, $2, 'salida', 1, 'documento_venta', $3, 'documentos_venta_detalle', $4)`,
            [det.articulo_id, det.cantidad, nuevoDoc.id, detalleId]
          );
        }
      }

      await client.query('COMMIT');

      return nuevoDoc;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Cancela un documento de venta.
   */
  async cancelar(id, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Cancelación de documento venta ${id}`);

      const doc = await client.query(
        'SELECT * FROM documentos_venta WHERE id = $1 AND estado NOT IN (\'cancelado\') FOR UPDATE',
        [id]
      );
      if (doc.rows.length === 0) {
        throw new Error(`Documento ${id} no encontrado o ya cancelado`);
      }

      const documento = doc.rows[0];

      // Si era una venta confirmada, revertir inventario
      if (documento.tipo === 'venta' && documento.estado === 'confirmado') {
        // Obtener movimientos de inventario relacionados
        const movimientos = await client.query(
          `SELECT * FROM inventario_movimientos
           WHERE referencia_tipo = 'documento_venta' AND referencia_id = $1
           AND tipo_movimiento = 'salida'`,
          [id]
        );

        for (const mov of movimientos.rows) {
          // Revertir: entrada de inventario
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id)
             VALUES ($1, $2, 'entrada', $3, 'cancelacion_documento_venta', $4)`,
            [mov.articulo_id, mov.cantidad, mov.almacen_id, id]
          );

          // Si el artículo usa series, regresar a disponible
          await client.query(
            `UPDATE articulos_series
             SET estado = 'disponible'
             WHERE inventario_movimiento_id = $1 AND estado = 'vendido'`,
            [mov.id]
          );
        }
      }

      await client.query(
        `UPDATE documentos_venta SET estado = 'cancelado', updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');
      return { id, estado: 'cancelado', mensaje: 'Documento cancelado exitosamente' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Obtiene todos los documentos de venta.
   */
  async findAll(filtros = {}) {
    const { tipo, estado } = filtros;
    const condiciones = [];
    const params = [];
    let idx = 1;

    if (tipo) {
      condiciones.push(`dv.tipo = $${idx}`);
      params.push(tipo);
      idx++;
    }
    if (estado) {
      condiciones.push(`dv.estado = $${idx}`);
      params.push(estado);
      idx++;
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT dv.*,
              ec.razon_social AS cliente_nombre,
              ec.rfc AS cliente_rfc,
              ev.razon_social AS vendedor_nombre,
              sd.serie,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', dvd.id,
                  'articulo_id', dvd.articulo_id,
                  'articulo_nombre', a.nombre,
                  'articulo_sku', a.sku,
                  'cantidad', dvd.cantidad,
                  'precio_unitario', dvd.precio_unitario,
                  'subtotal', dvd.subtotal
                ))
                FROM documentos_venta_detalle dvd
                LEFT JOIN articulos a ON a.id = dvd.articulo_id
                WHERE dvd.documento_venta_id = dv.id),
                '[]'::json
              ) AS detalles
       FROM documentos_venta dv
       LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
       LEFT JOIN entidades ev ON ev.id = dv.entidad_vendedor_id
       LEFT JOIN series_documentos sd ON sd.id = dv.serie_id
       ${where}
       ORDER BY dv.fecha DESC`
    );
    return result.rows;
  },

  /**
   * Obtiene un documento de venta por ID.
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT dv.*,
              ec.razon_social AS cliente_nombre,
              ec.rfc AS cliente_rfc,
              ev.razon_social AS vendedor_nombre,
              sd.serie,
              tp.nombre AS terminos_pago_nombre,
              tp.dias_credito,
              json_agg(json_build_object(
                'id', dvd.id,
                'articulo_id', dvd.articulo_id,
                'articulo_nombre', a.nombre,
                'articulo_sku', a.sku,
                'cantidad', dvd.cantidad,
                'precio_unitario', dvd.precio_unitario,
                'subtotal', dvd.subtotal
              )) AS detalles
       FROM documentos_venta dv
       LEFT JOIN documentos_venta_detalle dvd ON dvd.documento_venta_id = dv.id
       LEFT JOIN articulos a ON a.id = dvd.articulo_id
       LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
       LEFT JOIN entidades ev ON ev.id = dv.entidad_vendedor_id
       LEFT JOIN series_documentos sd ON sd.id = dv.serie_id
       LEFT JOIN terminos_pago tp ON tp.id = dv.terminos_pago_id
       WHERE dv.id = $1
       GROUP BY dv.id, ec.razon_social, ec.rfc, ev.razon_social, sd.serie, tp.nombre, tp.dias_credito`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = DocumentosVentaModel;
