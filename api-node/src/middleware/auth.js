const jwt = require('jsonwebtoken');
const pool = require('../db');

/**
 * Validación crítica al iniciar el módulo.
 * En producción, JWT_SECRET es OBLIGATORIA.
 */
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET no está definida en las variables de entorno. ' +
    'El servidor no puede iniciar de forma segura. ' +
    'Configure JWT_SECRET en el archivo .env o en las variables de entorno del sistema.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_no_usar_en_produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Genera un token JWT con la información mínima necesaria.
 * Por seguridad, SOLO guarda el ID del usuario en el payload.
 *
 * @param {Object} usuario - Objeto usuario que debe contener al menos { id }
 * @returns {string} Token JWT firmado
 */
function generarToken(usuario) {
  if (!usuario || !usuario.id) {
    throw new Error('No se puede generar token: usuario inválido o sin ID');
  }

  // Payload mínimo: solo el ID del usuario
  const payload = { id: usuario.id };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Middleware de autenticación para Express.
 * Verifica que el token JWT sea válido y obtiene el usuario completo desde la BD.
 *
 * Espera el token en el header: Authorization: Bearer <token>
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'No autorizado',
      mensaje: 'Token de autenticación no proporcionado',
    });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      error: 'No autorizado',
      mensaje: 'Formato de token inválido. Use: Authorization: Bearer <token>',
    });
  }

  try {
    const usuarioCompleto = await obtenerUsuarioDesdeToken(token);
    req.usuario = usuarioCompleto;
    next();
  } catch (err) {
    console.error('[Auth] Error de autenticación:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        mensaje: 'El token ha expirado. Inicie sesión nuevamente.',
      });
    }

    return res.status(401).json({
      error: 'No autorizado',
      mensaje: err.message || 'Token inválido',
    });
  }
}

/**
 * Decodifica un token JWT, extrae el ID del usuario y consulta la BD
 * para obtener el objeto usuario completo con sus roles y entidad.
 *
 * @param {string} token - Token JWT
 * @returns {Object} Objeto usuario completo con datos de entidad y roles
 */
async function obtenerUsuarioDesdeToken(token) {
  // Decodificar el token para extraer el payload
  const decoded = jwt.verify(token, JWT_SECRET);

  if (!decoded || !decoded.id) {
    throw new Error('Token inválido: no contiene ID de usuario');
  }

  const usuarioId = decoded.id;

  // Consultar el usuario completo con JOIN a roles, entidades y entidad_roles
  const result = await pool.query(
    `SELECT u.id,
            u.email,
            u.nombre,
            u.rol_id,
            u.activo,
            u.entidad_id,
            r.nombre AS rol_nombre,
            r.descripcion AS rol_descripcion,
            e.razon_social AS entidad_razon_social,
            e.rfc AS entidad_rfc,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', er.id,
                  'rol', er.rol
                )
              ) FILTER (WHERE er.id IS NOT NULL),
              '[]'::json
            ) AS entidad_roles
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN entidades e ON e.id = u.entidad_id
     LEFT JOIN entidad_roles er ON er.entidad_id = u.entidad_id
     WHERE u.id = $1 AND u.activo = true
     GROUP BY u.id, r.nombre, r.descripcion, e.razon_social, e.rfc`,
    [usuarioId]
  );

  if (result.rows.length === 0) {
    throw new Error('Usuario no encontrado o inactivo');
  }

  return result.rows[0];
}

module.exports = {
  generarToken,
  authMiddleware,
  obtenerUsuarioDesdeToken,
};
