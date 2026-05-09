const pool = require('../db');

const UsuariosModel = {
  async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.*, r.nombre as rol_nombre,
              e.razon_social as entidad_razon_social, e.rfc as entidad_rfc
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN entidades e ON e.id = u.entidad_id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT u.*, r.nombre as rol_nombre,
              e.razon_social as entidad_razon_social, e.rfc as entidad_rfc
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN entidades e ON e.id = u.entidad_id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findAll(activo = true) {
    const result = await pool.query(
      `SELECT u.id, u.email, u.nombre, u.rol_id, r.nombre as rol_nombre,
              u.entidad_id, e.razon_social as entidad_razon_social, u.activo
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN entidades e ON e.id = u.entidad_id
       WHERE u.activo = $1
       ORDER BY u.nombre`,
      [activo]
    );
    return result.rows;
  },

  /**
   * Crea un usuario y opcionalmente:
   * - Crea una entidad asociada (si se proporcionan datos de entidad)
   * - Asigna roles de entidad (vendedor, cliente, etc.)
   */
  async create({ email, password_hash, nombre, rol_id, entidad_data, roles_entidad }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let entidad_id = null;

      // Si se proporcionan datos de entidad, crear la entidad primero
      if (entidad_data) {
        const entidadResult = await client.query(
          `INSERT INTO entidades (razon_social, nombre_comercial, rfc, regimen_fiscal, direccion, cp)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            entidad_data.razon_social || nombre,
            entidad_data.nombre_comercial || null,
            entidad_data.rfc || 'XAXX010101000',
            entidad_data.regimen_fiscal || '601',
            entidad_data.direccion || null,
            entidad_data.cp || null,
          ]
        );
        entidad_id = entidadResult.rows[0].id;

        // Asignar roles de entidad (vendedor, cliente, etc.)
        if (roles_entidad && Array.isArray(roles_entidad)) {
          for (const rol of roles_entidad) {
            await client.query(
              `INSERT INTO entidad_roles (entidad_id, rol)
               VALUES ($1, $2::entidad_rol_enum)
               ON CONFLICT (entidad_id, rol) DO NOTHING`,
              [entidad_id, rol]
            );
          }
        }
      }

      // Crear el usuario
      const result = await client.query(
        `INSERT INTO usuarios (email, password_hash, nombre, rol_id, entidad_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, nombre, rol_id, entidad_id, activo`,
        [email, password_hash, nombre, rol_id, entidad_id]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id, fields) {
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (['email', 'nombre', 'password_hash', 'rol_id', 'entidad_id', 'activo'].includes(key)) {
        setClauses.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE usuarios SET ${setClauses.join(', ')} WHERE id = $${idx}
       RETURNING id, email, nombre, rol_id, entidad_id, activo`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene los roles de entidad de un usuario.
   */
  async getRolesEntidad(usuarioId) {
    const result = await pool.query(
      `SELECT er.rol, e.razon_social, e.rfc
       FROM entidad_roles er
       JOIN entidades e ON e.id = er.entidad_id
       JOIN usuarios u ON u.entidad_id = e.id
       WHERE u.id = $1`,
      [usuarioId]
    );
    return result.rows;
  },
};

module.exports = UsuariosModel;
