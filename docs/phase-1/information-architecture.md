# Information architecture

## Sitemap

```text
/                         Home
├── /services             Services overview + plans (pricing on request)
│   ├── /property-care
│   ├── /property-management
│   ├── /property-transactions
│   ├── /document-assistance
│   └── /family-assistance
├── /for-nris             Who we help
├── /how-it-works         11-step journey + worked example
├── /property             Secure listings preview (sample data)
├── /trust                Trust & Security (/security redirects here)
├── /about
├── /faq
├── /contact
├── /get-started          Primary conversion form
├── /privacy, /terms      Draft policies
└── /login, /register     Phase 2 entry points (noindex)
```

## Navigation

**Desktop header:** Logo · Services · For NRIs · How It Works · Property · Trust & Security · About · *Login* · **Get Started**

**Mobile header (below 1024px):** Logo · **Get Started** · menu button. Login joins the header from 640px up and is always inside the menu. The menu is a native `<dialog>`: focus is trapped, Escape and backdrop clicks close it, focus returns to the menu button, and it closes on navigation.

**Footer:** Company · Services · For NRIs · Trust · Platform, plus the tagline, optional contact details and a scope disclaimer ("We coordinate… we do not provide legal, tax, medical or other regulated professional services").

All links come from [src/config/navigation.ts](../../src/config/navigation.ts), which uses typed routes from [src/config/routes.ts](../../src/config/routes.ts). A unit test fails if any link points at a route without a page.

## Homepage section order

| # | Section | Job |
| --- | --- | --- |
| 1 | Hero + "My Family Office" preview | What, who, primary CTA |
| 2 | Problem: "Thousands of miles away…" | Recognition: who checks, handles, follows up |
| 3 | Solution: five pillars | Property, assets, documents, family, local services |
| 4 | Services: five categories | Depth, with a link to each service page |
| 5 | Trust: who/what/when/where/proof/cost + request chain | Why trust us |
| 6 | Privacy: four principles | Private by design |
| 7 | Vision: ecosystem + Available now vs Coming | The family-office idea, stated honestly |
| 8 | How it works: five steps | Process |
| 9 | Workspace preview | What the private workspace will look like |
| 10 | Sell/rent: three visibility levels | Transactions with control |
| 11 | FAQ (first six) | Objection handling |
| 12 | Closing CTA band | Convert |

## Page templates

- **Service pages** share `PageHero` → offerings grid → process or visual → `ScopeNote` → `RelatedServices` → `CtaBand`. Offerings copy lives in [src/config/services.ts](../../src/config/services.ts).
- **Content pages** (`/for-nris`, `/how-it-works`, `/trust`, `/about`, `/property`) use `PageHero` plus page-specific sections.
- **Policy pages** use `LegalPage`, which adds prose styles and a draft notice.

## Calls to action

One primary style (filled button) for the action we want, plus a secondary (outlined) and an inline ghost link. The labels are purposeful rather than decorative:

| Label | Destination | Used where |
| --- | --- | --- |
| **Get Started** | `/get-started` | Header, hero, CTA bands (the default) |
| Explore Services | `/services` | Hero secondary |
| Protect My Property | `/get-started` | Property Care |
| Tell Us What You Need | `/get-started` | For NRIs, Family Assistance, home services grid |
| Create Your Family Office | `/get-started` | How it works (register opens in Phase 2) |
| List My Property | `/get-started` | Sell/rent section, Property, Transactions |
| Request a plan | `/get-started` | Plans on `/services` |
| Contact us | `/contact` | Secondary in CTA bands, Trust, FAQ |

## Analytics events

Declarative tracking: server-rendered links carry `data-track="event"` plus `data-track-*` context. A single delegated listener ([analytics-listener.tsx](../../src/components/shared/analytics-listener.tsx)) pushes events to `window.dataLayer`. No vendor script is loaded in Phase 1.

| Event | Fired when | Context sent |
| --- | --- | --- |
| `hero_get_started_clicked` | Hero Get Started | `location` |
| `hero_explore_services_clicked` | Hero Explore Services | `location` |
| `cta_clicked` | Any other conversion CTA | `label`, `location` |
| `service_viewed` | A service page mounts | `service` |
| `service_cta_clicked` | Service card or hero CTA | `service`, `location` |
| `property_cta_clicked` | List My Property CTAs | `location` |
| `login_clicked` / `register_clicked` | Header, menu, auth pages | `location` |
| `faq_opened` | A FAQ item is expanded | `question` |
| `contact_submitted` | Contact form accepted | `category` |
| `get_started_submitted` | Get Started form accepted | `topics_count` |

**Privacy rule:** only allow-listed keys are sent (`sanitizeProps` in [events.ts](../../src/lib/analytics/events.ts)). Names, emails, phone numbers and free text never leave the form. The browser QA asserts that `dataLayer` contains no personal data after a submission.
