const pool = require('../db');

const AuditoriaModel = {
  /**
   * Obtiene el historial completo de cambios de un registro específico.
   * Estilo SAP CDHDR + CDPOS.
   * @param {string} tabla - Nombre de la tabla afectada
   * @param {number} registroId - ID del registro
   * @param {Object} opciones - Opciones de filtro { desde, hasta, limite }
   */
  async getHistorialPorRegistro(tabla, registroId, opciones = {}) {
    const { desde, hasta, limite = 50 } = opciones;
    const condiciones = ['lc.tabla_afectada = $1', 'lc.registro_id = $2'];
    const params = [tabla, registroId];
    let idx = 3;

    if (desde) {
      condiciones.push(`lc.fecha >= $${idx}`);
      params.push(desde);
      idx++;
    }

    if (hasta) {
      condiciones.push(`lc.fecha <= $${idx}`);
      params.push(hasta);
      idx++;
    }

    params.push(limite);

    const result = await pool.query(
      `SELECT lc.id AS id_cabecera,
              lc.tipo_operacion,
              u.nombre AS usuario_nombre,
              lc.fecha,
              lc.ip_origen,
              lc.comentario,
              COALESCE(
                json_agg(
                  json_build_object(
                    'campo_afectado', ld.campo_afectado,
                    'valor_anterior', ld.valor_anterior,
                    'valor_nuevo', ld.valor_nuevo
                  )
                  ORDER BY ld.id
                ) FILTER (WHERE ld.id IS NOT NULL),
                '[]'::json
              ) AS detalles
       FROM log_modificaciones_cabecera lc
       LEFT JOIN log_modificaciones_detalle ld ON ld.cabecera_id = lc.id
       LEFT JOIN usuarios u ON u.id = lc.usuario_id
       WHERE ${condiciones.join(' AND ')}
       GROUP BY lc.id, u.nombre
       ORDER BY lc.fecha DESC
       LIMIT $${idx}`,
      params
    );

    return result.rows;
  },


  /**
   * Obtiene todos los registros de auditoría con paginación.
   */
  async getAll({ limite = 50, pagina = 1, tabla, tipoOperacion } = {}) {
    const offset = (pagina - 1) * limite;
    const condiciones = [];
    const params = [];
    let idx = 1;

    if (tabla) {
      condiciones.push(`lc.tabla_afectada = $${idx}`);
      params.push(tabla);
      idx++;
    }

    if (tipoOperacion) {
      condiciones.push(`lc.tipo_operacion = $${idx}`);
      params.push(tipoOperacion);
      idx++;
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM log_modificaciones_cabecera lc ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    params.push(limite);
    params.push(offset);

    const result = await pool.query(
      `SELECT lc.*, u.nombre AS usuario_nombre, u.email AS usuario_email
       FROM log_modificaciones_cabecera lc
       LEFT JOIN usuarios u ON u.id = lc.usuario_id
       ${where}
       ORDER BY lc.fecha DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return {
      datos: result.rows,
      total,
      pagina,
      limite,
      total_paginas: Math.ceil(total / limite),
    };
  },
};

module.exports = AuditoriaModel;
