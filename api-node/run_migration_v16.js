/**
 * Migration V16: Configuración contable granular para entidades
 *
 * 1. Crea la tabla entidad_cuentas_contables
 * 2. Agrega el campo tipo_concepto a transacciones
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'spi_user',
  password: process.env.DB_PASSWORD || 'spi_pass',
  database: process.env.DB_NAME || 'spi_erp',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('=== Migration V16: Configuración contable granular ===');

    // 1. Crear tabla entidad_cuentas_contables
    await client.query(`
      CREATE TABLE IF NOT EXISTS entidad_cuentas_contables (
        id SERIAL PRIMARY KEY,
        entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
        rol_contable VARCHAR(30) NOT NULL CHECK (rol_contable IN (
          'proveedor','anticipo_proveedor','acreedor','anticipo_acreedor',
          'cliente','anticipo_cliente','deudor','anticipo_deudor'
        )),
        cuenta_contable_id INTEGER NOT NULL REFERENCES cuentas_contables(id),
        activo BOOLEAN DEFAULT TRUE,
        UNIQUE(entidad_id, rol_contable)
      );
    `);
    console.log('[OK] Tabla entidad_cuentas_contables creada');

    // 2. Agregar campo tipo_concepto a transacciones
    await client.query(`
      ALTER TABLE transacciones
      ADD COLUMN IF NOT EXISTS tipo_concepto VARCHAR(20) DEFAULT 'estandar'
      CHECK (tipo_concepto IN ('estandar','gasto','deudores'));
    `);
    console.log('[OK] Columna tipo_concepto agregada a transacciones');

    console.log('=== Migration V16 completada exitosamente ===');
  } catch (err) {
    console.error('Error en migration V16:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
