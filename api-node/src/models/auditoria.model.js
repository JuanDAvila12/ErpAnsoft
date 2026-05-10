const pool = require('../db');

const AuditoriaModel = {
  /**
   * Obtiene el historial completo de cambios de un registro específico.
   * Estilo SAP CDHDR + CDPOS.
   */
  async getHistorialPorRegistro(tabla, registroId) {
    const result = await pool.query(
      `SELECT lc.id AS cabecera_id,
              lc.tabla_afectada,
              lc.registro_id,
              lc.tipo_operacion,
              lc.usuario_id,
              u.nombre AS usuario_nombre,
              u.email AS usuario_email,
              lc.fecha,
              lc.ip_origen,
              lc.comentario,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ld.id,
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
       WHERE lc.tabla_afectada = $1 AND lc.registro_id = $2
       GROUP BY lc.id, u.nombre, u.email
       ORDER BY lc.fecha DESC`,
      [tabla, registroId]
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
