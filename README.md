# SYNZK HUB Backend

Production-ready minimal backend for SYNZK HUB.

## Endpoints
- `GET  /api/health`
- `POST /api/swap`
- `GET  /api/status/:id`
- `GET  /api/swaps?limit=50`
- `POST /api/swaps/:id/advance` (dev helper)

## Environment
```
PORT=8080
CORS_ORIGIN=*
# DATABASE_URL=postgres://USER:PASS@HOST:PORT/DB
PGSSL=1
```

If `DATABASE_URL` is not provided, backend uses in-memory Map (non-persistent).

## Run
```bash
npm i
npm run dev
```

## Deploy (Render)
- Start Command: `node server.js`
- Set env above. Use Render Postgres to persist swaps.
