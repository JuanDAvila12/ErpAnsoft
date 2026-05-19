// Script temporal para ejecutar migration_v11_cuentas_contables.sql
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'spi_erp',
  user: process.env.DB_USER || 'spi_user',
  password: process.env.DB_PASSWORD || 'spi_password',
});

async function run() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, '..', 'db', 'migration_v11_cuentas_contables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons to execute statements individually
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Ejecutando ${statements.length} bloques SQL...`);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i]);
        console.log(`  Bloque ${i + 1}/${statements.length} OK`);
      } catch (err) {
        console.log(`  Bloque ${i + 1}/${statements.length} ERROR: ${err.message}`);
      }
    }
    
    // Verify
    const result = await client.query('SELECT COUNT(*) as total FROM cuentas_contables');
    console.log(`\nTotal cuentas contables: ${result.rows[0].total}`);
    
    const result2 = await client.query('SELECT codigo, nombre, tipo, nivel, padre_id FROM cuentas_contables ORDER BY codigo');
    console.log('\nCatálogo de cuentas:');
    result2.rows.forEach(r => {
      const indent = '  '.repeat(r.nivel - 1);
      console.log(`${indent}${r.codigo} - ${r.nombre} (${r.tipo})`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
