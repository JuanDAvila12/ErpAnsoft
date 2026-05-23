// Script para ejecutar la migración v15 desde Node.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'spi_erp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    const sqlPath = path.join(__dirname, '..', 'db', 'migration_v15_plantillas_pdf.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando migración v15 (Plantillas PDF)...');
    await pool.query(sql);
    console.log('Migración v15 completada exitosamente');
  } catch (err) {
    console.error('Error ejecutando migración v15:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
