const pool = require('../db');
const { setAuditContext } = require('../utils/auditContext');

/**
 * Modelo Unificado de Transacciones
 *
 * Maneja ventas, compras, cotizaciones, órdenes, ajustes de inventario,
 * entradas/salidas de inventario, pagos y cobros sobre las tablas unificadas:
 *   transacciones, transacciones_detalle, transacciones_series, transacciones_contables
 *
 * Diseñado para reemplazar gradualmente DocumentosVentaModel y DocumentosCompraModel.
 */
const TransaccionesModel = {
  // ================================================================
  // MAPAS DE CONFIGURACIÓN
  // ================================================================

  /** Mapeo de tipo de transacción → código de folio */
  _tipoFolioMap: {
    cotizacion:        'COT',
    orden_venta:       'OV',
    venta:             'FAC',
    orden_compra:      'OC',
    compra:            'COM',
    ajuste_inventario: 'AJU',
    entrada_inventario:'ENT',
    salida_inventario: 'SAL',
    pago:              'PAG',
    cobro:             'COB',
  },

  /** Mapeo de tipo de transacción → tipo de serie de documento */
  _tipoSerieMap: {
    cotizacion:        'cotizacion',
    orden_venta:       'orden_venta',
    venta:             'venta',
    orden_compra:      'orden_compra',
    compra:            'compra',
    ajuste_inventario: 'ajuste',
    entrada_inventario:'entrada',
    salida_inventario: 'salida',
    pago:              'pago',
    cobro:             'cobro',
  },

  /** Tipos que afectan inventario (salida) */
  _tiposSalida: new Set(['venta', 'salida_inventario']),

  /** Tipos que afectan inventario (entrada) */
  _tiposEntrada: new Set(['compra', 'entrada_inventario']),

  /** Tipos que generan asientos contables automáticos */
  _tiposContables: new Set(['venta', 'compra', 'pago', 'cobro']),

  // ================================================================
  // HELPERS PRIVADOS
  // ================================================================

  /**
   * Valida que una entidad tenga un rol específico.
   * @param {number} entidadId
   * @param {string} rolEsperado - 'cliente', 'proveedor', 'vendedor'
   * @returns {Object|null}
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
   * Obtiene la serie_id por defecto según el tipo de transacción.
   * @param {Object} client - Cliente pg en transacción
   * @param {string} tipo - Tipo de transacción
   * @returns {Object|null}
   */
  async _getSeriePorDefecto(client, tipo) {
    const tipoDoc = this._tipoSerieMap[tipo] || 'venta';
    const result = await client.query(
      'SELECT id, serie FROM series_documentos WHERE tipo = $1 AND activo = true LIMIT 1',
      [tipoDoc]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene el tipo de movimiento de inventario según el tipo de transacción
   * y el signo del ajuste (para ajuste_inventario).
   * @param {string} tipo
   * @param {number} [cantidad] - Si es ajuste_inventario, positivo=entrada, negativo=salida
   * @returns {'entrada'|'salida'|'ninguno'}
   */
  _getTipoMovimiento(tipo, cantidad) {
    if (tipo === 'orden_venta' || tipo === 'orden_compra' || tipo === 'cotizacion') {
      return 'ninguno';
    }
    if (tipo === 'ajuste_inventario') {
      return cantidad > 0 ? 'entrada' : 'salida';
    }
    if (this._tiposSalida.has(tipo)) return 'salida';
    if (this._tiposEntrada.has(tipo)) return 'entrada';
    return 'ninguno';
  },

  /**
   * Determina si un tipo de transacción afecta inventario.
   */
  _afectaInventario(tipo) {
    return this._tiposSalida.has(tipo) || this._tiposEntrada.has(tipo) || tipo === 'ajuste_inventario';
  },

  // ================================================================
  // MÉTODO PRINCIPAL: crearTransaccion
  // ================================================================

  /**
   * Crea una transacción unificada (venta, compra, cotización, orden, inventario, pago/cobro).
   *
   * @param {string} tipo - Tipo de transacción
   * @param {Object} datos - Datos de la transacción
   * @param {Object} req - Request de Express (para auditoría)
   * @returns {Object} Transacción completa con detalles
   */
  async crearTransaccion(tipo, datos, req) {
    const {
      entidad_cliente_id,
      entidad_proveedor_id,
      entidad_vendedor_id,
      almacen_id,
      metodo_pago,
      forma_pago_id,
      terminos_pago_id,
      serie_id,
      fecha_vencimiento,
      comentario,
      moneda_id,
      articulos = [],
    } = datos;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Creación de ${tipo}`);

      // ============================================
      // VALIDACIONES
      // ============================================

      // Validar cliente si el tipo lo requiere
      if (tipo.includes('venta') || tipo === 'cotizacion') {
        if (!entidad_cliente_id) {
          throw new Error('entidad_cliente_id es requerido para transacciones de venta');
        }
        const cliente = await this._validarEntidadConRol(entidad_cliente_id, 'cliente');
        if (!cliente) {
          throw new Error(`La entidad con ID ${entidad_cliente_id} no existe como cliente activo`);
        }
      }

      // Validar proveedor si el tipo lo requiere
      if (tipo.includes('compra')) {
        if (!entidad_proveedor_id) {
          throw new Error('entidad_proveedor_id es requerido para transacciones de compra');
        }
        const proveedor = await this._validarEntidadConRol(entidad_proveedor_id, 'proveedor');
        if (!proveedor) {
          throw new Error(`La entidad con ID ${entidad_proveedor_id} no existe como proveedor activo`);
        }
      }

      // Validar vendedor opcional
      if (entidad_vendedor_id) {
        const vendedor = await this._validarEntidadConRol(entidad_vendedor_id, 'vendedor');
        if (!vendedor) {
          throw new Error(`La entidad con ID ${entidad_vendedor_id} no existe como vendedor activo`);
        }
      }

      // ============================================
      // SERIE
      // ============================================
      let serie = serie_id;
      if (!serie) {
        const serieDefault = await this._getSeriePorDefecto(client, tipo);
        serie = serieDefault?.id || null;
      }

      // ============================================
      // FOLIO ATÓMICO
      // ============================================
      const tipoFolio = this._tipoFolioMap[tipo] || 'FAC';
      const folioResult = await client.query(
        'SELECT obtener_folio($1) AS folio', [tipoFolio]
      );
      const folio = folioResult.rows[0].folio;

      // ============================================
      // CALCULAR TOTAL
      // ============================================
      let total = 0;
      const detallesArticulos = [];

      for (const art of articulos) {
        // Traer datos del artículo
        const artResult = await client.query(
          'SELECT precio_venta, costo_promedio, usa_serie FROM articulos WHERE id = $1',
          [art.articulo_id]
        );
        if (artResult.rows.length === 0) {
          throw new Error(`Artículo con ID ${art.articulo_id} no encontrado`);
        }
        const artData = artResult.rows[0];

        // Determinar precio:
        // - Para ventas confirmadas: usar precio_venta del artículo
        // - Para compras: usar el precio_unitario enviado (costo_promedio sugerido)
        // - Para cotizaciones/órdenes: usar precio_unitario enviado
        let precio;
        if (tipo === 'venta') {
          precio = parseFloat(artData.precio_venta);
        } else if (tipo === 'compra') {
          precio = art.precio_unitario != null
            ? parseFloat(art.precio_unitario)
            : parseFloat(artData.costo_promedio);
        } else {
          precio = art.precio_unitario != null
            ? parseFloat(art.precio_unitario)
            : parseFloat(artData.precio_venta);
        }

        const cantidad = parseFloat(art.cantidad) || 0;
        const subtotal = precio * cantidad;
        total += subtotal;

        detallesArticulos.push({
          ...art,
          precio_unitario: precio,
          subtotal,
          usa_serie: artData.usa_serie,
          tipo_movimiento: this._getTipoMovimiento(tipo, cantidad),
          impuesto_id: art.impuesto_id || null,
          cuenta_contable_id: art.cuenta_contable_id || null,
          numero_serie: art.numero_serie || null,
        });
      }

      // ============================================
      // INSERTAR TRANSACCIÓN
      // ============================================
      const insertResult = await client.query(
        `INSERT INTO transacciones
         (tipo, estado, folio, total, moneda_id,
          entidad_cliente_id, entidad_proveedor_id, entidad_vendedor_id,
          almacen_id, metodo_pago, forma_pago_id, terminos_pago_id,
          serie_id, fecha_vencimiento, comentario)
         VALUES ($1, 'confirmado', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [tipo, folio, total, moneda_id || 1,
         entidad_cliente_id || null, entidad_proveedor_id || null, entidad_vendedor_id || null,
         almacen_id || null, metodo_pago || 'efectivo', forma_pago_id || null,
         terminos_pago_id || null, serie, fecha_vencimiento || null, comentario || null]
      );
      const transaccion = insertResult.rows[0];

      // ============================================
      // INSERTAR DETALLES + INVENTARIO + SERIES
      // ============================================
      const almacenId = almacen_id || 1;

      for (const det of detallesArticulos) {
        // INSERT en transacciones_detalle
        const detResult = await client.query(
          `INSERT INTO transacciones_detalle
           (transaccion_id, articulo_id, cantidad, precio_unitario, subtotal,
            impuesto_id, cuenta_contable_id, almacen_id, tipo_movimiento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [transaccion.id, det.articulo_id, det.cantidad, det.precio_unitario, det.subtotal,
           det.impuesto_id, det.cuenta_contable_id, almacenId, det.tipo_movimiento]
        );
        const detalle = detResult.rows[0];

        // Registrar movimiento en inventario_movimientos (para compatibilidad con consultas de stock)
        if (this._afectaInventario(tipo) && det.tipo_movimiento !== 'ninguno') {
          const cantidadMov = (det.tipo_movimiento === 'salida') ? -det.cantidad : det.cantidad;
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
             VALUES ($1, $2, $3, $4, 'transaccion', $5, 'transacciones_detalle', $6)`,
            [det.articulo_id, Math.abs(cantidadMov), det.tipo_movimiento, almacenId,
             transaccion.id, detalle.id]
          );

          // Actualizar costo_promedio en compras (promedio ponderado)
          if (tipo === 'compra') {
            const stockResult = await client.query(
              `SELECT COALESCE(
                 SUM(cantidad) FILTER (WHERE tipo_movimiento = 'entrada'), 0
               ) - COALESCE(
                 SUM(cantidad) FILTER (WHERE tipo_movimiento = 'salida'), 0
               ) AS stock_actual
               FROM inventario_movimientos WHERE articulo_id = $1`,
              [det.articulo_id]
            );
            const stockActual = parseFloat(stockResult.rows[0].stock_actual) || det.cantidad;
            const artRow = await client.query(
              'SELECT costo_promedio FROM articulos WHERE id = $1',
              [det.articulo_id]
            );
            const costoAnterior = parseFloat(artRow.rows[0].costo_promedio);
            const stockAnterior = stockActual - det.cantidad;

            let nuevoCosto;
            if (stockAnterior <= 0) {
              nuevoCosto = det.precio_unitario;
            } else {
              nuevoCosto = ((costoAnterior * stockAnterior) + (det.precio_unitario * det.cantidad)) / stockActual;
            }

            await client.query(
              'UPDATE articulos SET costo_promedio = $1 WHERE id = $2',
              [nuevoCosto, det.articulo_id]
            );
          }
        }

        // Manejo de series
        if (det.usa_serie && det.numero_serie) {
          if (det.tipo_movimiento === 'salida') {
            // Validar que la serie exista y esté disponible
            const serieCheck = await client.query(
              "SELECT id FROM articulos_series WHERE articulo_id = $1 AND numero_serie = $2 AND estado = 'disponible'",
              [det.articulo_id, det.numero_serie]
            );
            if (serieCheck.rows.length === 0) {
              throw new Error(
                `Serie ${det.numero_serie} no disponible para artículo ${det.articulo_id}`
              );
            }
            // Marcar como vendida en articulos_series
            await client.query(
              "UPDATE articulos_series SET estado = 'vendido' WHERE id = $1",
              [serieCheck.rows[0].id]
            );
          }

          // Insertar en transacciones_series
          const estadoSerie = det.tipo_movimiento === 'salida' ? 'vendido' : 'disponible';
          await client.query(
            `INSERT INTO transacciones_series (transaccion_detalle_id, numero_serie, estado)
             VALUES ($1, $2, $3)`,
            [detalle.id, det.numero_serie, estadoSerie]
          );
        }
      }

      // ============================================
      // ASIENTOS CONTABLES AUTOMÁTICOS
      // ============================================
      if (this._tiposContables.has(tipo)) {
        await this._generarAsientosContables(client, tipo, transaccion, detallesArticulos);
      }

      await client.query('COMMIT');

      // Retornar la transacción completa
      return await this.findById(transaccion.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ================================================================
  // ASIENTOS CONTABLES
  // ================================================================

  /**
   * Genera asientos contables automáticos según el tipo de transacción.
   * @param {Object} client - Cliente pg en transacción
   * @param {string} tipo
   * @param {Object} transaccion
   * @param {Array} detalles
   */
  async _generarAsientosContables(client, tipo, transaccion, detalles) {
    // Obtener tasa IVA de configuración del sistema
    let ivaTasa = 0.16;
    try {
      const cfgResult = await client.query(
        "SELECT valor FROM configuracion_sistema WHERE clave = 'iva_tasa'"
      );
      if (cfgResult.rows.length > 0) {
        ivaTasa = parseFloat(cfgResult.rows[0].valor) || 0.16;
      }
    } catch {
      // Si no existe la config, usar valor por defecto
      ivaTasa = 0.16;
    }

    // Buscar IDs de cuentas contables por código
    const cuentasResult = await client.query(
      `SELECT codigo, id FROM cuentas_contables WHERE codigo IN ('1101','1102','1200','1300','2100','2200','4100','5100')`
    );
    const cuentas = {};
    for (const row of cuentasResult.rows) {
      cuentas[row.codigo] = row.id;
    }

    // IDs por defecto (fallback)
    const defaultCxcId = cuentas['1200'] || null;
    const defaultCajaId = cuentas['1101'] || null;
    const defaultBancosId = cuentas['1102'] || null;
    const defaultProveedoresId = cuentas['2100'] || null;
    const defaultIvaPagarId = cuentas['2200'] || null;
    const defaultVentasId = cuentas['4100'] || null;
    const defaultInventarioId = cuentas['1300'] || null;
    const defaultCostoVentasId = cuentas['5100'] || null;

    const totalSinIva = detalles.reduce((s, d) => s + d.subtotal, 0);
    const ivaMonto = totalSinIva * ivaTasa;
    const totalConIva = totalSinIva + ivaMonto;

    if (tipo === 'venta') {
      // Cargo a Clientes (o Caja según método de pago)
      let cuentaCargo = defaultCxcId || defaultCajaId;
      if (transaccion.metodo_pago === 'transferencia' || transaccion.metodo_pago === 'cheque') {
        cuentaCargo = defaultBancosId || cuentaCargo;
      }

      if (cuentaCargo && defaultVentasId) {
        // Cargo: Clientes/Bancos/Caja
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, cuentaCargo, totalConIva]
        );
        // Abono: Ventas
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, defaultVentasId, totalSinIva]
        );
        // Abono: IVA por pagar
        if (defaultIvaPagarId && ivaMonto > 0) {
          await client.query(
            `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
             VALUES ($1, $2, 0, $3)`,
            [transaccion.id, defaultIvaPagarId, ivaMonto]
          );
        }
        // Cargo: Costo de Ventas / Abono: Inventario
        if (defaultCostoVentasId && defaultInventarioId) {
          // Tomar el costo total de los artículos vendidos
          let costoTotal = 0;
          for (const det of detalles) {
            const costo = await client.query(
              'SELECT costo_promedio FROM articulos WHERE id = $1',
              [det.articulo_id]
            );
            costoTotal += (parseFloat(costo.rows[0]?.costo_promedio || 0) * det.cantidad);
          }
          await client.query(
            `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
             VALUES ($1, $2, $3, 0)`,
            [transaccion.id, defaultCostoVentasId, costoTotal]
          );
          await client.query(
            `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
             VALUES ($1, $2, 0, $3)`,
            [transaccion.id, defaultInventarioId, costoTotal]
          );
        }
      }
    } else if (tipo === 'compra') {
      // Cargo: Inventario
      if (defaultInventarioId) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, defaultInventarioId, totalSinIva]
        );
      }
      // Cargo: IVA acreditable (como parte de 2200, usamos la misma cuenta pero sería mejor una cuenta de IVA acreditable)
      if (defaultIvaPagarId && ivaMonto > 0) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, defaultIvaPagarId, ivaMonto]
        );
      }
      // Abono: Proveedores (o Caja según método de pago)
      let cuentaAbono = defaultProveedoresId || defaultCajaId;
      if (transaccion.metodo_pago === 'transferencia' || transaccion.metodo_pago === 'cheque') {
        cuentaAbono = defaultBancosId || cuentaAbono;
      }
      if (cuentaAbono) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, cuentaAbono, totalConIva]
        );
      }
    } else if (tipo === 'cobro') {
      // Simplificado: Cargo a Caja, Abono a Clientes
      if (defaultCajaId && defaultCxcId) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, defaultCajaId, totalConIva]
        );
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, defaultCxcId, totalConIva]
        );
      }
    } else if (tipo === 'pago') {
      // Simplificado: Cargo a Proveedores, Abono a Caja
      if (defaultProveedoresId && defaultCajaId) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, defaultProveedoresId, totalConIva]
        );
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, defaultCajaId, totalConIva]
        );
      }
    }
  },

  // ================================================================
  // convertirTransaccion
  // ================================================================

  /**
   * Convierte una transacción origen en un nuevo tipo (ej: cotizacion → orden_venta → venta).
   * @param {number} origenId - ID de la transacción origen
   * @param {string} nuevoTipo - Tipo destino
   * @param {Object} req - Request de Express
   * @returns {Object} Nueva transacción
   */
  async convertirTransaccion(origenId, nuevoTipo, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Conversión a ${nuevoTipo}`);

      // Obtener transacción origen
      const origen = await client.query(
        "SELECT * FROM transacciones WHERE id = $1 AND estado NOT IN ('cancelado')",
        [origenId]
      );
      if (origen.rows.length === 0) {
        throw new Error(`Transacción origen ID ${origenId} no encontrada o cancelada`);
      }
      const docOrigen = origen.rows[0];

      // Validar conversión lógica
      const conversionesPermitidas = {
        cotizacion:  ['orden_venta', 'venta'],
        orden_venta: ['venta'],
        orden_compra:['compra'],
      };
      const permitidos = conversionesPermitidas[docOrigen.tipo] || [];
      if (!permitidos.includes(nuevoTipo)) {
        throw new Error(
          `No se puede convertir ${docOrigen.tipo} a ${nuevoTipo}. ` +
          `Conversiones permitidas: ${permitidos.join(', ') || 'ninguna'}`
        );
      }

      // Obtener detalles del origen
      const detalles = await client.query(
        'SELECT * FROM transacciones_detalle WHERE transaccion_id = $1',
        [origenId]
      );

      // Armar datos para nueva transacción
      const articulos = detalles.rows.map(d => ({
        articulo_id: d.articulo_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        impuesto_id: d.impuesto_id,
        cuenta_contable_id: d.cuenta_contable_id,
      }));

      // Generar folio
      const tipoFolio = this._tipoFolioMap[nuevoTipo] || 'FAC';
      const folioResult = await client.query(
        'SELECT obtener_folio($1) AS folio', [tipoFolio]
      );
      const folio = folioResult.rows[0].folio;

      // Obtener serie
      const serieDefault = await this._getSeriePorDefecto(client, nuevoTipo);

      // Calcular total
      let total = 0;
      for (const art of articulos) {
        const artResult = await client.query(
          'SELECT precio_venta, costo_promedio FROM articulos WHERE id = $1',
          [art.articulo_id]
        );
        if (artResult.rows.length === 0) {
          throw new Error(`Artículo con ID ${art.articulo_id} no encontrado`);
        }
        let precio;
        if (nuevoTipo === 'venta') {
          precio = parseFloat(artResult.rows[0].precio_venta);
        } else {
          precio = art.precio_unitario != null
            ? parseFloat(art.precio_unitario)
            : parseFloat(artResult.rows[0].costo_promedio);
        }
        total += precio * art.cantidad;
      }

      // Insertar nueva transacción con documento_origen_id
      const insertResult = await client.query(
        `INSERT INTO transacciones
         (tipo, estado, folio, total, moneda_id,
          entidad_cliente_id, entidad_proveedor_id, entidad_vendedor_id,
          almacen_id, metodo_pago, forma_pago_id, terminos_pago_id,
          serie_id, fecha_vencimiento, comentario, documento_origen_id)
         VALUES ($1, 'confirmado', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [nuevoTipo, folio, total, docOrigen.moneda_id || 1,
         docOrigen.entidad_cliente_id, docOrigen.entidad_proveedor_id, docOrigen.entidad_vendedor_id,
         docOrigen.almacen_id, docOrigen.metodo_pago || 'efectivo', docOrigen.forma_pago_id,
         docOrigen.terminos_pago_id, serieDefault?.id || null, docOrigen.fecha_vencimiento,
         `Convertido desde ${docOrigen.tipo} ${docOrigen.folio}`, origenId]
      );
      const nuevaTransaccion = insertResult.rows[0];

      // Insertar detalles y movimientos de inventario
      const almacenId = docOrigen.almacen_id || 1;

      for (const det of detalles.rows) {
        const tipoMov = this._getTipoMovimiento(nuevoTipo, det.cantidad);

        const detResult = await client.query(
          `INSERT INTO transacciones_detalle
           (transaccion_id, articulo_id, cantidad, precio_unitario, subtotal,
            impuesto_id, cuenta_contable_id, almacen_id, tipo_movimiento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [nuevaTransaccion.id, det.articulo_id, det.cantidad, det.precio_unitario,
           det.subtotal, det.impuesto_id, det.cuenta_contable_id, almacenId, tipoMov]
        );
        const detalleId = detResult.rows[0].id;

        // Solo para tipos que afectan inventario (no órdenes/cotizaciones)
        if (this._afectaInventario(nuevoTipo) && tipoMov !== 'ninguno') {
          const cantidadMov = (tipoMov === 'salida') ? -det.cantidad : det.cantidad;
          await client.query(
            `INSERT INTO inventario_movimientos
             (articulo_id, cantidad, tipo_movimiento, almacen_id,
              referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
             VALUES ($1, $2, $3, $4, 'transaccion', $5, 'transacciones_detalle', $6)`,
            [det.articulo_id, Math.abs(cantidadMov), tipoMov, almacenId,
             nuevaTransaccion.id, detalleId]
          );
        }
      }

      // Generar asientos contables si aplica
      const nuevosDetalles = detalles.rows.map(d => ({
        articulo_id: d.articulo_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal,
        tipo_movimiento: this._getTipoMovimiento(nuevoTipo, d.cantidad),
      }));

      if (this._tiposContables.has(nuevoTipo)) {
        await this._generarAsientosContables(client, nuevoTipo, nuevaTransaccion, nuevosDetalles);
      }

      await client.query('COMMIT');

      return await this.findById(nuevaTransaccion.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ================================================================
  // cancelarTransaccion
  // ================================================================

  /**
   * Cancela una transacción y revierte los movimientos de inventario/series.
   * @param {number} id - ID de la transacción
   * @param {Object} req - Request de Express
   * @returns {Object} Resultado
   */
  async cancelarTransaccion(id, req) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Cancelación de transacción ${id}`);

      // Obtener transacción con lock
      const doc = await client.query(
        "SELECT * FROM transacciones WHERE id = $1 AND estado NOT IN ('cancelado') FOR UPDATE",
        [id]
      );
      if (doc.rows.length === 0) {
        throw new Error(`Transacción ${id} no encontrada o ya cancelada`);
      }
      const transaccion = doc.rows[0];

      // Obtener detalles con tipo_movimiento
      const detalles = await client.query(
        "SELECT * FROM transacciones_detalle WHERE transaccion_id = $1 AND tipo_movimiento IN ('entrada','salida')",
        [id]
      );

      // Revertir inventario: generar movimientos inversos
      for (const det of detalles.rows) {
        const tipoInverso = det.tipo_movimiento === 'entrada' ? 'salida' : 'entrada';
        await client.query(
          `INSERT INTO inventario_movimientos
           (articulo_id, cantidad, tipo_movimiento, almacen_id,
            referencia_tipo, referencia_id)
           VALUES ($1, $2, $3, $4, 'cancelacion_transaccion', $5)`,
          [det.articulo_id, det.cantidad, tipoInverso, det.almacen_id, id]
        );
      }

      // Liberar series si las hay (cambiar estado a 'disponible')
      await client.query(
        `UPDATE transacciones_series ts
         SET estado = 'disponible'
         FROM transacciones_detalle td
         WHERE td.id = ts.transaccion_detalle_id
           AND td.transaccion_id = $1
           AND ts.estado = 'vendido'`,
        [id]
      );

      // También liberar en articulos_series si se marcaron como vendidos
      await client.query(
        `UPDATE articulos_series aser
         SET estado = 'disponible'
         FROM transacciones_detalle td
         JOIN transacciones_series ts ON ts.transaccion_detalle_id = td.id
         WHERE td.transaccion_id = $1
           AND ts.numero_serie = aser.numero_serie
           AND aser.articulo_id = td.articulo_id
           AND aser.estado = 'vendido'`,
        [id]
      );

      // Cambiar estado de la transacción
      await client.query(
        "UPDATE transacciones SET estado = 'cancelado', updated_at = NOW() WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');
      return { id, estado: 'cancelado', mensaje: 'Transacción cancelada exitosamente' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ================================================================
  // findAll - Listar transacciones con filtros
  // ================================================================

  /**
   * Obtiene todas las transacciones con filtros opcionales.
   * @param {Object} filtros - { tipo, estado, entidad_cliente_id, entidad_proveedor_id, fecha_desde, fecha_hasta }
   * @returns {Array}
   */
  async findAll(filtros = {}) {
    const { tipo, estado, entidad_cliente_id, entidad_proveedor_id, fecha_desde, fecha_hasta } = filtros;
    const condiciones = [];
    const params = [];
    let idx = 1;

    if (tipo) {
      condiciones.push(`t.tipo = $${idx}`);
      params.push(tipo);
      idx++;
    }
    if (estado) {
      condiciones.push(`t.estado = $${idx}`);
      params.push(estado);
      idx++;
    }
    if (entidad_cliente_id) {
      condiciones.push(`t.entidad_cliente_id = $${idx}`);
      params.push(entidad_cliente_id);
      idx++;
    }
    if (entidad_proveedor_id) {
      condiciones.push(`t.entidad_proveedor_id = $${idx}`);
      params.push(entidad_proveedor_id);
      idx++;
    }
    if (fecha_desde) {
      condiciones.push(`t.fecha >= $${idx}`);
      params.push(fecha_desde);
      idx++;
    }
    if (fecha_hasta) {
      condiciones.push(`t.fecha <= $${idx}`);
      params.push(fecha_hasta);
      idx++;
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT t.*,
              ec.razon_social AS cliente_nombre,
              ec.rfc AS cliente_rfc,
              ep.razon_social AS proveedor_nombre,
              ep.rfc AS proveedor_rfc,
              ev.razon_social AS vendedor_nombre,
              sd.serie,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', td.id,
                  'articulo_id', td.articulo_id,
                  'articulo_nombre', a.nombre,
                  'articulo_sku', a.sku,
                  'cantidad', td.cantidad,
                  'precio_unitario', td.precio_unitario,
                  'subtotal', td.subtotal,
                  'tipo_movimiento', td.tipo_movimiento
                ))
                FROM transacciones_detalle td
                LEFT JOIN articulos a ON a.id = td.articulo_id
                WHERE td.transaccion_id = t.id),
                '[]'::json
              ) AS detalles
       FROM transacciones t
       LEFT JOIN entidades ec ON ec.id = t.entidad_cliente_id
       LEFT JOIN entidades ep ON ep.id = t.entidad_proveedor_id
       LEFT JOIN entidades ev ON ev.id = t.entidad_vendedor_id
       LEFT JOIN series_documentos sd ON sd.id = t.serie_id
       ${where}
       ORDER BY t.fecha DESC`
    );
    return result.rows;
  },

  // ================================================================
  // findById - Obtener transacción completa por ID
  // ================================================================

  /**
   * Obtiene una transacción completa con detalles, series y asientos contables.
   * @param {number} id
   * @returns {Object|null}
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT t.*,
              ec.razon_social AS cliente_nombre,
              ec.rfc AS cliente_rfc,
              ep.razon_social AS proveedor_nombre,
              ep.rfc AS proveedor_rfc,
              ev.razon_social AS vendedor_nombre,
              sd.serie,
              tp.nombre AS terminos_pago_nombre,
              tp.dias_credito,
              m.codigo AS moneda_codigo,
              a.nombre AS almacen_nombre,
              -- Detalles con series
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', td.id,
                  'articulo_id', td.articulo_id,
                  'articulo_nombre', art.nombre,
                  'articulo_sku', art.sku,
                  'cantidad', td.cantidad,
                  'precio_unitario', td.precio_unitario,
                  'subtotal', td.subtotal,
                  'impuesto_id', td.impuesto_id,
                  'cuenta_contable_id', td.cuenta_contable_id,
                  'tipo_movimiento', td.tipo_movimiento,
                  'series', COALESCE((
                    SELECT json_agg(json_build_object(
                      'id', ts.id,
                      'numero_serie', ts.numero_serie,
                      'estado', ts.estado
                    ))
                    FROM transacciones_series ts
                    WHERE ts.transaccion_detalle_id = td.id
                  ), '[]'::json)
                ))
                FROM transacciones_detalle td
                LEFT JOIN articulos art ON art.id = td.articulo_id
                WHERE td.transaccion_id = t.id),
                '[]'::json
              ) AS detalles,
              -- Asientos contables
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', tc.id,
                  'cuenta_contable_id', tc.cuenta_contable_id,
                  'cuenta_codigo', cc.codigo,
                  'cuenta_nombre', cc.nombre,
                  'debe', tc.debe,
                  'haber', tc.haber,
                  'fecha', tc.fecha
                ))
                FROM transacciones_contables tc
                LEFT JOIN cuentas_contables cc ON cc.id = tc.cuenta_contable_id
                WHERE tc.transaccion_id = t.id),
                '[]'::json
              ) AS asientos_contables,
              -- Documento origen
              (SELECT json_build_object(
                'id', t_origen.id,
                'tipo', t_origen.tipo,
                'folio', t_origen.folio,
                'estado', t_origen.estado
              ) FROM transacciones t_origen WHERE t_origen.id = t.documento_origen_id) AS origen,
              -- Documento destino (el que se creó a partir de éste)
              (SELECT json_build_object(
                'id', t_destino.id,
                'tipo', t_destino.tipo,
                'folio', t_destino.folio,
                'estado', t_destino.estado
              ) FROM transacciones t_destino WHERE t_destino.documento_origen_id = t.id LIMIT 1) AS destino
       FROM transacciones t
       LEFT JOIN entidades ec ON ec.id = t.entidad_cliente_id
       LEFT JOIN entidades ep ON ep.id = t.entidad_proveedor_id
       LEFT JOIN entidades ev ON ev.id = t.entidad_vendedor_id
       LEFT JOIN series_documentos sd ON sd.id = t.serie_id
       LEFT JOIN terminos_pago tp ON tp.id = t.terminos_pago_id
       LEFT JOIN monedas m ON m.id = t.moneda_id
       LEFT JOIN almacenes a ON a.id = t.almacen_id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = TransaccionesModel;
