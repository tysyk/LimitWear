# LimitWear Launch Checklist

This checklist supports LW-114 manual launch sign-off. It must be completed after LW-110, LW-111, LW-112, and LW-113 are ready and before the production release task starts.

## Sign-Off Rules

- Mark each item as `Pass`, `Fail`, or `N/A`.
- Add safe evidence links where useful.
- Do not paste secrets, tokens, personal data, raw payment data, or private file URLs into this document.
- Any `Fail` blocks public launch until the owner approves a fix or an explicit launch exception.

## Environment and Infrastructure

| Check                                                                      | Status  | Evidence |
| -------------------------------------------------------------------------- | ------- | -------- |
| Frontend production domain opens over HTTPS.                               | Pending |          |
| Backend production API domain opens over HTTPS.                            | Pending |          |
| Backend `GET /health` returns `status: ok`.                                | Pending |          |
| Production `CORS_ORIGINS` is restricted to the production frontend origin. | Pending |          |
| Production secrets are configured in hosting secret storage only.          | Pending |          |
| CI/CD verification passes before deployment.                               | Pending |          |

## Database, Storage, and Backups

| Check                                                            | Status  | Evidence |
| ---------------------------------------------------------------- | ------- | -------- |
| Production MongoDB database is connected.                        | Pending |          |
| MongoDB automated backups are enabled.                           | Pending |          |
| Restore drill passed in an isolated dev environment.             | Pending |          |
| Production S3/R2 bucket is configured.                           | Pending |          |
| Public files resolve through approved public URLs.               | Pending |          |
| Private files require authentication and signed URLs.            | Pending |          |
| File retention or versioning is configured for production files. | Pending |          |

## Auth, Admin, and Permissions

| Check                                                       | Status  | Evidence |
| ----------------------------------------------------------- | ------- | -------- |
| Admin account exists and default password has been changed. | Pending |          |
| Admin routes reject regular users.                          | Pending |          |
| Designer routes reject non-designer users.                  | Pending |          |
| User registration and login work in production.             | Pending |          |
| Session refresh and logout work in production.              | Pending |          |
| AuditLog records are created for sensitive admin actions.   | Pending |          |

## Commerce Flow

| Check                                                                           | Status  | Evidence |
| ------------------------------------------------------------------------------- | ------- | -------- |
| Test drop can be created and launched by admin.                                 | Pending |          |
| Test order reaches `pending_payment`.                                           | Pending |          |
| Monobank production token is configured only in backend secrets.                | Pending |          |
| Test Monobank hold does not increase drop quantity before trusted confirmation. | Pending |          |
| Successful payment confirmation updates order and payment state.                | Pending |          |
| Failed or expired payment does not leave reserved inventory stuck.              | Pending |          |
| Second Chance listing cannot be sold twice.                                     | Pending |          |

## Delivery and Production

| Check                                                      | Status  | Evidence |
| ---------------------------------------------------------- | ------- | -------- |
| Nova Poshta API key is configured only in backend secrets. | Pending |          |
| City and warehouse lookup works.                           | Pending |          |
| TTN can be created only after the order is ready to ship.  | Pending |          |
| Production package can move through expected statuses.     | Pending |          |
| Production files remain private to unauthorized users.     | Pending |          |

## Notifications and External Channels

| Check                                                      | Status  | Evidence |
| ---------------------------------------------------------- | ------- | -------- |
| In-app notifications are created for key service events.   | Pending |          |
| Email provider domain is verified.                         | Pending |          |
| SPF, DKIM, and DMARC checks pass.                          | Pending |          |
| Transactional email test is delivered successfully.        | Pending |          |
| Telegram bot is connected.                                 | Pending |          |
| Critical admin alert reaches the configured admin channel. | Pending |          |

## Monitoring and Rollback

| Check                                                   | Status  | Evidence |
| ------------------------------------------------------- | ------- | -------- |
| Server logs are available without exposing secrets.     | Pending |          |
| Monitoring alerts fire for backend or database failure. | Pending |          |
| Critical error path creates an admin alert.             | Pending |          |
| Rollback owner is identified.                           | Pending |          |
| Rollback procedure is understood by the team.           | Pending |          |
| Last known good deployment can be restored.             | Pending |          |

## Final Approval

| Role              | Name | Decision | Date |
| ----------------- | ---- | -------- | ---- |
| Product owner     |      | Pending  |      |
| Engineering owner |      | Pending  |      |

Public launch can proceed only when every required check is `Pass` or has an approved exception recorded in the evidence column.
