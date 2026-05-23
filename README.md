# Model Gateway API

A production-ready AI Gateway built with NestJS that sits between clients and multiple LLM providers (Gemini & Groq). Supports sync, streaming, and async completions with authentication, rate limiting, usage metering, webhook delivery, and full Swagger documentation.

🚀 **Live:** https://model-gateway-api-production.up.railway.app/api

---

## Tech Stack

- **NestJS 11** + TypeScript
- **PostgreSQL** via Prisma 7
- **Redis** (Upstash) + BullMQ for queues & rate limiting
- **AI Providers:** Google Gemini, Groq
- **Deployed on:** Railway

---

## Features

| Feature | Description |
|---|---|
| JWT Auth | Register/login, JWT-protected routes |
| API Key Management | HMAC-SHA256 hashed keys, raw shown only once |
| Sync Completions | `POST /v1/complete` — waits for AI response |
| SSE Streaming | `POST /v1/complete/stream` — token-by-token stream |
| Async Completions | `POST /v1/complete/async` — returns jobId instantly |
| Provider Fallback | Auto-switches Gemini ↔ Groq on failure |
| Rate Limiting | Redis sliding window — per API key, per minute |
| Usage Metering | Token logging, monthly limits, daily/monthly stats |
| Prompt Templates | Reusable templates with `{{variable}}` substitution |
| Webhook Delivery | Job completion callbacks with HMAC signatures + retry |
| Swagger Docs | Full API documentation at `/api` |
| Docker | Multi-stage Dockerfile + docker-compose |

---

## API Endpoints

### Auth
```
POST /v1/auth/register   — Register a new user
POST /v1/auth/login      — Login, returns JWT
```

### API Keys
```
POST   /v1/keys          — Create API key
GET    /v1/keys          — List API keys
DELETE /v1/keys/:id      — Revoke API key
```

### Completions
```
POST /v1/complete        — Sync completion
POST /v1/complete/stream — SSE streaming completion
POST /v1/complete/async  — Async completion (returns jobId)
```

### Jobs
```
GET /v1/jobs/:id         — Get async job status & result
```

### Templates
```
POST /v1/templates       — Create prompt template
GET  /v1/templates       — List templates
GET  /v1/templates/:id   — Get single template
```

### Webhooks
```
POST   /v1/webhooks          — Register webhook URL
GET    /v1/webhooks          — List webhooks
GET    /v1/webhooks/failed   — Dead-letter deliveries
DELETE /v1/webhooks/:id      — Revoke webhook
```

### Usage
```
GET /v1/usage            — Daily & monthly token usage
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- pnpm
- PostgreSQL
- Redis (or Upstash)

### Steps

```bash
# Clone the repo
git clone https://github.com/your-username/model-gateway-api
cd model-gateway-api

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in your values in .env

# Run database migrations
npx prisma migrate deploy

# Start the server
pnpm start:dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
PORT=3000
NODE_ENV=development
HMAC_SECRET=your-secret
GEMINI_API_KEY=your-key
GROQ_API_KEY=your-key
```

---

## Docker

```bash
# Run with Docker Compose (app + PostgreSQL)
docker-compose up

# Build image only
docker build -t model-gateway-api .
```

---

## Architecture

```
Client
  │
  ├── POST /v1/complete        → CompletionsService → ProvidersService (Gemini/Groq)
  ├── POST /v1/complete/stream → SSE stream → AbortController on disconnect
  ├── POST /v1/complete/async  → BullMQ Queue → Worker → result stored
  │                                                    → Webhook delivered
  └── GET  /v1/jobs/:id        → Job status from BullMQ

Guards (every request):
  ApiKeyGuard  → HMAC verify → attach apiKey to request
  RateLimitGuard → Redis sliding window → 429 if exceeded
```

---

## Project Timeline

| Day | Feature |
|-----|---------|
| 1 | Project setup + Prisma schema |
| 2 | JWT auth + API key management |
| 3 | Rate limiting + usage metering |
| 4 | Provider router + auto-fallback + prompt templates |
| 5 | SSE streaming completions |
| 6 | Async job queue (BullMQ) |
| 7 | Webhook delivery engine |
| 9 | Swagger docs + Docker + Deploy |