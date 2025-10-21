import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { initDb, upsertSwap, getSwap, listSwaps, setStatus } from './src/db.js';
import logger from './src/logger.js';

const PORT = process.env.PORT || 8080;
const ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'synzk-hub', time: Date.now() });
});

// Validation schema
const SwapBody = z.object({
  fromChain: z.string().min(1),
  fromToken: z.string().min(1),
  toChain:   z.string().min(1),
  toToken:   z.string().min(1),
  amount:    z.string().or(z.number()).transform(String),
  receiver:  z.string().min(8),
  refund:    z.string().min(8).nullable().optional(),
  proofHint: z.string().nullable().optional()
});

// Create swap
app.post('/api/swap', async (req, res) => {
  try {
    const body = SwapBody.parse(req.body || {});
    const id = nanoid();
    const rec = {
      id,
      status: 'queued',
      mode: 'backend',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      body
    };
    await upsertSwap(rec);
    res.json({ swapId: id, status: rec.status, mode: rec.mode });
  } catch (e) {
    logger.error(e);
    res.status(400).json({ error: 'invalid_request', details: e?.message });
  }
});

// Get one status
app.get('/api/status/:id', async (req, res) => {
  const row = await getSwap(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});

// List recent swaps
app.get('/api/swaps', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const rows = await listSwaps(limit);
  res.json(rows);
});

// Dev helper: advance status queued -> sent -> confirmed
app.post('/api/swaps/:id/advance', async (req, res) => {
  const row = await getSwap(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const next = row.status === 'queued' ? 'sent'
             : row.status === 'sent'   ? 'confirmed'
             : row.status === 'failed' ? 'failed'
             : 'confirmed';
  await setStatus(row.id, next);
  res.json(await getSwap(row.id));
});

// Boot
initDb().then(() => {
  app.listen(PORT, () => logger.info({ msg: 'SYNZK HUB backend listening', port: PORT }));
}).catch((e) => {
  console.error('DB init error:', e);
  process.exit(1);
});
