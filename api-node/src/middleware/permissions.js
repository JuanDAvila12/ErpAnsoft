const pool = require('../db');

/**
 * Cache de permisos por rol (se refresca cada 5 minutos)
 */
let permisosCache = {
  data: {},
  lastUpdated: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carga los permisos de todos los roles desde la BD.
 * Se ejecuta la primera vez y luego cada CACHE_TTL milisegundos.
 */
async function cargarPermisosCache() {
  try {
    const result = await pool.query(
      `SELECT r.id AS rol_id,
              r.nombre AS rol_nombre,
              json_agg(p.codigo) AS permisos
       FROM roles r
       LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
       LEFT JOIN permisos p ON p.id = rp.permiso_id
       GROUP BY r.id, r.nombre
       ORDER BY r.id`
    );

    const cache = {};
    for (const row of result.rows) {
      // Filtrar nulls (roles sin permisos)
      cache[row.rol_id] = {
        nombre: row.rol_nombre,
        permisos: row.permisos ? row.permisos.filter(p => p !== null) : [],
      };
    }

    permisosCache.data = cache;
    permisosCache.lastUpdated = Date.now();

    console.log('[Permissions] Cache de permisos actualizada:', Object.keys(cache).length, 'roles');
  } catch (err) {
    console.error('[Permissions] Error al cargar cache de permisos:', err.message);
    // Si no hay datos previos, lanzar error
    if (!permisosCache.lastUpdated) {
      throw new Error('No se pudieron cargar los permisos iniciales');
    }
  }
}

/**
 * Verifica si el cache necesita refrescarse.
 */
function isCacheStale() {
  if (!permisosCache.lastUpdated) return true;
  return (Date.now() - permisosCache.lastUpdated) > CACHE_TTL;
}

/**
 * Middleware que verifica si el usuario tiene un permiso específico.
 * @param {string} permisoRequerido - Código del permiso (ej: 'ventas.crear')
 * @returns {Function} Middleware de Express
 *
 * Uso:
 *   router.post('/', authMiddleware, checkPermission('ventas.crear'), handler)
 */
function checkPermission(permisoRequerido) {
  return async (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado (req.usuario debe existir del authMiddleware)
      if (!req.usuario || !req.usuario.rol_id) {
        return res.status(401).json({
          error: 'No autorizado',
          mensaje: 'Usuario no autenticado o sin rol asignado',
        });
      }

      // Refrescar cache si es necesario
      if (isCacheStale()) {
        await cargarPermisosCache();
      }

      const rolId = req.usuario.rol_id;

      // Verificar si el rol tiene el permiso (usando cache)
      const rolData = permisosCache.data[rolId];

      if (!rolData) {
        return res.status(403).json({
          error: 'Permiso denegado',
          mensaje: 'El rol del usuario no tiene permisos configurados',
          permiso_requerido: permisoRequerido,
        });
      }

      const tienePermiso = rolData.permisos.includes(permisoRequerido);

      if (!tienePermiso) {
        return res.status(403).json({
          error: 'Permiso denegado',
          mensaje: `No tienes permiso para realizar esta acción: ${permisoRequerido}`,
          permiso_requerido: permisoRequerido,
        });
      }

      next();
    } catch (err) {
      console.error('[Permissions] Error en checkPermission:', err.message);
      res.status(500).json({
        error: 'Error interno',
        mensaje: 'Error al verificar permisos',
      });
    }
  };
}

/**
 * Refresca el cache de permisos manualmente (útil después de cambios).
 */
async function refrescarPermisos() {
  permisosCache.lastUpdated = null;
  await cargarPermisosCache();
}

/**
 * Middleware opcional que verifica permisos pero NO bloquea si no tiene.
 * Útil para UI (esconder/mostrar elementos según permisos).
 * Agrega req.permisos con la lista de permisos del usuario.
 */
async function attachPermisos(req, res, next) {
  try {
    if (!req.usuario || !req.usuario.rol_id) {
      req.permisos = [];
      return next();
    }

    if (isCacheStale()) {
      await cargarPermisosCache();
    }

    const rolData = permisosCache.data[req.usuario.rol_id];
    req.permisos = rolData ? rolData.permisos : [];

    next();
  } catch (err) {
    console.error('[Permissions] Error en attachPermisos:', err.message);
    req.permisos = [];
    next();
  }
}

/**
 * Obtiene la lista de permisos actual en cache (para APIs).
 */
function obtenerCachePermisos() {
  return permisosCache;
}

// Cargar permisos al iniciar el módulo
cargarPermisosCache().catch(err => {
  console.warn('[Permissions] No se pudo cargar cache inicial. Se cargará en primera solicitud.');
});

module.exports = {
  checkPermission,
  refrescarPermisos,
  attachPermisos,
  obtenerCachePermisos,
};
