const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const pool = require('../db');

/**
 * ============================================
 * CONTABILIDAD - Rutas
 * ============================================
 */

/**
 * GET /api/v1/contabilidad/cuentas
 * Listar cuentas contables en estructura jerárquica
 */
router.get('/cuentas', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cuentas_contables ORDER BY codigo'
    );
    const cuentas = result.rows;

    // Construir árbol jerárquico
    const map = {};
    const arbol = [];
    cuentas.forEach(c => {
      map[c.id] = { ...c, children: [] };
    });
    cuentas.forEach(c => {
      if (c.padre_id && map[c.padre_id]) {
        map[c.padre_id].children.push(map[c.id]);
      } else {
        arbol.push(map[c.id]);
      }
    });

    res.json({ exito: true, datos: arbol, flat: cuentas });
  } catch (err) {
    console.error('Error al listar cuentas contables:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/contabilidad/asientos
 * Listar asientos contables con filtros
 */
router.get('/asientos', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, cuenta_id, limite } = req.query;
    let query = `
      SELECT tc.*, cc.codigo AS cuenta_codigo, cc.nombre AS cuenta_nombre,
             t.folio AS transaccion_folio, t.tipo AS transaccion_tipo
      FROM transacciones_contables tc
      LEFT JOIN cuentas_contables cc ON cc.id = tc.cuenta_contable_id
      LEFT JOIN transacciones t ON t.id = tc.transaccion_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (fecha_desde) {
      query += ` AND tc.fecha >= $${idx}`;
      params.push(fecha_desde);
      idx++;
    }
    if (fecha_hasta) {
      query += ` AND tc.fecha <= $${idx}`;
      params.push(fecha_hasta);
      idx++;
    }
    if (cuenta_id) {
      query += ` AND tc.cuenta_contable_id = $${idx}`;
      params.push(cuenta_id);
      idx++;
    }

    query += ' ORDER BY tc.fecha DESC, tc.id DESC';

    if (limite) {
      query += ` LIMIT $${idx}`;
      params.push(parseInt(limite));
    }

    const result = await pool.query(query, params);
    res.json({ exito: true, datos: result.rows });
  } catch (err) {
    console.error('Error al listar asientos:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/contabilidad/libro-mayor
 * Libro mayor por cuenta y rango de fechas
 */
router.get('/libro-mayor', authMiddleware, async (req, res) => {
  try {
    const { cuenta_id, fecha_desde, fecha_hasta } = req.query;

    if (!cuenta_id) {
      return res.status(400).json({ exito: false, error: 'cuenta_id es requerido' });
    }

    // Obtener información de la cuenta
    const cuentaInfo = await pool.query(
      'SELECT * FROM cuentas_contables WHERE id = $1',
      [cuenta_id]
    );
    if (cuentaInfo.rows.length === 0) {
      return res.status(404).json({ exito: false, error: 'Cuenta contable no encontrada' });
    }

    // Obtener movimientos
    let query = `
      SELECT tc.*, t.folio AS transaccion_folio, t.tipo AS transaccion_tipo,
             t.fecha AS transaccion_fecha, t.comentario
      FROM transacciones_contables tc
      LEFT JOIN transacciones t ON t.id = tc.transaccion_id
      WHERE tc.cuenta_contable_id = $1
    `;
    const params = [cuenta_id];
    let idx = 2;

    if (fecha_desde) {
      query += ` AND tc.fecha >= $${idx}`;
      params.push(fecha_desde);
      idx++;
    }
    if (fecha_hasta) {
      query += ` AND tc.fecha <= $${idx}`;
      params.push(fecha_hasta);
      idx++;
    }

    query += ' ORDER BY tc.fecha ASC, tc.id ASC';

    const result = await pool.query(query, params);
    const movimientos = result.rows;

    // Calcular saldos
    let saldoAcumulado = 0;
    const movimientosConSaldo = movimientos.map(m => {
      saldoAcumulado += parseFloat(m.debe || 0) - parseFloat(m.haber || 0);
      return { ...m, saldo_acumulado: saldoAcumulado };
    });

    // Calcular totales
    const totalDebe = movimientos.reduce((s, m) => s + parseFloat(m.debe || 0), 0);
    const totalHaber = movimientos.reduce((s, m) => s + parseFloat(m.haber || 0), 0);

    res.json({
      exito: true,
      datos: {
        cuenta: cuentaInfo.rows[0],
        movimientos: movimientosConSaldo,
        total_debe: totalDebe,
        total_haber: totalHaber,
        saldo_final: saldoAcumulado,
      }
    });
  } catch (err) {
    console.error('Error en libro mayor:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

/**
 * GET /api/v1/contabilidad/balanza
 * Balanza de comprobación con saldos por cuenta
 */
router.get('/balanza', authMiddleware, async (req, res) => {
  try {
    const { fecha_corte } = req.query;

    let query = `
      SELECT cc.id, cc.codigo, cc.nombre, cc.tipo, cc.naturaleza,
             COALESCE(SUM(tc.debe), 0) AS debe,
             COALESCE(SUM(tc.haber), 0) AS haber
      FROM cuentas_contables cc
      LEFT JOIN transacciones_contables tc ON tc.cuenta_contable_id = cc.id
    `;
    const params = [];
    let idx = 1;

    if (fecha_corte) {
      query += ` AND tc.fecha <= $${idx}`;
      params.push(fecha_corte);
      idx++;
    }

    query += `
      GROUP BY cc.id, cc.codigo, cc.nombre, cc.tipo, cc.naturaleza
      ORDER BY cc.codigo
    `;

    const result = await pool.query(query, params);
    const cuentas = result.rows;

    // Calcular saldos
    const cuentasConSaldo = cuentas.map(c => {
      const debe = parseFloat(c.debe);
      const haber = parseFloat(c.haber);
      let saldo = 0;
      if (c.naturaleza === 'deudora') {
        saldo = debe - haber;
      } else {
        saldo = haber - debe;
      }
      return { ...c, saldo };
    });

    const totalDebe = cuentas.reduce((s, c) => s + parseFloat(c.debe), 0);
    const totalHaber = cuentas.reduce((s, c) => s + parseFloat(c.haber), 0);

    res.json({
      exito: true,
      datos: cuentasConSaldo,
      totales: { debe: totalDebe, haber: totalHaber }
    });
  } catch (err) {
    console.error('Error en balanza:', err);
    res.status(500).json({ exito: false, error: err.message });
  }
});

module.exports = router;
