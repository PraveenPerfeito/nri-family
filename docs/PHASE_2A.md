# Phase 2A: customer portal foundation (Layer 2)

The private workspace where an NRI customer signs in, adds their Tamil Nadu properties, requests services and follows every step. This is the foundation only. The team's admin console followed in Phase 2B ([PHASE_2B.md](PHASE_2B.md)); there is no vendor or partner portal yet (see [What is not built](#what-is-not-built-in-phase-2a)).

**Status (28 Sept 2026).** Live and verified. The migration is applied to the Supabase project `epqwcpckltrnhzmegtyq`, and the site is connected to it in [src/config/site.ts](../src/config/site.ts) (the project URL and publishable key; both are public by design). The [acceptance test](#acceptance-test) passed 22/22 against that real project in Edge, Firefox and WebKit. Public sign-up stays closed (`customerSignupsOpen: false`) until auth emails go out from our own domain: add customers in Supabase under **Authentication → Users → Add user**, and they sign in at `/login`.

## What was built

- **Accounts** on Supabase Auth. Customers register with email and password, confirm their email address, sign in and out, and can reset a forgotten password or change it in Settings.
- **Every new account is a customer.** The roles `ADMIN`, `VENDOR` and `PARTNER` exist in the database but have no screens in Phase 2A. Anyone who is not a customer is turned away from `/app` (since Phase 2B, active admins are sent to `/admin`).
- **Dashboard** (`/app`). A time-of-day greeting, three counts (properties, open requests, waiting for you), the latest properties, requests that need attention, and recent activity. A new workspace shows a two-step "Set up your workspace" guide.
- **Properties.** Add, view, edit and delete (only when the property has no requests). Each property page shows its requests and activity, plus the features coming later.
- **Service requests.** A guided form with four steps (property, service, details, how soon) and a review before sending. Each request gets a number (`REQ-000001`) and starts as `SUBMITTED`. Its timeline shows only events that really happened, and stages still ahead appear as "Next steps". A customer can cancel a request until the team starts on it. The list filters by All, Open and Completed and is paginated.
- **Activity.** Every change in the workspace, grouped by day in the customer's time zone.
- **Notifications** (in-app only). Split into unread and read, with "Mark as read" and "Mark all as read". The bell in the header and the count in the sidebar show unread items.
- **Profile and settings.** Customers can edit their full name, phone, country and time zone; saving logs `PROFILE_UPDATED`. Email is read-only. Settings has password change and sign-out.
- **Every page handles each state**: loading skeleton, empty, error (with retry), not found and signed out. Not-found copy: "This property may have been removed or you may not have access to it."
- **Responsive** from 320px to desktop. Phones get a bottom tab bar; larger screens a sidebar.
- **Never indexed or cached.** `noindex` everywhere under `/app`, `Cache-Control: private, no-store`, disallowed in `robots.txt`, and absent from the sitemap.
- **No sample data in the portal.** Everything shown comes from the customer's own records; a test enforces this.

## How it fits together

```
Browser ──► Next.js on Vercel
            │  proxy.ts: refreshes the session cookie; signed-out /app → /login?next=…
            │  every page and Server Action: requireCustomer() re-checks the session
            │  a Supabase client bound to the visitor's cookie (never the service-role key)
            ▼
         Supabase
            Auth: accounts, passwords (bcrypt), email links
            Postgres: Row Level Security on every table; column-level grants;
                      triggers write timeline, activity and notifications
```

- There is **no Supabase client in the browser.** All data is read and written on the server as the signed-in customer, so the session cookies can be `HttpOnly`.
- The portal pages render per request (`force-dynamic`). The public marketing pages stay fully static.
- The app has **no service-role key**. Tests fail if one appears anywhere in `src/`. The key only unlocks scripts on your own computer.

## Routes

| Route | What it is |
| --- | --- |
| `/login` | Sign in. Also carries notices (signed out, link expired, email confirmed). |
| `/register` | Create an account. When sign-ups are closed, it says access is by invitation. |
| `/forgot-password` | Ask for a reset link. The answer is the same whether or not the account exists. |
| `/reset-password` | Choose a new password (opened from the emailed link). |
| `/auth/confirm` | Landing point for email links (confirm sign-up, reset password, invitation). |
| `/app` | Dashboard |
| `/app/properties`, `/app/properties/new` | Property list; add a property |
| `/app/properties/[id]`, `/app/properties/[id]/edit` | Property detail; edit |
| `/app/requests`, `/app/requests/new` | Requests (All / Open / Completed); request a service |
| `/app/requests/[id]` | Request detail, timeline and cancel |
| `/app/activity` | Activity by day |
| `/app/notifications` | Unread and read notifications |
| `/app/profile`, `/app/settings` | Profile; password and sign-out |

All routes live in [src/config/routes.ts](../src/config/routes.ts) (`portalRoutes`, `authCallbackPath`). The account pages are in `nonIndexedRoutes`.

## Database

One migration: [supabase/migrations/20260928090000_phase_2a_customer_portal.sql](../supabase/migrations/20260928090000_phase_2a_customer_portal.sql). It creates six tables in `public`, with internal helpers in a private `app` schema that the Data API does not expose.

| Table | Holds | Key rules |
| --- | --- | --- |
| `profiles` | One per auth user: role, full name, email, phone, country, time zone | `auth_user_id` → `auth.users` (cascade). `role` defaults to `CUSTOMER` and is never writable by users. Phone, country (2-letter) and time zone are checked. |
| `properties` | A customer's properties | `owner_id` defaults to the signed-in profile. PIN code `^[1-9][0-9]{5}$`. State defaults to Tamil Nadu. `status` (`ACTIVE`/`UNDER_REVIEW`/`INACTIVE`) is set by the team only. |
| `service_requests` | Requests | `request_number` from a sequence (`REQ-000001`, never truncated). `customer_id` defaults to the signed-in profile. 9 categories, `NORMAL`/`URGENT`, 7 statuses. `property_id` is optional; the foreign key blocks deleting a property that has requests. |
| `service_request_events` | The request timeline | Written only by triggers. `visibility` is `CUSTOMER` or `INTERNAL` (internal events are never shown to customers). |
| `activity_logs` | The audit trail | Written only by triggers. `actor_id` (who did it) and `customer_id` (whose workspace). Metadata holds names of changed fields, never their values. |
| `notifications` | In-app notifications | Written only by triggers. Customers can only set `read_at`. |

Every table has CHECK constraints on its columns, foreign keys and indexes for the portal's queries: owner/customer + `created_at desc`, request timeline, entity lookups, and a partial index on unread notifications.

**Triggers** (all `SECURITY DEFINER` with an empty `search_path`):

| When | What is written, in the same transaction |
| --- | --- |
| A user signs up | Profile (always `CUSTOMER`; invalid country or time zone dropped; name falls back to the email name) + `ACCOUNT_CREATED` activity |
| Auth email changes | Profile email kept in step |
| Profile updated | `PROFILE_UPDATED` with the changed field names |
| Property added, changed or deleted | `PROPERTY_CREATED` / `PROPERTY_UPDATED` (field names) / `PROPERTY_DELETED` |
| Request created | Timeline event "Request submitted", `REQUEST_CREATED` activity (number, title, category, property), notification "Your service request has been received." |
| Request status changes | Timeline event (e.g. "Under review"), `REQUEST_STATUS_CHANGED` or `REQUEST_CANCELLED` activity, and a notification "Update on REQ-…", sent only when someone other than the customer made the change |

## Authentication

- **Supabase Auth, email and password**, via `@supabase/ssr` on the server. Sessions live in cookies that are `HttpOnly`, `SameSite=Lax` and `Secure` on HTTPS ([src/lib/supabase/config.ts](../src/lib/supabase/config.ts)). The proxy refreshes them.
- **Identity is verified on every request** with `auth.getClaims()`, which checks the token's signature, never just the cookie's presence. [src/lib/portal/session.ts](../src/lib/portal/session.ts) loads the profile and turns away anyone who is not a customer.
- **Passwords** are 10–72 characters and can't be the email address; Supabase stores them (bcrypt). Changing the password in Settings re-checks the current one first.
- **Email links** use `token_hash` links to `/auth/confirm` (see [Email templates](#email-templates)), so they work on any device. Supabase's default `?code=` links work too, in the same browser. Links work once.
- **No account enumeration.** Wrong-password messages never say which part was wrong. The password-reset and resend-confirmation forms give one answer for every outcome, including Supabase's email limit. That limit only triggers for existing accounts, so surfacing it would reveal who is a customer.
- **Open-redirect protection.** `?next=` only accepts `/app…`, `/admin…` (since Phase 2B) and `/reset-password` ([src/lib/portal/redirects.ts](../src/lib/portal/redirects.ts)).
- **Rate limits** per client address, in memory: sign-in 10 per 10 minutes, registration 5 per hour, reset and confirmation emails 5 per hour. Supabase applies its own limits on top.
- **Registration switch.** `customerSignupsOpen` in site.ts shows or hides the form and must match Supabase's "Allow new users to sign up". Keep both off until auth emails go out from our own domain.

## Authorization and security

Five layers. Any one of them alone would stop another customer's data from showing.

1. **Proxy** ([src/proxy.ts](../src/proxy.ts)): signed-out page loads of `/app` go to `/login?next=…`. This is an early check only.
2. **Every page and Server Action** calls `requireCustomer()`. Layouts don't re-run on client navigation, so the layout's check is not relied on.
3. **Queries filter by the customer's own id** as well, which also uses the indexes. Ids from the URL are validated as UUIDs first. A missing record and someone else's give the same "not found" answer, so existence is never revealed. Before a request is created, the action checks that the property belongs to the customer.
4. **Row Level Security** on all six tables:

   | Table | A customer can |
   | --- | --- |
   | `profiles` | read and update their own row |
   | `properties` | read, add, edit and delete their own |
   | `service_requests` | read their own; create one only for their own property (or none); change the status only to `CANCELLED`, only from `SUBMITTED` / `UNDER_REVIEW` |
   | `service_request_events` | read `CUSTOMER` events of their own requests |
   | `activity_logs` | read their own |
   | `notifications` | read their own; mark their own read |

5. **Column privileges.** All table privileges are revoked from `anon` and `authenticated` and granted back column by column. So even through the public Data API, a customer can never write an owner, role, status, request number, timestamp, event, activity entry or notification text. Visitors with only the publishable key can read nothing at all. Helper functions can't be called directly.

**Also in place:**

- Server-side Zod validation on every input: lengths, enums, the PIN-code format, Tamil Nadu districts, time zones, control characters stripped.
- The database checks the same rules again.
- Server Actions only accept same-origin posts.
- Error logs contain codes and ids only, never personal data.
- No analytics inside `/app`.

## Components

- **Shell:** `AppShell` (header with "Request a service", notification bell and profile) and `SidebarNav` / `MobileTabBar` ([src/components/portal/shell/](../src/components/portal/shell)).
- **UI primitives** ([primitives.tsx](../src/components/portal/ui/primitives.tsx)):
  - page header, panel, stat card and empty state;
  - saved notice, status and priority badges;
  - pagination, detail list and skeleton;
  - `ConfirmAction`, a native `<dialog>` for delete and cancel.
- **Forms:**
  - `usePortalForm` (Server Action state, client validation, focus management) and `FormStatus` / `PendingButton`;
  - `PropertyForm`, `RequestForm` (four steps and a review; pressing Enter opens the review, it never submits);
  - `ProfileForm`, `PasswordForm`;
  - the auth forms in [src/components/portal/auth/](../src/components/portal/auth).
- **Lists and timeline:** `PropertyList`, `RequestList`, `ActivityFeed` (grouped by day) and `RequestTimeline` (real events, then next steps).
- **Server side:**
  - [src/lib/portal/](../src/lib/portal): session, data, validation, domain rules, formatting, activity descriptions;
  - Server Actions in `actions/`;
  - [src/lib/supabase/](../src/lib/supabase): the only place Supabase clients are created.

## Connecting a Supabase project

1. **Create the project** at supabase.com. The Mumbai region is closest to the properties and the team.
2. **Apply the migration.** In **SQL Editor**, paste the whole migration file and run it (or `supabase db push` with the CLI). Run it once, on an empty project.
3. **Authentication → URL Configuration.**
   - Set the Site URL to `https://nri-family.vercel.app` (later, the final domain).
   - The only Redirect URL is `https://nri-family.vercel.app/**`.
   - Don't add `localhost` to the live project. Supabase then sends any other redirect to the Site URL, so email links can never land on a developer's machine. Links requested from a local server open on the live site.
4. **Authentication → Sign In / Providers → Email.**
   - Keep "Confirm email" on.
   - Set the minimum password length to 10.
   - Turn off "Allow new users to sign up" until `customerSignupsOpen` is `true`.
5. **Email templates**, below.
6. **SMTP.** Supabase's built-in email only reaches members of your Supabase team, a few messages an hour. Real customers need custom SMTP.
   - With Resend, once the domain is verified: host `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key, sender `no-reply@<your domain>`.
   - Until then, create accounts for customers yourself (step 8).
7. **Connect the site.** In **Project Settings → API Keys**, copy the Project URL and the **publishable** key (`sb_publishable_…`). Put both in the settings block of [src/config/site.ts](../src/config/site.ts) (`supabaseUrl`, `supabasePublishableKey`), then commit and push. Vercel redeploys.
   - Both values are public by design.
   - **Never** put the secret or service-role key there, in `.env.example`, in Vercel or in git.
   - Scripts use a **secret key** (`sb_secret_…`, created under API Keys) as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
   - Disable the legacy JWT-based `anon` / `service_role` keys: the site doesn't use them.
8. **First accounts** while sign-ups are closed: **Authentication → Users → Add user → Create new user**, with "Auto Confirm User" ticked. The profile is created automatically as a customer. Share the password safely and ask them to change it in Settings. "Send invitation" works too once SMTP is set up.
9. **Verify.** Run the [acceptance test](#acceptance-test) against the project. It creates two test customers and deletes them afterwards.

### Email templates

**Authentication → Email Templates.** Replace the link in each template:

| Template | Link |
| --- | --- |
| Confirm sign up | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app` |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` |
| Invite user | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password` (the invited person then chooses a password) |

### Working a request in the Supabase dashboard (fallback)

Since Phase 2B the team works requests in the admin console at `/admin` ([PHASE_2B.md](PHASE_2B.md)), which enforces the allowed steps and records who made each change. If the console is unavailable, the team can update a request in **Table Editor → service_requests** by changing **only** `status`, one step at a time:

`SUBMITTED` → `UNDER_REVIEW` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`

`WAITING_FOR_CUSTOMER` is used when something is needed from the customer.

The triggers add the timeline event and the activity entry, and notify the customer. For "Waiting for you", the request page tells the customer the team will contact them using their profile details. Replying in the portal is not built yet.

## Service request lifecycle

| Status | Set by | Customer sees | Written automatically |
| --- | --- | --- | --- |
| `SUBMITTED` | The customer, on submit | "Submitted"; next steps from Team review on | Event "Request submitted", `REQUEST_CREATED` activity, notification "Your service request has been received." |
| `UNDER_REVIEW` | The team | "Under review" | Event "Team review started", activity, notification "Update on REQ-…" |
| `ASSIGNED` | The team | "Assigned" | Event "Local team assigned", activity, notification |
| `IN_PROGRESS` | The team | "In progress" | Event "Work in progress", activity, notification |
| `WAITING_FOR_CUSTOMER` | The team | "Waiting for you", plus a note that the team will get in touch | Event "Waiting for your input", activity, notification |
| `COMPLETED` | The team | "Completed"; no next steps | Event "Request completed", activity, notification |
| `CANCELLED` | The customer (only from `SUBMITTED` or `UNDER_REVIEW`) | "Cancelled" | Event "Request cancelled", `REQUEST_CANCELLED` activity (no notification: they did it) |

- **The timeline shows only these real events.** Stages that haven't happened are listed separately as "Next steps", never styled as done.
- **A "waiting for you" pause** keeps the request's place in the stages.
- **Since Phase 2B the team changes statuses in the admin console** at `/admin`, through the same triggers, and only along the allowed steps ([PHASE_2B.md](PHASE_2B.md#8-request-lifecycle)). The [Supabase dashboard](#working-a-request-in-the-supabase-dashboard-fallback) remains a fallback.

## Running it locally

- **Without any Supabase project** (this machine has no Docker): `npm run dev:supabase` starts [scripts/local-supabase.mjs](../scripts/local-supabase.mjs) on port 54321.
  - The **database is real**: the migration runs in PGlite with the real RLS, grants and triggers.
  - **Auth and REST are small emulations** of what supabase-js uses here. Emailed links are printed in its console.
  - Then run: `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_dev_only CUSTOMER_SIGNUPS_OPEN=true npm run dev`.
  - The data lives in memory. It is a development tool, not a substitute for testing against Supabase.
- **Against a real project:** copy [.env.example](../.env.example) to `.env.local` (git-ignored) and fill in `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CUSTOMER_SIGNUPS_OPEN` (it must match the project: `false` while Supabase sign-ups are off) and, for the scripts, `SUPABASE_SERVICE_ROLE_KEY`. `npm run dev` then uses that project. Never put real values in `.env.example` itself: it is committed.
- **Sample workspace** (development projects only): `node --env-file=.env.local scripts/seed-demo.mjs --dev --email you+demo@example.com` creates one clearly labelled demo customer, and `--delete` removes it. The script refuses to run against the project in site.ts, on Vercel, or without `--dev`. It never runs by itself.

## Testing

| Layer | Where | What it proves |
| --- | --- | --- |
| **Database** (34 tests) | [tests/db/portal-rls.test.ts](../tests/db/portal-rls.test.ts) | The real migration in PGlite behind a Supabase shim ([supabase-shim.sql](../tests/db/supabase-shim.sql)): sign-up profiles, own-row access, cross-customer denial on every table, column privileges (no role, owner, status or request-number writes), request numbering, the create → event + activity + notification transaction, the cancel rules, internal events hidden, read-only timeline/activity/notifications, anonymous access denied, and account deletion cascading cleanly. |
| **App layer** (26 tests) | [tests/portal/portal-app.test.ts](../tests/portal/portal-app.test.ts) | With a recording fake Supabase client: the session gate (not connected, signed out, non-customer), proxy redirects and headers, HttpOnly cookie flags, and the Server Actions. Inserts never carry an owner or status; updates are scoped to the customer; the ownership pre-check on requests; no account enumeration; no off-site redirects. |
| **Logic** (31 tests) | [tests/portal/portal-logic.test.ts](../tests/portal/portal-logic.test.ts) | Validation schemas, `safeNextPath`, next-step stages (including "waiting for you"), dates and greetings in the customer's time zone, and activity lines. |
| **Guards** | `content-guards`, `deployment-config`, `seo-and-routes` | No service-role key or JWT in `src/`; Supabase clients only in `src/lib/supabase`; portal code never imports sample data; the portal key in site.ts is publishable; every portal route has a page; the portal is rendered per request, `noindex` and absent from the sitemap and robots. |
| **Browser QA** | [scripts/qa.mjs](../scripts/qa.mjs) | Also checks the account pages, and that signed-out `/app` pages redirect to `/login` with `noindex` and `no-store`. |
| **Acceptance test** | [scripts/portal-e2e.mjs](../scripts/portal-e2e.mjs) | The full journey below, in a real browser, against a running app and a real (or stand-in) project. |

```bash
npm run check                        # lint + types + all unit tests + build
npm run qa                           # public site + signed-out portal checks
npm run build && npm start           # the app on :3000, using .env.local
npm run qa:portal                    # acceptance test in another terminal (reads .env.local)
```

### Acceptance test

`scripts/portal-e2e.mjs` runs the Phase 2A checklist, then a few more everyday flows. At each step it checks the page and, with the admin key, reads the database directly as a second opinion.

| # | Step | Checked |
| --- | --- | --- |
| 1 | Create a new customer account | **Registration closed (the live setting):** the page says so, Supabase refuses a direct sign-up (`signup_disabled`), and the account is created the team's way (admin, auto-confirmed). **Registration open:** the real registration form. If confirmation is on, it finishes through a real confirmation link. If the project can't email test addresses yet (built-in email only reaches your team), Supabase's refusal is shown to the visitor and the test confirms the account through an admin-generated link instead, noting it in the output. Profile is `CUSTOMER` with the entered details. |
| 2 | Login | Signed-out `/app` goes to `/login`. Sign-in works. The session cookie is HttpOnly and SameSite=Lax. |
| 3 | Empty dashboard | "Set up your workspace", "No properties yet", "Nothing needs your attention"; no request numbers |
| 4–6 | Add "Chennai House", see it on the dashboard, open it | Saved as entered, owned by customer 1 |
| 7–8 | Create "Garden Maintenance", review, submit | The property is preselected; the review shows the right summary |
| 9–10 | REQ-XXXXXX created; status SUBMITTED | Number format and database row |
| 11 | Timeline contains "Request submitted" | Page and the event row (`CUSTOMER` visibility) |
| 12 | Activity contains "Service request created" | Page and the `REQUEST_CREATED` row by customer 1 |
| 13 | Notification "Your service request has been received." | Listed under Unread; `read_at` is empty |
| 14 | Logout | The request page is no longer reachable |
| 15 | Second customer | Confirmed through a real email link (links work once), or created the team's way while sign-ups are closed |
| 16 | Customer 2 can't reach customer 1's data | Property, edit, request, activity and notification pages. A forged form (customer 1's property id submitted) is refused. Direct Data API reads, updates, deletes, inserts and a role change as customer 2 are all refused. |
| 17–18 | Back to customer 1; everything intact | Pages and rows unchanged; no injected requests |
| + | Mark as read; profile update; password reset via link (links work once); forgot-password gives the identical answer for an existing and an unknown address; cancel a request | Each checked in the database |

**Results (28 Sept 2026):**

- Against the local stand-in: **22/22 steps pass in Edge, Firefox and WebKit**, with email confirmation on and off.
- Portal visual and accessibility QA: 930 checks, **0 failures**. It covered every portal page (populated and empty workspaces, signed out, not found) at 375, 390, 430, 768, 1024, 1280 and 1440px, checking overflow, console errors, one `<h1>`, labelled controls, and axe (WCAG 2.2 AA + best practice).
- **Against the real Supabase project: 22/22 in Edge, Firefox and WebKit.** Supabase refused to email the test addresses (its built-in email only reaches the team, and it rejects `example.net`), so step 1 confirmed those accounts through admin-generated links, as designed.

## Environment variables

None are needed on Vercel for the portal. Public settings live in site.ts.

| Variable | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | `.env.local` only (optional) | Point a local server at a different project; they override site.ts |
| `CUSTOMER_SIGNUPS_OPEN` | `.env.local` only (optional) | `true` shows registration locally |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, for scripts only | A Supabase secret key (`sb_secret_…`), the admin key for `portal-e2e.mjs` and `seed-demo.mjs`. Bypasses RLS: never in `src/`, Vercel or git |
| `RESEND_API_KEY`, `LEADS_WEBHOOK_*` | Vercel (unchanged from Phase 1) | Enquiry emails |

## Known limitations

- **Email.** Until custom SMTP is set up with a verified domain, Supabase can only email your own team. So sign-ups stay closed and password-reset emails won't reach customers; the team creates accounts.
- **No operations console.** The team works requests in the Supabase dashboard ([how](#working-a-request-until-the-operations-console-exists)).
- **No replies on requests.** Customers can't comment yet (the `CUSTOMER_COMMENT` event type is reserved). "Waiting for you" says the team will get in touch.
- **Notifications are in-app only.** No email or WhatsApp yet.
- **Rate limits are in memory, per server instance**, like the enquiry forms. Supabase's own auth limits count all requests from Vercel's servers together.
- **Soft "not found".** Pages stream behind a loading state, so a missing or someone else's record shows the not-found page with `noindex` but HTTP 200 (see Next's `loading.js` docs).
- **CSP.** The portal still uses the site's static CSP (`'unsafe-inline'` scripts). A nonce-based policy for `/app` is the next hardening step.
- **Not yet available:**
  - two-factor sign-in;
  - changing the email address;
  - avatars (the column exists);
  - customers changing a property's status (the team sets it);
  - customer-initiated account deletion (via the team).
- **Deleting a property** is only possible while it has no requests.
- **Deleting an account removes everything**, including its activity. Keeping an audit trail after deletion is a decision for a later phase.
- **Request numbers** are unique and increasing, but a failed insert can skip a number.
- **Sign-out is per device.** "Sign out everywhere" isn't offered.

## What is not built in Phase 2A

Intentionally out of scope, and not stubbed:

- the admin ERP / operations console (Layer 3; its first slice came in Phase 2B);
- vendor and professional-partner portals (Layers 4–5);
- payments and billing;
- WhatsApp, SMS and email notifications;
- document upload, OCR and the document vault;
- inspection reports and photos;
- family access and sharing;
- property health scores;
- scheduled visits and inspections;
- the marketplace.

The property page lists some of these as "Coming to the platform".

The prompt's sample dashboard showed a health score ("92 / 100") and an "Upcoming: Next inspection" panel. Neither is shown, because nothing in Phase 2A produces that data, and the portal must not show invented data (§19, §51). They arrive with inspections and service reports (Phase 2D).

## Future phases

| Phase | Scope |
| --- | --- |
| 2B | Admin operations: request queue, statuses, assignment, internal notes, customer updates. **Built** ([PHASE_2B.md](PHASE_2B.md)); staff MFA is still to do. |
| 2C | Field operations and evidence: visits, photos, videos and documents, reviewed and explicitly shared. **Built** ([PHASE_2C.md](PHASE_2C.md)) |
| 2D | Service reports: visit reports |
| 2E | Approvals and payments |
| 2F | Documents |
| 2G | Rental management |
| 2H | Property transactions |
| 3 | The full operations ERP |

The schema is ready for them without a rewrite:
- roles exist on profiles;
- timeline events have `INTERNAL` visibility and a `CUSTOMER_COMMENT` type;
- activity entries separate the actor from the workspace;
- notifications and activity reference entities by type and id.

## Recommended next step

First, connect the Supabase project and run the acceptance test against it. Then set up custom SMTP with the final domain, so customers can register and reset passwords.

After that, **Phase 2B: the operations console** (the first slice of Layer 3), on the same database. **Built on 29 Sept 2026: see [PHASE_2B.md](PHASE_2B.md).** The original plan was:

- a staff role with MFA;
- a request queue with status changes (the triggers already write the timeline and notifications);
- internal notes (`INTERNAL` events already exist);
- two-way comments on a request;
- email notifications through Resend.

It needs its own review of roles and RLS before it is built. It has not been started.
