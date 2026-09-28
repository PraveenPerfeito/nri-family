# Phase 2A: customer portal foundation (Layer 2)

The private workspace where an NRI customer signs in, adds their Tamil Nadu properties, requests services and follows every step. This is the foundation only. There is no admin, vendor or partner portal yet (see [What is not built](#what-is-not-built-in-phase-2a)).

**Status.** Built and tested. The portal has run end to end in Edge, Firefox and WebKit against a local stand-in for Supabase (real database, emulated Auth/REST; see [Testing](#testing)). The live site does not use the portal yet: `supabaseUrl` and `supabasePublishableKey` in [src/config/site.ts](../src/config/site.ts) are empty. Until they are set, `/app` redirects to `/login`, which says accounts are coming. To go live, follow [Connecting a Supabase project](#connecting-a-supabase-project), then run the [acceptance test](#acceptance-test) against the real project.

## What was built

- **Accounts** on Supabase Auth. Customers register with email and password, confirm their email address, sign in and out, and can reset a forgotten password or change it in Settings.
- **Every new account is a customer.** The roles `ADMIN`, `VENDOR` and `PARTNER` exist in the database but have no screens. Anyone who is not a customer is turned away from `/app`.
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
- **No account enumeration.** Wrong-password, reset and resend messages never reveal whether an address has an account.
- **Open-redirect protection.** `?next=` only accepts `/app…` and `/reset-password` ([src/lib/portal/redirects.ts](../src/lib/portal/redirects.ts)).
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
3. **Authentication → URL Configuration.** Set the Site URL to `https://nri-family.vercel.app` (later, the final domain). Add these Redirect URLs: `https://nri-family.vercel.app/**` and, for development, `http://localhost:3000/**`.
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
8. **First accounts** while sign-ups are closed: **Authentication → Users → Add user → Create new user**, with "Auto Confirm User" ticked. The profile is created automatically as a customer. Share the password safely and ask them to change it in Settings. "Send invitation" works too once SMTP is set up.
9. **Verify.** Run the [acceptance test](#acceptance-test) against the project. It creates two test customers and deletes them afterwards.

### Email templates

**Authentication → Email Templates.** Replace the link in each template:

| Template | Link |
| --- | --- |
| Confirm sign up | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app` |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` |
| Invite user | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password` (the invited person then chooses a password) |

### Working a request (until the operations console exists)

The team updates a request in **Table Editor → service_requests** by changing **only** `status`, one step at a time:

`SUBMITTED` → `UNDER_REVIEW` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`

`WAITING_FOR_CUSTOMER` is used when something is needed from the customer.

The triggers add the timeline event and the activity entry, and notify the customer. For "Waiting for you", the request page tells the customer the team will contact them using their profile details. Replying in the portal is not built yet.

## Running it locally

- **Without any Supabase project** (this machine has no Docker): `npm run dev:supabase` starts [scripts/local-supabase.mjs](../scripts/local-supabase.mjs) on port 54321.
  - The **database is real**: the migration runs in PGlite with the real RLS, grants and triggers.
  - **Auth and REST are small emulations** of what supabase-js uses here. Emailed links are printed in its console.
  - Then run: `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_dev_only CUSTOMER_SIGNUPS_OPEN=true npm run dev`.
  - The data lives in memory. It is a development tool, not a substitute for testing against Supabase.
- **Against a real project:** copy [.env.example](../.env.example) to `.env.local` (git-ignored) and fill in `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CUSTOMER_SIGNUPS_OPEN=true` and, for the scripts, `SUPABASE_SERVICE_ROLE_KEY`. `npm run dev` then uses that project. Never put real values in `.env.example` itself: it is committed.
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
| 1 | Create a new customer account | The real registration form. If confirmation is on, it finishes through a real confirmation link. If the project can't email test addresses yet (built-in email only reaches your team), Supabase's refusal is shown to the visitor and the test confirms the account through an admin-generated link instead, noting it in the output. Profile is `CUSTOMER` with the entered details. |
| 2 | Login | Signed-out `/app` goes to `/login`. Sign-in works. The session cookie is HttpOnly and SameSite=Lax. |
| 3 | Empty dashboard | "Set up your workspace", "No properties yet", "Nothing needs your attention"; no request numbers |
| 4–6 | Add "Chennai House", see it on the dashboard, open it | Saved as entered, owned by customer 1 |
| 7–8 | Create "Garden Maintenance", review, submit | The property is preselected; the review shows the right summary |
| 9–10 | REQ-XXXXXX created; status SUBMITTED | Number format and database row |
| 11 | Timeline contains "Request submitted" | Page and the event row (`CUSTOMER` visibility) |
| 12 | Activity contains "Service request created" | Page and the `REQUEST_CREATED` row by customer 1 |
| 13 | Notification "Your service request has been received." | Listed under Unread; `read_at` is empty |
| 14 | Logout | The request page is no longer reachable |
| 15 | Second customer | Confirmed through a real email link (links work once) |
| 16 | Customer 2 can't reach customer 1's data | Property, edit, request, activity and notification pages. A forged form (customer 1's property id submitted) is refused. Direct Data API reads, updates, deletes, inserts and a role change as customer 2 are all refused. |
| 17–18 | Back to customer 1; everything intact | Pages and rows unchanged; no injected requests |
| + | Mark as read; profile update; password reset via link; cancel a request | Each checked in the database |

**Results (28 Sept 2026):**

- Against the local stand-in: **22/22 steps pass in Edge, Firefox and WebKit**, with email confirmation on and off.
- Portal visual and accessibility QA: 930 checks, **0 failures**. It covered every portal page (populated and empty workspaces, signed out, not found) at 375, 390, 430, 768, 1024, 1280 and 1440px, checking overflow, console errors, one `<h1>`, labelled controls, and axe (WCAG 2.2 AA + best practice).
- **Against a real Supabase project: not yet run.** It needs the project from [Connecting a Supabase project](#connecting-a-supabase-project). Run it before real customers use the portal.

## Environment variables

None are needed on Vercel for the portal. Public settings live in site.ts.

| Variable | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | `.env.local` only (optional) | Point a local server at a different project; they override site.ts |
| `CUSTOMER_SIGNUPS_OPEN` | `.env.local` only (optional) | `true` shows registration locally |
| `SUPABASE_SERVICE_ROLE_KEY` | Your shell, for scripts only | Admin key for `portal-e2e.mjs` and `seed-demo.mjs`. Bypasses RLS: never in `src/`, Vercel or git |
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

- the admin ERP / operations console (Layer 3);
- vendor and professional-partner portals (Layers 4–5);
- payments and billing;
- WhatsApp, SMS and email notifications;
- document upload, OCR and the document vault;
- inspection reports and photos;
- family access and sharing;
- property health scores;
- the marketplace.

The property page lists some of these as "Coming to the platform".

## Recommended next step

First, connect the Supabase project and run the acceptance test against it. Then set up custom SMTP with the final domain, so customers can register and reset passwords.

After that, **Phase 2B: the operations console** (the first slice of Layer 3), on the same database:

- a staff role with MFA;
- a request queue with status changes (the triggers already write the timeline and notifications);
- internal notes (`INTERNAL` events already exist);
- two-way comments on a request;
- email notifications through Resend.

It needs its own review of roles and RLS before it is built. It has not been started.
