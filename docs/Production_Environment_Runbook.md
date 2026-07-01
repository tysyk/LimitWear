# LimitWear Production Environment Runbook

This runbook covers the LW-110 production environment setup before public launch. It keeps production isolated from local/dev environments and gives the team a repeatable smoke test path.

## Required Services

- Frontend hosting: Vercel production project.
- Backend hosting: VPS or cloud runtime for the NestJS API.
- Database: MongoDB Atlas production cluster.
- File storage: S3-compatible production bucket, such as Cloudflare R2 or AWS S3.
- Domain and DNS: production frontend domain and backend API domain.
- Secrets: hosting-provider secret storage or an approved secret manager.
- Monitoring: backend health checks and critical admin alerts.

## Environment Separation

- Production must use separate database, storage bucket, API keys, domains, and webhook URLs.
- Dev/staging credentials must not be reused in production.
- Production secrets must not be committed to GitHub, pasted into issue comments, or stored in local docs.
- `DATABASE_URL` is the production MongoDB connection string. `MONGO_URI` is only a local fallback and must not be used for production.
- Frontend production config must point to the production backend API URL.

## Backend Production Variables

Configure these in the backend host secret store:

- `NODE_ENV=production`
- `PORT`
- `CLIENT_URL`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `JWT_SECRET`
- `MONO_TOKEN`
- `MONO_WEBHOOK_URL`
- `MONO_WEBHOOK_SECRET`
- `NOVA_POSHTA_API_KEY`
- `NOVA_POSHTA_API_URL`
- `EMAIL_PROVIDER_API_URL`
- `EMAIL_PROVIDER_API_KEY`
- `EMAIL_FROM`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `S3_SIGNED_URL_EXPIRES_IN_SECONDS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_API_BASE_URL`

Use `apps/api/.env.example` as the field reference, but never copy placeholder values into production.

## Frontend Production Variables

Configure these in Vercel:

- Production API base URL.
- Public frontend URL if required by auth, checkout, or notification links.
- Any public analytics or monitoring keys approved for launch.

Only expose variables with a `NEXT_PUBLIC_` prefix when the browser genuinely needs them.

## Database Setup

- Create a dedicated MongoDB Atlas production cluster or database.
- Restrict network access to the backend host or trusted deployment network.
- Create an application user with least required permissions.
- Enable automated backups before accepting production traffic.
- Record the restore procedure in `docs/Backups_Runbook.md`.

## Storage Setup

- Create a dedicated production S3/R2 bucket.
- Enable versioning or retention where available.
- Configure CORS only for approved production origins.
- Keep production/private files behind signed URLs.
- Confirm public assets use the approved CDN/public base URL.

## Deployment Smoke Test

Run this after the production environment is deployed but before public launch:

1. Open the frontend production URL over HTTPS.
2. Call backend `GET /health` and confirm `status: ok`.
3. Register or log in with an approved test account.
4. Confirm admin login works with the production admin account.
5. Create or inspect one test drop without taking real payments.
6. Upload a safe test file and confirm it is stored in the production bucket.
7. Confirm private file access requires authentication and signed URL flow.
8. Confirm Monobank and Nova Poshta credentials are configured in production secrets.
9. Trigger a harmless critical admin alert path or test notification.
10. Confirm server logs do not expose secrets, tokens, or personal data.

## Sign-Off Checklist

| Check                                  | Status  |
| -------------------------------------- | ------- |
| Frontend production project exists     | Pending |
| Backend production runtime exists      | Pending |
| Production MongoDB configured          | Pending |
| Production S3/R2 bucket configured     | Pending |
| Production secrets configured          | Pending |
| Production domain and HTTPS configured | Pending |
| Backend `/health` passes               | Pending |
| Smoke test completed                   | Pending |
| Backups enabled                        | Pending |
| Rollback owner identified              | Pending |

LW-110 can be signed off when the production environment is ready, smoke tested, and not yet publicly launched.
