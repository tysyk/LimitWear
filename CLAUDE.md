# LimitWear Claude Handoff

This file is a project handoff for Claude or any other coding agent joining the
LimitWear repository. Treat it as an onboarding note, not as a replacement for
`AGENTS.md` or `docs/LimitWear_Baseline.md`.

## First things to read

1. `AGENTS.md` - contributor rules, commit format, and baseline policy.
2. `docs/LimitWear_Baseline.md` - source of truth for product logic, data
   models, permissions, APIs, business rules, roadmap, testing, and deployment.
3. The matching GitHub issue / GitHub Project item before starting a roadmap
   task.

If an issue and the baseline conflict, stop and ask the project owner which
version wins before implementing.

## Product summary

LimitWear is a limited-drop fashion marketplace.

Core flow:

1. Users register/login.
2. Users or designers submit designer applications and designs.
3. Admin reviews designers/designs.
4. Admin creates and launches drops from approved designs.
5. Users reserve a place in an active drop.
6. Monobank creates a payment hold.
7. Only after trusted payment confirmation does the drop quantity increase.
8. Successful drops move into production, delivery, payouts, notifications, and
   later second-chance flows.

Important business rules:

- `Drop.currentQuantity` must never come from frontend.
- `pending_payment` orders do not reserve quantity.
- Drop quantity increases only after trusted Monobank hold confirmation or a
  trusted backend payment status check.
- No overbooking.
- Reaching `minQuantity` moves a drop to `guaranteed`.
- Reaching `maxQuantity` moves a drop to `sold_out`.
- Admin-only operations must use permission checks, not just role checks.
- Private/internal files must be served through backend permission checks.

## Repository structure

- `apps/api` — NestJS backend.
- `apps/web` — Next.js frontend.
- `packages/shared` — shared enums and permissions.
- `docs/LimitWear_Baseline.md` — product and technical baseline.
- `AGENTS.md` — general agent/contributor rules.

## Workflow rules

- Work in a separate branch. Preferred prefix: `codex/` or `claude/`.
- Before implementing, read the matching issue and baseline sections.
- Keep changes focused on the task.
- Do not silently change product rules. Update the baseline only when the owner
  approved the decision.
- Use Conventional Commits:

```text
type(scope): short imperative description (LW-XXX)
```

Examples:

```text
feat(orders): add create order endpoint (LW-059)
fix(api): remove duplicate mongoose indexes
test(auth): cover logout flow (LW-018)
```

For roadmap work, include the matching `LW-XXX` in the commit subject.

## Checks before PR

For backend changes, run:

```powershell
npm.cmd run format:check --prefix apps/api
npm.cmd run lint --prefix apps/api
npm.cmd run typecheck --prefix apps/api
npm.cmd run build --prefix apps/api
npm.cmd test --prefix apps/api -- --runInBand
```

For frontend changes, inspect `apps/web/package.json` and run the matching
format/lint/typecheck/build checks.

CI must be green before merge.

## Current project state

Latest known merged work on `main`:

- PR #153 - drop admin lifecycle management.
- PR #154 - drop quantity reservation rules.
- PR #155 - create order DTO validation.
- PR #156 - create order endpoint.
- PR #157 - OrdersModule auth guard dependency fix.
- PR #158 - duplicate Mongoose index warning fix.

At this point the backend has:

- Auth/user foundation:
  - user schema;
  - register/login/logout/me;
  - HttpOnly cookie auth;
  - role and permission map;
  - auth/permission/owner guards.

- Admin/audit foundation:
  - audit log schema/service;
  - admin request/design/drop endpoints;
  - permission-protected admin flows.

- Storefront/domain foundation:
  - drop, collection, designer profile schemas;
  - public drops/collections/designers APIs;
  - Next.js public storefront pages/components.

- Designer/files flow:
  - designer application/request flow;
  - design schema and designer design endpoints;
  - admin design moderation;
  - file asset schema;
  - S3/R2-compatible storage service;
  - upload validation;
  - private file signed URL access;
  - file security tests.

- Drops:
  - admin create/edit/launch;
  - lifecycle transition service;
  - quantity validation;
  - atomic confirmed-hold quantity increment helper;
  - guaranteed/sold_out status rules;
  - drop tests.

- Orders:
  - `CreateOrderDto`;
  - `Order` schema;
  - `OrdersModule`;
  - `POST /orders`;
  - creates `pending_payment` orders;
  - validates active/guaranteed drop, size, quantity, and delivery data;
  - does not increment `Drop.currentQuantity` on pending order.

Quality status after latest work:

- Backend CI checks pass.
- Backend tests are currently around 202 passing tests.
- Mongoose duplicate schema index warnings for Design/Drop/DesignerProfile/
  FileAsset/Collection were fixed by keeping explicit `Schema.index(...)`
  declarations as the single source of truth.

## Suggested next tasks

The next logical backend area is payments:

1. LW-065 - Create Payment schema.
2. LW-066 - Implement Monobank service.
3. LW-067 - Implement create payment hold.
4. LW-068 - Implement Monobank webhook endpoint.
5. LW-069 - Handle `hold_created` event.
6. LW-070 - Handle payment failed event.
7. LW-071 - Finalize holds after successful drop.
8. LW-072 - Cancel holds after failed drop.
9. LW-073 - Payment tests.

Orders still has follow-up work:

- LW-061 - cancel order.
- LW-062 - update order size/delivery.
- LW-064 - order tests.

Admin/frontend work still open:

- LW-055 - Admin drops frontend.
- LW-063 - Checkout frontend.
- Admin layout/action center tasks may still be open and should be checked in
  GitHub Project before starting.

Later blocks:

- Nova Poshta delivery.
- Production packages/statuses.
- Notifications.
- Wishlist.
- Second Chance.
- Payouts.
- Analytics.
- Monitoring/backups/deployment/launch checklist.

## Practical implementation notes

- Backend validation is currently mostly explicit service/DTO helper validation,
  not `class-validator`.
- Do not add a new dependency unless the task really requires it.
- Auth-protected modules that use `AuthGuard` or `PermissionsGuard` should import
  `AuthModule`, because that exports `AuthGuard`, `PermissionsGuard`, `JwtModule`,
  and `UsersModule`.
- For unique MongoDB constraints, prefer explicit `Schema.index(...)` and avoid
  also setting `unique: true` on `@Prop`, otherwise Mongoose prints duplicate
  schema index warnings.
- When creating orders, use `DropsService.validatePendingOrderQuantity(...)`;
  do not increment drop counters there.
- Payment confirmation logic should later use
  `DropsService.confirmPaymentHoldQuantity(...)`, not direct mutation.
- Keep public/private/internal file access rules strict.

## How to hand off progress back

When finishing a task, report:

- issue(s) completed;
- PR link;
- checks run;
- any product or technical decisions made;
- what should be picked up next.
