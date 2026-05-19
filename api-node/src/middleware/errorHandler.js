/**
 * Middleware de manejo de errores - Sistema de Notificación tipo SAP
 * 
 * Cada error debe tener un código único con formato "MOD-XXX"
 * Ej: ART-001 (artículos), VENT-002 (ventas), TRANS-001 (transacciones)
 * 
 * La respuesta del servidor será un JSON con:
 * { codigo, mensaje, modulo, detalle, timestamp }
 */

// Mapa de códigos de error por módulo
const ERROR_CODES = {
  // Artículos
  'ART-001': { modulo: 'Artículos', mensaje: 'Artículo no encontrado' },
  'ART-002': { modulo: 'Artículos', mensaje: 'SKU duplicado' },
  'ART-003': { modulo: 'Artículos', mensaje: 'Error al crear artículo' },
  'ART-004': { modulo: 'Artículos', mensaje: 'Error al actualizar artículo' },
  'ART-005': { modulo: 'Artículos', mensaje: 'Stock insuficiente' },
  'ART-006': { modulo: 'Artículos', mensaje: 'Error al buscar artículos' },

  // Ventas
  'VENT-001': { modulo: 'Ventas', mensaje: 'Error al crear venta' },
  'VENT-002': { modulo: 'Ventas', mensaje: 'Error al cancelar venta' },
  'VENT-003': { modulo: 'Ventas', mensaje: 'Venta no encontrada' },
  'VENT-004': { modulo: 'Ventas', mensaje: 'Error al convertir documento' },
  'VENT-005': { modulo: 'Ventas', mensaje: 'Error al listar ventas' },
  'VENT-006': { modulo: 'Ventas', mensaje: 'Error al obtener historial de venta' },

  // Transacciones
  'TRANS-001': { modulo: 'Transacciones', mensaje: 'Error al crear transacción' },
  'TRANS-002': { modulo: 'Transacciones', mensaje: 'Error al cancelar transacción' },
  'TRANS-003': { modulo: 'Transacciones', mensaje: 'Transacción no encontrada' },
  'TRANS-004': { modulo: 'Transacciones', mensaje: 'Error al convertir transacción' },
  'TRANS-005': { modulo: 'Transacciones', mensaje: 'Error al listar transacciones' },
  'TRANS-006': { modulo: 'Transacciones', mensaje: 'Error al obtener historial' },
  'TRANS-007': { modulo: 'Transacciones', mensaje: 'Tipo de transacción inválido' },
  'TRANS-008': { modulo: 'Transacciones', mensaje: 'Artículos requeridos' },

  // Entidades
  'ENT-001': { modulo: 'Entidades', mensaje: 'Error al crear entidad' },
  'ENT-002': { modulo: 'Entidades', mensaje: 'Error al actualizar entidad' },
  'ENT-003': { modulo: 'Entidades', mensaje: 'Entidad no encontrada' },
  'ENT-004': { modulo: 'Entidades', mensaje: 'Error al buscar entidades' },
  'ENT-005': { modulo: 'Entidades', mensaje: 'RFC duplicado' },
  'ENT-006': { modulo: 'Entidades', mensaje: 'Razón social y RFC son requeridos' },

  // Inventario
  'INV-001': { modulo: 'Inventario', mensaje: 'Error al listar almacenes' },
  'INV-002': { modulo: 'Inventario', mensaje: 'Almacén no encontrado' },
  'INV-003': { modulo: 'Inventario', mensaje: 'Error al crear almacén' },
  'INV-004': { modulo: 'Inventario', mensaje: 'Error al actualizar almacén' },
  'INV-005': { modulo: 'Inventario', mensaje: 'Error al consultar stock' },
  'INV-006': { modulo: 'Inventario', mensaje: 'Error en movimientos de inventario' },
  'INV-007': { modulo: 'Inventario', mensaje: 'Serie no encontrada' },

  // Compras
  'COMP-001': { modulo: 'Compras', mensaje: 'Error al crear compra' },
  'COMP-002': { modulo: 'Compras', mensaje: 'Error al cancelar compra' },
  'COMP-003': { modulo: 'Compras', mensaje: 'Compra no encontrada' },
  'COMP-004': { modulo: 'Compras', mensaje: 'Error al listar compras' },

  // Autenticación
  'AUTH-001': { modulo: 'Autenticación', mensaje: 'Credenciales inválidas' },
  'AUTH-002': { modulo: 'Autenticación', mensaje: 'Token no proporcionado' },
  'AUTH-003': { modulo: 'Autenticación', mensaje: 'Token inválido o expirado' },
  'AUTH-004': { modulo: 'Autenticación', mensaje: 'Acceso denegado' },
  'AUTH-005': { modulo: 'Autenticación', mensaje: 'Permiso denegado' },

  // Configuración
  'CONF-001': { modulo: 'Configuración', mensaje: 'Error al obtener configuración' },
  'CONF-002': { modulo: 'Configuración', mensaje: 'Error al guardar configuración' },
  'CONF-003': { modulo: 'Configuración', mensaje: 'Configuración no encontrada' },

  // Reportes
  'REP-001': { modulo: 'Reportes', mensaje: 'Error al generar reporte' },
  'REP-002': { modulo: 'Reportes', mensaje: 'Error al ejecutar consulta' },
  'REP-003': { modulo: 'Reportes', mensaje: 'Reporte no encontrado' },

  // Fiscal
  'FISC-001': { modulo: 'Fiscal', mensaje: 'Error al timbrar CFDI' },
  'FISC-002': { modulo: 'Fiscal', mensaje: 'Comprobante no encontrado' },
  'FISC-003': { modulo: 'Fiscal', mensaje: 'Error al cancelar CFDI' },

  // General / Sistema
  'SYS-001': { modulo: 'Sistema', mensaje: 'Error interno del servidor' },
  'SYS-002': { modulo: 'Sistema', mensaje: 'Recurso no encontrado' },
  'SYS-003': { modulo: 'Sistema', mensaje: 'Solicitud inválida' },
};

/**
 * Clase de error personalizada con código SAP-style
 */
class AppError extends Error {
  constructor(codigo, detalle = '', statusCode = null) {
    const info = ERROR_CODES[codigo] || { modulo: 'Sistema', mensaje: 'Error desconocido' };
    super(info.mensaje);
    this.name = 'AppError';
    this.codigo = codigo;
    this.modulo = info.modulo;
    this.mensaje = info.mensaje;
    this.detalle = detalle || info.mensaje;
    this.statusCode = statusCode || _getStatusCode(codigo);
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      codigo: this.codigo,
      mensaje: this.mensaje,
      modulo: this.modulo,
      detalle: this.detalle,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Determina el código HTTP según el código de error
 */
function _getStatusCode(codigo) {
  if (!codigo) return 500;
  const suffix = parseInt(codigo.split('-')[1], 10);
  // Códigos que terminan en 03, 05, 07 suelen ser "no encontrado" o "duplicado"
  if (suffix === 3) return 404;       // No encontrado
  if (suffix === 2 || suffix === 5) return 409; // Duplicado / conflicto
  if (suffix === 6) return 400;       // Validación
  return 500;                          // Error interno
}

/**
 * Middleware de Express para manejo de errores
 * Debe registrarse al final de todas las rutas con app.use(errorHandler)
 */
function errorHandler(err, req, res, next) {
  // Si ya se envió una respuesta, pasar al siguiente
  if (res.headersSent) {
    return next(err);
  }

  // Si es un AppError, usar su estructura
  if (err instanceof AppError) {
    console.error(`[${err.codigo}] ${err.modulo}: ${err.mensaje}`, err.detalle ? `- ${err.detalle}` : '');
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Si es un error de validación de Express (400)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      codigo: 'SYS-003',
      mensaje: 'Solicitud inválida',
      modulo: 'Sistema',
      detalle: 'Error al parsear el cuerpo de la solicitud. Verifique que el JSON sea válido.',
      timestamp: new Date().toISOString(),
    });
  }

  // Para errores de PostgreSQL
  if (err.code && typeof err.code === 'string' && err.code.startsWith('23')) {
    const detalle = err.detail || err.message || 'Violación de restricción en base de datos';
    console.error('[DB] Violación de integridad:', detalle);
    return res.status(409).json({
      codigo: 'SYS-003',
      mensaje: 'Conflicto en base de datos',
      modulo: 'Sistema',
      detalle,
      timestamp: new Date().toISOString(),
    });
  }

  // Error genérico
  console.error('[SYS-001] Error no manejado:', err);
  return res.status(500).json({
    codigo: 'SYS-001',
    mensaje: 'Error interno del servidor',
    modulo: 'Sistema',
    detalle: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado. Contacte al administrador.',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler, AppError, ERROR_CODES };
