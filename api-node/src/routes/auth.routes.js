const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { generarToken, authMiddleware } = require('../middleware/auth');

/**
 * POST /api/v1/auth/login
 * Autenticación de usuarios. Solo devuelve el token JWT.
 * El token contiene únicamente el ID del usuario.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Solicitud inválida',
        mensaje: 'Correo electrónico y contraseña son requeridos',
      });
    }

    // Buscar usuario por email
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.nombre, u.rol_id, u.entidad_id, u.activo
       FROM usuarios u
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'El correo electrónico o la contraseña son incorrectos',
      });
    }

    const usuario = result.rows[0];

    if (!usuario.activo) {
      return res.status(401).json({
        error: 'Cuenta desactivada',
        mensaje: 'Esta cuenta ha sido desactivada. Contacte al administrador.',
      });
    }

    // Verificar contraseña
    const passwordValida = bcrypt.compareSync(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'El correo electrónico o la contraseña son incorrectos',
      });
    }

    // Generar token solo con el ID del usuario
    const token = generarToken(usuario);

    // No devolver datos del usuario en el login por seguridad (solo el token)
    res.json({
      token,
      mensaje: 'Inicio de sesión exitoso',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Error en login:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al procesar la solicitud de inicio de sesión',
    });
  }
});

/**
 * GET /api/v1/auth/perfil
 * Obtiene el perfil completo del usuario autenticado.
 * Requiere token válido.
 */
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    // req.usuario ya contiene toda la información del usuario
    // (se pobló en authMiddleware mediante obtenerUsuarioDesdeToken)
    res.json({
      datos: req.usuario,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Error al obtener perfil:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al obtener el perfil del usuario',
    });
  }
});

module.exports = router;
