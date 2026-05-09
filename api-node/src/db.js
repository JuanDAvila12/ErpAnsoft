const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'spi_erp',
  user: process.env.DB_USER || 'spi_user',
  password: process.env.DB_PASSWORD || 'spi_password',
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool de conexiones:', err);
});

module.exports = pool;
