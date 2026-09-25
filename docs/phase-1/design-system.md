# Design system

Premium SaaS or wealth-management calm, rather than a property portal. It uses one deep evergreen brand colour on a warm paper background, with dark "night" bands for product previews. There is no gold or red, and no stock photography.

All tokens are CSS variables in the `@theme` block of [src/app/globals.css](../../src/app/globals.css), exposed as Tailwind utilities (`bg-canvas`, `text-ink-muted`, `rounded-card`, `shadow-raised`, …). Components use tokens only, never raw hex values.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#f7f6f2` | Page background |
| `surface` | `#ffffff` | Cards, forms |
| `subtle` | `#efede6` | Tints, hover, disabled |
| `line` / `line-strong` | `#e3e0d7` / `#cbc6b8` | Borders and dividers |
| `ink` | `#0e1a2b` | Headings, primary text |
| `ink-muted` | `#45505f` | Body copy |
| `ink-subtle` | `#5d6776` | Captions, meta |
| `brand` / `brand-strong` | `#0f5a4f` / `#0a443c` | Primary actions, accents |
| `brand-soft` / `brand-muted` | `#e3efeb` / `#a8cdc2` | Icon tiles; accents on night |
| `night` / `night-raised` / `night-line` | `#0b1522` / `#121f30` / `#24344b` | Dark bands and previews |
| `night-text` / `night-muted` | `#e8edf3` / `#9eacbf` | Text on night |
| `good`, `attention`, `info` (+ `-soft`, `-bright`) | | Status. `-bright` variants are for night surfaces. |

**Contrast:** every text/background pairing in use meets WCAG AA for normal text (≥ 4.5:1). The lowest is `ink-subtle` on `subtle` at 4.89:1. Status is never shown by colour alone: `StatusBadge` always renders its label.

## Typography

- **Geist** (sans, variable) for UI and body text.
- **Newsreader** (serif, 500, roman and italic) for display headings via the `text-display` utility. The serif carries the "family office" tone, and the italic is used for the empathetic "Who checks it?" lines.
- Both are self-hosted through `next/font` (no external requests) with `display: swap`.
- Scale: H1 36→60px responsive, H2 30→44px, body 16–18px, captions 12–14px. Headings use `text-wrap: balance` and paragraphs use `pretty`.

## Layout and spacing

- `container-page`: max width 76rem, with 16 / 24 / 32px side padding at mobile / sm / lg.
- `Section` gives vertical rhythm of 64 / 80 / 96px and tones (`canvas`, `surface`, `subtle`, `night`).
- Grids collapse to one column on mobile. Short-card grids use `FeatureCard compact`, which switches to an icon-beside-text row on phones to keep pages short.

## Radius and elevation

`rounded-control` (10px) for buttons and inputs, `rounded-card` (16px), `rounded-panel` (24px). Shadows are `shadow-card` (resting), `shadow-raised` (previews, forms) and `shadow-focus` (focus rings on inputs).

## Components

| Component | File | Notes |
| --- | --- | --- |
| `ButtonLink`, `Button`, `buttonClasses` | [ui/button.tsx](../../src/components/ui/button.tsx) | Variants: `primary`, `secondary`, `quiet`, `ghost`. Tones: `light`, `night`. Built-in analytics props. |
| `Badge`, `StatusBadge`, `AvailabilityBadge`, `DemoLabel` | [ui/badge.tsx](../../src/components/ui/badge.tsx) | `DemoLabel` must accompany any sample data |
| `Card`, `FeatureCard`, `IconTile` | [ui/card.tsx](../../src/components/ui/card.tsx) | |
| `Section`, `SectionHeader`, `Eyebrow` | [ui/section.tsx](../../src/components/ui/section.tsx) | |
| `Navbar`, `MobileMenu`, `Footer`, `Logo`, `SkipLink` | [layout/](../../src/components/layout/) | |
| `PageHero`, `CtaBand`, `ScopeNote`, `LegalPage` | [marketing/](../../src/components/marketing/) | `PageHero` also emits breadcrumb JSON-LD |
| `FlowChain`, `Timeline` | [marketing/flow.tsx](../../src/components/marketing/flow.tsx) | `FlowChain` is a rail on mobile and an even track on larger screens. It is never used as a wrapping pill row, which could orphan a step. |
| `FamilyOfficePreview`, `WorkspacePreview` | [marketing/dashboard-preview.tsx](../../src/components/marketing/dashboard-preview.tsx) | Always captioned as illustrative |
| `TrustRecord`, `PrivacyPrinciples`, `VisibilityLevels`, `VisibilityBadge` | [trust/](../../src/components/trust/) | |
| `PropertyCard`, `InspectionReport` | [property/](../../src/components/property/) | |
| `Field`, `Input`, `Select`, `Textarea`, `ChoiceGroup`, `ConsentCheckbox` | [forms/fields.tsx](../../src/components/forms/fields.tsx) | Label, hint and error wired through `aria-describedby` |
| `FaqList` | [shared/faq-list.tsx](../../src/components/shared/faq-list.tsx) | Native `<details>`: accessible with no JS |

### Spec component list → implementation (§45)

| Spec name | Implemented as |
| --- | --- |
| Navbar, MobileMenu, Footer, Logo | `Navbar`, `MobileMenu`, `Footer`, `Logo` / `LogoMark` (placeholder mark until branding is confirmed) |
| Hero | Home hero (in the homepage) + `PageHero` for inner pages |
| SectionHeader | `SectionHeader` |
| CTAButton, SecondaryButton | `ButtonLink` / `Button` with `variant="primary"` / `"secondary"` |
| ServiceCard, FeatureCard, PropertyCard | `ServiceCard`, `FeatureCard`, `PropertyCard` |
| TrustCard | `TrustRecord` (six cards built on `FeatureCard`) |
| Timeline | `Timeline` (detailed) and `FlowChain` (compact steps) |
| DashboardPreview | `FamilyOfficePreview` (hero) and `WorkspacePreview` |
| FAQ | `FaqList` |
| ContactForm, GetStartedForm | `ContactForm`, `GetStartedForm` |
| StatusBadge | `StatusBadge` (+ `Badge`, `AvailabilityBadge`, `DemoLabel`) |
| Container | `container-page` utility (a component would add nothing) |
| Testimonial | **Deliberately not built.** There are no customers yet and the spec forbids invented testimonials (§51, §55). Add one only with real, consented quotes. |

### Rule: no competing utility classes

There is no class-merging step (no `tailwind-merge`). A caller must not pass a class that competes with a component's own class for the same CSS property. For example, `hidden` against a button's `inline-flex` will lose, depending on stylesheet order. Override with a variant prefix instead (`max-sm:hidden`, `max-sm:px-3`), which always wins, or add a prop or variant to the component. The QA overflow check caught exactly this bug on the 320px header.

## Branding

Branding is not confirmed. The name comes from `NEXT_PUBLIC_BRAND_NAME` (default "NRI Family Office"). The mark is a neutral placeholder (a roofline over a circle). The evergreen palette is brand-neutral and can be retuned in `@theme` once the brand is final.

## Motion

- Scroll reveal (`.reveal`) uses CSS scroll-driven animations only where supported, and only when `prefers-reduced-motion: no-preference`. Otherwise content is simply visible. No JavaScript is involved.
- The hero activity list animates in once. Hover transitions are 200ms.
- There are no parallax effects, no auto-playing video and no animation libraries.
- Number/count animations (§43, "if meaningful") are intentionally not used: the only numbers are sample values in labelled previews, and animating them would imply live data.

## Imagery

No stock photos. Visuals are product previews built in HTML/CSS: the dashboard, the report and listing cards. They stay crisp at any size, cost almost nothing to load, and every sample carries a visible label. When real photography is added (for example a founder photo), use `next/image` with meaningful `alt` text.
