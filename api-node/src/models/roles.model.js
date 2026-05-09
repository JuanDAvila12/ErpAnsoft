const pool = require('../db');

const RolesModel = {
  async findAll() {
    const result = await pool.query(
      'SELECT * FROM roles ORDER BY nombre'
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByName(nombre) {
    const result = await pool.query(
      'SELECT * FROM roles WHERE nombre = $1',
      [nombre]
    );
    return result.rows[0] || null;
  },

  async create({ nombre, descripcion }) {
    const result = await pool.query(
      `INSERT INTO roles (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, descripcion]
    );
    return result.rows[0];
  },
};

module.exports = RolesModel;
