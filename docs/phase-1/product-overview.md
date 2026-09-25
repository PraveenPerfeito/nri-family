# Product overview — Phase 1 (Layer 1: Public Website)

## What we are building

A technology-enabled **Digital Family Office for NRIs in Tamil Nadu**.

> **Your trusted team in Tamil Nadu.**
> You live abroad. We take care of what you own here.

The customer is not buying "maintenance". They are buying **trust**: the confidence that someone responsible is looking after things locally, and the evidence to prove it.

## The five-layer platform

| Layer | Audience | Status |
| --- | --- | --- |
| 1. Public Website | Prospective customers, search engines | **Built in Phase 1** |
| 2. NRI Portal | Customers and invited family members | Entry points only (`/login`, `/register`) |
| 3. Admin ERP | Operations team | Not started |
| 4. Vendor Portal | Local service providers | Not started |
| 5. Professional Partner Portal | Lawyers, auditors, other professionals | Not started |

## Phase 1 goals

Within about 10 seconds of landing, an NRI should understand:

| Question | Where the site answers it |
| --- | --- |
| **What** is this? | Hero headline: "Your trusted team in Tamil Nadu." |
| **Who** is it for? | Hero microcopy, the `/for-nris` page |
| **What do you handle?** | Solution cards, service cards (property, assets, documents, family, local services) |
| **How does it work?** | "Request → assigned → … → invoice" chain, five-step how-it-works |
| **Why trust you?** | Who/what/when/where/proof/cost record, privacy principles, visibility levels, example report |
| **What do I do?** | One primary CTA everywhere: **Get Started** |

## Audience

NRIs living anywhere (USA, Canada, UK, UAE, Singapore, Australia, Europe and elsewhere) who own a house, apartment, land, rental or property under construction in Tamil Nadu, or who have family there. Copy never stereotypes by nationality, and avoids assuming every NRI has the same situation.

## Principles that shaped every page

1. **Trust through evidence, not claims.** There are no testimonials, customer counts, partner logos, awards or certifications. The site instead shows the process, an example report, a workspace preview and the privacy approach. An automated test ([tests/content-guards.test.ts](../../tests/content-guards.test.ts)) fails if banned claims appear.
2. **Private by default.** No customer data appears publicly. Listings show city-level location only, and enquiries route through the platform.
3. **Honest about what exists.** Services coordinated by the team are marked **Available now**. Platform features (online workspace, document vault, listings, family access, partner network) are marked **Coming to the platform**. The list lives in [src/data/marketing.ts](../../src/data/marketing.ts).
4. **Know our limits.** Legal, tax, medical and other regulated work is always attributed to qualified professionals. We coordinate; we do not replace them. Scope notes appear on every page where this matters.
5. **Calm, premium, plain English.** Short sentences, no hype, no fake urgency.

## Assumptions made in Phase 1

These need confirmation from the business. Each is easy to change.

| Assumption | Where to change it |
| --- | --- |
| **Branding is not confirmed.** The site uses the neutral working name **"NRI Family Office"** (from the spec footer) and a placeholder mark. No brand story is told. | `NEXT_PUBLIC_BRAND_NAME` (read by `siteConfig.name` in [src/config/site.ts](../../src/config/site.ts)); mark in [logo.tsx](../../src/components/layout/logo.tsx), [icon.svg](../../src/app/icon.svg), [opengraph-image.tsx](../../src/app/opengraph-image.tsx) |
| No production domain yet. Canonical URLs, the sitemap and Open Graph default to `http://localhost:3000`. | `NEXT_PUBLIC_SITE_URL` (required before launch) |
| No public email, WhatsApp number or legal entity yet. These are hidden until configured. | `NEXT_PUBLIC_CONTACT_*`, `NEXT_PUBLIC_COMPANY_*` |
| All six service areas are operationally available now, coordinated by the team | `roadmap` in [src/data/marketing.ts](../../src/data/marketing.ts) |
| No published pricing. Plans (Essential / Family / Premium) say "Pricing on request". | [src/app/(public)/services/page.tsx](../../src/app/(public)/services/page.tsx) |
| No response-time promise after form submission | Success message in [src/lib/leads/actions.ts](../../src/lib/leads/actions.ts) |
| Privacy Policy and Terms are drafts. They are marked as such on the page and need legal review. | [src/app/(public)/privacy/page.tsx](../../src/app/(public)/privacy/page.tsx), [terms](../../src/app/(public)/terms/page.tsx) |
| Enquiries are delivered to a webhook (CRM or automation tool) until the Admin ERP exists | `LEADS_WEBHOOK_URL` |

## Out of scope for Phase 1

- Authentication, customer accounts, dashboards and portals. `/login` and `/register` render a clearly labelled "Coming in Phase 2" preview and never pretend to sign anyone in.
- Marketplace backend and real listings. `/property` shows fictional sample cards only.
- Payments, document storage, vendor and partner workflows.
- Analytics vendor integration. The event architecture is in place (see [information-architecture.md](information-architecture.md#analytics-events)), but no tracker is loaded.

## Before general launch

- [ ] Confirm the brand name and domain; set `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_SITE_URL`
- [ ] Replace the placeholder logo mark (logo.tsx, app/icon.svg, opengraph-image.tsx) and, if wanted, adjust brand colours in globals.css
- [ ] Remove the `uraavu` pattern from the brand guard in tests/content-guards.test.ts only if that name is chosen
- [ ] Set contact channels (`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_WHATSAPP`)
- [ ] Set the legal entity name and address
- [ ] Have qualified counsel review and finalise the Privacy Policy and Terms, then remove the draft notice in [legal-page.tsx](../../src/components/marketing/legal-page.tsx)
- [ ] Configure `LEADS_WEBHOOK_URL` (and `LEADS_WEBHOOK_SECRET`) and send a test enquiry end to end
- [ ] Confirm which services are genuinely operational on day one, and update `roadmap`
- [ ] Decide on analytics (consent-aware), then update the Privacy Policy
- [ ] Add a real founder story or team information to `/about` when ready (no stock or invented team members)
