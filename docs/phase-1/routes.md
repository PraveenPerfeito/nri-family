# Routes

Every route is prerendered as static HTML at build time (`○` in `next build` output). Route constants live in [src/config/routes.ts](../../src/config/routes.ts).

| Route | Page file | Purpose | Indexed | Structured data | Primary CTA |
| --- | --- | --- | --- | --- | --- |
| `/` | `(public)/page.tsx` | Homepage (12 sections) | ✓ (priority 1.0) | Organization, WebSite | Get Started |
| `/services` | `(public)/services/page.tsx` | All services + plans | ✓ | Breadcrumb | Get Started / Request a plan |
| `/property-care` | `(public)/property-care/page.tsx` | Inspections, maintenance, repairs; example report | ✓ | Service, Breadcrumb | Protect My Property |
| `/property-management` | `(public)/property-management/page.tsx` | Tenant and rental coordination | ✓ | Service, Breadcrumb | Get Started |
| `/property-transactions` | `(public)/property-transactions/page.tsx` | Sell, buy, rent coordination; visibility | ✓ | Service, Breadcrumb | List My Property |
| `/document-assistance` | `(public)/document-assistance/page.tsx` | Document organisation and reminders | ✓ | Service, Breadcrumb | Get Started |
| `/family-assistance` | `(public)/family-assistance/page.tsx` | Local coordination for family | ✓ | Service, Breadcrumb | Tell Us What You Need |
| `/for-nris` | `(public)/for-nris/page.tsx` | Audiences and situations | ✓ | Breadcrumb | Tell Us What You Need |
| `/how-it-works` | `(public)/how-it-works/page.tsx` | 11-step journey; Dubai → Chennai example | ✓ | Breadcrumb | Create Your Family Office |
| `/trust` | `(public)/trust/page.tsx` | Seven trust commitments, what we don't claim | ✓ | Breadcrumb | Contact us |
| `/property` | `(public)/property/page.tsx` | Listing preview with sample cards | ✓ | Breadcrumb | List My Property |
| `/about` | `(public)/about/page.tsx` | Mission, vision, principles | ✓ | Breadcrumb | Get Started |
| `/faq` | `(public)/faq/page.tsx` | Ten questions | ✓ | FAQPage, Breadcrumb | Contact us |
| `/contact` | `(public)/contact/page.tsx` | Contact form | ✓ | Breadcrumb | Send message |
| `/get-started` | `(public)/get-started/page.tsx` | Primary intake form | ✓ | Breadcrumb | Send my request |
| `/privacy` | `(public)/privacy/page.tsx` | Draft privacy policy | ✓ | Breadcrumb | |
| `/terms` | `(public)/terms/page.tsx` | Draft terms of use | ✓ | Breadcrumb | |
| `/login` | `(auth)/login/page.tsx` | Phase 2 placeholder (disabled form) | noindex | | Get Started with our team |
| `/register` | `(auth)/register/page.tsx` | Phase 2 placeholder (disabled form) | noindex | | Get Started |

## Special routes

| Route | Source | Notes |
| --- | --- | --- |
| `/security` | `next.config.ts` redirect | Permanent (308) redirect to `/trust` |
| `/sitemap.xml` | [src/app/sitemap.ts](../../src/app/sitemap.ts) | Built from `indexableRoutes` |
| `/robots.txt` | [src/app/robots.ts](../../src/app/robots.ts) | Disallows future `/portal`, `/admin`, `/vendor`, `/partners` and `/api/` |
| `/opengraph-image` | [src/app/opengraph-image.tsx](../../src/app/opengraph-image.tsx) | 1200×630 PNG generated at build |
| `/icon.svg` | [src/app/icon.svg](../../src/app/icon.svg) | Favicon |
| any unknown path | [src/app/not-found.tsx](../../src/app/not-found.tsx) | Branded 404, noindex |

## Route groups

- `(public)` wraps marketing pages with the skip link, navbar, footer and Organization/WebSite JSON-LD.
- `(auth)` gives `/login` and `/register` a minimal layout. In Phase 2 this group becomes the NRI Portal's sign-in surface.
- Future layers get their own top-level segments (`portal/`, `admin/`, `vendor/`, `partners/`). See [future-architecture.md](future-architecture.md). A unit test ensures they are not shipped as empty placeholders.

## Adding a page

1. Add the path to `routes` and to `indexableRoutes` (or `nonIndexedRoutes`) in [src/config/routes.ts](../../src/config/routes.ts).
2. Create `src/app/(public)/<path>/page.tsx` exporting `metadata = pageMetadata({...})`.
3. Start with `<PageHero breadcrumb={...}>` for exactly one `<h1>` plus breadcrumb JSON-LD.
4. Link to it from [navigation.ts](../../src/config/navigation.ts) if it belongs in the header or footer.
5. Run `npm test` (route/link integrity) and `npm run qa` (metadata, headings, overflow).
