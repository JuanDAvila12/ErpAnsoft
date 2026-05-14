const pool = require('../db');
const { setAuditContext } = require('../utils/auditContext');

/**
 * Modelo para Documentos de Compra (capas: orden_compra → compra)
 * Maneja el ciclo de vida completo con folio atómico, auditoría e inventario.
 */
const DocumentosCompraModel = {
  /**
   * Valida que una entidad tenga rol de proveedor.
   */
  async _validarProveedor(entidadId) {
    const result = await pool.query(
      `SELECT e.id, e.razon_social, e.rfc
       FROM entidades e
       JOIN entidad_roles er ON er.entidad_id = e.id
       WHERE e.id = $1 AND e.activo = true AND er.rol = 'proveedor'`,
      [entidadId]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene la serie_id por defecto según el tipo.
   */
  async _getSeriePorDefecto(client, tipo) {
    const tipoMap = { orden_compra: 'orden_compra', compra: 'compra' };
    const tipoDoc = tipoMap[tipo] || 'orden_compra';
    const result = await client.query(
      'SELECT id, serie FROM series_documentos WHERE tipo = $1 AND activo = true LIMIT 1',
      [tipoDoc]
    );
    return result.rows[0] || null;
  },

  /**
   * Crea un documento de compra con transacción ACID.
   * @param {string} tipo - 'orden_compra', 'compra'
   * @param {Object} datos - Datos del documento
   * @param {Object} req - Request de Express (para auditoría)
   */
  async crearDocumento(tipo, datos, req) {
    const {
      proveedor_entidad_id, entidad_comprador_id, almacen_id, metodo_pago,
      forma_pago_id, terminos_pago_id, fecha_vencimiento, serie_id, articulos
    } = datos;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Creación de ${tipo}`);

      // Validar proveedor
      const proveedor = await this._validarProveedor(proveedor_entidad_id);
      if (!proveedor) {
        throw new Error(`La entidad con ID ${proveedor_entidad_id} no existe como proveedor activo`);
      }

      // Obtener serie
      let serie = serie_id;
      if (!serie) {
        const serieDefault = await this._getSeriePorDefecto(client, tipo);
        serie = serieDefault?.id || null;
      }

      // Generar folio atómico
      const tipoFolioMap = { orden_compra: 'OC', compra: 'COM' };
      const tipoFolio = tipoFolioMap[tipo] || 'OC';
      const folioResult = await client.query(
        'SELECT obtener_folio($1) AS folio', [tipoFolio]
      );
      const folio = folioResult.rows[0].folio;

      // Calcular total
      let total = 0;
      for (const art of articulos) {
        const artResult = await client.query(
          'SELECT costo_promedio FROM articulos WHERE id = $1', [art.articulo_id]
        );
        if (artResult.rows.length === 0) {
          throw new Error(`Artículo con ID ${art.articulo_id} no encontrado`);
        }
        // Usar precio_unitario enviado si existe, de lo contrario sugerir costo_promedio
        const precio = art.precio_unitario != null
          ? parseFloat(art.precio_unitario)
          : parseFloat(artResult.rows[0].costo_promedio);
        total += precio * art.cantidad;
      }

      // Insertar documento
      const docResult = await client.query(
        `INSERT INTO documentos_compra
         (proveedor_entidad_id, entidad_comprador_id, folio, total, tipo, estado,
          metodo_pago, forma_pago_id, terminos_pago_id, fecha_vencimiento, serie_id, almacen_id)
         VALUES ($1, $2, $3, $4, $5, 'confirmado', $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [proveedor_entidad_id, entidad_comprador_id || null, folio, total,
         tipo, metodo_pago || 'efectivo', forma_pago_id || null,
         terminos_pago_id || null, fecha_vencimiento || null, serie, almacen_id || 1]
      );
      const documento = docResult.rows[0];

      // Insertar detalle y movimientos de inventario (solo para compra confirmada)
      for (const art of articulos) {
        const artResult = await client.query(
          'SELECT costo_promedio FROM articulos WHERE id = $1 FOR UPDATE',
          [art.articulo_id]
        );
        if (artResult.rows.length === 0) {
          throw new Error(`Artículo con ID ${art.articulo_id} no encontrado`);
        }
        const precio = art.precio_unitario != null
          ? parseFloat(art.precio_unitario)
          : parseFloat(artResult.rows[0].costo_promedio);
        const subtotal = precio * art.cantidad;

        // Insertar detalle
        const detResult = await client.query(
          `INSERT INTO documentos_compra_detalle
           (documento_compra_id, articulo_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [documento.id, art.articulo_id, art.cantidad, precio, subtotal]
        );
        const detalleId = detResult.rows[0].id;

        // Solo para compras: entrada de inventario + actualizar costo_promedio
        if (tipo === 'compra') {
          // Registrar movimiento de entrada
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
             VALUES ($1, $2, 'entrada', $3, 'documento_compra', $4, 'documentos_compra_detalle', $5)`,
            [art.articulo_id, art.cantidad, almacen_id || 1, documento.id, detalleId]
          );

          // Actualizar costo_promedio (promedio ponderado simple)
          // costo_promedio = (costo_anterior * stock_anterior + precio_compra * cantidad_comprada) / stock_final
          const stockResult = await client.query(
            `SELECT COALESCE(
               (SELECT SUM(cantidad) FILTER (WHERE tipo_movimiento = 'entrada') -
                       SUM(cantidad) FILTER (WHERE tipo_movimiento = 'salida')
                FROM inventario_movimientos WHERE articulo_id = $1 AND id <= (
                  SELECT MAX(id) FROM inventario_movimientos WHERE referencia_id = $2 AND documento_detalle_tipo = 'documentos_compra_detalle'
                )),
               0
             ) AS stock_actual`,
            [art.articulo_id, documento.id]
          );
          const stockActual = parseFloat(stockResult.rows[0].stock_actual) || art.cantidad;
          const costoAnterior = parseFloat(artResult.rows[0].costo_promedio);
          const stockAnterior = stockActual - art.cantidad;

          let nuevoCostoPromedio;
          if (stockAnterior <= 0) {
            nuevoCostoPromedio = precio;
          } else {
            nuevoCostoPromedio = ((costoAnterior * stockAnterior) + (precio * art.cantidad)) / stockActual;
          }

          await client.query(
            'UPDATE articulos SET costo_promedio = $1 WHERE id = $2',
            [nuevoCostoPromedio, art.articulo_id]
          );
        }
      }

      await client.query('COMMIT');

      // Retornar documento completo
      const docCompleto = await client.query(
        `SELECT dc.*,
                ep.razon_social AS proveedor_nombre,
                ep.rfc AS proveedor_rfc,
                sd.serie,
                json_agg(json_build_object(
                  'id', dcd.id,
                  'articulo_id', dcd.articulo_id,
                  'articulo_nombre', a.nombre,
                  'articulo_sku', a.sku,
                  'cantidad', dcd.cantidad,
                  'precio_unitario', dcd.precio_unitario,
                  'subtotal', dcd.subtotal
                )) AS detalles
         FROM documentos_compra dc
         LEFT JOIN documentos_compra_detalle dcd ON dcd.documento_compra_id = dc.id
         LEFT JOIN articulos a ON a.id = dcd.articulo_id
         LEFT JOIN entidades ep ON ep.id = dc.proveedor_entidad_id
         LEFT JOIN series_documentos sd ON sd.id = dc.serie_id
         WHERE dc.id = $1
         GROUP BY dc.id, ep.razon_social, ep.rfc, sd.serie`,
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
   * Convierte un documento origen en uno nuevo (ej: orden_compra → compra).
   * @param {number} origenId - ID del documento origen
   * @param {string} nuevoTipo - 'compra' (desde orden_compra)
   * @param {Object} req - Request de Express
   */
  async convertirDocumento(origenId, nuevoTipo, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Conversión a ${nuevoTipo}`);

      // Obtener documento origen
      const origen = await client.query(
        'SELECT * FROM documentos_compra WHERE id = $1 AND estado NOT IN (\'cancelado\')',
        [origenId]
      );
      if (origen.rows.length === 0) {
        throw new Error(`Documento origen ID ${origenId} no encontrado o cancelado`);
      }
      const docOrigen = origen.rows[0];

      // Obtener detalles del origen
      const detalles = await client.query(
        'SELECT * FROM documentos_compra_detalle WHERE documento_compra_id = $1',
        [origenId]
      );

      // Armar datos para nuevo documento
      const datosNuevo = {
        proveedor_entidad_id: docOrigen.proveedor_entidad_id,
        entidad_comprador_id: docOrigen.entidad_comprador_id,
        metodo_pago: docOrigen.metodo_pago,
        forma_pago_id: docOrigen.forma_pago_id,
        terminos_pago_id: docOrigen.terminos_pago_id,
        fecha_vencimiento: docOrigen.fecha_vencimiento,
        almacen_id: docOrigen.almacen_id,
        articulos: detalles.rows.map(d => ({
          articulo_id: d.articulo_id,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
        })),
      };

      // Generar nuevo tipo
      const tipoFolioMap = { compra: 'COM' };
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
          'SELECT costo_promedio FROM articulos WHERE id = $1', [art.articulo_id]
        );
        const precio = art.precio_unitario != null
          ? parseFloat(art.precio_unitario)
          : parseFloat(artResult.rows[0]?.costo_promedio || 0);
        total += precio * art.cantidad;
      }

      // Insertar nuevo documento con referencia al origen
      const docResult = await client.query(
        `INSERT INTO documentos_compra
         (proveedor_entidad_id, entidad_comprador_id, folio, total, tipo, estado,
          documento_origen_id, metodo_pago, forma_pago_id, terminos_pago_id,
          fecha_vencimiento, serie_id, almacen_id)
         VALUES ($1, $2, $3, $4, $5, 'confirmado', $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [docOrigen.proveedor_entidad_id, docOrigen.entidad_comprador_id, folio, total,
         nuevoTipo, origenId, docOrigen.metodo_pago, docOrigen.forma_pago_id,
         docOrigen.terminos_pago_id, docOrigen.fecha_vencimiento, serieDefault?.id || null,
         docOrigen.almacen_id || 1]
      );
      const nuevoDoc = docResult.rows[0];

      // Insertar detalles y movimientos de inventario
      for (const det of detalles.rows) {
        const artRow = await client.query(
          'SELECT costo_promedio FROM articulos WHERE id = $1 FOR UPDATE',
          [det.articulo_id]
        );

        const detResult = await client.query(
          `INSERT INTO documentos_compra_detalle
           (documento_compra_id, articulo_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [nuevoDoc.id, det.articulo_id, det.cantidad, det.precio_unitario, det.subtotal]
        );
        const detalleId = detResult.rows[0].id;

        // Si es compra, generar movimiento de inventario y actualizar costo_promedio
        if (nuevoTipo === 'compra') {
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
             VALUES ($1, $2, 'entrada', $3, 'documento_compra', $4, 'documentos_compra_detalle', $5)`,
            [det.articulo_id, det.cantidad, docOrigen.almacen_id || 1, nuevoDoc.id, detalleId]
          );

          // Actualizar costo_promedio (promedio ponderado simple)
          const stockResult = await client.query(
            `SELECT COALESCE(SUM(cantidad) FILTER (WHERE tipo_movimiento = 'entrada'), 0) -
                    COALESCE(SUM(cantidad) FILTER (WHERE tipo_movimiento = 'salida'), 0) AS stock_actual
             FROM inventario_movimientos WHERE articulo_id = $1`,
            [det.articulo_id]
          );
          const stockActual = parseFloat(stockResult.rows[0].stock_actual) || det.cantidad;
          const costoAnterior = parseFloat(artRow.rows[0].costo_promedio);
          const stockAnterior = stockActual - det.cantidad;

          let nuevoCostoPromedio;
          if (stockAnterior <= 0) {
            nuevoCostoPromedio = parseFloat(det.precio_unitario);
          } else {
            nuevoCostoPromedio = ((costoAnterior * stockAnterior) + (parseFloat(det.precio_unitario) * det.cantidad)) / stockActual;
          }

          await client.query(
            'UPDATE articulos SET costo_promedio = $1 WHERE id = $2',
            [nuevoCostoPromedio, det.articulo_id]
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
   * Cancela un documento de compra y revierte inventario.
   */
  async cancelar(id, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Cancelación de documento compra ${id}`);

      const doc = await client.query(
        'SELECT * FROM documentos_compra WHERE id = $1 AND estado NOT IN (\'cancelado\') FOR UPDATE',
        [id]
      );
      if (doc.rows.length === 0) {
        throw new Error(`Documento compra ${id} no encontrado o ya cancelado`);
      }

      const documento = doc.rows[0];

      // Revertir inventario si era una compra
      if (documento.tipo === 'compra' && documento.estado === 'confirmado') {
        const movimientos = await client.query(
          `SELECT * FROM inventario_movimientos
           WHERE referencia_tipo = 'documento_compra' AND referencia_id = $1
           AND tipo_movimiento = 'entrada'`,
          [id]
        );
        for (const mov of movimientos.rows) {
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id)
             VALUES ($1, $2, 'salida', $3, 'cancelacion_documento_compra', $4)`,
            [mov.articulo_id, mov.cantidad, mov.almacen_id, id]
          );
        }
      }

      await client.query(
        `UPDATE documentos_compra SET estado = 'cancelado', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');
      return { id, estado: 'cancelado', mensaje: 'Documento de compra cancelado exitosamente' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Obtiene todos los documentos de compra con filtros.
   */
  async findAll(filtros = {}) {
    const { tipo, estado, proveedor } = filtros;
    const condiciones = [];
    const params = [];
    let idx = 1;

    if (tipo) { condiciones.push(`dc.tipo = $${idx}`); params.push(tipo); idx++; }
    if (estado) { condiciones.push(`dc.estado = $${idx}`); params.push(estado); idx++; }
    if (proveedor) { condiciones.push(`dc.proveedor_entidad_id = $${idx}`); params.push(proveedor); idx++; }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT dc.*,
              ep.razon_social AS proveedor_nombre,
              ep.rfc AS proveedor_rfc,
              sd.serie,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', dcd.id,
                  'articulo_id', dcd.articulo_id,
                  'articulo_nombre', a.nombre,
                  'articulo_sku', a.sku,
                  'cantidad', dcd.cantidad,
                  'precio_unitario', dcd.precio_unitario,
                  'subtotal', dcd.subtotal
                ))
                FROM documentos_compra_detalle dcd
                LEFT JOIN articulos a ON a.id = dcd.articulo_id
                WHERE dcd.documento_compra_id = dc.id),
                '[]'::json
              ) AS detalles
       FROM documentos_compra dc
       LEFT JOIN entidades ep ON ep.id = dc.proveedor_entidad_id
       LEFT JOIN series_documentos sd ON sd.id = dc.serie_id
       ${where}
       ORDER BY dc.fecha DESC`
    );
    return result.rows;
  },

  /**
   * Obtiene un documento de compra por ID, incluyendo origen y destino (trazabilidad).
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT dc.*,
              ep.razon_social AS proveedor_nombre,
              ep.rfc AS proveedor_rfc,
              sd.serie,
              json_agg(json_build_object(
                'id', dcd.id,
                'articulo_id', dcd.articulo_id,
                'articulo_nombre', a.nombre,
                'articulo_sku', a.sku,
                'cantidad', dcd.cantidad,
                'precio_unitario', dcd.precio_unitario,
                'subtotal', dcd.subtotal
              )) AS detalles,
              -- Documento origen (de dónde proviene)
              (SELECT json_build_object(
                'id', doc_origen.id,
                'tipo', doc_origen.tipo,
                'folio', doc_origen.folio
              ) FROM documentos_compra doc_origen WHERE doc_origen.id = dc.documento_origen_id) AS origen,
              -- Documento destino (qué se creó a partir de éste)
              (SELECT json_build_object(
                'id', doc_destino.id,
                'tipo', doc_destino.tipo,
                'folio', doc_destino.folio
              ) FROM documentos_compra doc_destino WHERE doc_destino.documento_origen_id = dc.id LIMIT 1) AS destino
       FROM documentos_compra dc
       LEFT JOIN documentos_compra_detalle dcd ON dcd.documento_compra_id = dc.id
       LEFT JOIN articulos a ON a.id = dcd.articulo_id
       LEFT JOIN entidades ep ON ep.id = dc.proveedor_entidad_id
       LEFT JOIN series_documentos sd ON sd.id = dc.serie_id
       WHERE dc.id = $1
       GROUP BY dc.id, ep.razon_social, ep.rfc, sd.serie`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = DocumentosCompraModel;
