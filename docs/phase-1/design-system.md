# Design system (UI V2)

**Quiet premium.** The site should feel like a private wealth or modern fintech platform (Linear, Stripe, Mercury), not a property portal. It gets there through discipline, not decoration: one refined accent colour on a warm off-white base, generous whitespace, 1px borders, restrained shadows and product UI instead of photography. There is no gold, no brand red (red is used only for form errors), no glassmorphism and no stock imagery.

All tokens are CSS variables in the `@theme` block of [src/app/globals.css](../../src/app/globals.css), exposed as Tailwind utilities (`bg-canvas`, `text-ink-muted`, `rounded-card`, `shadow-float`, …). Components use tokens only, never raw hex values. The UI V2 brief and where each part of it lives are in [ui-v2.md](ui-v2.md).

## Colour

| Token | Value | Semantic name | Use |
| --- | --- | --- | --- |
| `canvas` | `#f6f5f1` | `--background` | Page background (warm off-white) |
| `surface` / `surface-elevated` | `#ffffff` | `--surface`, `--surface-elevated` | Cards, panels, forms, previews |
| `subtle` | `#eeede7` | | Tints, the evidence band, hover, disabled |
| `line` / `line-subtle` / `line-strong` | `#e3e0d8` / `#ecebe5` / `#cdc9be` | `--border`, `--border-subtle` | 1px borders and dividers |
| `ink` | `#0e1a2b` | `--foreground` | Headings, primary text (deep navy) |
| `ink-muted` / `ink-subtle` | `#45505f` / `#5d6776` | `--muted` | Body copy / captions and metadata |
| `brand` / `brand-strong` | `#0f5a4f` / `#0a443c` | `--accent` | The one accent: deep teal. Primary actions, links, icons |
| `brand-soft` / `brand-muted` | `#e2eeea` / `#a8cdc2` | `--accent-soft` | Tints; accent text on night surfaces |
| `night`, `night-raised`, `night-line` | `#0b1522`, `#121f30`, `#24344b` | | The vision band and closing CTA |
| `night-text` / `night-muted` | `#e8edf3` / `#9eacbf` | | Text on night |
| `good`, `attention`, `info` (+ `-soft`, `-bright`) | | `--success`, `--warning` | Status. `-bright` variants are for night surfaces and bars. |
| `danger` / `danger-soft` | `#b42318` / `#fdecea` | `--danger` | Form errors only |

**Contrast:** every text/background pairing in use meets WCAG AA for normal text. axe-core finds 0 contrast violations on all 19 pages (desktop and phone). Status is never shown by colour alone: every status dot sits next to its label.

## Typography

- **Geist** (variable, self-hosted through `next/font`, `display: swap`) for everything. Display headings use the `text-display` utility: weight 600, tight tracking (−0.035em, −0.045em on the home hero) and a 1.05 line height.
- Scale: home hero 44px mobile → 56px (lg) → 72px (xl); inner page H1 40 → 52 → 64px; section H2 32 → 48 → 56px; body 17px (`text-base`), leads 19–22px, metadata 11–14px.
- `text-label` is the small uppercase metadata style (11px, 600, 0.14em tracking) used for eyebrows, panel titles and the trust strip.
- Headings use `text-wrap: balance`, paragraphs `pretty`. Where two sentences share one heading, each sits in its own block span so they balance separately.

## Layout and spacing

- `container-page`: max width 76rem, with 16 / 24 / 32px side padding at mobile / sm / lg.
- `Section` rhythm: 80px on phones, 112px on tablets, 144px on desktop (the brief asks for 72–96 / 120–160px). Tones: `canvas`, `surface`, `subtle`, `night`.
- Consecutive home sections alternate surfaces (canvas → white → canvas → subtle → canvas → night …) and never repeat the same composition. See [ui-v2.md](ui-v2.md#scroll-rhythm).

## Radius, borders and elevation

- Radius: `rounded-control` 10px (buttons, inputs), `rounded-card` 14px, `rounded-panel` 20px.
- 1px borders everywhere; `line-subtle` inside panels, `line` for outlines, `line-strong` for connectors and emphasis.
- Shadows: `shadow-card` (almost none), `shadow-raised` (panels and reports), `shadow-float` (floating preview layers only), `shadow-focus` (input focus ring).

## Backgrounds

- `bg-hero-glow`: a barely-visible teal glow in one corner.
- `bg-grid`: a faint 56px grid. Safe on any element.
- `bg-grid-fade`, `bg-grid-night`: the same grid with an edge fade. **The fade is a mask, so these only go on an empty decorative layer** (`absolute inset-0` behind the content), never on an element that contains text or forms.
- `ContourLines` ([ui/contours.tsx](../../src/components/ui/contours.tsx)): topographic contour lines generated on the server, used at ~5% contrast behind heroes and the closing CTA.

## Motion

All motion is CSS, short and one-off, and fully disabled by `prefers-reduced-motion`.

| Effect | Where | Timing |
| --- | --- | --- |
| Hover lift (−1px) and shadow | Primary and secondary buttons, service panels | 200ms |
| Header becomes more opaque with a soft edge | `[data-site-header][data-scrolled]`, set by an IntersectionObserver ([header-scroll-state.tsx](../../src/components/layout/header-scroll-state.tsx)); no scroll listeners | 300ms |
| Fade-up reveal on scroll | `.reveal`; scroll-driven animations, only where supported | ~500ms of scroll |
| Activity rows fade in, staggered | Hero command center (`.animate-activity`) | 500ms each, 350ms apart |
| Floating layers settle in | Hero approval and map cards (`.animate-float-in`) | 700ms |
| Numbers fade up, staggered | Hero stats (`.animate-activity`) | 500ms each |
| Service record fills as you scroll | `.timeline-fill`, `.timeline-node` with `animation-timeline: view(block 50%)` | Tied to scroll |
| Approval dot pulses 3 times | Dashboard approval card | 2.4s × 3, never infinite |
| FAQ open/close height | `details.faq-item::details-content` where supported | 300ms |

Only transform, opacity and colour are animated. A counter-based count-up was removed in the final polish because it re-ran style and layout on every frame. There is no parallax, no infinite animation and no animation library.

## Components

| Component | File | Notes |
| --- | --- | --- |
| `ButtonLink`, `Button`, `buttonClasses` | [ui/button.tsx](../../src/components/ui/button.tsx) | Variants `primary`, `secondary`, `quiet`, `ghost`; tones `light`, `night`; built-in analytics props |
| `Badge`, `StatusBadge`, `AvailabilityBadge`, `DemoLabel` | [ui/badge.tsx](../../src/components/ui/badge.tsx) | `DemoLabel kind="concept"` ("Concept preview", product UI) or `kind="illustrative"` ("Illustrative data", example content): the only two sample labels |
| `Card`, `FeatureCard`, `IconTile` | [ui/card.tsx](../../src/components/ui/card.tsx) | Small icon tiles; icons support content, never dominate |
| `Section`, `SectionHeader`, `Eyebrow` | [ui/section.tsx](../../src/components/ui/section.tsx) | |
| `ContourLines` | [ui/contours.tsx](../../src/components/ui/contours.tsx) | Decorative, `aria-hidden` |
| `Navbar`, `HeaderScrollState`, `MobileMenu`, `Footer`, `Logo`, `LogoMark`, `SkipLink` | [layout/](../../src/components/layout/) | Four desktop nav items; light minimal footer |
| `HomeHero`, `HeroBackdrop`, `TrustStrip` | [marketing/home/hero.tsx](../../src/components/marketing/home/hero.tsx) | |
| `CommandCenter` | [marketing/home/command-center.tsx](../../src/components/marketing/home/command-center.tsx) | Hero "My Family Office" preview: stats, health bars, sparkline, activity timeline, floating approval and map cards |
| `DistanceStory` | [marketing/home/distance-story.tsx](../../src/components/marketing/home/distance-story.tsx) | Editorial problem section with a vertical path |
| `EcosystemRadial` | [marketing/home/ecosystem-radial.tsx](../../src/components/marketing/home/ecosystem-radial.tsx) | Radial on desktop, one connected list on phones |
| `ServicesShowcase` | [marketing/home/services-showcase.tsx](../../src/components/marketing/home/services-showcase.tsx) | Primary (Property Care, care plan) → secondary → supporting + prompt |
| `EvidenceTimeline` | [marketing/home/evidence-timeline.tsx](../../src/components/marketing/home/evidence-timeline.tsx) | Timestamped service record; each step tagged with the question it answers; scroll-driven rail |
| `PrivacyAccess` | [marketing/home/privacy-access.tsx](../../src/components/marketing/home/privacy-access.tsx) | Permission interface: roles, access levels, visibility switch |
| `FutureOffice` | [marketing/home/future-office.tsx](../../src/components/marketing/home/future-office.tsx) | Night band; Today → Next → Vision |
| `WorkspaceDashboard` | [marketing/home/workspace-dashboard.tsx](../../src/components/marketing/home/workspace-dashboard.tsx) | Sidebar (desktop) / icon rail (tablet) / stacked (phone) |
| `PropertyControl` | [marketing/home/property-control.tsx](../../src/components/marketing/home/property-control.tsx) | Visibility ladder + sample listing card |
| `Journey` | [marketing/home/journey.tsx](../../src/components/marketing/home/journey.tsx) | Six stages, horizontal on desktop, vertical rail on phones |
| `PageHero`, `CtaBand`, `ScopeNote`, `LegalPage`, `ServiceCard` | [marketing/](../../src/components/marketing/) | `PageHero` emits breadcrumb JSON-LD; `CtaBand` is the full-bleed night close |
| `FlowChain`, `Timeline` | [marketing/flow.tsx](../../src/components/marketing/flow.tsx) | Inner pages. `FlowChain` is a rail on mobile and an even track on larger screens |
| `TrustRecord`, `RecordPrinciples`, `PrivacyPrinciples`, `VisibilityLevels`, `VisibilityBadge` | [trust/](../../src/components/trust/) | `TrustRecord` (grid, /trust) and `RecordPrinciples` (typographic, home) share one data source |
| `PropertyCard`, `InspectionReport` | [property/](../../src/components/property/) | The report is labelled "Sample report · Illustrative data" |
| `Field`, `Input`, `Select`, `Textarea`, `ChoiceGroup`, `ConsentCheckbox` | [forms/fields.tsx](../../src/components/forms/fields.tsx) | Label, hint and error wired through `aria-describedby`; errors use `danger` |
| `FaqList` | [shared/faq-list.tsx](../../src/components/shared/faq-list.tsx) | Native `<details>`: keyboard and screen-reader friendly with no JS |

### Concept previews

The hero command center and the dashboard are built from HTML and CSS, so they stay crisp and cost almost nothing to load. Each is exposed to assistive technology as a single image (`role="img"`) with a plain-language summary, so a screen reader doesn't read a mock interface as if it were real. Their buttons are non-interactive `<span>`s, and every preview carries a visible "Sample data" / "Concept preview" label. Sample people and places come from [src/data/demo.ts](../../src/data/demo.ts) and are fictional.

### Rule: no competing utility classes

There is no class-merging step (no `tailwind-merge`). A caller must not pass a class that competes with a component's own class for the same CSS property. For example, `hidden` against a button's `inline-flex` will lose, depending on stylesheet order. Override with a variant prefix instead (`max-sm:hidden`, `max-sm:px-3`, `lg:rounded-none`), which always wins, or add a prop.

## Branding

Branding is not confirmed. Everything brand-related comes from `siteConfig.brand` (`name`, `shortName`, `descriptor`, `tagline`, `promise`, `description`, `logo`, `favicon`), edited in the settings block of [src/config/site.ts](../../src/config/site.ts). The mark is a neutral placeholder (a roofline over a circle); setting `brand.logo` to a file in `/public` replaces it in the header and footer. Also update [icon.svg](../../src/app/icon.svg) and [opengraph-image.tsx](../../src/app/opengraph-image.tsx) when the brand is final. The teal palette is brand-neutral and can be retuned in `@theme`.

Public contact details (`contactEmail`, `contactWhatsapp`, `contactPhone`) are empty until business contact details exist; the footer and contact page show them only when set. Never put a personal email or number there.

## Imagery

No stock photos and no house photography. Visuals are product UI (the command center, dashboard, report, listing card), diagrams (the radial ecosystem, access tree, journey) and abstract location patterns (contours, a dotted Tamil Nadu map). If real photography is added later, use authentic Tamil Nadu imagery through `next/image` with meaningful `alt` text.
