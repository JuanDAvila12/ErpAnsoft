const pool = require('../db');

/**
 * Modelo genérico para catálogos maestros.
 * Proporciona CRUD dinámico para cualquier tabla de catálogo.
 */
class CatalogoModel {
  constructor(tableName, config = {}) {
    this.tableName = tableName;
    this.allowedFields = config.allowedFields || ['*'];
    this.searchFields = config.searchFields || ['nombre'];
    this.orderBy = config.orderBy || 'nombre';
    this.idField = config.idField || 'id';
    this.softDelete = config.softDelete !== undefined ? config.softDelete : true;
  }

  /**
   * Obtiene todos los registros del catálogo.
   */
  async findAll(includeInactivos = false) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (this.softDelete && !includeInactivos) {
      query += ' WHERE activo = TRUE';
    }

    query += ` ORDER BY ${this.orderBy}`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Obtiene un registro por ID.
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.idField} = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Crea un nuevo registro.
   */
  async create(data) {
    const fields = Object.keys(data).filter(f => this.allowedFields.includes('*') || this.allowedFields.includes(f));
    const values = fields.map(f => data[f]);
    const placeholders = fields.map((_, i) => `$${i + 1}`);

    const result = await pool.query(
      `INSERT INTO ${this.tableName} (${fields.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Actualiza un registro existente.
   */
  async update(id, data) {
    const fields = Object.keys(data).filter(
      f => (this.allowedFields.includes('*') || this.allowedFields.includes(f)) && f !== this.idField
    );

    if (fields.length === 0) return null;

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = fields.map(f => data[f]);
    values.push(id);

    const result = await pool.query(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE ${this.idField} = $${fields.length + 1}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Elimina (o desactiva) un registro.
   */
  async delete(id) {
    if (this.softDelete) {
      const result = await pool.query(
        `UPDATE ${this.tableName} SET activo = FALSE, updated_at = NOW()
         WHERE ${this.idField} = $1
         RETURNING *`,
        [id]
      );
      return result.rows[0] || null;
    } else {
      const result = await pool.query(
        `DELETE FROM ${this.tableName} WHERE ${this.idField} = $1 RETURNING *`,
        [id]
      );
      return result.rows[0] || null;
    }
  }

  /**
   * Busca registros por término de búsqueda.
   */
  async search(term, includeInactivos = false) {
    if (this.searchFields.length === 0) return this.findAll(includeInactivos);

    const conditions = this.searchFields.map(
      (f, i) => `${f}::text ILIKE $${i + 1}`
    );
    const params = this.searchFields.map(() => `%${term}%`);

    let query = `SELECT * FROM ${this.tableName} WHERE (${conditions.join(' OR ')})`;

    if (this.softDelete && !includeInactivos) {
      query += ` AND activo = TRUE`;
    }

    query += ` ORDER BY ${this.orderBy}`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

// Instancias de catálogos
const catalogos = {
  monedas: new CatalogoModel('monedas', {
    allowedFields: ['codigo', 'nombre', 'simbolo', 'activo'],
    searchFields: ['codigo', 'nombre'],
    orderBy: 'codigo',
  }),
  paises: new CatalogoModel('paises', {
    allowedFields: ['codigo', 'nombre', 'nacionalidad', 'activo'],
    searchFields: ['codigo', 'nombre'],
    orderBy: 'nombre',
  }),
  impuestos: new CatalogoModel('impuestos', {
    allowedFields: ['nombre', 'tasa', 'tipo', 'activo'],
    searchFields: ['nombre', 'tipo'],
    orderBy: 'nombre',
  }),
  formas_pago: new CatalogoModel('formas_pago', {
    allowedFields: ['clave_sat', 'nombre', 'activo'],
    searchFields: ['clave_sat', 'nombre'],
    orderBy: 'clave_sat',
  }),
  listas_precios: new CatalogoModel('listas_precios', {
    allowedFields: ['nombre', 'factor_descuento', 'activo'],
    searchFields: ['nombre'],
    orderBy: 'nombre',
  }),
  almacenes: new CatalogoModel('almacenes', {
    allowedFields: ['nombre', 'ubicacion', 'activo'],
    searchFields: ['nombre', 'ubicacion'],
    orderBy: 'nombre',
  }),
  bancos: new CatalogoModel('bancos', {
    allowedFields: ['nombre_corto', 'razon_social', 'clave_institucion', 'activo'],
    searchFields: ['nombre_corto', 'razon_social'],
    orderBy: 'nombre_corto',
  }),
  cuentas_contables: new CatalogoModel('cuentas_contables', {
    allowedFields: ['codigo', 'nombre', 'nivel', 'padre_id', 'tipo', 'naturaleza', 'activo'],
    searchFields: ['codigo', 'nombre'],
    orderBy: 'codigo',
  }),
  unidades_transporte: new CatalogoModel('unidades_transporte', {
    allowedFields: ['placa', 'modelo', 'chofer_entidad_id', 'activo'],
    searchFields: ['placa', 'modelo'],
    orderBy: 'placa',
  }),
  entidades: new CatalogoModel('entidades', {
    allowedFields: ['razon_social', 'nombre_comercial', 'rfc', 'regimen_fiscal', 'direccion', 'cp', 'pais_id', 'activo'],
    searchFields: ['razon_social', 'nombre_comercial', 'rfc'],
    orderBy: 'razon_social',
  }),
  cuentas_bancarias: new CatalogoModel('cuentas_bancarias', {
    allowedFields: ['entidad_id', 'banco_id', 'clabe', 'numero_cuenta', 'moneda_id', 'activo'],
    searchFields: ['clabe', 'numero_cuenta'],
    orderBy: 'id',
  }),
};

module.exports = { CatalogoModel, catalogos };
