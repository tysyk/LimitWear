# LimitWear Domain and Email Runbook

This runbook covers LW-111 domain, HTTPS, sender addresses, DNS authentication, and transactional email testing before launch.

## Scope

Configure and verify:

- Production frontend domain with HTTPS.
- Backend API domain with HTTPS.
- `noreply` sender for automated transactional emails.
- `support` mailbox or alias for customer replies.
- SPF, DKIM, and DMARC DNS records.
- A manual transactional email delivery test.

## Domain Setup

- Point the production frontend domain to the approved Vercel project.
- Point the production API domain to the backend host or reverse proxy.
- Enforce HTTPS for both frontend and backend domains.
- Redirect plain HTTP traffic to HTTPS.
- Keep dev/staging domains separate from production domains.
- Set production `CORS_ORIGIN` to the final HTTPS frontend origin.

## Sender Addresses

- Use `noreply@<domain>` only for automated transactional messages.
- Use `support@<domain>` for user replies, support contact, and mailbox forwarding.
- Do not send marketing emails from the transactional sender unless marketing opt-in and unsubscribe handling are implemented.
- Keep provider API keys in the backend host secret store only.

## DNS Records

Add records from the selected email provider:

| Record    | Purpose                                                | Required check                                            |
| --------- | ------------------------------------------------------ | --------------------------------------------------------- |
| SPF       | Authorizes the provider to send for the domain.        | Provider dashboard shows verified.                        |
| DKIM      | Signs outbound mail.                                   | Provider dashboard shows verified for all DKIM selectors. |
| DMARC     | Defines policy and reporting for unauthenticated mail. | DNS lookup returns a valid `_dmarc` record.               |
| MX        | Receives support mail if using hosted mailbox.         | Test inbound mail reaches support.                        |
| CNAME/TXT | Provider-specific domain verification.                 | Provider dashboard shows domain verified.                 |

MVP DMARC can start in monitoring mode:

```text
v=DMARC1; p=none; rua=mailto:dmarc@<domain>
```

Move to a stricter policy only after successful delivery monitoring.

## Transactional Email Test

Run this manual test after DNS records show verified:

1. Trigger a safe transactional email from production or a production-like environment.
2. Send to at least one Gmail inbox and one non-Gmail inbox when available.
3. Confirm the message lands in Inbox or Promotions, not Spam.
4. Confirm sender name, sender address, reply-to, subject, and links are correct.
5. Confirm links use HTTPS production domains.
6. Inspect message authentication headers:
   - SPF passes.
   - DKIM passes.
   - DMARC passes or aligns with the monitoring policy.
7. Reply to the message if replies are expected, and confirm support routing works.
8. Record safe evidence without API keys, raw tokens, personal data, or full message headers.

## Manual Evidence Log

| Field                        | Value                       |
| ---------------------------- | --------------------------- |
| Issue                        | LW-111                      |
| Date                         | YYYY-MM-DD                  |
| Domain                       | limitwear.example           |
| Frontend HTTPS               | Pass/fail                   |
| Backend HTTPS                | Pass/fail                   |
| SPF                          | Pass/fail                   |
| DKIM                         | Pass/fail                   |
| DMARC                        | Pass/fail                   |
| noreply sender               | Pass/fail                   |
| support mailbox              | Pass/fail                   |
| Transactional email delivery | Pass/fail                   |
| Notes                        | Links to safe evidence only |

## Launch Acceptance

LW-111 is ready for sign-off only when:

- Frontend and backend production domains resolve over HTTPS.
- Email provider domain verification is complete.
- SPF, DKIM, and DMARC checks pass.
- `noreply` and `support` addresses are configured.
- A transactional email test is delivered successfully.
