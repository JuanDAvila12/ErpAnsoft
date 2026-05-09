const express = require('express');
const router = express.Router();
const UsuariosModel = require('../models/usuarios.model');
const RolesModel = require('../models/roles.model');
const { generarToken, authMiddleware } = require('../middleware/auth');

// Por ahora usamos bcryptjs para validación de contraseñas
const bcrypt = require('bcryptjs');

/**
 * POST /api/v1/auth/login
 * Valida credenciales del usuario y devuelve un token JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Solicitud inválida',
        mensaje: 'Email y contraseña son requeridos',
      });
    }

    // Buscar usuario por email
    const usuario = await UsuariosModel.findByEmail(email);

    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'El email o la contraseña no son correctos',
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({
        error: 'Usuario inactivo',
        mensaje: 'La cuenta de usuario está desactivada',
      });
    }

    // Validar contraseña con bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'El email o la contraseña no son correctos',
      });
    }

    // Obtener roles de entidad del usuario
    const rolesEntidad = await UsuariosModel.getRolesEntidad(usuario.id);

    // Generar token JWT
    const token = generarToken(usuario);

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol_id: usuario.rol_id,
        rol_nombre: usuario.rol_nombre,
        entidad_id: usuario.entidad_id,
        entidad_razon_social: usuario.entidad_razon_social,
        roles_entidad: rolesEntidad.map(r => r.rol),
      },
    });
  } catch (err) {
    console.error('[Auth] Error en login:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al procesar la solicitud',
    });
  }
});

/**
 * POST /api/v1/auth/register
 * Registra un nuevo usuario con opción de crear entidad y asignar roles.
 * Body esperado:
 * {
 *   email, password, nombre, rol_id,
 *   entidad_data: { razon_social, rfc, regimen_fiscal, ... },
 *   roles_entidad: ['vendedor', 'cliente']  // roles opcionales
 * }
 */
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const { email, password, nombre, rol_id, entidad_data, roles_entidad } = req.body;

    if (!email || !password || !nombre || !rol_id) {
      return res.status(400).json({
        error: 'Datos inválidos',
        mensaje: 'Email, contraseña, nombre y rol_id son requeridos',
      });
    }

    // Verificar si el email ya existe
    const existente = await UsuariosModel.findByEmail(email);
    if (existente) {
      return res.status(400).json({
        error: 'Datos duplicados',
        mensaje: 'El email ya está registrado',
      });
    }

    // Verificar que el rol existe
    const rol = await RolesModel.findById(rol_id);
    if (!rol) {
      return res.status(400).json({
        error: 'Datos inválidos',
        mensaje: 'El rol especificado no existe',
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Crear usuario (con entidad y roles si se proporcionan)
    const usuario = await UsuariosModel.create({
      email,
      password_hash,
      nombre,
      rol_id,
      entidad_data,
      roles_entidad,
    });

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      datos: usuario,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Error en registro:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: err.message || 'Ocurrió un error al registrar el usuario',
    });
  }
});

/**
 * GET /api/v1/auth/usuarios
 * Lista todos los usuarios (solo admin).
 */
router.get('/usuarios', authMiddleware, async (req, res) => {
  try {
    const usuarios = await UsuariosModel.findAll();

    res.json({
      datos: usuarios,
      total: usuarios.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Error al listar usuarios:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar los usuarios',
    });
  }
});

/**
 * GET /api/v1/auth/roles
 * Lista todos los roles disponibles.
 */
router.get('/roles', authMiddleware, async (req, res) => {
  try {
    const roles = await RolesModel.findAll();

    res.json({
      datos: roles,
      total: roles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Error al listar roles:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al consultar los roles',
    });
  }
});

/**
 * GET /api/v1/auth/perfil
 * Obtiene el perfil del usuario autenticado.
 */
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuario = await UsuariosModel.findById(req.user.id);

    if (!usuario) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Usuario no encontrado',
      });
    }

    const rolesEntidad = await UsuariosModel.getRolesEntidad(usuario.id);

    res.json({
      datos: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol_id: usuario.rol_id,
        rol_nombre: usuario.rol_nombre,
        entidad_id: usuario.entidad_id,
        entidad_razon_social: usuario.entidad_razon_social,
        roles_entidad: rolesEntidad.map(r => r.rol),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Error al obtener perfil:', err);
    res.status(500).json({
      error: 'Error interno',
      mensaje: 'Ocurrió un error al obtener el perfil',
    });
  }
});

module.exports = router;
