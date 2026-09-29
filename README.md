# NRI Family Office — public website

> You live abroad. We take care of what you own here.

> **Branding is not confirmed.** "NRI Family Office" is a neutral working name. The final brand name and domain go in the settings block at the top of [src/config/site.ts](src/config/site.ts); the placeholder mark is in [src/components/layout/logo.tsx](src/components/layout/logo.tsx).

The Digital Family Office platform for NRIs with property, assets and family in Tamil Nadu. This app holds the public website (Layer 1), the customer portal foundation (`/app`, [docs/PHASE_2A.md](docs/PHASE_2A.md)) and the team's admin operations console (`/admin`, [docs/PHASE_2B.md](docs/PHASE_2B.md)). The vendor and partner portals will be added to this same app later. See [docs/phase-1/future-architecture.md](docs/phase-1/future-architecture.md).

## Stack

- Next.js 16 (App Router, Turbopack, static prerendering) · React 19 · TypeScript (strict)
- Tailwind CSS v4 with design tokens in [src/app/globals.css](src/app/globals.css)
- Zod (server-side validation), lucide-react (icons)
- Vitest (unit tests), playwright-core (browser QA against a running build)

## Getting started

```bash
npm install
cp .env.example .env.local   # optional for local development
npm run dev                  # http://localhost:3000
```

Forms work in development without configuration. Submissions are validated and logged as a redacted notice, and are not delivered anywhere. On Vercel, enquiries are emailed to the inbox set in `src/config/site.ts`. See [docs/phase-1/security.md](docs/phase-1/security.md).

## Settings and deployment

- **Public settings live in code**, not in environment variables: brand name, domain, contact email and WhatsApp, company details and the pre-launch search-indexing switch are all in the settings block at the top of [src/config/site.ts](src/config/site.ts). Edit, commit, push.
- **Vercel needs no environment variables.** The production domain is detected automatically (`VERCEL_PROJECT_PRODUCTION_URL`), and every push to `main` redeploys.
- **Enquiry emails:** with a `RESEND_API_KEY` in Vercel, the site sends its own branded email (no ads, with reply, WhatsApp and call buttons, and a signature). Otherwise, or as a backup, FormSubmit is used: the server validates each enquiry, then the visitor's browser hands it over, because FormSubmit blocks requests from Vercel's servers. The first enquiry triggers a one-time "Activate Form" email to the inbox; click it once.
- **Search engines are blocked until launch** (`allowSearchIndexing: false`). Set it to `true` at launch.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Unit tests (validation, server actions, SEO, routes, content and brand guards) |
| `npm run check` | lint + typecheck + test + build, which is the pre-merge gate |
| `npm run qa` | Browser QA against a running server. See [docs/phase-1/testing.md](docs/phase-1/testing.md) |
| `npm run dev:supabase` | Local Supabase stand-in for development (real migrations in PGlite). See [docs/PHASE_2A.md](docs/PHASE_2A.md) |
| `npm run qa:portal` / `npm run qa:admin` | Customer portal / admin console acceptance tests in a real browser. See [docs/PHASE_2A.md](docs/PHASE_2A.md) and [docs/PHASE_2B.md](docs/PHASE_2B.md) |

## Project layout

```text
src/
  app/
    (public)/        Layer 1 marketing pages (shared navbar + footer)
    (auth)/          Sign in, registration and password reset (Supabase Auth)
    (portal)/app/    The customer portal (Phase 2A)
    (admin)/admin/   The admin operations console (Phase 2B)
    sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg, not-found.tsx
  components/
    ui/              Design-system primitives (Button, Badge, Card, Section)
    layout/          Navbar, MobileMenu, Footer, Logo, SkipLink
    marketing/       Page sections (PageHero, CtaBand, FlowChain, previews)
    trust/           Trust record, privacy principles, visibility levels
    property/        PropertyCard, InspectionReport
    forms/           Contact + Get Started forms, field primitives
    shared/          JSON-LD, FAQ, analytics listener
    portal/, admin/  Customer portal and admin console UI
  config/            site, routes, navigation, services, form options
  data/              Marketing copy, FAQ and FICTIONAL demo data
  lib/               seo, validation, leads (server actions), analytics, security, supabase, portal, admin
  types/             Shared domain vocabulary (visibility, roles, request stages)
supabase/migrations/ Database schema, RLS and triggers (Phase 2A, Phase 2B)
tests/               Vitest unit tests (tests/db: the migrations in real Postgres)
scripts/             Browser quality gate, acceptance tests, local Supabase stand-in
docs/phase-1/        Product, IA, design system, routes, SEO, security, architecture, testing, spec compliance
docs/PHASE_2A.md, docs/PHASE_2B.md  The customer portal and the admin console
```

## Ground rules

- **No fake claims.** No invented reviews, customer counts, logos, certifications or guarantees. [tests/content-guards.test.ts](tests/content-guards.test.ts) enforces this.
- **Sample data is fictional and labelled.** Anything rendered from [src/data/demo.ts](src/data/demo.ts) carries a visible "sample" label.
- **Private by default.** The public site never displays customer information.
- **Say what exists today.** Anything not yet built is marked "Coming to the platform". The source of truth is [src/data/marketing.ts](src/data/marketing.ts).
