# LimitWear Backups Runbook

This runbook implements the LW-113 backup and restore procedure for LimitWear. It follows the baseline rules for MongoDB Atlas backups, S3-compatible file retention, soft delete, and a tested restore in the dev environment.

## Scope

Back up and validate restore coverage for:

- MongoDB production data: users, orders, payments, drops, audit logs, notifications, delivery data, designer records, payouts, and file metadata.
- S3/R2 file storage: design originals, previews, mockups, production files, banners, and drop photos.
- Server configuration: documented environment variables and deployment settings, with secrets stored only in the approved secret manager or hosting provider settings.
- Code: GitHub remains the source of truth for application code.

## MongoDB Backup Policy

- Enable MongoDB Atlas automated backups for the production cluster before production launch.
- Use daily backups for production.
- Keep at least 7 days of retention for MVP launch; increase to 30 days once paid production traffic starts.
- Keep dev/staging data separate from production. Never restore production data into a shared or public dev database without owner approval.
- Before destructive schema migrations or bulk data jobs, create an on-demand snapshot.

## File Storage Retention Policy

- Enable bucket versioning or provider-native object retention for the production S3/R2 bucket when available.
- Private files and production files must not be physically deleted immediately.
- Application-level deletes should mark FileAsset metadata as deleted/quarantined and set deletedAt where applicable.
- Use a lifecycle rule only after the retention window is approved. MVP default: keep deleted private and production files for at least 30 days.
- Public derived files can be regenerated only if their source files are still retained.

## Restore Drill

Run a restore drill before launch and after major infrastructure changes.

1. Create an on-demand MongoDB production snapshot or select the latest daily snapshot.
2. Restore it into an isolated dev restore database, not into the active production database.
3. Point a local or dev backend to the restored database with `DATABASE_URL`.
4. Configure a dev-only S3/R2 bucket or read-only credentials for checking referenced objects.
5. Start the backend and verify `GET /health` returns `status: ok`.
6. Verify core records exist:
   - one admin user
   - one customer user
   - one drop
   - one order with payment data
   - one FileAsset metadata record with a real storageKey
   - recent AuditLog records
7. Verify at least one private FileAsset can be resolved through the normal signed URL flow.
8. Verify soft-deleted FileAsset records are still present in metadata and are not exposed to regular users.
9. Run the API verification suite against the restored dev environment where practical.
10. Destroy the temporary restore database after evidence is recorded.

## Command Examples

Use provider restore tools first when using MongoDB Atlas. If a manual dump is required for a controlled drill, run it only from a trusted admin workstation or CI runner with temporary credentials:

```powershell
mongodump --uri "$env:DATABASE_URL" --archive="limitwear-prod.archive" --gzip
mongorestore --uri "$env:DEV_RESTORE_DATABASE_URL" --archive="limitwear-prod.archive" --gzip --drop
```

Do not commit dumps, archives, bucket exports, credentials, or restore logs containing personal data.

## Restore Evidence Log

Record each drill in the project tracker or launch checklist:

| Field             | Value                                                    |
| ----------------- | -------------------------------------------------------- |
| Issue             | LW-113                                                   |
| Date              | YYYY-MM-DD                                               |
| Snapshot source   | Atlas snapshot id or backup timestamp                    |
| Restore target    | Dev restore database name                                |
| Operator          | Name                                                     |
| Health check      | Pass/fail                                                |
| Core data checks  | Pass/fail                                                |
| File access check | Pass/fail                                                |
| Soft-delete check | Pass/fail                                                |
| Cleanup completed | Yes/no                                                   |
| Notes             | Links to safe evidence, without secrets or personal data |

## Launch Acceptance

LW-113 is ready for launch sign-off only when:

- MongoDB Atlas production backups are enabled.
- S3/R2 retention or versioning is configured for production files.
- The restore drill has passed in an isolated dev environment.
- Evidence is recorded without exposing secrets or personal data.
