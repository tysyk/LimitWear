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

## Health check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
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
