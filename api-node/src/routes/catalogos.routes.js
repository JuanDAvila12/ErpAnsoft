const express = require('express');
const router = express.Router();
const { catalogos } = require('../models/catalogos.model');
const { authMiddleware } = require('../middleware/auth');

/**
 * Genera rutas CRUD para un catálogo específico.
 */
function crearRutasCatalogo(nombre, catalogo) {
  const ruta = express.Router();

  // GET /api/v1/catalogos/:nombre - Listar todos
  ruta.get('/', authMiddleware, async (req, res) => {
    try {
      const includeInactivos = req.query.incluir_inactivos === 'true';
      const search = req.query.search;

      let datos;
      if (search) {
        datos = await catalogo.search(search, includeInactivos);
      } else {
        datos = await catalogo.findAll(includeInactivos);
      }

      res.json({
        datos,
        total: datos.length,
        catalogo: nombre,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[Catalogos] Error al listar ${nombre}:`, err);
      res.status(500).json({
        error: 'Error interno',
        mensaje: `Error al consultar ${nombre}: ${err.message}`,
      });
    }
  });

  // GET /api/v1/catalogos/:nombre/:id - Obtener por ID
  ruta.get('/:id', authMiddleware, async (req, res) => {
    try {
      const dato = await catalogo.findById(req.params.id);

      if (!dato) {
        return res.status(404).json({
          error: 'No encontrado',
          mensaje: `Registro con ID ${req.params.id} no encontrado en ${nombre}`,
        });
      }

      res.json({
        datos: dato,
        catalogo: nombre,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[Catalogos] Error al obtener ${nombre}:`, err);
      res.status(500).json({
        error: 'Error interno',
        mensaje: `Error al consultar ${nombre}: ${err.message}`,
      });
    }
  });

  // POST /api/v1/catalogos/:nombre - Crear
  ruta.post('/', authMiddleware, async (req, res) => {
    try {
      const dato = await catalogo.create(req.body);

      res.status(201).json({
        mensaje: `${nombre} creado exitosamente`,
        datos: dato,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[Catalogos] Error al crear ${nombre}:`, err);
      res.status(500).json({
        error: 'Error interno',
        mensaje: `Error al crear en ${nombre}: ${err.message}`,
      });
    }
  });

  // PUT /api/v1/catalogos/:nombre/:id - Actualizar
  ruta.put('/:id', authMiddleware, async (req, res) => {
    try {
      const dato = await catalogo.update(req.params.id, req.body);

      if (!dato) {
        return res.status(404).json({
          error: 'No encontrado',
          mensaje: `Registro con ID ${req.params.id} no encontrado en ${nombre}`,
        });
      }

      res.json({
        mensaje: `${nombre} actualizado exitosamente`,
        datos: dato,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[Catalogos] Error al actualizar ${nombre}:`, err);
      res.status(500).json({
        error: 'Error interno',
        mensaje: `Error al actualizar ${nombre}: ${err.message}`,
      });
    }
  });

  // DELETE /api/v1/catalogos/:nombre/:id - Eliminar (soft delete)
  ruta.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const dato = await catalogo.delete(req.params.id);

      if (!dato) {
        return res.status(404).json({
          error: 'No encontrado',
          mensaje: `Registro con ID ${req.params.id} no encontrado en ${nombre}`,
        });
      }

      res.json({
        mensaje: `${nombre} eliminado exitosamente`,
        datos: dato,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[Catalogos] Error al eliminar ${nombre}:`, err);
      res.status(500).json({
        error: 'Error interno',
        mensaje: `Error al eliminar ${nombre}: ${err.message}`,
      });
    }
  });

  return ruta;
}

// Registrar rutas para cada catálogo
const rutasCatalogos = {
  monedas: crearRutasCatalogo('monedas', catalogos.monedas),
  paises: crearRutasCatalogo('paises', catalogos.paises),
  impuestos: crearRutasCatalogo('impuestos', catalogos.impuestos),
  'formas-pago': crearRutasCatalogo('formas_pago', catalogos.formas_pago),
  'listas-precios': crearRutasCatalogo('listas_precios', catalogos.listas_precios),
  almacenes: crearRutasCatalogo('almacenes', catalogos.almacenes),
  bancos: crearRutasCatalogo('bancos', catalogos.bancos),
  'cuentas-contables': crearRutasCatalogo('cuentas_contables', catalogos.cuentas_contables),
  'unidades-transporte': crearRutasCatalogo('unidades_transporte', catalogos.unidades_transporte),
  entidades: crearRutasCatalogo('entidades', catalogos.entidades),
  'cuentas-bancarias': crearRutasCatalogo('cuentas_bancarias', catalogos.cuentas_bancarias),
};

// Montar todas las rutas de catálogos
Object.entries(rutasCatalogos).forEach(([nombre, ruta]) => {
  router.use(`/${nombre}`, ruta);
});

// GET /api/v1/catalogos - Listar todos los catálogos disponibles
router.get('/', authMiddleware, (req, res) => {
  res.json({
    catalogos_disponibles: Object.keys(rutasCatalogos),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
