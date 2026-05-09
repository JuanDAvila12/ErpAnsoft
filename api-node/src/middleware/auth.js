const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'spi_erp_secret_key_dev_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Middleware de autenticación JWT.
 * Verifica que el token sea válido y adjunta los datos del usuario a req.user.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Acceso denegado',
      mensaje: 'No se proporcionó token de autenticación',
    });
  }

  // Esperamos formato: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Acceso denegado',
      mensaje: 'Formato de token inválido. Use: Bearer <token>',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        mensaje: 'El token de autenticación ha expirado. Inicie sesión nuevamente.',
      });
    }

    return res.status(401).json({
      error: 'Token inválido',
      mensaje: 'El token de autenticación no es válido.',
    });
  }
}

/**
 * Genera un token JWT para un usuario.
 */
function generarToken(usuario) {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol_id: usuario.rol_id,
    rol_nombre: usuario.rol_nombre,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = { authMiddleware, generarToken };
