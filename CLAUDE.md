@AGENTS.md

# Project: NRI Family Office (Digital Family Office for NRIs in Tamil Nadu)

Phase 1 = **Layer 1, the public website**. Phase 2A = **the foundation of Layer 2, the customer portal** (`/app`; see `docs/PHASE_2A.md`). Phase 2B = **the admin operations console** (`/admin`, the first slice of Layer 3; see `docs/PHASE_2B.md`). Phase 2C = **field operations and evidence** (visits on the admin request page, evidence upload, review and explicit sharing, the customer's proof; see `docs/PHASE_2C.md`). The Vendor Portal, Professional Partner Portal and Phase 2D onwards are planned but **must not be built** until explicitly requested. Don't add empty placeholder routes for them, or admin pages beyond `adminRoutes`; tests enforce both. The plan is in `docs/phase-1/future-architecture.md`.

## Branding is NOT confirmed

- The working name is **"NRI Family Office"**, from `brand` in the settings block of `src/config/site.ts` (exposed as `siteConfig.brand`: name, shortName, descriptor, tagline, promise, description, logo, favicon). Never hard-code a brand name in components or copy; `tests/content-guards.test.ts` fails on "uraavu".
- The logo mark is a neutral placeholder (`src/components/layout/logo.tsx`, `src/app/icon.svg`, `src/app/opengraph-image.tsx`). Change all three together when the brand is final.
- There is no final domain yet. The site is live at https://nri-family.vercel.app (Vercel, deployed from `main`). The canonical URL comes from `productionUrl` in site.ts or, if that's empty, Vercel's `VERCEL_PROJECT_PRODUCTION_URL`.

## Settings: code, not environment variables

- All **public** settings are in the settings block at the top of `src/config/site.ts`: brand, domain, public contact channels, leads inbox, company details and `allowSearchIndexing` (false until launch). The user could not edit Vercel's Sensitive env vars, so don't move these back into env vars.
- Public contact channels (`contactEmail`, `contactWhatsapp`, `contactPhone`) stay **empty until business contact details exist** (UI V2 privacy rule): never put a personal email or number there. The leads inbox (`leadsEmail`) is private and only used server-side.
- Only **secrets** go in Vercel env vars (optional `RESEND_API_KEY`, `LEADS_WEBHOOK_URL` / `LEADS_WEBHOOK_SECRET`).
- The portal's Supabase connection is public settings too: `supabaseUrl`, `supabasePublishableKey` (`sb_publishable_…`) and `customerSignupsOpen` in site.ts. Empty = portal off. `customerSignupsOpen` must match Supabase's "Allow new users to sign up". The **service-role / secret key never goes in the app** (not in `src/`, site.ts, `.env.example` or Vercel); only scripts on the developer's machine use it. Tests fail on a service-role key or JWT in `src/`.
- **Enquiries** are emailed only when `VERCEL_ENV` is set, so local dev and QA never email the owner. Preferred: Resend, server-side, when `RESEND_API_KEY` is set (template in `src/lib/leads/notification-email.ts`: no images, HTML-escape every visitor value). Backup, or when there is no key: FormSubmit. FormSubmit blocks requests from Vercel's servers, so the Server Action validates and then returns a `relay` result, and the browser posts it (`src/lib/leads/browser-relay.ts`). Keep that split: don't move the FormSubmit call back to the server. Never point `npm run qa` at the live site without `QA_READONLY=true`: normal runs submit real forms.

## Commands

- `npm run dev`: development server
- `npm run check`: lint + typecheck + unit tests + production build (the pre-merge gate; must pass)
- `npm test`: Vitest unit tests in `tests/`
- `npm run qa`: browser QA against a running server (`scripts/qa.mjs`). Run `LEADS_WEBHOOK_URL=http://127.0.0.1:3199/leads npm start` first, then `QA_BROWSER=msedge|chrome|firefox|webkit npm run qa`.
- `npm run dev:supabase`: local Supabase stand-in on :54321 (real migration + RLS in PGlite, emulated Auth/REST; development only). Start the app with `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_dev_only CUSTOMER_SIGNUPS_OPEN=true` (build and start with the same env).
- `npm run qa:portal`: the Phase 2A acceptance test (`scripts/portal-e2e.mjs`; env at the top of the file). It creates and deletes two test customers.
- `npm run qa:admin`: the Phase 2B acceptance test (`scripts/admin-e2e.mjs`): two customers, a temporary admin and an operations member, created and deleted by the script; includes the responsive and axe checks of every admin page.
- `npm run qa:field-ops`: the Phase 2C acceptance test (`scripts/field-ops-e2e.mjs`): five `nfo-2c-e2e-…` accounts and generated files; it removes their evidence files from Storage, then the accounts. The local stand-in emulates Storage too.

## Stack and layout

Next.js 16 (App Router, Turbopack; marketing pages static, portal pages dynamic), React 19, TypeScript strict, Tailwind v4, Zod, lucide-react, Supabase (`@supabase/ssr`, Auth + Postgres). Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md): request APIs are async, and `proxy.ts` replaces `middleware.ts`.

- `src/app/(public)/`: marketing pages. `src/app/(auth)/`: `/login`, `/register`, `/forgot-password`, `/reset-password` (honest "coming" state while no Supabase project is connected). `src/app/auth/confirm`: email-link landing. `src/app/(portal)/app/`: the customer portal. `src/app/(admin)/admin/`: the admin console.
- `src/proxy.ts` + `src/lib/supabase/`: session refresh and the only place Supabase clients are created (server only; there is no browser client, so session cookies are HttpOnly).
- `src/lib/portal/`: `session.ts` (`requireCustomer`, `isActiveAdmin`), `data.ts` (queries), `actions/` (Server Actions), `validation.ts`, `domain.ts`, `format.ts`. `src/components/portal/`: portal UI.
- `src/lib/admin/`: `session.ts` (`requireAdmin`), `data.ts` (queries on the admin views), `search.ts` (list URL parameters), `domain.ts` (the lifecycle table, labels), `validation.ts`, `activity.ts` (audit lines), `actions/` (Server Actions calling the `admin_*` functions: `requests.ts`, `field-work.ts`, `evidence.ts`), `operations.ts` (shared call-and-refresh helper). `src/components/admin/`: console UI.
- `src/lib/field-ops/`: Phase 2C vocabulary mirrored from SQL (`domain.ts`: visit lifecycle, file types, limits, completion rule), `schedule.ts` (India time), `files.ts` (content check, EXIF), `photo.ts` (browser-side resize and upload), `evidence-files.ts` (authorise, then redirect to a signed link). Evidence is served only through `evidenceFileRoutes` (route handlers, not pages).
- `supabase/migrations/`: the schema, RLS, grants and triggers (2A, then 2B, additive). They are applied in the Supabase SQL editor, never with `supabase db push` (the project's CLI history is empty). `tests/db/`: the migrations tested for real in PGlite.
- `src/config/`: `site.ts` (brand/contact/company from env), `routes.ts` (every route; drives nav, sitemap and tests), `navigation.ts`, `services.ts` (service copy), `leads.ts` (form options).
- `src/data/`: `marketing.ts` (the **Available now / Coming** roadmap), `faq.ts`, `demo.ts` (fictional sample data only).
- `src/lib/`: `seo/` (`pageMetadata`, JSON-LD), `validation/`, `leads/` (Server Actions + email relay / webhook delivery), `analytics/`, `security/`.
- `src/components/marketing/home/`: the UI V2 homepage sections (hero + command center, radial ecosystem, services showcase, evidence timeline, privacy access diagram, family-office vision, dashboard, property control, journey).
- `docs/phase-1/`: product, IA, design system, routes, SEO, security, architecture, testing, spec-compliance, ui-v2. `docs/PHASE_2A.md`: the portal (setup, security model, tests, limitations). `docs/PHASE_2B.md`: the admin console (roles, lifecycle, RLS, deployment, limitations).

## Rules (from the master spec; trust is the product)

- **No fake claims:** no testimonials, customer or property counts, logos, awards, certifications (ISO / SOC 2 / GDPR / "bank-grade") or "best / No.1 / guaranteed". Content guards enforce this.
- **Be honest about availability:** anything not built is labelled "Coming to the platform". Update `roadmap` in `src/data/marketing.ts` when that changes.
- **Sample data** must be fictional and visibly labelled (`DemoLabel`, "Sample", "Example report"). Never add real names, phone numbers, emails, addresses or documents.
- **Privacy:** never display customer information publicly. Listings show city only and "Contact through platform".
- **Regulated work:** we *coordinate* qualified professionals. Never imply we provide legal, tax, medical or other regulated services; keep the scope notes.
- **Forms:** keep server-side Zod validation, honeypot and timing checks, and the rate limit. Never fake success: if delivery isn't configured, say so. Never log or track personal data (analytics props are allow-listed).
- **Auth:** real Supabase Auth only; never fake sign-in or account creation. Every new account is a CUSTOMER; roles are never set from user input.
- **Portal data:** the portal shows only the signed-in customer's own records. No sample data, previews or marketing sections in `/app` (a test enforces this). Honest empty states instead.
- **Portal security:** every portal page and Server Action calls `requireCustomer()` (never rely on the layout or the proxy); queries also filter by the customer's id; missing and someone else's records get the same "not found". The database is the last line: RLS on every table, column-level grants, and timeline / activity / notifications written only by triggers in the same transaction. Change the schema only with a new migration plus tests in `tests/db/`. Activity metadata holds field names, never values. Portal pages stay `noindex` and `no-store`.
- **Admin security:** every admin layout, page and Server Action calls `requireAdmin()` (role `ADMIN` + an active `team_members` row; everyone else gets `notFound()`, and page titles don't reveal the console). Admin code never writes tables: changes go through the `admin_*` database functions, which re-check `app.is_admin()` (a test enforces this). The browser sends only ids and the admin's choices, never an actor, customer id or role. Admin reads go through RLS policies and `security_invoker` views gated by `app.is_admin()`: never `USING (true)`, never the service-role key. Internal notes and internal activity are `INTERNAL` by constraint; customer queries also filter `visibility = 'CUSTOMER'`. Keep `adminStatusTransitions` (domain.ts) identical to `app.admin_status_transition_allowed()`; a test compares them. Team membership is changed by the owner in SQL only (see `docs/PHASE_2B.md`). No deleting customers, properties or requests from the console.
- **Field work and evidence:** the visit's team member is the request's Phase 2B assignee (no second assignee model). What a customer may read and what only the team may read live in different tables (`field_work` / `request_evidence` vs `*_internal`): admins and customers share the `authenticated` role, so column grants can't separate them. Uploaded evidence is `PENDING_REVIEW` + `INTERNAL`; only `APPROVED` evidence can be `CUSTOMER_VISIBLE` (constraint), and sharing is its own explicit step. Files live in the private `request-evidence` bucket (never public, never overwritten; only unregistered uploads can be deleted); pages link to the evidence routes, which authorise every request before creating a short-lived signed link; never put signed links in pages or send evidence through `next/image`. Keep `fieldWorkTransitions` and the file-type table in `src/lib/field-ops/domain.ts` identical to the SQL (tests compare them). Visit times are India time (Asia/Kolkata).
- **Copy:** simple, confident English; short sentences; no hype or fake urgency.

## Code conventions

- New page: add it to `routes.ts` (+ `indexableRoutes` or `nonIndexedRoutes`), export `metadata = pageMetadata({...})`, use `PageHero` (one `<h1>` + breadcrumb JSON-LD), and add links through `navigation.ts`.
- Styling uses tokens only (`@theme` in `src/app/globals.css`). Don't use raw hex values in components. UI V2 is "quiet premium": Geist only, one teal accent, 1px borders, restrained shadows, no stock photos (see `docs/phase-1/design-system.md`).
- `bg-grid-fade` / `bg-grid-night` fade with a CSS mask that applies to the whole element: only use them on an empty decorative layer, never on an element with content (plain `bg-grid` is safe anywhere).
- **No competing utility classes:** there is no `tailwind-merge`. Never pass a class that fights a component's own class for the same property (e.g. `hidden` vs `inline-flex`). Override with a variant prefix (`max-sm:hidden`) or add a prop.
- Buttons: `ButtonLink`/`Button` variants `primary | secondary | quiet | ghost | danger` (`danger` only inside a destructive confirmation). Keep one primary CTA per view ("Get Started" on the site).
- Analytics: add `track=` / `data-track=` with an event from `src/lib/analytics/events.ts`. Never send form values.
- Keep client components minimal. Most components are server components.
