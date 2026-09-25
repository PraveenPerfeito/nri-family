# SEO

## Technical foundation

| Requirement | Implementation |
| --- | --- |
| Unique title and description | `pageMetadata()` in [src/lib/seo/metadata.ts](../../src/lib/seo/metadata.ts). Titles use the template `%s \| <brand>` (currently the working name "NRI Family Office"); the homepage title is "NRI Family Office — Your trusted team in Tamil Nadu". Descriptions are 50–160 characters. QA fails on duplicates. |
| Canonical URL | `alternates.canonical`: site origin + path. The origin is `productionUrl` in site.ts, else Vercel's production domain (`VERCEL_PROJECT_PRODUCTION_URL`, which becomes the custom domain once one is added), else localhost. |
| Pre-launch noindex | While `allowSearchIndexing` is `false` (site.ts), every response carries `X-Robots-Tag: noindex, nofollow`. robots.txt stays open so crawlers can see it. Vercel adds the same header to preview deployments. **Set it to `true` at launch.** |
| Open Graph / Twitter | Set per page: `og:url`, title, description, site name, locale `en_IN`, 1200×630 image; `summary_large_image` card. The image is referenced explicitly because a page-level `openGraph` object replaces the inherited one (the QA caught this). |
| One H1, structured headings | `PageHero` or the page renders exactly one `<h1>`. QA checks no heading level is skipped. |
| Sitemap | [src/app/sitemap.ts](../../src/app/sitemap.ts), generated from `indexableRoutes` |
| robots.txt | [src/app/robots.ts](../../src/app/robots.ts). `/login` and `/register` are *not* disallowed; they carry `noindex`, which crawlers must be able to fetch in order to see. |
| Clean URLs | Lowercase, hyphenated, no trailing slashes; `/security` → `/trust` (308) |
| Rendering | Fully static HTML: fast, and crawlable without JavaScript |
| Language | `<html lang="en-IN">` |

## Structured data (JSON-LD)

Emitted with `serializeJsonLd`, which escapes `<` to prevent script injection. It describes only what is visible on the page: no ratings, reviews, prices or claims.

| Schema | Where | Builder |
| --- | --- | --- |
| `Organization` | Every public page (layout) | `organizationJsonLd()`. `legalName` and `contactPoint` are included only when configured. |
| `WebSite` | Every public page (layout) | `websiteJsonLd()` |
| `Service` | Each of the five service pages | `serviceJsonLd()`: area served Tamil Nadu, audience NRIs |
| `FAQPage` | `/faq` only, where every question is visible | `faqJsonLd()` |
| `BreadcrumbList` | Inner pages | `breadcrumbJsonLd()`, via `PageHero` |

Validate after deployment with Google's Rich Results Test and the Schema.org validator.

## Content and keyword mapping

Written for people first. Keywords appear where they fit naturally, in titles, descriptions, H1/H2 and body copy, with no stuffing.

| Topic | Primary page |
| --- | --- |
| NRI property management Tamil Nadu / Chennai | `/` , `/property-management` |
| NRI property maintenance Chennai | `/property-care` |
| NRI property inspection | `/property-care` |
| NRI land management Tamil Nadu | `/property-care` (land inspections), `/for-nris` |
| NRI rental management Tamil Nadu | `/property-management` |
| NRI property sale assistance | `/property-transactions` |
| NRI property services / property management for NRIs | `/services` |
| NRI family assistance Tamil Nadu | `/family-assistance` |

## Checklist for new pages

- [ ] `export const metadata = pageMetadata({ title, description, path })`, with a description of 50–160 characters
- [ ] Exactly one `<h1>`; no skipped heading levels
- [ ] Added to `indexableRoutes` (sitemap) or `nonIndexedRoutes`
- [ ] Linked from at least one other page (internal linking)
- [ ] JSON-LD only for content that is actually on the page
- [ ] `npm run qa` passes (checks title, description, canonical, OG, Twitter card, JSON-LD validity and headings)

## After launch

- Submit the sitemap in Google Search Console and Bing Webmaster Tools.
- Monitor Core Web Vitals in Search Console.
- As real content becomes available, the strongest additions are a founder story, genuine case studies (with consent) and city-specific guides (for example, maintaining a vacant home in Chennai during the monsoon).
