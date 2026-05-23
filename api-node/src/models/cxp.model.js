/**
 * Modelo de Cuentas por Pagar (CxP)
 *
 * Proporciona consultas de estado de cuenta y antigüedad de saldos
 * para proveedores. Las transacciones de pago se manejan directamente
 * desde TransaccionesModel (crearTransaccion con tipo='pago').
 */
const pool = require('../db');

const CxpModel = {
  /**
   * Obtiene el estado de cuenta de un proveedor con todos sus movimientos.
   * @param {number} entidadProveedorId
   * @returns {Object} { saldo_total, facturas, pagos }
   */
  async obtenerEstadoCuenta(entidadProveedorId) {
    const facturas = await pool.query(
      `SELECT id, folio, total, saldo_restante, estado_saldo, fecha, fecha_vencimiento, tipo,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', tc.id,
                  'monto', tc.monto,
                  'pago_folio', t_pago.folio,
                  'pago_id', t_pago.id,
                  'created_at', tc.created_at
                ))
                FROM transacciones_cuentas tc
                LEFT JOIN transacciones t_pago ON t_pago.id = tc.transaccion_id
                WHERE tc.transaccion_factura_id = t.id),
                '[]'::json
              ) AS abonos
       FROM transacciones t
       WHERE t.entidad_proveedor_id = $1
         AND t.tipo = 'compra'
         AND t.estado = 'confirmado'
         AND t.estado_saldo IN ('pendiente', 'parcial')
       ORDER BY t.fecha DESC`,
      [entidadProveedorId]
    );

    const pagos = await pool.query(
      `SELECT t.id, t.folio, t.total, t.fecha, t.comentario, t.created_at,
              tc.transaccion_factura_id, tc.monto
       FROM transacciones t
       LEFT JOIN transacciones_cuentas tc ON tc.transaccion_id = t.id
       WHERE t.entidad_proveedor_id = $1
         AND t.tipo = 'pago'
         AND t.estado = 'confirmado'
       ORDER BY t.fecha DESC`,
      [entidadProveedorId]
    );

    const saldoTotal = facturas.rows.reduce((s, f) => s + parseFloat(f.saldo_restante || 0), 0);

    return {
      entidad_proveedor_id: entidadProveedorId,
      saldo_total: saldoTotal,
      facturas: facturas.rows,
      pagos: pagos.rows,
    };
  },

  /**
   * Obtiene antigüedad de saldos del proveedor.
   * @param {number} entidadProveedorId
   * @returns {Object}
   */
  async obtenerAntiguedad(entidadProveedorId) {
    const hoy = new Date();
    const result = await pool.query(
      `SELECT id, folio, total, saldo_restante, fecha, fecha_vencimiento, estado_saldo
       FROM transacciones
       WHERE entidad_proveedor_id = $1
         AND tipo = 'compra'
         AND estado = 'confirmado'
         AND estado_saldo IN ('pendiente', 'parcial')
       ORDER BY fecha_vencimiento ASC NULLS LAST`,
      [entidadProveedorId]
    );

    const periodos = { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };
    for (const factura of result.rows) {
      const venc = factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento) : null;
      const saldo = parseFloat(factura.saldo_restante) || 0;
      if (!venc) {
        periodos['0-30'] += saldo;
      } else {
        const diffDays = Math.floor((hoy - venc) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) periodos['0-30'] += saldo;
        else if (diffDays <= 60) periodos['31-60'] += saldo;
        else if (diffDays <= 90) periodos['61-90'] += saldo;
        else periodos['91+'] += saldo;
      }
    }

    return {
      entidad_proveedor_id: entidadProveedorId,
      periodos,
      facturas: result.rows,
    };
  },
};

module.exports = CxpModel;
