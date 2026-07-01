# LimitWear API

NestJS and TypeScript backend for LimitWear.

## Development

Copy the environment template and replace its placeholders:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Never commit `.env` or real credentials.

```bash
npm install
npm run start:dev
```

The API listens on `PORT` from `.env`, or port `5000` by default.

Set the MongoDB connection string with `DATABASE_URL`. The legacy `MONGO_URI`
name is supported temporarily for local development. See `.env.example` for
the complete configuration inventory.

## Environment hardening

Local development keeps external integrations lazy so the API can boot without
real Monobank, Nova Poshta, or S3 credentials. In `NODE_ENV=production`, startup
fails unless required secrets and public URLs are configured with real values:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL` and `CORS_ORIGINS`
- `MONO_TOKEN`, `MONO_WEBHOOK_URL`, `MONO_WEBHOOK_SECRET`
- `NOVA_POSHTA_API_KEY`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_PUBLIC_BASE_URL`

Production also requires `COOKIE_SECURE=true`, rejects `CORS_ORIGINS=*`, and
rejects placeholder values such as `replace-with-*` or `<account-id>`.

Launch-facing external notifications are configured separately:

- Email: `EMAIL_PROVIDER_API_URL`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_API_BASE_URL`

Email and Telegram delivery wrappers are failure-safe: provider failures are
logged and returned as failed/skipped results so order and notification flows do
not crash.

Swagger docs are enabled by default outside production. In production, `/docs`
is disabled unless `SWAGGER_ENABLED=true` is set explicitly.

The API also applies an in-memory request limiter as a backend safety net. It is
enabled by default with `RATE_LIMIT_MAX=300` requests per
`RATE_LIMIT_WINDOW_MS=60000` milliseconds per client IP. Use edge/WAF limits in
production as the primary defense.

## Health check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-07-01T00:00:00.000Z",
  "uptimeSeconds": 42,
  "environment": "production",
  "checks": {
    "database": "connected"
  }
}
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```
