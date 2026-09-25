# Spec compliance: master prompt → implementation

This doc traces each section of the Phase 1 master prompt to where it is implemented. **Deviation** marks anything intentionally different, with the reason.

| § | Requirement | Where / how |
| --- | --- | --- |
| 1 | Layer 1 only; architecture ready for Layers 2–5 | Route groups `(public)`, `(auth)`; [future-architecture.md](future-architecture.md). A unit test fails if `portal/`, `admin/`, `vendor/` or `partners/` placeholders appear. |
| 2 | Family-office positioning, no pretending future features exist | "Available now" vs "Coming to the platform" ([src/data/marketing.ts](../../src/data/marketing.ts)) |
| 3 | NRI audience, no nationality stereotypes | `/for-nris` audience cards; copy uses situations, not nationalities |
| 4 | Primary, supporting and alternative messages | Hero (primary, supporting, explanation); alternative positioning is the `/services` lead |
| 5 | Premium, calm brand; no gold/red, stock photos or superlatives | Evergreen/night palette, HTML product visuals; content guards ban "best", "No.1", "guaranteed" |
| 6 | Trust through evidence | Trust record, request chain, example report, workspace preview, approvals |
| 7 | Privacy and three visibility levels (visual only) | `VisibilityLevels`, `VisibilityBadge`, `/property`, `/trust`; no marketplace backend |
| 8 | Inspect repo; Next.js + TS + Tailwind for an empty repo | The repo was empty. Next.js 16, TypeScript strict, Tailwind v4, ESLint, npm. |
| 9 | Clean structure | `src/app`, `components/{ui,layout,marketing,forms,property,trust,shared}`, `config/{site,navigation,services,routes,leads}`, `lib/{utils,validation,seo,…}`, `data/`, `types/`. **Deviation:** styles live in `app/globals.css` (Tailwind v4 convention), data is flat files, and future portals are documented rather than added as empty folders (§9, "do not create empty fake implementations"). |
| 10 | All routes, plus optional `/security` and `/faq`; `/login` and `/register` | All present; `/security` → 308 `/trust`. See [routes.md](routes.md). |
| 11 | Desktop nav + right-side Login / Get Started; mobile Logo, Menu, Login, Get Started | [navbar.tsx](../../src/components/layout/navbar.tsx): mobile shows a Login icon button, Get Started and the menu; the menu also contains Login and Get Started |
| 12 | Hero copy, CTAs, microcopy, labelled "Family Office" preview | Homepage section 1, `FamilyOfficePreview` (labelled "Sample") |
| 13 | Problem headline, copy, five cards | Homepage section 2 |
| 14 | Solution headline, five cards, "See How It Works" | Homepage section 3 |
| 15 | Five service categories with bullets and CTAs; careful legal and medical wording | `ServiceCard` × 5 + scope notes ([services.ts](../../src/config/services.ts)) |
| 16 | "Distance shouldn't mean uncertainty", six trust cards, 7-step timeline | `TrustRecord`, `FlowChain` |
| 17 | Privacy section, four cards, "Explore Trust & Security" | `PrivacyPrinciples` + CTA |
| 18 | Future family office, ecosystem, Available now vs Coming | `EcosystemDiagram`, `RoadmapLists` |
| 19 | Five-step how it works, "Create Your Family Office" | `Timeline` + CTA (→ `/get-started` until accounts exist) |
| 20 | Dashboard preview with the specified figures | `WorkspacePreview` (3 / 2 / 1; activity; 92 / 96 / 88), labelled |
| 21 | Sell/rent section, three visibility levels, "List My Property" → `/get-started` | Homepage section 10 |
| 22 | `/for-nris` headline, seven audience sections, CTA | [for-nris/page.tsx](../../src/app/(public)/for-nris/page.tsx) |
| 23 | `/property-care` list including emergency visits; example report marked as a demo | Offerings (incl. "Emergency visits") + `InspectionReport` ("Example report") |
| 24 | `/property-management` list + 6-step workflow | Offerings + `FlowChain` |
| 25 | `/property-transactions` Sell/Buy/Rent + regulated-services statement | Three tracks + `ScopeNote` |
| 26 | `/document-assistance`; no legal-verification claims | Offerings + scope note |
| 27 | `/family-assistance` positioning, categories, "do not replace" statement | Offerings + scope note |
| 28 | `/how-it-works` 11-step journey + Dubai → Chennai example | `FlowChain` + `Timeline`; example labelled illustrative, no personal names |
| 29 | `/trust` seven sections; no certification claims | Seven pillars + "What we don't claim"; content guard bans ISO / SOC 2 / GDPR / bank-grade |
| 30 | `/about` headline, belief, vision, mission; no fake team or numbers | [about/page.tsx](../../src/app/(public)/about/page.tsx) |
| 31 | `/contact` fields, ten categories, consent | `ContactForm` |
| 32 | `/get-started` fields and exact success message; no response-time promise | `GetStartedForm`; message in [actions.ts](../../src/lib/leads/actions.ts) |
| 33 | Login/Register fields; never fake account creation; "Coming in Phase 2" | `AuthPreview` (disabled fieldset, labelled). Login shows "Forgot password?" and "New here? Create your Family Office". |
| 34 | `/property` concept page with fictional cards | `PropertyCard` × 4 (sample data, "Contact through platform") |
| 35 | Pricing (optional): Essential / Family / Premium, no numbers, "Request a plan" / "Talk to us" | Plans on `/services#plans` |
| 36 | FAQ (eight required questions) | [src/data/faq.ts](../../src/data/faq.ts) (the 8 plus 2), `/faq` + homepage |
| 37 | Footer columns, tagline, "© 2026 [Brand Name]", no invented company info | `Footer` (brand and legal name come from config/env) |
| 38 | Responsive at 320–1920px, no overflow | QA at 10 widths × 19 routes × 4 engines |
| 39 | Accessibility basics, WCAG 2.2 AA where practical | Skip link, landmarks, one H1, focus rings, labelled controls, `<dialog>` menu, `<details>` FAQ, reduced motion, AA contrast |
| 40 | Per-page SEO, sitemap, robots, schema | `pageMetadata`, `sitemap.ts`, `robots.ts`, JSON-LD. See [seo.md](seo.md). |
| 41 | Keyword topics, no stuffing | Mapping in [seo.md](seo.md) |
| 42 | Performance | Static HTML, ~139 KB JS (framework baseline), no images or videos, self-hosted fonts |
| 43 | Subtle animation | CSS scroll reveal (progressive), activity fade, hover transitions. **Deviation:** no count-up numbers, since they would imply live data. |
| 44 | Design tokens | `@theme` in [globals.css](../../src/app/globals.css). See [design-system.md](design-system.md). |
| 45 | Component system | Mapping table in [design-system.md](design-system.md). **Deviation:** no `Testimonial` component, since there are no real testimonials. |
| 46 | Fictional mock data only | [src/data/demo.ts](../../src/data/demo.ts); guard tests ban emails, phone numbers and street addresses |
| 47 | Forms: client and server validation, errors, success, loading, disabled, spam, labels, no data loss | [forms/](../../src/components/forms/), [actions.ts](../../src/lib/leads/actions.ts) |
| 48 | Analytics events, no unnecessary PII | [events.ts](../../src/lib/analytics/events.ts) (allow-listed props). See [information-architecture.md](information-architecture.md#analytics-events). |
| 49 | Security practices | Headers/CSP, Zod, Server Action CSRF check, rate limit, `server-only`, redacted logs. See [security.md](security.md). |
| 50 | Future boundaries | robots disallows future zones; `PlatformRole` types; architecture doc |
| 51 | No fake reviews, counts, logos, certifications | Content guard tests |
| 52–53 | Plain English; brand phrases | All listed phrases are used, e.g. "Your property. Your control.", "Local execution. Remote visibility.", "One trusted workspace." |
| 54 | One primary CTA + purposeful secondary CTAs | CTA table in [information-architecture.md](information-architecture.md) |
| 55 | Trust without testimonials | Process, example report, workspace preview, security approach. Founder story to be added when available. |
| 56–57 | Testing and quality gate | `npm run check` + `npm run qa` on Edge, Chrome, Firefox and WebKit. See [testing.md](testing.md). |
| 58 | Development order | Followed. The repository report was given before implementation. |
| 59 | Sensible defaults, documented assumptions | Assumptions table in [product-overview.md](product-overview.md) |
| 60 | Eight docs in `/docs/phase-1/` | All present, plus this file |
| 61–62 | 10-second understanding: trust, control, transparency, privacy, local execution | Hero → problem → solution → trust → privacy order. See [information-architecture.md](information-architecture.md). |

**Branding:** not confirmed. The working name is "NRI Family Office", set through `NEXT_PUBLIC_BRAND_NAME`, with a placeholder mark. See [product-overview.md](product-overview.md).
