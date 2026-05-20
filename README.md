# Model Gateway API

A production-grade AI gateway built with NestJS that sits on top of multiple AI providers (Gemini, Groq). Instead of calling AI providers directly, clients call this gateway — which handles auth, rate limiting, async jobs, webhooks, and usage metering.

## Tech Stack

- **NestJS 11** + TypeScript
- **PostgreSQL** + Prisma 7
- **Redis** + BullMQ
- **Gemini** + Groq (AI providers)

## Features

- API Key auth system (HMAC-SHA256)
- Sync + streaming AI completions (SSE)
- Async job queue (BullMQ)
- Webhook delivery with retry logic
- Token usage metering + rate limiting
- Prompt templates

## Getting Started

```bash
pnpm install
cp .env.example .env
# fill in .env values
pnpm prisma migrate dev
pnpm run dev
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /v1/auth/register | Register a new user | None |
| POST | /v1/auth/login | Login and get JWT | None |
| POST | /v1/keys | Issue a new API key | JWT |
| GET | /v1/keys | List all API keys | JWT |
| DELETE | /v1/keys/:id | Revoke an API key | JWT |

# Important Note:
Currently project is under development phase