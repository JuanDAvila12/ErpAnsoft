const express = require('express');
const router = express.Router();
const AuditoriaModel = require('../models/auditoria.model');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/v1/auditoria/:tabla/:registro_id
 * Obtiene el historial completo de cambios de un registro específico.
 * Solo accesible para administradores (rol_id = 1).
 */
router.get('/:tabla/:registro_id', authMiddleware, async (req, res) => {
  try {
    // Verificar que el usuario sea administrador (rol_id = 1)
    const usuario = req.usuario;
    if (!usuario || usuario.rol_id !== 1) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'Solo los administradores pueden acceder al log de auditoría.',
      });
    }

    const { tabla, registro_id } = req.params;
    const id = parseInt(registro_id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Solicitud inválida',
        mensaje: 'El registro_id debe ser un número válido.',
      });
    }

    // Tablas permitidas (whitelist para seguridad)
    const tablasPermitidas = [
      'ventas', 'ventas_detalle', 'inventario_movimientos',
      'articulos', 'entidades', 'asientos_contables',
    ];

    if (!tablasPermitidas.includes(tabla)) {
      return res.status(400).json({
        error: 'Solicitud inválida',
        mensaje: `La tabla '${tabla}' no está sujeta a auditoría o no existe. Permitidas: ${tablasPermitidas.join(', ')}`,
      });
    }

    const historial = await AuditoriaModel.getHistorialPorRegistro(tabla, id);

    res.json({
      datos: historial,
      total: historial.length,
      tabla,
      registro_id: id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auditoría] Error al consultar historial:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar el historial de auditoría.',
    });
  }
});

/**
 * GET /api/v1/auditoria
 * Obtiene el listado de todos los eventos de auditoría (paginado).
 * Solo accesible para administradores.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const usuario = req.usuario;
    if (!usuario || usuario.rol_id !== 1) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'Solo los administradores pueden acceder al log de auditoría.',
      });
    }

    const { limite = 50, pagina = 1, tabla, tipo_operacion } = req.query;

    const result = await AuditoriaModel.getAll({
      limite: parseInt(limite),
      pagina: parseInt(pagina),
      tabla,
      tipoOperacion: tipo_operacion,
    });

    res.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auditoría] Error al listar eventos:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar los eventos de auditoría.',
    });
  }
});

module.exports = router;
