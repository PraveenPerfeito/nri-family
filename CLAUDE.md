@AGENTS.md

# Project: NRI Family Office (Digital Family Office for NRIs in Tamil Nadu)

Phase 1 = **Layer 1, public website only**. Layers 2–5 (NRI Portal, Admin ERP, Vendor Portal, Professional Partner Portal) are planned but **must not be built** until explicitly requested. Don't add empty placeholder routes for them; a test enforces this. The plan is in `docs/phase-1/future-architecture.md`.

## Branding is NOT confirmed

- The working name is **"NRI Family Office"**, from `brandName` in the settings block of `src/config/site.ts`. Never hard-code a brand name in components or copy; `tests/content-guards.test.ts` fails on "uraavu".
- The logo mark is a neutral placeholder (`src/components/layout/logo.tsx`, `src/app/icon.svg`, `src/app/opengraph-image.tsx`). Change all three together when the brand is final.
- There is no final domain yet. The site is live at https://nri-family.vercel.app (Vercel, deployed from `main`). The canonical URL comes from `productionUrl` in site.ts or, if that's empty, Vercel's `VERCEL_PROJECT_PRODUCTION_URL`.

## Settings: code, not environment variables

- All **public** settings are in the settings block at the top of `src/config/site.ts`: brand name, domain, contact email and WhatsApp, leads inbox, company details and `allowSearchIndexing` (false until launch). The user could not edit Vercel's Sensitive env vars, so don't move these back into env vars.
- Only **secrets** go in Vercel env vars (optional `RESEND_API_KEY`, `LEADS_WEBHOOK_URL` / `LEADS_WEBHOOK_SECRET`).
- **Enquiries** are emailed only when `VERCEL_ENV` is set, so local dev and QA never email the owner. Preferred: Resend, server-side, when `RESEND_API_KEY` is set (template in `src/lib/leads/notification-email.ts`: no images, HTML-escape every visitor value). Backup, or when there is no key: FormSubmit. FormSubmit blocks requests from Vercel's servers, so the Server Action validates and then returns a `relay` result, and the browser posts it (`src/lib/leads/browser-relay.ts`). Keep that split: don't move the FormSubmit call back to the server. Never point `npm run qa` at the live site without `QA_READONLY=true`: normal runs submit real forms.

## Commands

- `npm run dev`: development server
- `npm run check`: lint + typecheck + unit tests + production build (the pre-merge gate; must pass)
- `npm test`: Vitest unit tests in `tests/`
- `npm run qa`: browser QA against a running server (`scripts/qa.mjs`). Run `LEADS_WEBHOOK_URL=http://127.0.0.1:3199/leads npm start` first, then `QA_BROWSER=msedge|chrome|firefox|webkit npm run qa`.

## Stack and layout

Next.js 16 (App Router, Turbopack, all pages static), React 19, TypeScript strict, Tailwind v4, Zod, lucide-react. Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md): request APIs are async, and `proxy.ts` replaces `middleware.ts`.

- `src/app/(public)/`: marketing pages. `src/app/(auth)/`: `/login` and `/register` Phase 2 placeholders.
- `src/config/`: `site.ts` (brand/contact/company from env), `routes.ts` (every route; drives nav, sitemap and tests), `navigation.ts`, `services.ts` (service copy), `leads.ts` (form options).
- `src/data/`: `marketing.ts` (the **Available now / Coming** roadmap), `faq.ts`, `demo.ts` (fictional sample data only).
- `src/lib/`: `seo/` (`pageMetadata`, JSON-LD), `validation/`, `leads/` (Server Actions + email relay / webhook delivery), `analytics/`, `security/`.
- `docs/phase-1/`: product, IA, design system, routes, SEO, security, architecture, testing, spec-compliance.

## Rules (from the master spec; trust is the product)

- **No fake claims:** no testimonials, customer or property counts, logos, awards, certifications (ISO / SOC 2 / GDPR / "bank-grade") or "best / No.1 / guaranteed". Content guards enforce this.
- **Be honest about availability:** anything not built is labelled "Coming to the platform". Update `roadmap` in `src/data/marketing.ts` when that changes.
- **Sample data** must be fictional and visibly labelled (`DemoLabel`, "Sample", "Example report"). Never add real names, phone numbers, emails, addresses or documents.
- **Privacy:** never display customer information publicly. Listings show city only and "Contact through platform".
- **Regulated work:** we *coordinate* qualified professionals. Never imply we provide legal, tax, medical or other regulated services; keep the scope notes.
- **Forms:** keep server-side Zod validation, honeypot and timing checks, and the rate limit. Never fake success: if delivery isn't configured, say so. Never log or track personal data (analytics props are allow-listed).
- **Auth:** don't fake sign-in or account creation until a real backend exists.
- **Copy:** simple, confident English; short sentences; no hype or fake urgency.

## Code conventions

- New page: add it to `routes.ts` (+ `indexableRoutes` or `nonIndexedRoutes`), export `metadata = pageMetadata({...})`, use `PageHero` (one `<h1>` + breadcrumb JSON-LD), and add links through `navigation.ts`.
- Styling uses tokens only (`@theme` in `src/app/globals.css`). Don't use raw hex values in components.
- **No competing utility classes:** there is no `tailwind-merge`. Never pass a class that fights a component's own class for the same property (e.g. `hidden` vs `inline-flex`). Override with a variant prefix (`max-sm:hidden`) or add a prop.
- Buttons: `ButtonLink`/`Button` variants `primary | secondary | quiet | ghost`. Keep one primary CTA ("Get Started") per view.
- Analytics: add `track=` / `data-track=` with an event from `src/lib/analytics/events.ts`. Never send form values.
- Keep client components minimal. Most components are server components.
