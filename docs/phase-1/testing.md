# Testing and quality gate

## Commands

```bash
npm run check                 # lint + typecheck + unit tests + production build
npm run build && npm start    # serve the production build on :3000
npm run qa                    # browser QA against BASE_URL (default http://localhost:3000)
```

To verify form delivery end to end, start the server pointing at the QA's mock webhook:

```bash
LEADS_WEBHOOK_URL=http://127.0.0.1:3199/leads npm start
QA_BROWSER=msedge npm run qa      # or chrome | chromium | firefox | webkit
```

To check the **live site** without sending enquiries, use read-only mode. It skips the real form submissions and still checks empty-form validation:

```bash
BASE_URL=https://nri-family.vercel.app QA_READONLY=true QA_BROWSER=msedge npm run qa
```

`firefox` and `webkit` need the Playwright engines: `npx playwright-core install firefox webkit`. `msedge` and `chrome` use the installed browsers. Set `QA_SCREENSHOTS=<dir>` to save full-page screenshots of key pages.

## Unit tests (Vitest, `tests/`)

| File | Covers |
| --- | --- |
| `validation.test.ts` | Zod schemas: valid and invalid input, normalisation, length limits, consent; the phone pattern is identical in JS and in the HTML `pattern` (compiled with the `v` flag, as browsers do) |
| `lead-actions.test.ts` | Server Actions end to end with mocked `fetch`: webhook payload, field errors, honeypot, timing trap, rate limit, honest "not enabled" in production, no personal data in error logs; email relay (relay instruction only on Vercel, never locally, never for invalid or spam submissions; readable formatting; fallback message with direct contacts; webhook success reported); Resend channel (branded email sent server-side on Vercel with the right headers and fields, FormSubmit fallback if Resend fails, never used locally); WhatsApp chat link in the FormSubmit email |
| `notification-email.test.ts` | The branded email: subject, reply-to, reply / WhatsApp / call links, no images, website signature, details in HTML and text, HTML escaping of visitor input, single-line subject; customer WhatsApp link rules (country code, or 10-digit Indian numbers) |
| `browser-relay.test.ts` | The browser hand-off: posts the server-built body, success on FormSubmit's `success: "true"`, direct-contact fallback when rejected or offline, success if the webhook already delivered |
| `deployment-config.test.ts` | Canonical URL resolution (configured domain → Vercel production domain → localhost), WhatsApp link, pre-launch noindex header matches `allowSearchIndexing` |
| `security-and-analytics.test.ts` | Rate limiter windowing; analytics allow-list drops personal data; JSON-LD escaping |
| `seo-and-routes.test.ts` | Every route has a page; every nav/footer/service link resolves; sitemap completeness; no future-layer placeholders; metadata helper output |
| `content-guards.test.ts` | Fails if a brand name is hard-coded instead of read from config (branding not confirmed); fails on unsupported claims (ISO/SOC 2/GDPR certification, "bank-grade", "guaranteed", "No.1", customer counts, awards, hype, testimonials); sample data has no emails, phone numbers or street addresses; secrets are never exposed through `NEXT_PUBLIC_` |

Result at the end of Phase 1: **110 tests passing**.

## Browser QA (`scripts/qa.mjs`)

For **every route × 10 viewports** (320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920):

- No horizontal overflow. On failure it names the offending elements.
- No console errors or warnings, no uncaught page errors, no 4xx/5xx responses.

For **every route**:

- Exactly one `<h1>`, no skipped heading levels, `<html lang>` set
- Title, a 50–160 character meta description, a correct canonical URL, Open Graph (title, image, url) and a Twitter card. No duplicate titles or descriptions.
- Valid JSON-LD; `noindex` only on `/login` and `/register`
- No broken images or images missing `alt`; every form control labelled; every link and button has an accessible name
- Every internal link returns < 400; every in-page anchor has a target

**Site-wide:** `robots.txt`, `sitemap.xml`, OG image and icon respond; `/security` 308s to `/trust`; security headers are present; `X-Powered-By` is absent.

**Interactions:**

- The skip link is the first Tab stop and moves to `#main`
- The first 25 Tab stops all show a visible focus indicator
- FAQ opens with the keyboard and fires `faq_opened`
- Mobile menu: opens, closes on Escape, restores focus to the button, and closes after navigation
- Get Started: an empty submit shows inline errors and focuses the first invalid field; errors clear as fields are edited; a valid submit shows the success state and **the mock webhook receives the correct payload**
- Contact: a valid submit succeeds, fires `contact_submitted`, and `dataLayer` contains no personal data

### Results at the end of Phase 1

| Engine | Browser | Result |
| --- | --- | --- |
| Chromium | Microsoft Edge (installed) | 435 checks, 0 failures |
| Chromium | Google Chrome (installed) | 435 checks, 0 failures |
| Gecko | Firefox (Playwright) | 435 checks, 0 failures |
| WebKit | WebKit / Safari engine (Playwright) | 435 checks, 0 failures |

Under WebKit, Tab-order checks are replaced by focusing the skip link directly: like Safari's default setting, WebKit does not Tab to links. Aborted RSC prefetch requests are also ignored under WebKit; they are cancelled by the test's own navigation and reported as "access control" errors.

## Bugs the gate caught during Phase 1

- Header overflow at 320px: a utility-class conflict (`hidden` vs `inline-flex`). This led to the "no competing classes" rule in [design-system.md](design-system.md).
- Missing `og:image` on every page (page-level `openGraph` replaced the inherited image)
- Five meta descriptions over 160 characters
- An orphaned final step in the wrapping step chain, which prompted the `FlowChain` redesign
- The CSP `upgrade-insecure-requests` directive broke WebKit on plain-HTTP previews
- Safari does not focus buttons on click, so mobile-menu focus restore is now explicit

## Performance (production build, home page)

Measured on the final build:

| Route | HTML (gz) | JS, modern browsers (gz) | CSS (gz) | Preloaded fonts |
| --- | --- | --- | --- | --- |
| `/` | 32.8 KB | 138.6 KB | 9.7 KB | 3 files, 148 KB |
| `/get-started` | 9.9 KB | 143.7 KB | 9.7 KB | 3 files, 148 KB |
| `/property-care` | 15.9 KB | 138.8 KB | 9.7 KB | 3 files, 148 KB |

- Every route is static HTML.
- Roughly 121 KB of the JavaScript is the React/Next.js runtime; the site's own code is about 13 KB (plus about 5 KB for the form on `/get-started`). A further 38.7 KB polyfill chunk is `nomodule`, so modern browsers never download it.
- There are no images, so all visuals are HTML/CSS.
- Two self-hosted font families (Geist, Newsreader) use `display: swap`. Removing an unused Geist Mono cut preloaded fonts from 4 files (171 KB) to 3 (148 KB).

## Manual checks still recommended before launch

- A screen reader pass: VoiceOver on iOS Safari, and TalkBack or NVDA on the forms and mobile menu
- Real devices: a mid-range Android on 4G, an iPhone opened from a WhatsApp link (the in-app browser)
- Lighthouse or PageSpeed Insights on the deployed URL (Core Web Vitals with real network latency)
- One real enquiry on the live site after clicking FormSubmit's activation email, to confirm it arrives in the inbox

> **Against the live site, always set `QA_READONLY=true`.** Normal runs submit real forms, which would email the owner and use up the rate limit. Local runs are safe, because email is only sent on Vercel.
- Rich Results Test on `/faq` and a service page
