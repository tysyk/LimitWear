# LimitWear Telegram Bot Runbook

This runbook covers the Telegram setup used by the notification provider and manual launch checks.

## Scope

Configure and verify:

- Telegram bot token stored only in backend secrets.
- Optional Telegram API base URL override for tests or proxying.
- User account linking with a saved `telegramId`.
- Mocked or safe manual message delivery.
- Failure-safe behavior when Telegram is not configured or rejects a message.

## Backend Variables

Configure these in the backend host secret store:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_API_BASE_URL`

`TELEGRAM_BOT_API_BASE_URL` defaults to `https://api.telegram.org` when it is not set.

## Account Linking

- Store the Telegram chat/user id as `telegramId` on the user profile.
- Store `telegramUsername` only as display metadata; do not use it as the delivery target.
- Trim user-provided Telegram values before saving.
- If a user disconnects Telegram in a future UI, clear `telegramId` and keep in-app notifications enabled.

## Delivery Test

Run this check before launch:

1. Configure `TELEGRAM_BOT_TOKEN` in a production-like backend environment.
2. Link a safe test user to a known Telegram chat id.
3. Trigger a safe service notification path that calls Telegram delivery.
4. Confirm the message appears in the expected Telegram chat.
5. Confirm the same event is still recorded as an in-app notification.
6. Temporarily test a missing or invalid chat id in a non-production environment.
7. Confirm the provider returns a failed result and logs the failure without crashing the caller.

## Evidence Log

| Field                         | Value                    |
| ----------------------------- | ------------------------ |
| Issue                         | LW-092                   |
| Date                          | YYYY-MM-DD               |
| Bot token configured          | Pass/fail                |
| Test account linked           | Pass/fail                |
| Telegram message delivered    | Pass/fail                |
| Failure-safe behavior checked | Pass/fail                |
| Notes                         | Safe evidence links only |

## Launch Acceptance

Telegram is ready for launch when:

- Bot credentials are configured in backend secrets.
- At least one safe delivery test passes.
- Failure handling is verified with a mocked or non-production rejection.
- No bot token, chat id, or message containing personal data is committed or pasted into public logs.
