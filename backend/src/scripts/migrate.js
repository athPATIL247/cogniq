// filename: backend/src/scripts/migrate.js
// Runs the SQL migration files in order.
// Usage: node src/scripts/migrate.js
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '../../migrations');

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id      SERIAL PRIMARY KEY,
        name    TEXT UNIQUE NOT NULL,
        run_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = (await client.query('SELECT name FROM _migrations')).rows.map(r => r.name);
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.includes(file)) {
        console.log(`[migrate] Skipping ${file} (already applied)`);
        continue;
      }
      console.log(`[migrate] Applying ${file}...`);
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`[migrate] ${file} applied.`);
    }
    console.log('[migrate] All migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('[migrate] Fatal:', err.message); process.exit(1); });
