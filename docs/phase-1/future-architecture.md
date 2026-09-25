# Future architecture: Layers 2–5

Phase 1 ships only the public website. This note explains how the same Next.js application grows into the full platform without a rewrite. Nothing below is implemented yet, and no empty placeholder routes exist; a unit test enforces this.

## One app, separate zones

```text
src/app/
  (public)/     Layer 1 — marketing site (today)
  (auth)/       Sign-in / registration (today: placeholders → Phase 2: real)
  portal/       Layer 2 — NRI Portal          /portal/...
  admin/        Layer 3 — Admin ERP           /admin/...
  vendor/       Layer 4 — Vendor Portal       /vendor/...
  partners/     Layer 5 — Partner Portal      /partners/...
  api/          Webhooks and integrations (payments, messaging)
```

Each zone has its own `layout.tsx` (shell, navigation, providers), so the marketing chrome never leaks into authenticated areas and vice versa. `robots.ts` already disallows `/portal`, `/admin`, `/vendor`, `/partners` and `/api/`.

**Why one app?** The zones share the domain model, design system, auth and deployment. If Admin ERP later needs independent scaling or release cadence, the same folder boundaries let it move into its own app in a monorepo, with `src/types`, `src/config` and `src/components/ui` becoming shared packages.

## Authentication and authorisation boundary

1. **Sessions.** Pick an auth provider or library in Phase 2 (for example Auth.js, Clerk or Supabase Auth). Store sessions in `HttpOnly` cookies. `/login` and `/register` in `(auth)` become the real entry points; the UI already exists.
2. **Coarse gate.** `src/proxy.ts` (Next 16's replacement for `middleware.ts`) redirects unauthenticated requests on `/portal`, `/admin`, `/vendor` and `/partners` to `/login?next=…`, and checks that the session's role may enter that zone.
3. **Fine-grained checks.** Every Server Action, Route Handler and data loader re-checks role *and* ownership. The proxy check is only a convenience, never the enforcement point.

Roles are already defined in [src/types/domain.ts](../../src/types/domain.ts):

| Role | Zone | Sees |
| --- | --- | --- |
| `customer` | `/portal` | Own properties, requests, documents, invoices |
| `family-delegate` | `/portal` | Only what the customer shares with them |
| `operations` | `/admin` | Assigned customers, requests, vendors |
| `admin` | `/admin` | Everything, with audit logging |
| `vendor` | `/vendor` | Only jobs assigned to them, with the minimum property detail needed (no documents, no other properties) |
| `professional-partner` | `/partners` | Only matters they are engaged on, with explicit customer consent |

## Domain model (starting point)

Types already used by the public site ([src/types/domain.ts](../../src/types/domain.ts)): `PropertyVisibility`, `PropertyKind`, `HealthStatus`, `ServiceRequestStage`, `PlatformRole` and `Availability`.

Suggested entities for Phase 2–3:

```text
Customer ─┬─< Property ─┬─< ServiceRequest ─┬─< Visit / Evidence (photos, video, report)
          │             │                   ├─< Quote ── Approval
          │             │                   └─< Invoice ── Payment
          │             ├─< Document (private storage, signed URLs)
          │             └── Listing (visibility: private | verified-network | public)
          ├─< FamilyDelegate (scoped permissions)
          └─< AuditEvent (who, what, when, before/after)
Vendor ──< Assignment >── ServiceRequest
Partner ──< Engagement >── Customer/Property (consent record)
Lead (from today's forms) ── converts to ── Customer
```

- **Visibility** defaults to `private` (`DEFAULT_PROPERTY_VISIBILITY`). Moving a listing to `verified-network` or `public` should be an explicit customer action, written to the audit log.
- **The request lifecycle** (`ServiceRequestStage`) is already the vocabulary of the public site's "Request → … → Invoice" chain and the 11-step journey. The Admin ERP should own it as a state machine.
- **Evidence** is attached at the time of work (timestamped), not uploaded retrospectively. This is the product's core trust promise.

## How today's pieces carry forward

| Today | Later |
| --- | --- |
| Enquiry forms → email relay (FormSubmit) and/or `LEADS_WEBHOOK_URL` | The Admin ERP gets a `Lead` table. Swap `deliverLead()` to write there; the forms don't change. |
| `WorkspacePreview`, `InspectionReport` (sample data) | The real NRI Portal overview and report views. The preview components are the visual spec. |
| `VisibilityLevels`, `VisibilityBadge`, `PropertyCard` | Listing management in the portal, and the public or verified marketplace |
| `roadmap` in [src/data/marketing.ts](../../src/data/marketing.ts) | Flip items to `available` as features launch, and the site copy updates everywhere |
| Design tokens and `components/ui` | Shared by all zones. Dense ERP views may add table and form primitives, but should reuse tokens. |
| `analytics/events.ts` catalogue and `sanitizeProps` | Extend with portal events under the same allow-list rule |
| In-memory rate limiter interface | Back it with Redis before auth endpoints exist |
| Static CSP | Nonce-based CSP for dynamic, authenticated zones |

## Suggested order

1. **Layer 3 (Admin ERP), minimal first:** leads inbox, customers, properties, requests and assignments. Operations needs this before customers can self-serve.
2. **Layer 2 (NRI Portal):** sign-in, properties, requests, approvals, evidence and invoices. The previews already define the target UX.
3. **Layer 4 (Vendor Portal):** assigned jobs, checklists, and evidence capture on mobile.
4. **Layer 5 (Partner Portal):** consent-based engagements with professionals.
