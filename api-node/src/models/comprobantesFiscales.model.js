const pool = require('../db');

/**
 * Modelo para Comprobantes Fiscales CFDI 4.0
 */
const ComprobantesFiscalesModel = {
  /**
   * Obtiene todos los comprobantes fiscales.
   */
  async findAll(filtros = {}) {
    const { estatus, documento_venta_id } = filtros;
    const condiciones = [];
    const params = [];
    let idx = 1;

    if (estatus) {
      condiciones.push(`cf.estatus = $${idx}`);
      params.push(estatus);
      idx++;
    }
    if (documento_venta_id) {
      condiciones.push(`cf.documento_venta_id = $${idx}`);
      params.push(documento_venta_id);
      idx++;
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT cf.*, dv.folio, dv.total,
              ec.razon_social AS cliente_nombre, ec.rfc AS cliente_rfc
       FROM comprobantes_fiscales cf
       JOIN documentos_venta dv ON dv.id = cf.documento_venta_id
       LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
       ${where}
       ORDER BY cf.created_at DESC`,
      params
    );
    return result.rows;
  },

  /**
   * Obtiene un comprobante por ID.
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT cf.*, dv.folio, dv.total,
              ec.razon_social AS cliente_nombre, ec.rfc AS cliente_rfc
       FROM comprobantes_fiscales cf
       JOIN documentos_venta dv ON dv.id = cf.documento_venta_id
       LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
       WHERE cf.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene un comprobante por UUID.
   */
  async findByUUID(uuid) {
    const result = await pool.query(
      `SELECT cf.*, dv.folio, dv.total,
              ec.razon_social AS cliente_nombre, ec.rfc AS cliente_rfc
       FROM comprobantes_fiscales cf
       JOIN documentos_venta dv ON dv.id = cf.documento_venta_id
       LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
       WHERE cf.uuid = $1`,
      [uuid]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene comprobantes por documento de venta.
   */
  async findByDocumentoVentaId(documentoVentaId) {
    const result = await pool.query(
      `SELECT * FROM comprobantes_fiscales
       WHERE documento_venta_id = $1
       ORDER BY created_at DESC`,
      [documentoVentaId]
    );
    return result.rows;
  },
};

module.exports = ComprobantesFiscalesModel;
