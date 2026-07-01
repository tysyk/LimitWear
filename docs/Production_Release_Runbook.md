# LimitWear Production Release Runbook

This runbook supports LW-115 production release. Use it only after the launch checklist in `docs/Launch_Checklist.md` is complete or every exception has explicit owner approval.

## Release Preconditions

- The release branch is merged into `main`.
- GitHub Actions or the local verification gate is green.
- `docs/Launch_Checklist.md` has no blocking `Fail` items.
- Production environment setup is complete according to `docs/Production_Environment_Runbook.md`.
- Domain and email setup are complete according to `docs/Domain_Email_Runbook.md`.
- Backup restore drill is recorded according to `docs/Backups_Runbook.md`.
- Rollback owner and support contact are available during the release window.

## Release Order

1. Announce the internal release window to the team.
2. Confirm no active incident, migration, or provider outage is in progress.
3. Pull the latest `main` locally and confirm the release commit.
4. Confirm CI is green for the commit being released.
5. Deploy the backend first.
6. Run backend smoke checks.
7. Deploy the frontend.
8. Run full production smoke checks.
9. Watch logs and admin alerts for at least 30 minutes.
10. Mark the internal launch as complete only after smoke checks and monitoring are clean.

## Backend Deploy Checks

| Check                                                         | Status  | Evidence |
| ------------------------------------------------------------- | ------- | -------- |
| Backend deployment completed for the expected commit.         | Pending |          |
| `GET /health` returns `status: ok`.                           | Pending |          |
| Server logs show no startup errors.                           | Pending |          |
| Database connection is healthy.                               | Pending |          |
| Storage configuration is healthy.                             | Pending |          |
| Swagger is disabled in production unless explicitly approved. | Pending |          |

## Frontend Deploy Checks

| Check                                                              | Status  | Evidence |
| ------------------------------------------------------------------ | ------- | -------- |
| Frontend deployment completed for the expected commit.             | Pending |          |
| Production domain opens over HTTPS.                                | Pending |          |
| Public home/catalog routes render.                                 | Pending |          |
| Dynamic drop/designer/collection routes render.                    | Pending |          |
| Frontend calls the production backend API.                         | Pending |          |
| No user-facing console or runtime errors appear in the smoke path. | Pending |          |

## Production Smoke Tests

| Flow                                         | Expected result                                         | Status  |
| -------------------------------------------- | ------------------------------------------------------- | ------- |
| Register or log in with a safe test account. | Session starts and `/profile` loads.                    | Pending |
| Open admin area with admin account.          | Admin routes load and regular users are rejected.       | Pending |
| Create or inspect a test drop.               | Drop data is saved and visible only in expected states. | Pending |
| Start checkout for a test order.             | Order reaches `pending_payment`.                        | Pending |
| Check payment configuration.                 | Monobank secrets are present only in backend host.      | Pending |
| Check delivery lookup.                       | Nova Poshta city and warehouse lookup responds.         | Pending |
| Upload a safe test file.                     | File metadata is stored and access rules hold.          | Pending |
| Open private file as regular user.           | Access is denied.                                       | Pending |
| Trigger a safe notification path.            | In-app notification is created.                         | Pending |
| Trigger a safe admin alert path.             | Admin alert is delivered or recorded.                   | Pending |

## Monitoring Window

Monitor these for the first 30 minutes after deploy:

- Backend logs.
- Frontend deployment logs and runtime errors.
- Database connection errors.
- Payment webhook errors.
- File upload or signed URL errors.
- Email and Telegram delivery failures.
- Admin critical alerts.

If any critical issue appears, pause the launch announcement and start rollback triage.

## Rollback Procedure

1. Identify the last known good backend and frontend deployments.
2. Roll back frontend first if the issue is UI-only.
3. Roll back backend first if the issue affects data, payments, auth, delivery, files, or webhooks.
4. Do not roll back database state unless the owner approves a restore plan.
5. Disable risky external webhooks temporarily if they are producing duplicate or unsafe events.
6. Record the rollback reason, owner, affected commit, and final status.
7. Run smoke checks again after rollback.

## Release Evidence Log

| Field                    | Value                    |
| ------------------------ | ------------------------ |
| Issue                    | LW-115                   |
| Release date             | YYYY-MM-DD               |
| Release commit           | Commit SHA               |
| Backend deployment       | URL or deployment id     |
| Frontend deployment      | URL or deployment id     |
| Smoke test result        | Pass/fail                |
| Monitoring window result | Pass/fail                |
| Rollback needed          | Yes/no                   |
| Owner                    | Name                     |
| Notes                    | Safe evidence links only |

## Completion Criteria

LW-115 is ready for sign-off when:

- Backend and frontend are deployed from the intended commit.
- Production smoke tests pass.
- Logs and alerts stay clean during the monitoring window.
- Internal launch is announced to the team.
- Any exceptions are documented with owner approval.
