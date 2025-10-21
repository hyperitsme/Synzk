import { Pool } from 'pg';
import logger from './logger.js';

const DATABASE_URL = process.env.DATABASE_URL || '';
let pool = null;
const memory = { swaps: new Map() };

export async function initDb() {
  if (!DATABASE_URL) {
    logger.warn('DATABASE_URL not set, using in-memory store (non-persistent).');
    return;
  }
  pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.PGSSL === '0' ? false : { rejectUnauthorized: false } });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS swaps (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      body JSONB NOT NULL
    );
  `);
  logger.info('Postgres ready.');
}

export async function upsertSwap(rec) {
  if (!pool) { memory.swaps.set(rec.id, rec); return; }
  const q = "
    INSERT INTO swaps (id, status, mode, created_at, updated_at, body)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      body = EXCLUDED.body
  ";
  await pool.query(q, [rec.id, rec.status, rec.mode, rec.created_at, rec.updated_at, rec.body]);
}

export async function getSwap(id) {
  if (!pool) return memory.swaps.get(id) || null;
  const r = await pool.query('SELECT * FROM swaps WHERE id=$1', [id]);
  return r.rows[0] || null;
}

export async function listSwaps(limit=50) {
  if (!pool) return Array.from(memory.swaps.values()).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)).slice(0, limit);
  const r = await pool.query('SELECT * FROM swaps ORDER BY created_at DESC LIMIT $1', [limit]);
  return r.rows;
}

export async function setStatus(id, status) {
  if (!pool) {
    const row = memory.swaps.get(id);
    if (!row) return;
    row.status = status;
    row.updated_at = new Date().toISOString();
    memory.swaps.set(id, row);
    return;
  }
  await pool.query('UPDATE swaps SET status=$2, updated_at=NOW() WHERE id=$1', [id, status]);
}
