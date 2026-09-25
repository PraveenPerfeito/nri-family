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

Result at the end of Phase 1: **110 tests passing** (unchanged after UI V2).

> **Windows:** run the tests from a terminal whose path starts with an uppercase drive letter (`C:\Uraavu.com`). When the working directory is spelled `c:\Uraavu.com`, Vitest reports "failed to find the runner" and runs no tests. The code is not at fault.

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

**Against the live site** (https://nri-family.vercel.app, read-only mode, 2026-09-25): Edge, Firefox and WebKit each pass **433 checks, 0 failures**. The two real form submissions are skipped in read-only mode; they were verified live separately, and FormSubmit confirmed delivery. A separate content audit of the live pages found **all 333 items the Phase 1 prompt requires**.

**After UI V2** (local production build, 2026-09-25): Edge, Firefox and WebKit each pass **435 checks, 0 failures**, and axe finds 0 violations on all 19 pages. See [ui-v2.md](ui-v2.md#qa-record-local-production-build-2026-09-25).

Under WebKit, Tab-order checks are replaced by focusing the skip link directly: like Safari's default setting, WebKit does not Tab to links. Aborted RSC prefetch requests are also ignored under WebKit; they are cancelled by the test's own navigation and reported as "access control" errors.

## Bugs the gate caught during Phase 1

- Header overflow at 320px: a utility-class conflict (`hidden` vs `inline-flex`). This led to the "no competing classes" rule in [design-system.md](design-system.md).
- Missing `og:image` on every page (page-level `openGraph` replaced the inherited image)
- Five meta descriptions over 160 characters
- An orphaned final step in the wrapping step chain, which prompted the `FlowChain` redesign
- The CSP `upgrade-insecure-requests` directive broke WebKit on plain-HTTP previews
- Safari does not focus buttons on click, so mobile-menu focus restore is now explicit
- Lighthouse: the logo link's aria-label didn't match its visible text (fixed), and mobile LCP was 2.9 s because of preloaded italic and variable fonts (now 2.2–2.3 s)

## Performance (live site, home page)

**Lighthouse on https://nri-family.vercel.app** (2026-09-25, two runs each, after the font change):

| Mode | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile (simulated slow 4G, mid-range phone) | 98 | 100 | 100 | 66* | 1.2–1.3 s | 2.2–2.3 s | 10–40 ms | 0 |
| Desktop | 100 | 100 | 100 | 66* | 0.3 s | 0.5 s | 0 ms | 0 |

* SEO 66 comes only from "page is blocked from indexing": the deliberate pre-launch noindex (`allowSearchIndexing: false`). Every other SEO audit passes; it returns to 100 at launch.

Page weight:

| Route | HTML (gz) | JS, modern browsers (gz) | CSS (gz) | Preloaded fonts |
| --- | --- | --- | --- | --- |
| `/` | ~33 KB | ~139 KB | ~10 KB | 2 files, 51 KB |
| `/get-started` | ~10 KB | ~144 KB | ~10 KB | 2 files, 51 KB |

- Every route is static HTML. There are no images; all visuals are HTML/CSS.
- About 121 KB of the JavaScript is the React/Next.js runtime; the site's own code is about 13 KB (plus about 5 KB for the form on `/get-started`). A 38.7 KB polyfill chunk is `nomodule`, so modern browsers never download it.
- **Fonts:** only the faces the first screen needs are preloaded. In Phase 1 that was Geist (sans) and Newsreader roman at weight 500 (23 KB), which took mobile LCP from 2.9 s to 2.2–2.3 s. UI V2 removed Newsreader entirely, so only Geist is loaded.
- **Measured and rejected:** Next.js's experimental `inlineCss` made LCP worse in local Lighthouse runs (2.8 s, against 2.6–2.7 s without it), so it is not used.

## Device, screen-reader, WhatsApp and email checks (live site, 2026-09-25)

- **iPhone 15 emulation** (WebKit, the Safari engine, with touch, screen size and iOS user agent): all 19 pages load with no overflow and no console errors. Every text field is 16px or larger, so iOS won't zoom when a field is tapped. The menu, FAQ and form validation work by touch, and the sticky header holds while scrolling.
- **Screen-reader semantics:** axe-core 4.13 (WCAG 2.2 AA and best practices) on all 19 pages, on iPhone and desktop, finds **0 violations with animations off**. With animations on, axe reports "contrast" on text caught mid fade-in (for example 1.17:1 while nearly transparent). That is a scan-time artifact, not what users see once the text has appeared, and it doesn't affect screen readers. The accessibility tree shows banner, primary navigation, main and footer landmarks; one H1 with a logical H2 outline; and a spoken name for every form field and group.
- **WhatsApp:** shared links produce a preview with the page title, description and the 1200×630 image (56 KB). In an emulated Android WhatsApp in-app browser (WebView), pages load, the menu works, and the site's WhatsApp link opens a chat with a pre-typed greeting. On iPhone, WhatsApp opens links in Safari's own view, which the iPhone check covers.
- **Enquiry emails:** one live test of each form. The Contact form and Get Started emails were both **delivered as the branded Resend email** (Resend log: `delivered`), and FormSubmit wasn't needed.

## Optional final checks on real devices

The automated checks above cover the engines these devices use. A quick hands-on look is still worthwhile before launch:

- Open the site from a WhatsApp message on an iPhone and on an Android phone
- Try VoiceOver (iPhone) or TalkBack (Android) on the Get Started form
- Run Google's Rich Results Test on `/faq` and a service page (after search indexing is enabled at launch)

> **Against the live site, always set `QA_READONLY=true`.** Normal runs submit real forms, which would email the owner and use up the rate limit. Local runs are safe, because email is only sent on Vercel.
