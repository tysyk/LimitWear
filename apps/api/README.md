# LimitWear API

NestJS and TypeScript backend for LimitWear.

## Development

```bash
npm install
npm run start:dev
```

The API listens on `PORT` from `.env`, or port `5000` by default.

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
