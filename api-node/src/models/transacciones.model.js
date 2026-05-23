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
    cotizacion:         'COT',
    orden_venta:        'OV',
    venta:              'FAC',
    orden_compra:       'OC',
    compra:             'COM',
    cotizacion_compra:  'COTC',
    recepcion_compra:   'RECC',
    traspaso:           'TRAS',
    recepcion_traspaso: 'RECT',
    ajuste_inventario:  'AJU',
    entrada_inventario: 'ENT',
    salida_inventario:  'SAL',
    pago:               'PAG',
    cobro:              'COB',
    asiento_manual:     'CONT',
  },

  /** Mapeo de tipo de transacción → tipo de serie de documento */
  _tipoSerieMap: {
    cotizacion:         'cotizacion',
    orden_venta:        'orden_venta',
    venta:              'venta',
    orden_compra:       'orden_compra',
    compra:             'compra',
    cotizacion_compra:  'cotizacion_compra',
    recepcion_compra:   'recepcion_compra',
    traspaso:           'traspaso',
    recepcion_traspaso: 'recepcion_traspaso',
    ajuste_inventario:  'ajuste',
    entrada_inventario: 'entrada',
    salida_inventario:  'salida',
    pago:               'pago',
    cobro:              'cobro',
  },

  /** Tipos que afectan inventario (salida) */
  _tiposSalida: new Set(['venta', 'salida_inventario', 'traspaso']),

  /** Tipos que afectan inventario (entrada) */
  _tiposEntrada: new Set(['compra', 'entrada_inventario', 'recepcion_compra', 'recepcion_traspaso']),

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
    if (tipo === 'orden_venta' || tipo === 'orden_compra' || tipo === 'cotizacion' || tipo === 'cotizacion_compra') {
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
   * Crea una transacción unificada (venta, compra, cotización, orden, inventario, pago/cobro, asiento_manual).
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
      almacen_destino_id,
      documento_origen_id,
      metodo_pago,
      forma_pago_id,
      terminos_pago_id,
      serie_id,
      fecha_vencimiento,
      comentario,
      moneda_id,
      articulos = [],
      tipo_concepto = 'estandar',
    } = datos;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setAuditContext(client, req?.usuario?.id, req?.ip, `Creación de ${tipo}`);

      // ============================================
      // VALIDACIONES GENERALES
      // ============================================

      if (tipo.includes('venta') || tipo === 'cotizacion') {
        if (!entidad_cliente_id) {
          throw new Error('entidad_cliente_id es requerido para transacciones de venta');
        }
        const cliente = await this._validarEntidadConRol(entidad_cliente_id, 'cliente');
        if (!cliente) {
          throw new Error(`La entidad con ID ${entidad_cliente_id} no existe como cliente activo`);
        }
      }

      if (tipo.includes('compra')) {
        if (!entidad_proveedor_id) {
          throw new Error('entidad_proveedor_id es requerido para transacciones de compra');
        }
        const proveedor = await this._validarEntidadConRol(entidad_proveedor_id, 'proveedor');
        if (!proveedor) {
          throw new Error(`La entidad con ID ${entidad_proveedor_id} no existe como proveedor activo`);
        }
      }

      if (entidad_vendedor_id) {
        const vendedor = await this._validarEntidadConRol(entidad_vendedor_id, 'vendedor');
        if (!vendedor) {
          throw new Error(`La entidad con ID ${entidad_vendedor_id} no existe como vendedor activo`);
        }
      }

      // ============================================
      // COBRO: validar factura_id
      // ============================================
      if (tipo === 'cobro') {
        if (!datos.factura_id) {
          throw new Error('factura_id es requerido para registrar un cobro');
        }
        if (!datos.monto_abono || parseFloat(datos.monto_abono) <= 0) {
          throw new Error('monto_abono debe ser mayor a 0 para registrar un cobro');
        }
        // Validar que la factura exista y tenga saldo pendiente
        const facResult = await client.query(
          "SELECT id, total, saldo_restante, estado_saldo FROM transacciones WHERE id = $1 AND tipo = 'venta' AND estado_saldo IN ('pendiente', 'parcial')",
          [datos.factura_id]
        );
        if (facResult.rows.length === 0) {
          throw new Error(`Factura ID ${datos.factura_id} no encontrada o ya liquidada`);
        }
        const factura = facResult.rows[0];
        const montoAbono = parseFloat(datos.monto_abono);
        if (montoAbono > parseFloat(factura.saldo_restante)) {
          throw new Error(`El monto del cobro (${montoAbono}) excede el saldo restante (${factura.saldo_restante})`);
        }
      }

      // ============================================
      // PAGO: validar factura_id (compra a proveedor)
      // ============================================
      if (tipo === 'pago') {
        if (!datos.factura_id) {
          throw new Error('factura_id es requerido para registrar un pago');
        }
        if (!datos.monto_abono || parseFloat(datos.monto_abono) <= 0) {
          throw new Error('monto_abono debe ser mayor a 0 para registrar un pago');
        }
        const facResult = await client.query(
          "SELECT id, total, saldo_restante, estado_saldo FROM transacciones WHERE id = $1 AND tipo = 'compra' AND estado_saldo IN ('pendiente', 'parcial')",
          [datos.factura_id]
        );
        if (facResult.rows.length === 0) {
          throw new Error(`Factura de compra ID ${datos.factura_id} no encontrada o ya liquidada`);
        }
        const factura = facResult.rows[0];
        const montoAbono = parseFloat(datos.monto_abono);
        if (montoAbono > parseFloat(factura.saldo_restante)) {
          throw new Error(`El monto del pago (${montoAbono}) excede el saldo restante (${factura.saldo_restante})`);
        }
      }

      // ============================================
      // ASIENTO MANUAL: validar líneas contables
      // ============================================
      if (tipo === 'asiento_manual') {
        const lineas = datos.lineas_contables || [];
        if (lineas.length === 0) {
          throw new Error('Debe incluir al menos una línea contable para un asiento manual');
        }
        let totalDebe = 0;
        let totalHaber = 0;
        for (const linea of lineas) {
          if (!linea.cuenta_contable_id) {
            throw new Error('Cada línea contable debe tener una cuenta_contable_id');
          }
          totalDebe += parseFloat(linea.debe || 0);
          totalHaber += parseFloat(linea.haber || 0);
        }
        if (Math.abs(totalDebe - totalHaber) > 0.01) {
          throw new Error(
            `El asiento no cuadra: Débitos (${totalDebe.toFixed(2)}) ≠ Créditos (${totalHaber.toFixed(2)})`
          );
        }
      }

      // ============================================
      // VALIDACIÓN DE STOCK (para venta y salida_inventario)
      // ============================================
      if ((tipo === 'venta' || tipo === 'salida_inventario') && articulos.length > 0) {
        const almacenId = almacen_id || 1;
        for (const art of articulos) {
          const stockResult = await client.query(
            `SELECT COALESCE(
               SUM(cantidad) FILTER (WHERE tipo_movimiento = 'entrada'), 0
             ) - COALESCE(
               SUM(cantidad) FILTER (WHERE tipo_movimiento = 'salida'), 0
             ) AS stock_actual
             FROM inventario_movimientos WHERE articulo_id = $1 AND almacen_id = $2`,
            [art.articulo_id, almacenId]
          );
          const stockActual = parseFloat(stockResult.rows[0].stock_actual) || 0;
          const cantidadSolicitada = parseFloat(art.cantidad) || 0;

          if (cantidadSolicitada > stockActual) {
            const artNombre = await client.query(
              'SELECT nombre FROM articulos WHERE id = $1', [art.articulo_id]
            );
            const nombreArt = artNombre.rows[0]?.nombre || `ID ${art.articulo_id}`;
            throw new Error(
              `Stock insuficiente para "${nombreArt}". ` +
              `Disponible: ${stockActual}, Solicitado: ${cantidadSolicitada}`
            );
          }
        }
      }

      // ============================================
      // SERIE
      // ============================================
      let serie = serie_id;
      if (!serie && tipo !== 'asiento_manual') {
        const serieDefault = await this._getSeriePorDefecto(client, tipo);
        serie = serieDefault?.id || null;
      }

      // ============================================
      // FOLIO ATÓMICO
      // ============================================
      let folio = null;
      const tipoFolio = this._tipoFolioMap[tipo] || 'FAC';
      const folioResult = await client.query(
        'SELECT obtener_folio($1) AS folio', [tipoFolio]
      );
      folio = folioResult.rows[0].folio;

      // ============================================
      // CALCULAR TOTAL
      // ============================================
      let total = 0;
      const detallesArticulos = [];

      if (tipo === 'cobro' || tipo === 'pago') {
        // El total del cobro/pago es el monto del abono
        total = parseFloat(datos.monto_abono) || 0;
      } else if (tipo === 'asiento_manual') {
        // El total del asiento manual es la suma de débitos
        total = datos.lineas_contables.reduce((s, l) => s + parseFloat(l.debe || 0), 0);
      } else {
        for (const art of articulos) {
          const artResult = await client.query(
            'SELECT precio_venta, costo_promedio, usa_serie FROM articulos WHERE id = $1',
            [art.articulo_id]
          );
          if (artResult.rows.length === 0) {
            throw new Error(`Artículo con ID ${art.articulo_id} no encontrado`);
          }
          const artData = artResult.rows[0];

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
      }

      // ============================================
      // DETERMINAR ESTADO_SALDO Y SALDO_RESTANTE
      // ============================================
      let saldoRestante = 0;
      let estadoSaldo = 'liquidado';

      if ((tipo === 'venta' || tipo === 'compra') && terminos_pago_id) {
        const tpResult = await client.query(
          'SELECT dias_credito FROM terminos_pago WHERE id = $1',
          [terminos_pago_id]
        );
        const diasCredito = tpResult.rows[0]?.dias_credito || 0;
        if (parseInt(diasCredito) > 0) {
          saldoRestante = total;
          estadoSaldo = 'pendiente';
        }
      }

      // ============================================
      // INSERTAR TRANSACCIÓN
      // ============================================
      let transaccion;
      if (tipo === 'asiento_manual') {
        // Para asiento manual: incluir fecha si se proporcionó
        const tieneFecha = datos.fecha && datos.fecha !== '';
        const insertResult = await client.query(
          `INSERT INTO transacciones
           (tipo, estado, folio, total, moneda_id,
            comentario, fecha, saldo_restante, estado_saldo, tipo_concepto)
           VALUES ($1, 'confirmado', $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [tipo, folio, total, moneda_id || 1,
           comentario || null,
           tieneFecha ? datos.fecha : new Date(),
           saldoRestante, estadoSaldo, tipo_concepto]
        );
        transaccion = insertResult.rows[0];
      } else if (tipo === 'cobro' || tipo === 'pago') {
        // Para cobro/pago: registrar el abono en transacciones_cuentas
        const insertResult = await client.query(
          `INSERT INTO transacciones
           (tipo, estado, folio, total, moneda_id,
            entidad_cliente_id, entidad_proveedor_id, almacen_id,
            metodo_pago, forma_pago_id, terminos_pago_id,
            serie_id, comentario, saldo_restante, estado_saldo, documento_origen_id,
            tipo_concepto)
           VALUES ($1, 'confirmado', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           RETURNING *`,
          [tipo, folio, total, moneda_id || 1,
           entidad_cliente_id || null, entidad_proveedor_id || null, almacen_id || null,
           metodo_pago || 'efectivo', forma_pago_id || null, terminos_pago_id || null,
           serie, comentario || null, 0, 'liquidado',
           datos.factura_id || null, tipo_concepto]
        );
        transaccion = insertResult.rows[0];

        // Insertar abono en transacciones_cuentas
        const montoAbono = parseFloat(datos.monto_abono) || 0;
        await client.query(
          `INSERT INTO transacciones_cuentas (transaccion_id, transaccion_factura_id, monto)
           VALUES ($1, $2, $3)`,
          [transaccion.id, datos.factura_id, montoAbono]
        );

        // Actualizar saldo_restante y estado_saldo de la factura
        const facturaResult = await client.query(
          "SELECT saldo_restante, total FROM transacciones WHERE id = $1 FOR UPDATE",
          [datos.factura_id]
        );
        const factura = facturaResult.rows[0];
        const nuevoSaldo = parseFloat(factura.saldo_restante) - montoAbono;
        let nuevoEstado;
        if (nuevoSaldo <= 0.01) {
          nuevoEstado = 'liquidado';
        } else if (nuevoSaldo < parseFloat(factura.total)) {
          nuevoEstado = 'parcial';
        } else {
          nuevoEstado = 'pendiente';
        }

        await client.query(
          `UPDATE transacciones SET saldo_restante = $1, estado_saldo = $2 WHERE id = $3`,
          [Math.max(0, nuevoSaldo), nuevoEstado, datos.factura_id]
        );
      } else {
        const insertResult = await client.query(
          `INSERT INTO transacciones
           (tipo, estado, folio, total, moneda_id,
            entidad_cliente_id, entidad_proveedor_id, entidad_vendedor_id,
            almacen_id, almacen_destino_id, metodo_pago, forma_pago_id, terminos_pago_id,
            serie_id, fecha_vencimiento, comentario, documento_origen_id,
            saldo_restante, estado_saldo, tipo_concepto)
           VALUES ($1, 'confirmado', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           RETURNING *`,
          [tipo, folio, total, moneda_id || 1,
           entidad_cliente_id || null, entidad_proveedor_id || null, entidad_vendedor_id || null,
           almacen_id || null, almacen_destino_id || null, metodo_pago || 'efectivo', forma_pago_id || null,
           terminos_pago_id || null, serie, fecha_vencimiento || null, comentario || null,
           documento_origen_id || null, saldoRestante, estadoSaldo, tipo_concepto]
        );
        transaccion = insertResult.rows[0];
      }

      // ============================================
      // INSERTAR DETALLES + INVENTARIO + SERIES
      // ============================================
      if (tipo !== 'cobro' && tipo !== 'pago' && tipo !== 'asiento_manual') {
        const almacenId = almacen_id || 1;

        for (const det of detallesArticulos) {
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

            if (tipo === 'traspaso' && almacen_destino_id) {
              await client.query(
                `INSERT INTO inventario_movimientos
                 (articulo_id, cantidad, tipo_movimiento, almacen_id,
                  referencia_tipo, referencia_id, documento_detalle_tipo, documento_detalle_id)
                 VALUES ($1, $2, 'entrada', $3, 'transaccion', $4, 'transacciones_detalle', $5)`,
                [det.articulo_id, Math.abs(cantidadMov), almacen_destino_id,
                 transaccion.id, detalle.id]
              );
            }

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

          if (det.usa_serie && det.numero_serie) {
            if (det.tipo_movimiento === 'salida') {
              const serieCheck = await client.query(
                "SELECT id FROM articulos_series WHERE articulo_id = $1 AND numero_serie = $2 AND estado = 'disponible'",
                [det.articulo_id, det.numero_serie]
              );
              if (serieCheck.rows.length === 0) {
                throw new Error(
                  `Serie ${det.numero_serie} no disponible para artículo ${det.articulo_id}`
                );
              }
              await client.query(
                "UPDATE articulos_series SET estado = 'vendido' WHERE id = $1",
                [serieCheck.rows[0].id]
              );
            }

            const estadoSerie = det.tipo_movimiento === 'salida' ? 'vendido' : 'disponible';
            await client.query(
              `INSERT INTO transacciones_series (transaccion_detalle_id, numero_serie, estado)
               VALUES ($1, $2, $3)`,
              [detalle.id, det.numero_serie, estadoSerie]
            );
          }
        }
      }

      // ============================================
      // ASIENTO MANUAL: insertar líneas contables
      // ============================================
      if (tipo === 'asiento_manual') {
        const lineas = datos.lineas_contables || [];
        for (const linea of lineas) {
          await client.query(
            `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
             VALUES ($1, $2, $3, $4)`,
            [transaccion.id, linea.cuenta_contable_id,
             parseFloat(linea.debe || 0), parseFloat(linea.haber || 0)]
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
      ivaTasa = 0.16;
    }

    // Obtener códigos de cuenta desde configuracion_sistema (con defaults)
    const configClaves = [
      'cuenta_cxc_default', 'cuenta_cxp_default', 'cuenta_caja_default',
      'cuenta_ventas_default', 'cuenta_compras_default',
      'cuenta_iva_trasladado', 'cuenta_iva_acreditable',
    ];
    const cfgResult = await client.query(
      `SELECT clave, valor FROM configuracion_sistema WHERE clave = ANY($1)`,
      [configClaves]
    );
    const config = { cuenta_cxc_default: '1200', cuenta_cxp_default: '2100',
      cuenta_caja_default: '1101', cuenta_ventas_default: '4100',
      cuenta_compras_default: '5300', cuenta_iva_trasladado: '2200',
      cuenta_iva_acreditable: '1108' };
    for (const row of cfgResult.rows) {
      config[row.clave] = row.valor;
    }

    // Buscar IDs de cuentas contables por código
    const codigosBuscados = Object.values(config);
    const cuentasResult = await client.query(
      `SELECT codigo, id FROM cuentas_contables WHERE codigo = ANY($1)`,
      [codigosBuscados]
    );
    const cuentasMap = {};
    for (const row of cuentasResult.rows) {
      cuentasMap[row.codigo] = row.id;
    }

    // Resolver IDs de cuentas
    const resolveId = (codigo) => cuentasMap[codigo] || null;
    const cuentaCxc = resolveId(config.cuenta_cxc_default);
    const cuentaCxp = resolveId(config.cuenta_cxp_default);
    const cuentaCaja = resolveId(config.cuenta_caja_default);
    const cuentaVentas = resolveId(config.cuenta_ventas_default);
    const cuentaCompras = resolveId(config.cuenta_compras_default);
    const cuentaIvaTrasladado = resolveId(config.cuenta_iva_trasladado);
    const cuentaIvaAcreditable = resolveId(config.cuenta_iva_acreditable);

    // Cuentas hardcodeadas como fallback (códigos originales)
    const cuentasHardResult = await client.query(
      `SELECT codigo, id FROM cuentas_contables WHERE codigo IN ('1101','1200','1300','2100','2200','4100','5100','5300')`
    );
    const hardCuentas = {};
    for (const row of cuentasHardResult.rows) {
      hardCuentas[row.codigo] = row.id;
    }

    const cuentaCostoVentas = hardCuentas['5100'] || null;
    const cuentaInventario = hardCuentas['1300'] || null;

    let cuentaBancos = hardCuentas['1102'] || cuentaCaja;
    const cxcFallback = cuentaCxc || hardCuentas['1200'] || null;
    const cxpFallback = cuentaCxp || hardCuentas['2100'] || null;
    const cajaFallback = cuentaCaja || hardCuentas['1101'] || null;

    const totalSinIva = detalles.reduce((s, d) => s + d.subtotal, 0);
    const ivaMonto = totalSinIva * ivaTasa;
    const totalConIva = totalSinIva + ivaMonto;

    // ============================================================
    // CONSULTAR CONFIGURACIÓN CONTABLE DE LA ENTIDAD (V16)
    // ============================================================
    const tipoConcepto = transaccion.tipo_concepto || 'estandar';

    /**
     * Busca en entidad_cuentas_contables una cuenta configurada para la entidad y rol.
     * @param {number} entidadId
     * @param {string} rolContable
     * @returns {number|null} cuenta_contable_id
     */
    const _getEntidadCuenta = async (entidadId, rolContable) => {
      if (!entidadId || !rolContable) return null;
      try {
        const result = await client.query(
          `SELECT cuenta_contable_id FROM entidad_cuentas_contables
           WHERE entidad_id = $1 AND rol_contable = $2 AND activo = true
           LIMIT 1`,
          [entidadId, rolContable]
        );
        return result.rows[0]?.cuenta_contable_id || null;
      } catch {
        return null;
      }
    };

    // Determinar si es a crédito según terminos_pago
    let esCredito = false;
    if (transaccion.terminos_pago_id) {
      const tpResult = await client.query(
        'SELECT dias_credito FROM terminos_pago WHERE id = $1',
        [transaccion.terminos_pago_id]
      );
      if (tpResult.rows.length > 0 && parseInt(tpResult.rows[0].dias_credito) > 0) {
        esCredito = true;
      }
    }

    if (tipo === 'venta') {
      // Determinar cuenta de cargo según tipo_concepto y configuración de la entidad
      const entidadId = transaccion.entidad_cliente_id;
      let cuentaCargo;

      if (tipoConcepto === 'deudores') {
        // Para deudores, intentar usar la cuenta configurada como 'deudor' o 'cliente'
        cuentaCargo = await _getEntidadCuenta(entidadId, 'deudor')
                 || await _getEntidadCuenta(entidadId, 'cliente');
      }

      if (!cuentaCargo) {
        if (esCredito) {
          cuentaCargo = cxcFallback;
        } else if (transaccion.metodo_pago === 'transferencia' || transaccion.metodo_pago === 'cheque') {
          cuentaCargo = cuentaBancos || cajaFallback;
        } else {
          cuentaCargo = cajaFallback;
        }
      }

      if (cuentaCargo && cuentaVentas) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, cuentaCargo, totalConIva]
        );
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, cuentaVentas, totalSinIva]
        );
        if (cuentaIvaTrasladado && ivaMonto > 0) {
          await client.query(
            `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
             VALUES ($1, $2, 0, $3)`,
            [transaccion.id, cuentaIvaTrasladado, ivaMonto]
          );
        }
        if (cuentaCostoVentas && cuentaInventario) {
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
            [transaccion.id, cuentaCostoVentas, costoTotal]
          );
          await client.query(
            `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
             VALUES ($1, $2, 0, $3)`,
            [transaccion.id, cuentaInventario, costoTotal]
          );
        }
      }
    } else if (tipo === 'compra') {
      let cuentaInventarioOCompras = cuentaCompras || cuentaInventario;
      if (cuentaInventarioOCompras) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, cuentaInventarioOCompras, totalSinIva]
        );
      }
      if (cuentaIvaAcreditable && ivaMonto > 0) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, cuentaIvaAcreditable, ivaMonto]
        );
      }
      let cuentaAbono;
      // Consultar configuración contable de la entidad para compras
      const entidadProvId = transaccion.entidad_proveedor_id;
      if (tipoConcepto === 'gasto') {
        // Para gastos, usar cuenta de 'acreedor' o 'proveedor' configurada
        cuentaAbono = await _getEntidadCuenta(entidadProvId, 'acreedor')
                  || await _getEntidadCuenta(entidadProvId, 'proveedor');
      }
      if (!cuentaAbono) {
        if (esCredito) {
          cuentaAbono = cxpFallback;
        } else if (transaccion.metodo_pago === 'transferencia' || transaccion.metodo_pago === 'cheque') {
          cuentaAbono = cuentaBancos || cajaFallback;
        } else {
          cuentaAbono = cajaFallback;
        }
      }
      if (cuentaAbono) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, cuentaAbono, totalConIva]
        );
      }
    } else if (tipo === 'cobro') {
      // ==========================================
      // COBRO: Cargo a Caja/Bancos, Abono a Clientes (CxC)
      // Usar el total (monto del cobro) en lugar de totalConIva
      // ==========================================
      const montoCobro = parseFloat(transaccion.total) || totalConIva;
      if (cajaFallback && cxcFallback) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, cajaFallback, montoCobro]
        );
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, cxcFallback, montoCobro]
        );
      }
    } else if (tipo === 'pago') {
      // ==========================================
      // PAGO: Cargo a CxP (Proveedores), Abono a Caja/Bancos
      // ==========================================
      const montoPago = parseFloat(transaccion.total) || totalConIva;
      if (cxpFallback && cajaFallback) {
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, $3, 0)`,
          [transaccion.id, cxpFallback, montoPago]
        );
        await client.query(
          `INSERT INTO transacciones_contables (transaccion_id, cuenta_contable_id, debe, haber)
           VALUES ($1, $2, 0, $3)`,
          [transaccion.id, cajaFallback, montoPago]
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

      const origen = await client.query(
        "SELECT * FROM transacciones WHERE id = $1 AND estado NOT IN ('cancelado')",
        [origenId]
      );
      if (origen.rows.length === 0) {
        throw new Error(`Transacción origen ID ${origenId} no encontrada o cancelada`);
      }
      const docOrigen = origen.rows[0];

      const conversionesPermitidas = {
        cotizacion:        ['orden_venta', 'venta'],
        orden_venta:       ['venta'],
        orden_compra:      ['compra'],
        cotizacion_compra: ['orden_compra', 'compra'],
      };
      const permitidos = conversionesPermitidas[docOrigen.tipo] || [];
      if (!permitidos.includes(nuevoTipo)) {
        throw new Error(
          `No se puede convertir ${docOrigen.tipo} a ${nuevoTipo}. ` +
          `Conversiones permitidas: ${permitidos.join(', ') || 'ninguna'}`
        );
      }

      const detalles = await client.query(
        'SELECT * FROM transacciones_detalle WHERE transaccion_id = $1',
        [origenId]
      );

      const articulos = detalles.rows.map(d => ({
        articulo_id: d.articulo_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        impuesto_id: d.impuesto_id,
        cuenta_contable_id: d.cuenta_contable_id,
      }));

      const tipoFolio = this._tipoFolioMap[nuevoTipo] || 'FAC';
      const folioResult = await client.query(
        'SELECT obtener_folio($1) AS folio', [tipoFolio]
      );
      const folio = folioResult.rows[0].folio;

      const serieDefault = await this._getSeriePorDefecto(client, nuevoTipo);

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

      // Determinar saldo_restante si es a crédito
      let saldoRestante = 0;
      let estadoSaldo = 'liquidado';
      if ((nuevoTipo === 'venta' || nuevoTipo === 'compra') && docOrigen.terminos_pago_id) {
        const tpResult = await client.query(
          'SELECT dias_credito FROM terminos_pago WHERE id = $1',
          [docOrigen.terminos_pago_id]
        );
        if (tpResult.rows.length > 0 && parseInt(tpResult.rows[0].dias_credito) > 0) {
          saldoRestante = total;
          estadoSaldo = 'pendiente';
        }
      }

      const insertResult = await client.query(
        `INSERT INTO transacciones
         (tipo, estado, folio, total, moneda_id,
          entidad_cliente_id, entidad_proveedor_id, entidad_vendedor_id,
          almacen_id, metodo_pago, forma_pago_id, terminos_pago_id,
          serie_id, fecha_vencimiento, comentario, documento_origen_id,
          saldo_restante, estado_saldo)
         VALUES ($1, 'confirmado', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [nuevoTipo, folio, total, docOrigen.moneda_id || 1,
         docOrigen.entidad_cliente_id, docOrigen.entidad_proveedor_id, docOrigen.entidad_vendedor_id,
         docOrigen.almacen_id, docOrigen.metodo_pago || 'efectivo', docOrigen.forma_pago_id,
         docOrigen.terminos_pago_id, serieDefault?.id || null, docOrigen.fecha_vencimiento,
         `Convertido desde ${docOrigen.tipo} ${docOrigen.folio}`, origenId,
         saldoRestante, estadoSaldo]
      );
      const nuevaTransaccion = insertResult.rows[0];

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

      await client.query(
        "UPDATE transacciones SET estado = 'convertido', updated_at = NOW() WHERE id = $1",
        [origenId]
      );

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

      const doc = await client.query(
        "SELECT * FROM transacciones WHERE id = $1 AND estado NOT IN ('cancelado') FOR UPDATE",
        [id]
      );
      if (doc.rows.length === 0) {
        throw new Error(`Transacción ${id} no encontrada o ya cancelada`);
      }
      const transaccion = doc.rows[0];

      // Si es cobro/pago, revertir el abono
      if ((transaccion.tipo === 'cobro' || transaccion.tipo === 'pago') && transaccion.documento_origen_id) {
        const abonos = await client.query(
          "SELECT * FROM transacciones_cuentas WHERE transaccion_id = $1",
          [id]
        );
        for (const abono of abonos.rows) {
          const montoAbono = parseFloat(abono.monto);
          const facturaResult = await client.query(
            "SELECT saldo_restante, total FROM transacciones WHERE id = $1 FOR UPDATE",
            [abono.transaccion_factura_id]
          );
          if (facturaResult.rows.length > 0) {
            const factura = facturaResult.rows[0];
            const nuevoSaldo = parseFloat(factura.saldo_restante) + montoAbono;
            const totalFac = parseFloat(factura.total);
            let nuevoEstado;
            if (nuevoSaldo >= totalFac - 0.01) {
              nuevoEstado = 'pendiente';
            } else if (nuevoSaldo > 0) {
              nuevoEstado = 'parcial';
            } else {
              nuevoEstado = 'liquidado';
            }
            await client.query(
              `UPDATE transacciones SET saldo_restante = $1, estado_saldo = $2 WHERE id = $3`,
              [nuevoSaldo, nuevoEstado, abono.transaccion_factura_id]
            );
          }
        }
        // Eliminar abonos
        await client.query(
          "DELETE FROM transacciones_cuentas WHERE transaccion_id = $1",
          [id]
        );
      }

      const detalles = await client.query(
        "SELECT * FROM transacciones_detalle WHERE transaccion_id = $1 AND tipo_movimiento IN ('entrada','salida')",
        [id]
      );

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

      await client.query(
        `UPDATE transacciones_series ts
         SET estado = 'disponible'
         FROM transacciones_detalle td
         WHERE td.id = ts.transaccion_detalle_id
           AND td.transaccion_id = $1
           AND ts.estado = 'vendido'`,
        [id]
      );

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
              ao.nombre AS almacen_origen_nombre,
              ad.nombre AS almacen_destino_nombre,
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
       LEFT JOIN almacenes ao ON ao.id = t.almacen_id
       LEFT JOIN almacenes ad ON ad.id = t.almacen_destino_id
       LEFT JOIN series_documentos sd ON sd.id = t.serie_id
       ${where}
       ORDER BY t.fecha DESC`,
      params
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
              ad.nombre AS almacen_destino_nombre,
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
              -- Abonos (cobros/pagos aplicados a esta transacción)
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', tc2.id,
                  'transaccion_id', tc2.transaccion_id,
                  'monto', tc2.monto,
                  'created_at', tc2.created_at,
                  'tipo', t_cobro.tipo,
                  'folio', t_cobro.folio
                ))
                FROM transacciones_cuentas tc2
                LEFT JOIN transacciones t_cobro ON t_cobro.id = tc2.transaccion_id
                WHERE tc2.transaccion_factura_id = t.id),
                '[]'::json
              ) AS abonos,
              -- Documento origen
              (SELECT json_build_object(
                'id', t_origen.id,
                'tipo', t_origen.tipo,
                'folio', t_origen.folio,
                'estado', t_origen.estado
              ) FROM transacciones t_origen WHERE t_origen.id = t.documento_origen_id) AS origen,
              -- Documento destino
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
       LEFT JOIN almacenes ad ON ad.id = t.almacen_destino_id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = TransaccionesModel;
