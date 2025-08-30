/**
 * Simple SQL migration runner: executes .sql files in /migrations alphabetically once.
 * Stores applied filenames in table schema_migrations.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

(async () => {
  const [rows] = await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  const [appliedRows] = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedRows.map(r => r.filename));
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log('Applying', f);
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES (?)', [f]);
  }
  console.log('Migrations complete.');
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
