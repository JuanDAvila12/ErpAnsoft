const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { generarToken, authMiddleware } = require('../middleware/auth');

/**
 * POST /api/v1/auth/login
 * Autenticación de usuarios internos (ERP).
 * Solo devuelve el token JWT.
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

    // Buscar usuario por email (excluir clientes)
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.nombre, u.rol_id, u.entidad_id, u.activo
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.email = $1 AND r.nombre != 'cliente'`,
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
 * POST /api/v1/auth/login-cliente
 * Autenticación para el Portal de Clientes.
 * Los usuarios con rol 'cliente' obtienen un token con claim 'portal: true'
 * y el entidad_id para restringir acceso a sus propios datos.
 */
router.post('/login-cliente', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Solicitud inválida',
        mensaje: 'Correo electrónico y contraseña son requeridos',
      });
    }

    // Buscar usuario que tenga el rol 'cliente'
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.nombre, u.rol_id, u.entidad_id, u.activo,
              r.nombre AS rol_nombre,
              e.razon_social, e.rfc
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN entidades e ON e.id = u.entidad_id
       WHERE u.email = $1 AND r.nombre = 'cliente'`,
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

    // Generar token con información del cliente
    // Incluimos entidad_id y portal:true para que el middleware pueda filtrar
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_no_usar_en_produccion';
    const payload = {
      id: usuario.id,
      entidad_id: usuario.entidad_id,
      portal: true,
      rol: 'cliente',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      datos: {
        nombre: usuario.nombre,
        email: usuario.email,
        entidad_id: usuario.entidad_id,
        razon_social: usuario.razon_social,
        rfc: usuario.rfc,
      },
      mensaje: 'Inicio de sesión exitoso',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Error en login-cliente:', err);
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

/**
 * GET /api/v1/auth/mis-permisos
 * Obtiene los permisos del usuario autenticado.
 * Requiere token válido.
 */
router.get('/mis-permisos', authMiddleware, async (req, res) => {
  try {
    const { attachPermisos } = require('../middleware/permissions');

    if (!req.usuario || !req.usuario.rol_id) {
      return res.json({ permisos: [] });
    }

    // Consultar permisos directamente
    const result = await pool.query(
      `SELECT p.codigo
       FROM permisos p
       JOIN rol_permisos rp ON rp.permiso_id = p.id
       WHERE rp.rol_id = $1`,
      [req.usuario.rol_id]
    );

    const permisos = result.rows.map(r => r.codigo);

    res.json({ permisos });
  } catch (err) {
    console.error('[Auth] Error al obtener permisos:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Error al obtener permisos del usuario',
    });
  }
});
// GET /api/v1/auth/mis-permisos
router.get('/mis-permisos', authMiddleware, async (req, res) => {
  try {
    const usuario = req.usuario;
    if (!usuario || !usuario.rol_id) {
      return res.status(400).json({ error: 'Usuario sin rol asignado' });
    }

    const result = await pool.query(
      `SELECT p.codigo
       FROM permisos p
       JOIN rol_permisos rp ON rp.permiso_id = p.id
       WHERE rp.rol_id = $1`,
      [usuario.rol_id]
    );

    const permisos = result.rows.map(row => row.codigo);
    res.json({ permisos });
  } catch (err) {
    console.error('[Auth] Error al obtener permisos:', err);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
});
module.exports = router;
