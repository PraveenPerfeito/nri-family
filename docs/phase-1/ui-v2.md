# UI V2: premium presentation layer

The "Premium UI/UX V2" brief (2026-09-25) restyled the presentation layer of the Phase 1 site. It did **not** change routes, forms, lead delivery, SEO, analytics events, security headers or content strategy. Tokens and components are documented in [design-system.md](design-system.md).

## Brief → implementation

| § | Brief | Where / how |
| --- | --- | --- |
| 1 | Audit before changing; preserve routes, functionality, content, SEO, forms, links, a11y | Same 19 routes, same forms and Server Actions, same metadata and JSON-LD. `npm run check` (110 unit tests) and `npm run qa` (435 browser checks) pass unchanged. |
| 2–3 | Trust, control, calm, visibility, privacy, local presence; quiet premium | Warm neutral palette, one teal accent, 1px borders, product UI instead of decoration |
| 4 | Colour system with semantic tokens | `@theme` palette plus `--background`, `--surface`, `--surface-elevated`, `--foreground`, `--muted`, `--border`, `--border-subtle`, `--accent`, `--accent-soft`, `--success`, `--warning`, `--danger` in [globals.css](../../src/app/globals.css) |
| 5 | Premium modern sans; hierarchy by weight and whitespace | Geist only (the Phase 1 serif was removed). Hero 72px desktop, H2 56px, body 17px, labels 11–14px |
| 6 | Four-item translucent sticky navbar, more opaque on scroll | [navbar.tsx](../../src/components/layout/navbar.tsx): Services, For NRIs, How It Works, Trust + Login + Get Started; [header-scroll-state.tsx](../../src/components/layout/header-scroll-state.tsx) |
| 7 | Two-column hero with a layered "Family Office Command Center", PRIVATE WORKSPACE badge, "Sample data · Concept preview" | [hero.tsx](../../src/components/marketing/home/hero.tsx), [command-center.tsx](../../src/components/marketing/home/command-center.tsx): stats, health bars, 6-month sparkline, activity timeline, floating approval card, dotted Tamil Nadu map |
| 8 | Background that almost disappears | Corner glow, faded grid and ~5% contour lines (`HeroBackdrop`, `ContourLines`) |
| 9 | Trust strip under the hero | `TrustStrip`: Private by default · Local execution · Visible proof · Customer approval |
| 10 | Editorial problem section with a path | [distance-story.tsx](../../src/components/marketing/home/distance-story.tsx). **Deviation:** "7,000+ miles" became real approximate distances to Chennai (Dubai 2,900 km … Toronto 13,400 km), because 7,000 miles is wrong for Dubai or Singapore. |
| 11 | Radial ecosystem around "Your Family Office" | [ecosystem-radial.tsx](../../src/components/marketing/home/ecosystem-radial.tsx): raised night centre node, orbits, dashed connectors; a connected list on phones |
| 12 | Service hierarchy, not identical cards | [services-showcase.tsx](../../src/components/marketing/home/services-showcase.tsx): Property Care flagship with a report visual; Management and Transactions with small visuals; Documents and Family as secondary; a "Not sure where to start?" prompt |
| 13 | Signature trust timeline with timestamps, status, icons, connectors | [evidence-timeline.tsx](../../src/components/marketing/home/evidence-timeline.tsx): eight timestamped steps from request to invoice, plus the six-question `TrustRecord` |
| 14 | Sample inspection report, 92/100, 18 photos, 1 video, 1 recommendation | [inspection-report.tsx](../../src/components/property/inspection-report.tsx), labelled "Sample report · Illustrative data". **Deviation:** the property is "Chennai House" (not "Chennai Residence") to match the dashboards. |
| 15 | Access-control diagram and visibility levels | [privacy-access.tsx](../../src/components/marketing/home/privacy-access.tsx): property record → Owner (full access) / Team (required data) / Partner (assigned data); Private / Verified network / Public |
| 16 | Visionary family-office section; Available today vs Coming, clearly separated | [future-office.tsx](../../src/components/marketing/home/future-office.tsx), driven by `roadmap` in [marketing.ts](../../src/data/marketing.ts). Coming items are dashed, muted and labelled "In development". |
| 17 | Polished dashboard with 03/02/01, progress bars, timeline and an approval card | [workspace-dashboard.tsx](../../src/components/marketing/home/workspace-dashboard.tsx): Garden maintenance ₹8,500 with [Review] [Approve], labelled "Concept preview · Sample data" |
| 18 | Controlled marketplace: visibility ladder + sample card | [property-control.tsx](../../src/components/marketing/home/property-control.tsx): Chennai · Independent Residence · 2,400 sq.ft · Verified network · Contact through platform, labelled "Sample listing" |
| 19 | Six-stage journey, horizontal on desktop, vertical on mobile, small visuals | [journey.tsx](../../src/components/marketing/home/journey.tsx), from `journeyStages` |
| 20 | Clean accessible FAQ with hover and smooth expand | [faq-list.tsx](../../src/components/shared/faq-list.tsx): native `<details>`; height transition via `::details-content` |
| 21 | Premium closing CTA on a deep surface | [cta-band.tsx](../../src/components/marketing/cta-band.tsx): full-bleed night band with contours; the home version uses the brief's exact copy |
| 22 | Minimal footer; "© 2026 [Brand]"; configurable company and contact details | [footer.tsx](../../src/components/layout/footer.tsx): light, four link groups, everything from `siteConfig` |
| 23 | One icon system, used sparingly | lucide-react; small 14–18px icons |
| 24 | Subtle motion, 150–500ms, reduced motion respected | See Motion in [design-system.md](design-system.md#motion). No infinite animations. |
| 25 | Scroll rhythm | See below |
| 26 | 120–160px desktop / 72–96px mobile spacing | `Section`: 144px desktop, 112px tablet, 80px phone |
| 27 | 1px borders, 12–20px radius, layered surfaces | 10 / 14 / 20px radius; back plates behind the hero and listing previews |
| 28–29 | Intentional mobile; responsive dashboard | Radial → connected list; timelines → vertical; dashboard → sidebar / icon rail / stacked (summary → health → activity → approval); secondary service bullets hidden on phones (they remain on each service page) |
| 30 | No stock photography | Product UI, diagrams and abstract location patterns only |
| 31 | `siteConfig.brand` with name, shortName, tagline, description, logo, favicon | [site.ts](../../src/config/site.ts); no component hard-codes the brand name |
| 32 | No fake customers, testimonials, statistics or certifications | Unchanged content guards; all numbers are labelled sample data |
| 33 | No personal contact details in components; configuration placeholders | `contactEmail`, `contactWhatsapp`, `contactPhone` are empty until business details exist. The leads inbox is private and server-side only. |
| 34–35 | Lint, build, tests; browser visual QA at 1440×900, 1920×1080, 390×844, 375×812 | See QA record below |
| 38 | No backend rebuild, no Phase 2, no auth, no fake functionality | Presentation layer only |

**Copy changed on purpose.** V2 kept the Phase 1 messaging except where the brief gave new wording: the hero supporting line ("Property care, local execution, documents and family assistance — managed transparently from anywhere."), "Inspection completed" in the hero activity, and "Available today" instead of "Available now". The full Phase 1 supporting line still serves as the site description in metadata. Everything else from the Phase 1 content audit is still on the page (330 of 333 items; those three are the ones above).

## Scroll rhythm

| # | Section | Surface | Composition |
| --- | --- | --- | --- |
| 1 | Hero | canvas + backdrop | Two columns; layered command center |
| 2 | Trust strip | white band | One line of four principles |
| 3 | Problem | canvas | Editorial text + question list; vertical path |
| 4 | Solution | white band | Centred header; radial ecosystem |
| 5 | Services | canvas | Asymmetric panels |
| 6 | Trust / evidence | subtle band | Split header; staggered timeline and report; six-question grid |
| 7 | Privacy | canvas | Text and principles; access-control tree |
| 8 | Digital family office | night | Centred header; convergence diagram; today vs coming |
| 9 | Dashboard | canvas | Centred header; full-width product window |
| 10 | Property | white band | Visibility ladder; floating sample listing |
| 11 | How it works | canvas | Header with CTAs; six-stage track |
| 12 | FAQ | white band | Header left; accordion right |
| 13 | Closing CTA | night | Full-bleed, centred |

## QA record (local production build, 2026-09-25)

- `npm run check`: lint, typecheck, 110 unit tests and the production build pass.
- `npm run qa`: 19 routes × 10 widths (320–1920px), 435 checks in each of Edge, Firefox and WebKit, 0 failures (no horizontal overflow, no console errors, links, headings, forms, menu, FAQ, skip link).
- axe-core 4.13 (WCAG 2.2 AA + best practices), reduced motion: 0 violations on all 19 pages at 1440px (Edge) and on a 390px phone (WebKit).
- Visual review of every home section at 1440×900, 1920×1080, 390×844 and 375×812, plus inner pages at 1440 and 390. Fixed during review: radial cards collapsing onto one row, a floating card hiding the "Private workspace" badge, captions hidden behind stacked back plates, an empty flagship service panel, truncated activity text, and the grid fade mask fading the Get Started form (now `bg-grid-fade`, decorative layers only).
