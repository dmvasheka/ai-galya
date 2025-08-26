# Numerology Forecast — Monorepo

## Prereqs
- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)

## Quick Start
```bash
pnpm i
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# edit apps/api/.env: add OPENAI_API_KEY and (optionally) GOOGLE_* vars

pnpm dev
# web: http://localhost:3000
# api: http://localhost:4000
```

## Google Drive (local, simple)
In `apps/api/.env` set `GOOGLE_TOKENS_JSON` (personal tokens) OR implement proper OAuth flow later.
