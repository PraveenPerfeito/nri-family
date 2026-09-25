# Security

Phase 1 has no accounts and stores no customer data. The attack surface is the two enquiry forms, response headers and the build itself. These are the measures in place.

## HTTP headers

Set for every route in [next.config.ts](../../next.config.ts). The QA script verifies them.

| Header | Value / purpose |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; scripts, styles and fonts are same-origin only; connections are same-origin plus `https://formsubmit.co` (the enquiry email hand-off); `img-src 'self' data: blob:`; `frame-ancestors 'none'`; `form-action 'self'`; `base-uri 'self'`; `object-src 'none'` |
| `Strict-Transport-Security` | Production only: 2 years, `includeSubDomains`, `preload` |
| `X-Frame-Options` | `DENY` (legacy clickjacking protection alongside `frame-ancestors`) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera, microphone, geolocation, payment and USB disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `X-Powered-By` | Removed (`poweredByHeader: false`) |

**CSP trade-offs.**

- `script-src` includes `'unsafe-inline'` because Next.js injects inline bootstrap scripts. A nonce-based CSP requires generating a nonce per request in `proxy.ts`, which forces every page to render dynamically. For a static marketing site with no user-generated content and no third-party scripts, the static policy is the right trade. **Revisit when Layer 2 ships.** Authenticated pages are dynamic anyway, so add nonces there.
- `upgrade-insecure-requests` is deliberately omitted. Every asset is same-origin and relative, and HSTS already enforces HTTPS. The directive also broke plain-HTTP previews: WebKit upgraded `http://localhost` asset requests.
- If an analytics or tag-manager script is added later, extend `script-src` and `connect-src` for that host only.

## Forms

Contact and Get Started use Next.js Server Actions ([src/lib/leads/actions.ts](../../src/lib/leads/actions.ts)).

| Control | Detail |
| --- | --- |
| **Server-side validation** | Zod schemas ([src/lib/validation/leads.ts](../../src/lib/validation/leads.ts)) re-validate everything. Client validation is for UX only. Control characters are stripped, lengths bounded, categories and topics enum-checked, emails normalised, and phone numbers limited to 7–15 digits. |
| **CSRF** | Server Actions only accept POSTs whose `Origin` matches the `Host` (or `X-Forwarded-Host`), and action IDs are encrypted and non-deterministic. No extra token is needed. Behind a proxy or CDN on a different domain, list it in `serverActions.allowedOrigins`. |
| **Output encoding** | Submissions are never rendered back as HTML. React escapes all text, and JSON-LD escapes `<`. |
| **Spam: honeypot** | A visually hidden `company_website` field. If it is filled, the action returns a normal-looking success and stores nothing. |
| **Spam: timing** | `form_started_at` is set on mount. Submissions faster than 2.5s get the same silent treatment. |
| **Rate limiting** | 5 submissions per 10 minutes per client ([src/lib/security/rate-limit.ts](../../src/lib/security/rate-limit.ts)). This is in-memory and per instance. On serverless or multi-instance hosting, back the `RateLimiter` interface with a shared store (for example Redis) before relying on it. |
| **Client IP** | Taken from the first `x-forwarded-for` value, then `x-real-ip`. These headers are only trustworthy when a proxy you control (Vercel, a load balancer or nginx) overwrites them. Do not expose `next start` directly to the internet, or clients can spoof their way past the limit. |
| **Data minimisation** | The forms ask for name, country, email, phone, needs and a message. The UI explicitly asks people not to send documents or ID numbers. |
| **Honest failure** | If no delivery channel is available in production, visitors see "Online submissions are not enabled yet", with the direct email and WhatsApp. If delivery fails, they are asked to retry or contact us directly. There is never a fake success. |

## Delivery and secrets

- **Email relay:** on Vercel, leads are emailed to `leadsEmail` (site.ts) through [FormSubmit](https://formsubmit.co), a free relay that needs no account or API key. FormSubmit refuses requests from cloud servers such as Vercel's (confirmed in production), so the Server Action first validates, spam-checks and rate-limits the submission, then returns the formatted email to the visitor's browser, which posts it to FormSubmit ([browser-relay.ts](../../src/lib/leads/browser-relay.ts)). The inbox address is therefore visible in that request, but it is already public on the site. If the hand-off fails, the visitor sees the direct email and WhatsApp. The first message triggered a one-time activation email (activated 2026-09-25). FormSubmit is a third party that **keeps submissions for 30 days**. It's acceptable for pre-launch; before scale, move to a provider with a data-processing agreement or the Admin ERP. The relay only runs when `VERCEL_ENV` is set (or `LEADS_EMAIL_RELAY=true`), so local development and QA never send email.
- **Branded email via Resend (preferred):** when `RESEND_API_KEY` is set (server-only env var), the Server Action sends our own notification email through Resend's API from the server ([notification-email.ts](../../src/lib/leads/notification-email.ts)). It has no images or third-party ads, offers reply-by-email, WhatsApp and call buttons, and signs off as the website. Every visitor-supplied value is HTML-escaped, and header-like values are kept on one line. Until a domain is verified in Resend, its shared sender (`onboarding@resend.dev`) can only deliver to the Resend account's own address, which is the leads inbox. When Resend succeeds, FormSubmit is not used, so there are no duplicate emails. If Resend fails, the browser relay is used as a backup.
- **Webhook (optional):** leads can also go to `LEADS_WEBHOOK_URL` as JSON, with an optional `Authorization: Bearer $LEADS_WEBHOOK_SECRET`. A lead counts as delivered if either channel succeeds.
- Both use an 8s timeout and no caching. The code lives in [src/lib/leads/delivery.ts](../../src/lib/leads/delivery.ts), which imports `server-only`, so it can never be bundled into client code.
- Public settings (brand, domain, contact channels, company) are plain values in site.ts; no environment variable is needed for them. Secrets stay in server-only env vars. A unit test fails if a `NEXT_PUBLIC_` variable name contains `SECRET`, `TOKEN`, `KEY` or `WEBHOOK`, or if webhook configuration is read anywhere except the delivery module.
- `.env*` files are git-ignored, except `.env.example`.
- For multi-instance self-hosting, set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to one stable key across instances. Otherwise action IDs differ between instances.

## Logging

Logs never contain personal data. Delivery failures log only the HTTP status. The development fallback logs the lead type and field *names*. A unit test asserts that an error path does not log the email or phone number.

## Analytics and privacy

- No third-party trackers or cookies are loaded in Phase 1.
- Events pushed to `window.dataLayer` pass through an allow-list (`sanitizeProps`), so personal data cannot be sent even by mistake. The browser QA verifies this after a real submission.
- Before adding a vendor, choose a consent-aware setup, update the CSP, and update the Privacy Policy.

## Dependencies

`npm audit` reported 0 vulnerabilities at the time of writing. Runtime dependencies are deliberately few: `next`, `react`, `react-dom`, `zod`, `lucide-react`, `server-only`.

## Carry-forward for Layer 2+

- Authentication: session cookies (`HttpOnly`, `Secure`, `SameSite=Lax`), MFA for staff roles, and account lockout plus shared-store rate limits on auth endpoints.
- Authorise inside every Server Action and Route Handler, not only in layouts or `proxy.ts`.
- Row-level access by role and ownership (see [future-architecture.md](future-architecture.md)). Documents go in private object storage behind signed, short-lived URLs.
- An audit log for sensitive actions: visibility changes, document access, approvals and role changes.
- Nonce-based CSP for authenticated routes.
