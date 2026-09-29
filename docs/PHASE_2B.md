# Phase 2B: admin operations console

The team's side of the platform: one place to see every service request, review it, make someone responsible, move it along, keep internal notes and send updates to the customer. It replaces the Supabase dashboard for everyday request work. It is built on Phase 2A ([PHASE_2A.md](PHASE_2A.md)) in the same app, on the same database.

**Status (29 Sept 2026).** Live at https://nri-family.vercel.app/admin. Both Phase 2B migrations are applied to the Supabase project `epqwcpckltrnhzmegtyq`, the app is deployed from `main`, and the first admin account is set up. The acceptance tests pass against the live site and the real database in Edge, Firefox and WebKit ([Tests](#13-tests)).

## 1. Purpose

A customer submits a request in their workspace. An admin then:

1. sees it in the dashboard and the request inbox;
2. opens it with the customer's and the property's details beside it;
3. reviews it and moves its status on, one allowed step at a time;
4. assigns it to a team member;
5. records internal notes the customer never sees;
6. sends the customer updates, which appear on their request timeline with a notification.

Every change is recorded in the audit trail. The customer only ever sees what is meant for them.

## 2. Architecture

```
Browser ──► Next.js on Vercel (same app as the site and the customer portal)
            │  proxy.ts: refreshes the session; signed-out /admin → /login?next=…
            │  admin layout, every admin page and every admin Server Action:
            │    requireAdmin() → role ADMIN + active team membership, or "not found"
            │  Supabase client bound to the admin's own cookie (publishable key only)
            ▼
         Supabase Postgres
            ├─ reads:  RLS policies "Admins read …" (app.is_admin()) beside the customer policies
            │          + six admin views (security_invoker, empty unless app.is_admin())
            └─ writes: five admin functions (SECURITY DEFINER), each checking app.is_admin() first
                       → Phase 2A triggers write the timeline event, activity entry and notification
```

- **No service-role key in the app.** The console works with the admin's own session, like the customer portal. The database decides what an admin may read and do.
- **Admins never write tables directly.** No table gained a write privilege. Every change goes through one of the five admin functions, which validate and apply it in one transaction.
- **Code:**
  - pages: [src/app/(admin)/admin/](../src/app/(admin)/admin/)
  - session and access: [src/lib/admin/session.ts](../src/lib/admin/session.ts) (`requireAdmin`, `getAdmin`), [src/lib/portal/session.ts](../src/lib/portal/session.ts) (`isActiveAdmin`)
  - queries: [src/lib/admin/data.ts](../src/lib/admin/data.ts); list parameters: [search.ts](../src/lib/admin/search.ts)
  - Server Actions: [src/lib/admin/actions/requests.ts](../src/lib/admin/actions/requests.ts), validation: [validation.ts](../src/lib/admin/validation.ts)
  - vocabulary and the lifecycle table: [src/lib/admin/domain.ts](../src/lib/admin/domain.ts); audit lines: [activity.ts](../src/lib/admin/activity.ts)
  - components: [src/components/admin/](../src/components/admin/)
  - database: [20260929090000_phase_2b_admin_operations.sql](../supabase/migrations/20260929090000_phase_2b_admin_operations.sql) and [20260929100000_phase_2b_admin_list_views.sql](../supabase/migrations/20260929100000_phase_2b_admin_list_views.sql)

## 3. Roles

| Role | Where | Can |
| --- | --- | --- |
| `CUSTOMER` | `/app` | Everything in Phase 2A: their own properties and requests. Can't open `/admin`. |
| `ADMIN` with an **active** team membership | `/admin` | Read every customer, property, request, timeline entry and activity entry. Change statuses, assign, write internal notes and customer updates. |
| `ADMIN` without an active membership | nowhere | Nothing. Deactivating the membership removes access at once. |
| `OPERATIONS` with an active membership | nowhere yet | Can be made responsible for requests. There is no operations workspace yet, so they can't sign in to either area. |
| `VENDOR`, `PARTNER` | nowhere | Roles exist for later phases; no screens. |

An admin is someone the owner has deliberately added, with two statements in the Supabase SQL editor. Nobody can become staff from the browser: `role` is not writable by any signed-in user, and `team_members` has no write privilege at all.

```sql
-- Make an existing account an admin (use the account's email)
update public.profiles set role = 'ADMIN' where email = 'someone@example.com';
insert into public.team_members (profile_id) select id from public.profiles where email = 'someone@example.com';

-- Add an operations team member (can be assigned requests)
update public.profiles set role = 'OPERATIONS' where email = 'someone@example.com';
insert into public.team_members (profile_id) select id from public.profiles where email = 'someone@example.com';

-- Remove someone's access (their past work stays in the audit trail)
update public.team_members set is_active = false
where profile_id = (select id from public.profiles where email = 'someone@example.com');
```

Use an account that holds no customer data. An admin account can't use the customer workspace (it is sent to `/admin`), and its own properties would appear in the console as belonging to a team member.

## 4. Route map

| Route | What it is |
| --- | --- |
| `/admin` | Dashboard: counts by status (New, Under review, Assigned, In progress, Awaiting customer, Completed), requests needing attention (new or urgent, longest waiting first), recent activity, latest requests, customer and property totals |
| `/admin/requests` | The request inbox. Search (number, title, customer name or email, property) and filters: status (or "open"), priority, service, assigned person (or unassigned), customer, property. Sort: newest, oldest, recently updated, urgent first. 25 per page. |
| `/admin/requests/[id]` | One request: details, status change, assignment, the full timeline (customer-visible and internal, each marked), internal note, message to the customer, the request's activity, the customer's contact details and other properties, and the property's details |
| `/admin/customers` | Customers: name, email, country, time zone, properties, open requests, joined date. Search by name, email or phone; filter by country, "with open requests" or "no properties yet". |
| `/admin/customers/[id]` | One customer: contact details, properties, latest requests, recent activity |
| `/admin/properties` | Properties: name, type, owner, location, status, open and total requests. Search by name, city, district or owner; filter by type and status. |
| `/admin/properties/[id]` | One property: details, owner, requests, activity |
| `/admin/team` | Team members: role, active or inactive, open and total assigned requests |
| `/admin/activity` | The audit trail. Filter by visibility (customer visible or internal), subject (requests, properties, customer accounts) and customer. |

All routes are in [src/config/routes.ts](../src/config/routes.ts) (`adminRoutes`). A test checks that each has a page and that no other admin page exists. Filters are plain GET forms: they work without JavaScript and every view can be bookmarked. Ids in URLs are validated as UUIDs; anything else is "not found".

Everything under `/admin` is `noindex`, `Cache-Control: private, no-store`, disallowed in `robots.txt` and absent from the sitemap.

## 5. Database changes

Two new, additive migrations. The Phase 2A migration is unchanged, and the live Phase 2A app works unchanged on top of both.

- [20260929090000_phase_2b_admin_operations.sql](../supabase/migrations/20260929090000_phase_2b_admin_operations.sql): everything below except the two list views. Applied in production on 29 Sept 2026.
- [20260929100000_phase_2b_admin_list_views.sql](../supabase/migrations/20260929100000_phase_2b_admin_list_views.sql): the views `admin_request_inbox` and `admin_activity_feed`, added after the first file was applied (an applied migration is never edited).

| Change | Detail |
| --- | --- |
| Role `OPERATIONS` | Added to the `profiles.role` check |
| `team_members` | One row per staff member: `profile_id`, `is_active`. A trigger only allows `ADMIN` or `OPERATIONS` profiles. |
| `request_assignments` | At most one per request: `assignee_id`, `assigned_by`, `assigned_at`. Deleted with the request or the assignee's account. |
| Timeline event types | `INTERNAL_NOTE` (must be `INTERNAL`) and `TEAM_UPDATE` (must be `CUSTOMER`), both 1–2,000 characters. Enforced by constraints, whoever writes. |
| `activity_logs.visibility` | `CUSTOMER` (default, every Phase 2A entry) or `INTERNAL` |
| Notification type | `REQUEST_UPDATE`, for updates from the team |
| Helpers (private `app` schema) | `is_admin()`, `is_active_team_member()`, `log_internal_activity()`, `admin_status_transition_allowed()` |
| Admin functions (`public`) | `admin_change_request_status`, `admin_assign_request`, `admin_unassign_request`, `admin_add_internal_note`, `admin_post_customer_update` |
| Admin views | `admin_request_status_counts`, `admin_request_inbox`, `admin_customer_overview`, `admin_property_overview`, `admin_team_overview`, `admin_activity_feed` |
| Indexes | Requests by status and date, and by date; profiles by role and date; activity by date; assignments by assignee |

The admin functions raise stable error keys (`not_authorized`, `request_not_found`, `stale_status`, `invalid_transition`, `assignment_required`, `request_closed`, `invalid_assignee`, `invalid_text`). The app turns them into plain-English messages.

## 6. Row Level Security

RLS stays on for every table. Admin access was **added beside** the customer policies (Postgres combines policies with OR), so what customers can see and do is unchanged. There is one deliberate tightening: customers now see only `CUSTOMER` activity.

| Table | Customers (Phase 2A) | Active admins (new) | Writes |
| --- | --- | --- | --- |
| `profiles` | own row | read all | unchanged; admins can't edit customers |
| `properties` | own | read all | unchanged; admins can't edit, reassign or delete |
| `service_requests` | own | read all | status only through `admin_change_request_status` |
| `service_request_events` | `CUSTOMER` events of their own requests | read all | only triggers and the admin functions |
| `activity_logs` | own, **`CUSTOMER` only** | read all | only triggers and the admin functions |
| `notifications` | own | none | only triggers and the admin functions |
| `team_members` | none | read | none through the API (the owner uses SQL) |
| `request_assignments` | none | read | only the admin functions |

- **`app.is_admin()`** is true only for a profile with role `ADMIN` **and** an active team membership, looked up from the caller's verified token (`auth.uid()`).
- **No `USING (true)`.** Every admin policy is `USING ((select app.is_admin()))`.
- **The views** are `security_invoker`, so the reader's own RLS applies, and each also filters on `app.is_admin()`. For anyone else they are empty.
- **Visitors with only the publishable key** can read none of the new tables or views and can't call the admin functions.
- The column-level grants from Phase 2A are unchanged. The new tables and views are read-only for signed-in users.

## 7. Authorization

Four layers:

1. **Proxy** ([src/proxy.ts](../src/proxy.ts)). Signed-out page loads of `/admin…` go to `/login?next=…`. This is an early redirect only; it doesn't check roles.
2. **`requireAdmin()`** in the admin layout, in **every** admin page and in **every** admin Server Action. Layouts don't re-run on client navigation, so pages and actions don't rely on the layout.
   - Signed out: redirect to sign in, then back to the page.
   - Signed in without admin rights (customers, operations staff, inactive admins): the site's ordinary "page not found". Page titles become "Page not found" too, so nothing confirms that the console exists.
   - If the membership can't be read, access is refused (fails closed).
3. **Validation in every action.** The browser sends only a reference (which request) and the admin's choice: new status, team member, text. It never sends who is acting, whose request it is, or a role. Extra fields are ignored. The acting admin comes from the session in the database (`auth.uid()`); the customer comes from the request row.
4. **The database** (section 6) checks `app.is_admin()` again on every read and every admin function.

Also:

- The customer workspace sends active admins to `/admin`. Other staff roles get "workspace unavailable".
- Sign-in lands each person in their own workspace. `?next=` now also accepts `/admin` paths, and still never another website.

## 8. Request lifecycle

The seven Phase 2A statuses. The team may move a request only along these steps. The table is `adminStatusTransitions` in [domain.ts](../src/lib/admin/domain.ts) and `app.admin_status_transition_allowed()` in the migration, and a test compares the two pair by pair (all 49 pairs).

| From | The team can move it to |
| --- | --- |
| New (`SUBMITTED`) | Under review, Cancelled |
| Under review | Assigned\*, Awaiting customer, Cancelled |
| Assigned | In progress\*, Awaiting customer, Under review, Cancelled |
| In progress | Awaiting customer, Completed, Cancelled |
| Awaiting customer (`WAITING_FOR_CUSTOMER`) | Under review, Assigned\*, In progress\*, Cancelled |
| Completed | nothing (final) |
| Cancelled | nothing (final) |

\* Needs someone assigned first. The form greys these out until then, and the database refuses them.

Each status in detail:

| Status | Who sets it | Reached from | The customer sees | Notification | Activity |
| --- | --- | --- | --- | --- | --- |
| New (`SUBMITTED`) | The customer, by submitting | (start) | "Submitted"; timeline "Request submitted" | "Your service request has been received." | `REQUEST_CREATED`, by the customer |
| Under review | Admin | New, Assigned, Awaiting customer | "Under review"; "Team review started" | "Update on REQ-…" | `REQUEST_STATUS_CHANGED`, by the admin |
| Assigned | Admin, once someone is assigned | Under review, Awaiting customer | "Assigned"; "Local team assigned" (never who) | "Update on REQ-…" | `REQUEST_STATUS_CHANGED` |
| In progress | Admin, once someone is assigned | Assigned, Awaiting customer | "In progress"; "Work in progress" | "Update on REQ-…" | `REQUEST_STATUS_CHANGED` |
| Awaiting customer | Admin | Under review, Assigned, In progress | "Waiting for you", with a note that the team will get in touch; "Waiting for your input" | "Update on REQ-…" | `REQUEST_STATUS_CHANGED` |
| Completed (final) | Admin, after confirming | In progress | "Completed"; "Request completed"; no next steps | "Update on REQ-…" | `REQUEST_STATUS_CHANGED` |
| Cancelled (final) | Admin, after confirming, from any open status; or the customer, from New or Under review | any open status | "Cancelled"; "Request cancelled" | "Update on REQ-…" when the team cancels; none when the customer does | `REQUEST_CANCELLED` |

- **Customers keep their single Phase 2A step:** cancel their own request while it is New or Under review.
- **Stale screens are refused.** The form sends the status the admin was looking at. If someone changed the request meanwhile, the change is refused ("Someone updated this request a moment ago") and the page reloads with the latest status.
- **Completing or cancelling asks for confirmation**, because both are final.
- **What each change writes**, in the same transaction, through the Phase 2A trigger:
  - a customer-visible timeline event ("Team review started", "Local team assigned", "Work in progress", "Waiting for your input", "Request completed", "Request cancelled");
  - a `REQUEST_STATUS_CHANGED` (or `REQUEST_CANCELLED`) activity entry, with the admin as the actor;
  - a notification "Update on REQ-…" for the customer.
- **Wording.** The team sees "New" and "Awaiting customer"; the customer sees "Submitted" and "Waiting for you".

## 9. Assignment lifecycle

- **Assign or reassign** to any active team member, admin or operations. The form lists them with their current open workload.
- **Remove an assignment** only while the request is not Assigned or In progress: someone must stay responsible. Reassign instead, or move the request back to Under review first.
- **Closed requests** (completed or cancelled) keep their last assignment. It can't change.
- **Assigning the same person again** changes nothing and logs nothing.
- **Every change is audited** as internal activity: `REQUEST_ASSIGNED`, `REQUEST_REASSIGNED` or `REQUEST_UNASSIGNED`, recording the request number and team member ids.
- **Customers never see who is assigned.** They see the status ("Local team assigned"). The assignment table and its activity are admin-only.
- Deleting a team member's account removes their assignments. The requests stay, unassigned.

## 10. Internal vs customer-visible

The request page has two separate forms, so a note can't reach the wrong audience by picking the wrong option:

| | Internal note | Message to the customer |
| --- | --- | --- |
| Stored as | `INTERNAL_NOTE`, visibility `INTERNAL` | `TEAM_UPDATE`, visibility `CUSTOMER` |
| Who sees it | Admins | The customer (timeline "Update from our team"), and admins |
| Activity | `INTERNAL_NOTE_ADDED`, internal | `TEAM_UPDATE_POSTED`, customer visible |
| Notification | none | "Update on REQ-…" |
| Confirmation | none | Yes: "Send this update to …?" |

How the separation is enforced:

- **The audience is fixed by the database function**, not by a choice in the form.
- **A constraint** makes `INTERNAL_NOTE` always `INTERNAL` and `TEAM_UPDATE` always `CUSTOMER`, whoever writes the row.
- **Customer RLS** returns only `CUSTOMER` events and activity. The portal's queries also ask for `visibility = CUSTOMER` explicitly.
- **Activity metadata never contains note or message text.** It holds the request number, and for assignments the team member ids.
- **The admin timeline marks every entry** "Customer visible" or "Internal". Internal notes are set apart in an amber box.

Notes and updates can't be edited or deleted, which keeps the record honest.

## 11. Notifications

In-app only, through the Phase 2A notifications table and pages. No email, WhatsApp or SMS.

| Event | Customer notification |
| --- | --- |
| The team changes the status | "Update on REQ-…": "{title} is now: {status}." (the Phase 2A trigger notifies whenever someone other than the customer changes the status) |
| The team sends an update | "Update on REQ-…": "Our team added an update to {title}." (type `REQUEST_UPDATE`) |
| Internal note, assignment | none |

## 12. Security

- **Authorization:** sections 6 and 7. Tested for customers, signed-out visitors, inactive admins and operations staff, through the pages, the Server Actions (including replaying an admin's real request) and the Data API directly.
- **Secrets.** The app uses only the publishable key. The service-role or secret key stays in `.env.local` for the test scripts, never in `src/`, Vercel, `NEXT_PUBLIC_*` variables or git. A test fails if one appears in `src/`, and the built bundle is scanned before each release.
- **Errors.** Database errors are mapped to plain English. Details never reach the page. The server log gets error codes and ids only, never note text, names, emails or tokens.
- **No destructive operations.** The console can't delete customers, properties or requests, or edit customer identity or property ownership. A test checks that admin code never writes tables directly.
- **Auditable.** Every admin change has an activity entry naming the admin, with visibility, and without values.
- **Private.** No analytics in the console; `noindex` and `no-store` throughout.

## 13. Tests

```bash
npm run check          # lint + types + all unit tests (incl. database) + build
npm run qa             # public site + signed-out /app and /admin checks
npm run qa:portal      # Phase 2A acceptance test (reads .env.local)
npm run qa:admin       # Phase 2B acceptance test (reads .env.local)
```

| Layer | Where | What it proves |
| --- | --- | --- |
| **Database** (30 new, 34 Phase 2A) | [tests/db/admin-operations.test.ts](../tests/db/admin-operations.test.ts) | Both migrations in real Postgres (PGlite): who counts as an admin; deactivation; admins read everything but can't edit identity or ownership, or delete; customers see nothing new; anonymous access denied; the 49-pair lifecycle check; stale, final and assignee rules; internal notes never visible to customers; updates visible and notified; views and counts; cascades. |
| **App layer** | [tests/admin/admin-app.test.ts](../tests/admin/admin-app.test.ts) | `requireAdmin` (signed out, not connected, customer, inactive, operations, unreadable membership); page titles; routing between the workspaces; proxy; every action refused for signed-out visitors, customers and inactive admins with nothing sent to the database; exact function arguments (never an actor or customer id); malformed ids and invalid statuses rejected; error mapping; logs without note text. |
| **Logic** | [tests/admin/admin-logic.test.ts](../tests/admin/admin-logic.test.ts) | Lifecycle rules, search sanitising, URL parameters, audit lines. |
| **Guards** | `content-guards`, `seo-and-routes`, `deployment-config` | Admin code uses no sample data and writes no tables directly; every admin action calls `requireAdmin`; no browser-supplied actor, customer or role; every admin route has a page and there are no others; `noindex` / `no-store` on `/admin`; vendor and partner areas still absent. |
| **Acceptance test** | [scripts/admin-e2e.mjs](../scripts/admin-e2e.mjs) | The journey below, in a real browser. |
| **Phase 2A regression** | `qa:portal`, `qa` | The customer journey and the public site, unchanged. |

### Acceptance test

`npm run qa:admin` creates four throwaway accounts the team's way: customer A, customer B, an admin and an operations member. It runs the journey and deletes all four at the end, along with everything they created. It never changes other records. At each step it also reads the database directly as a second opinion.

| # | Step |
| --- | --- |
| 1–4 | Customer A signs in, adds a property, submits a request (REQ number), signs out |
| 5 | Signed out, `/admin` and a request page redirect to sign-in |
| 6–7 | The admin signs in and lands on `/admin`; the dashboard shows the request |
| 8–9 | The inbox finds it by number; the request page shows the customer and the property |
| 10–11 | Assigned and In progress are not offered without an assignee; a forged status is refused by the server |
| 12–14 | New → Under review; assign to the operations member; Under review → Assigned |
| 15 | A change from a stale screen is refused |
| 16–17 | Internal note (stored `INTERNAL`); customer update (Escape cancels the confirmation without sending; then sent) |
| 18–19 | Activity records every change with the right visibility and no note text; the customer got a notification for each change |
| 20 | Customer, property and team pages |
| 20b | Every admin page at 320, 375, 390, 768, 1024, 1280 and 1440px: no horizontal scrolling, tables become cards below 768px, the mobile menu works, and axe (WCAG 2.2 AA and best practice) finds nothing |
| 22–23 | Customer A sees the new status and the update, never the internal note or who is assigned; their API access returns no internal rows and admin calls are refused |
| 24 | Customer B gets "page not found" for `/admin`, the request and the customer page, with nothing revealed |
| 25 | Customer B replaying the admin's own captured Server Action requests (and a signed-out replay) changes nothing. As a control, the same replay with the admin's session works. |
| 26 | Customer B's direct API calls are refused: all five admin functions, the new tables and views, a role change, joining the team, writing assignments or events |
| 27 | The admin completes the request (confirmed); it is final |
| 28 | Deactivating the admin removes their access to the console, the views and the functions at once |

**Results (29 Sept 2026):**

| Run | Local stand-in (both migrations) | Live site + real project |
| --- | --- | --- |
| `npm run check` (lint, types, 356 unit and database tests, build) | pass | n/a |
| `npm run qa:admin` | 30/30 in Edge, Firefox and WebKit | 30/30 in Edge, Firefox and WebKit |
| `npm run qa:portal` (Phase 2A regression) | 23/23 | 23/23 in Edge, Firefox and WebKit |
| `npm run qa` (public site; read-only on live) | 506 checks, 0 failures | 506 checks, 0 failures |

Notes from the live runs:

- **Console messages from cancelled loads.** Browsers cancel prefetches and form responses still in flight when the next page loads, and the tests move on the moment a URL changes. WebKit then logs "TypeError: Load failed" and Firefox "Error in input stream". The scripts set these two messages aside only within 5 seconds of a real cancellation; any other console or page error fails the run.
- **Cleanup after a cut-off run.** One run was cut short by a network drop on the test machine and left its four test accounts behind. They were deleted the same day and nothing else was affected. The scripts now retry cleanup, fail loudly if it doesn't finish, and remove such leftovers at the start of the next run.

## 14. Deployment steps

**Production (29 Sept 2026): steps 1–6 are done.** Both migrations are applied, the app is deployed, the first admin is set up, and the live acceptance tests pass.

Order matters. The new app code reads columns and views the migrations add, so apply them **first**. The live Phase 2A app works unchanged on the new schema.

1. **Apply the migrations, in order, each once.** Supabase → **SQL Editor** → New query → paste the whole file → Run: first `supabase/migrations/20260929090000_phase_2b_admin_operations.sql` (already done in production), then `supabase/migrations/20260929100000_phase_2b_admin_list_views.sql`. Do not use `supabase db push`: the migrations were applied in the SQL editor and aren't in the CLI's history, so `db push` would try to run them again.
2. **Check it.** In the SQL editor:
   ```sql
   select count(*) from public.team_members;                  -- 0
   select column_name from information_schema.columns
   where table_name = 'activity_logs' and column_name = 'visibility';  -- one row
   select count(*) from public.admin_request_inbox;           -- 0 (empty unless you are an admin)
   ```
3. **Deploy the app.** Push to `main`; Vercel builds and deploys. No environment variables change.
4. **Make the first admin** with the SQL in [section 3](#3-roles), using an account with no customer data.
5. **Sign in** at `/login`. You land on `/admin`.
6. **Verify** with `npm run qa:admin` against the live site: set `BASE_URL=https://nri-family.vercel.app` (the other values come from `.env.local`). It creates and deletes its own four test accounts. The customer accounts are created the team's way, so no email is sent.

**Rolling back.** The migrations are additive. To undo a bad release, redeploy the previous commit: the Phase 2A app runs on the Phase 2B schema. No database rollback is needed or provided (dropping the new tables would delete the team and assignment records).

## 15. Limitations

- **Team management is SQL only.** No screen to add, deactivate or change the role of staff (section 3).
- **Operations staff have no workspace.** They can be assigned but can't sign in to anything yet.
- **No multi-factor authentication for admins.** Out of scope for 2B. Recommended before the team grows (Supabase supports TOTP).
- **Notes and updates can't be edited or removed**, by design. A mistaken update needs a follow-up update.
- **Customers can't reply in the portal yet.** "Awaiting customer" relies on the team contacting them.
- **Search is simple substring matching.** Fine for thousands of rows; full-text or trigram search is the next step at scale.
- **Admins see all customers.** There is no per-team or per-region scoping.
- **Dates are shown in the admin's own time zone** (India time when not set). The request page shows the customer's local time alongside.
- **Deleting a customer account still deletes their whole history**, including internal notes and assignments (a Phase 2A limitation; retention needs a decision).
- **One assignee per request.** Assignment history lives in the audit trail, not a separate table.

## 16. Out of scope

Not built, and not stubbed:

- payments, invoices, accounting and payouts;
- vendor and professional-partner portals, vendor marketplace;
- property listings and transactions;
- the document vault, OCR, evidence, inspection reports and health scores;
- family access;
- WhatsApp, SMS and email automation;
- AI features;
- a mobile app;
- two-factor authentication;
- workforce management (shifts, capacity, HR).

## 17. Phase 2C handoff

What 2C (vendor operations) can build on:

- **The admin pattern:** `requireAdmin()` in every page and action, admin reads through policies beside the existing ones, and writes only through `SECURITY DEFINER` functions that check the caller first and raise stable error keys. New staff features should follow it.
- **Assignments.** `request_assignments` names the internal person responsible. Vendors should get their own table (for example `vendor_assignments`) with vendor-scoped RLS, rather than overloading this one.
- **Visibility.** Timeline events and activity already separate `CUSTOMER` from `INTERNAL`. A vendor audience would need a third value and matching policies.
- **Audit.** `app.log_internal_activity()` records internal actions; `admin_activity_feed` shows them. Keep metadata to ids and field names.
- **Team.** `team_members` plus roles `ADMIN` / `OPERATIONS`. An operations workspace would reuse the admin views, scoped to the member's own assignments.

Recommended before or with 2C:

- MFA for staff;
- a team management screen for the owner;
- customer replies on requests;
- email notifications through Resend once the domain is verified.

Each needs its own review of roles and RLS.
