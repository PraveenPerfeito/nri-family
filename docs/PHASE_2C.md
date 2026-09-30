# Phase 2C: field operations and evidence

> You live abroad. We take care of what you own in Tamil Nadu, and you can see the proof.

Phase 2C turns a request into tracked local work with proof: the team schedules a visit, records it as it happens, uploads photos, videos and documents, reviews them, and explicitly shares the approved ones with the customer, who sees them on their request. It extends the Phase 2A portal and the Phase 2B console; nothing from those phases was rewritten.

## 1. Purpose

```text
Request → review → assignment (Phase 2B) → visit scheduled → work started → execution notes
        → evidence uploaded → reviewed → explicitly shared → the customer sees the proof → request completed
```

- **Field work ("visit")**: one visit carries out a request, done by the request's assignee.
- **Evidence**: photos, videos and PDF documents, each tagged Before, During, After or General.
- **Proof for the customer**: only evidence that an admin has approved and then chosen to share. Everything else stays internal.

## 2. Architecture

Same modular monolith as before. There is no new service, backend, auth system or route group.

| Part | Where |
| --- | --- |
| Database: tables, RLS, Storage bucket and policies, admin functions | [supabase/migrations/20260930090000_phase_2c_field_operations.sql](../supabase/migrations/20260930090000_phase_2c_field_operations.sql) |
| Vocabulary (mirrors the SQL): visit lifecycle, file types, limits, completion rule | [src/lib/field-ops/domain.ts](../src/lib/field-ops/domain.ts) |
| India-time scheduling and display | [src/lib/field-ops/schedule.ts](../src/lib/field-ops/schedule.ts) |
| File checks: contents (magic bytes), EXIF capture time, file names | [src/lib/field-ops/files.ts](../src/lib/field-ops/files.ts) |
| Browser-side file preparation and upload | [src/lib/field-ops/photo.ts](../src/lib/field-ops/photo.ts) |
| Evidence file redirect (authorise, then sign) | [src/lib/field-ops/evidence-files.ts](../src/lib/field-ops/evidence-files.ts) |
| Admin Server Actions | [src/lib/admin/actions/field-work.ts](../src/lib/admin/actions/field-work.ts), [src/lib/admin/actions/evidence.ts](../src/lib/admin/actions/evidence.ts) |
| Admin UI: Field work and Evidence panels on the request page, dashboard panel | [src/components/admin/requests/](../src/components/admin/requests/) |
| Customer UI: service visit card, evidence gallery, timeline entries | [src/components/portal/requests/](../src/components/portal/requests/) |
| Evidence file routes | `src/app/(portal)/app/requests/[id]/evidence/[evidenceId]/route.ts`, `src/app/(admin)/admin/requests/[id]/evidence/[evidenceId]/route.ts` |

The design rules from Phase 2B still hold:

- Admins read through RLS policies gated by `app.is_admin()`.
- Admins write only through `SECURITY DEFINER` `admin_*` functions, which check `app.is_admin()` first and raise stable error keys.
- Every page, Server Action and file route checks who is asking itself.
- The service-role key is never in the app.

## 3. Roles

| Who | What they can do in Phase 2C |
| --- | --- |
| **Admin** (role `ADMIN` plus an active team membership) | Schedule, start, record, complete and cancel visits. Upload evidence, then approve, reject and share it. See every visit and all evidence, internal records included. |
| **Operations** (team member, role `OPERATIONS`) | Can be the assignee who carries out the visit. **No interface in Phase 2C**: admins record the work for them (see Limitations). |
| **Customer** | See the visits of their own requests, and the evidence shared with them. They can't upload, review or share anything. |
| **Signed out** | Nothing. |

The team member who does the work is the request's **assignee** (Phase 2B `request_assignments`). There is no second assignee model.

## 4. Route map

No new pages. `adminRoutes` and `portalRoutes` are unchanged, and the tests still refuse extra pages. Two new file routes, listed as `evidenceFileRoutes` in [routes.ts](../src/config/routes.ts), are route handlers, not pages:

| Route | Who | Answer |
| --- | --- | --- |
| `/app/requests/[id]/evidence/[evidenceId]` | The request's customer, only for evidence shared with them | `302` to a short-lived signed link; otherwise `404` |
| `/admin/requests/[id]/evidence/[evidenceId]` | Active admins, any evidence of that request | `302` to a short-lived signed link; otherwise `404` |

Everything else gets the same plain `404`: signed-out visitors (the proxy sends page loads to sign-in), other customers, rejected or internal evidence, tampered or malformed ids. Both routes send `Cache-Control: private, no-store`.

## 5. Database changes

One additive migration, `20260930090000_phase_2c_field_operations.sql`. No earlier migration was edited.

**Tables** (all with RLS; no write privileges for the API roles):

| Table | Holds | Read by |
| --- | --- | --- |
| `field_work` | One visit: status, scheduled start and end, started, completed and cancelled times, and the customer's "service notes" (`summary`). Everything in it may be shown to the request's customer. | The request's customer (own rows); admins |
| `field_work_internal` | Instructions for the team, execution notes | Admins only |
| `request_evidence` | One piece of evidence: kind, stage, title, description, file type and size, capture time, review status, visibility, published time | The customer, **only** when `APPROVED` and `CUSTOMER_VISIBLE` and theirs; admins |
| `request_evidence_internal` | Storage path, the file's fingerprint when registered (Storage's eTag), original file name, uploader, reviewer, review time and reason, publisher | Admins only |

Why internal data has its own tables: admins and customers both use the `authenticated` role, so column grants can't tell them apart. Separate tables with their own RLS can.

**Constraints** (whoever writes):

- `request_evidence_visibility_check`: `visibility = 'INTERNAL' or review_status = 'APPROVED'`. Pending and rejected evidence can never be customer-visible.
- `request_evidence_published_check`: customer-visible if and only if `published_at` is set.
- `request_evidence_file_check`: kind and MIME type agree (`PHOTO` JPEG/PNG/WebP, `VIDEO` MP4, `DOCUMENT` PDF), with size limits of 10 MB, 50 MB and 20 MB.
- `field_work_timestamps_check`: the timestamps always agree with the status. Every branch is true or false, never null.
- `field_work_window_check`: the end is after the start and within 24 hours. `field_work_summary_status_check`: service notes only on a completed visit.
- `field_work_one_open_visit_idx`: a unique partial index allowing at most one visit per request that is not cancelled.
- Guard triggers take the customer from the request, stop a visit or piece of evidence moving to another request, and link evidence only to a visit of its own request.
- Event visibility is fixed by type (`service_request_events_field_ops_visibility_check`, next to the Phase 2B constraints).

**Functions** (`public`, `SECURITY DEFINER`, admins only, executable by `authenticated`; not by `anon`):

- Visits: `admin_schedule_field_work`, `admin_reschedule_field_work`, `admin_start_field_work`, `admin_record_field_work_notes`, `admin_complete_field_work`, `admin_cancel_field_work`.
- Evidence: `admin_add_evidence`, `admin_approve_evidence`, `admin_reject_evidence`, `admin_publish_evidence`.
- `admin_change_request_status` was replaced with the same signature, so its grants are kept. Only one thing changed: the completion rule in §11. The admin check, the stale-screen check, the lifecycle and the Phase 2B active-assignee rule are exactly as before.
- Helpers in `app` (not exposed by the Data API):
  - `field_work_transition_allowed`, and `evidence_kind` / `_extension` / `_max_bytes` / `_object_path`, all mirrored in `domain.ts` and compared by tests;
  - `assert_field_work_allowed`, `assert_valid_schedule`, `visit_window`, `add_customer_event`;
  - the three Storage policy helpers (§6).
- A trigger on `service_requests` cancels any open visit when a request is cancelled.

**Other additions:**

- Event types `FIELD_WORK_SCHEDULED`, `FIELD_WORK_RESCHEDULED`, `FIELD_WORK_STARTED`, `FIELD_WORK_COMPLETED`, `FIELD_WORK_CANCELLED` and `EVIDENCE_AVAILABLE`.
- Notification types `VISIT_UPDATE` and `EVIDENCE_AVAILABLE`.
- Indexes for the request page, the customer's shared evidence, the pending-review queue and the dashboard.

## 6. Row Level Security

| Table / object | Customer | Admin | Anonymous |
| --- | --- | --- | --- |
| `field_work` | own requests' visits | all | no access |
| `field_work_internal` | none | all | no access |
| `request_evidence` | own, `APPROVED` and `CUSTOMER_VISIBLE` only | all | no access |
| `request_evidence_internal` | none | all | no access |
| Storage `request-evidence`: read | files of their own shared evidence, while unchanged since registration | all files (registered ones only while unchanged) | none |
| Storage: create an upload link | none | open requests only, unused evidence id, accepted name, one file per id | none |
| Storage: overwrite | none | none (there is no UPDATE policy) | none |
| Storage: delete | none | only files never registered as evidence | none |

- No `USING (true)` anywhere.
- The Storage policies call four `SECURITY DEFINER` helpers: `app.can_upload_evidence_file`, `app.can_read_published_evidence_file`, `app.evidence_file_intact` and `app.can_remove_evidence_file`. They are needed because the policies must look at the internal tables, which customers can't read.
- **Registered files are served only while unchanged.** Storage can issue upload links that allow overwriting (anyone allowed to get an upload link can ask for one; the console never does). So registration records Storage's fingerprint of the file (eTag), and both read policies require the current file to match it. A file replaced after registration is never shown, to the team or the customer.
- The Phase 2A and 2B policies are unchanged.

## 7. Authorization

- **Server Actions:** `requireAdmin()` in every action (a content guard enforces it). The browser sends only ids (request, visit, evidence) and the admin's own input: dates, times, text, stage, title and file type. The customer, the uploader, the review state and the visibility are never read from the browser. Injected fields are ignored, and a test and the acceptance test prove it.
- **File routes:** `getCustomer()` / `getAdmin()` first (the same checks as `requireCustomer()` / `requireAdmin()`, answering `404` instead of redirecting). Then an RLS query with explicit filters: own request, this evidence, `APPROVED`, `CUSTOMER_VISIBLE`. Only then is a signed link created, as the viewer, so the Storage policy decides again.
- **Database:** every `admin_*` function checks `app.is_admin()` first. Deactivating an admin revokes everything at once, file links included (acceptance test step 23).

## 8. Field work lifecycle

`NOT_SCHEDULED` means there is no visit yet. The table is `fieldWorkTransitions` in [domain.ts](../src/lib/field-ops/domain.ts) and `app.field_work_transition_allowed()` in SQL, compared pair by pair (all 25 pairs).

| From | To |
| --- | --- |
| Not scheduled | Scheduled |
| Scheduled | Scheduled (reschedule), In progress, Cancelled |
| In progress | Completed, Cancelled |
| Completed | nothing (final) |
| Cancelled | nothing (final; a new visit can be scheduled instead) |

Rules the database enforces:

- **Scheduling and starting** need the request to be Assigned, In progress or Awaiting customer (not New, Under review, Completed or Cancelled), and an **active** assignee (`app.is_active_team_member`, the Phase 2B rule). Otherwise the errors are `request_not_ready`, `assignment_required` or `request_closed`.
- **Scheduling:** from today onwards in India time, within a year; an optional end time later the same day. There is at most one visit per request that isn't cancelled.
- **Starting** records the start time and moves the request to **In progress**, if it isn't already, through the normal status change. The customer sees "Work in progress" and gets the usual notification.
- **Execution notes** (internal) can be recorded while the visit is in progress or after it, while the request is open.
- **Completing** records the completion time and optional **service notes**, which the customer sees. The request stays open for evidence review.
- **Cancelling** needs the status the admin was looking at (a stale screen is refused). Cancelling the request cancels its open visit automatically.
- **Stale screens and double clicks:** each step checks the visit's current state, so a repeated or stale action is refused with "This visit was updated a moment ago". The page refreshes and the message is shown at panel level.

## 9. Evidence lifecycle and visibility

```text
upload → PENDING_REVIEW + INTERNAL
       → APPROVED + INTERNAL          (approve)
       → APPROVED + CUSTOMER_VISIBLE  (share with the customer: explicit, confirmed)
       ↘ REJECTED + INTERNAL          (reject, from waiting or approved-not-shared; kept, never shown)
```

- **Review state and visibility are separate.** Approving does not share. Sharing is its own confirmed step ("Share this with the customer?").
- **Rejected evidence is never deleted.** It stays, internal, with the reason (internal) and the reviewer, for the audit trail.
- **Shared evidence can't be rejected or withdrawn from the console.** See Limitations.
- **A replaced file can't be approved or shared** (`evidence_file_changed`): the file must still match the fingerprint recorded when it was added (§6).
- **Repeating a step changes nothing:** approving again, sharing again or registering the same upload again.
- **The customer sees:** the title, description, stage, when it was taken (if known) and when it was shared. They never see file names, storage paths, uploaders, reviewers, reasons or internal notes.
- **One timeline entry and one notification per batch:** while the latest customer-visible entry is already "New evidence shared" and the notification is unread, sharing more adds nothing new for the customer. The activity log records every share.

## 10. Storage and file links

- **Bucket:** `request-evidence`.
  - **private** (`public = false`); there are no public URLs, and a test refuses a public bucket;
  - 50 MB limit (the Free plan's per-file maximum);
  - accepted types: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `application/pdf`.
- **File names:** `<request id>/<evidence id>/original.<ext>`. Only ids and the type, so the name reveals nothing. The path is kept in `request_evidence_internal.storage_path`.
- **Upload, in two steps**, straight from the admin's browser to Storage (never through this app's server, which has a 4.5 MB request limit on Vercel):
  1. `prepareEvidenceUpload`: the server picks the evidence id and file name, and Supabase signs a one-time upload link. It signs only after the Storage INSERT policy agrees: an active admin, an open request, an unused id, an accepted name.
  2. The browser uploads with progress. Photos are first redrawn at no more than 2,560 px and saved as JPEG, which drops EXIF data, including any GPS location. The capture time is read from EXIF first; with no offset recorded, India time is assumed.
  3. `finishEvidenceUpload`: the server reads the stored file's **first 16 bytes** and checks they match the type (JPEG/PNG/WebP/MP4 signatures, `%PDF-`; QuickTime is refused). A disguised file is removed and refused. Then `admin_add_evidence` reads the file's real type, size and fingerprint (eTag) **from Storage's own record** (not from the browser) and registers it as `PENDING_REVIEW`, `INTERNAL`, with the signed-in admin as uploader. From then on the file is served only while it matches that fingerprint (§6).
- **Viewing:** pages link to the app's own evidence routes (§4). Each request is authorised, then redirected to a signed link valid for **5 minutes** (photos, PDFs) or **30 minutes** (videos, so playback and seeking keep working). Pages never contain signed links, and images never go through the Next.js image optimiser, which would cache them. Tests check both.
- **Content Security Policy:** `/app` may show images and video from the Supabase origin, and `/admin` may also upload to it. The public site's policy is unchanged. See [next.config.ts](../next.config.ts).
- **Free plan quota:** 1 GB of Storage in total. Photos are resized, and videos are capped at 50 MB each.

## 11. Completing a request

Clicking "Completed" is not enough for a request that had field work. `admin_change_request_status` refuses `COMPLETED`:

| When | Error, shown as |
| --- | --- |
| A visit is still Scheduled or In progress | `field_work_open`: "Finish or cancel the field work before completing the request." |
| Any evidence is waiting for review | `evidence_pending`: "Review every piece of evidence before completing the request." |
| A visit was completed but no evidence has been shared | `evidence_required`: "Share at least one piece of evidence with the customer before completing the request." |

- The status form greys out "Completed" with the reason. The same check lives in `completionBlocker()` in [domain.ts](../src/lib/field-ops/domain.ts), and a test compares it with the database.
- A request without field work (for example document assistance) completes exactly as in Phase 2B. Cancelled visits don't count.
- Once a request is completed or cancelled, nothing about its visits or evidence can change: no scheduling, notes, uploads, reviews or sharing (`request_closed`, and the Storage upload policy agrees).

## 12. Times and time zones

- Field work happens in Tamil Nadu, so visits are **entered and checked in India time** (Asia/Kolkata, UTC+05:30 all year, no daylight saving). A date and clock time there is exactly one instant.
- Stored as `timestamptz` (UTC). The admin console shows visit times in India time, labelled "India time".
- **Customers** see the India time and the same window in their own time zone, for example "Tue, 6 Oct 2026, 10:00–12:00 India time (08:30–10:30 in Dubai)". When the window crosses midnight in their zone, both days are named.
- "Today" for scheduling is today's date in India. Start and completion times are when the admin recorded them.

## 13. Timeline, activity and notifications

| Step | Customer timeline | Customer notification | Activity (all internal) |
| --- | --- | --- | --- |
| Visit scheduled | "Service visit scheduled" + time | "Visit scheduled for REQ-…" | `FIELD_WORK_SCHEDULED` |
| New time | "Service visit rescheduled" + time | "Visit rescheduled for REQ-…" | `FIELD_WORK_RESCHEDULED` |
| New instructions only | — | — | `FIELD_WORK_UPDATED` |
| Work started | "Work in progress" (the status change) | "… is now: In progress." | `FIELD_WORK_STARTED` (+ internal timeline entry) |
| Notes recorded | — | — | `FIELD_WORK_NOTES_RECORDED` |
| Visit completed | "Service visit completed" + service notes | "Visit completed for REQ-…" | `FIELD_WORK_COMPLETED` |
| Visit cancelled | "Service visit cancelled" | "Visit cancelled for REQ-…" | `FIELD_WORK_CANCELLED` |
| Request cancelled with a visit open | (the request's own "Request cancelled") | (the request's own) | `FIELD_WORK_CANCELLED`, reason `request_cancelled` |
| Evidence uploaded / approved / rejected | — | — | `EVIDENCE_UPLOADED` / `_APPROVED` / `_REJECTED` |
| Evidence shared | "New evidence shared" (one per batch) | "New evidence on REQ-…" (one while unread) | `EVIDENCE_PUBLISHED` |

- Activity metadata holds the request number, visit and evidence ids, and the evidence's kind and stage. It never holds notes, instructions, reasons, titles, file names or links. Tests check this.
- Phase 2C's customer-visible timeline entries carry no author (`created_by` is null), so no team member's id reaches the customer. The acting admin is in the internal activity entry beside it.
- Notifications stay in-app only: no email, SMS or WhatsApp.

## 14. Security summary

| Threat | Control |
| --- | --- |
| A customer reads another customer's visit or evidence (IDOR) | RLS on `customer_id`; the portal queries filter by the customer too; file routes answer `404`; Storage SELECT policy on the file's own evidence |
| A customer sees pending, rejected or internal evidence | RLS requires `APPROVED` + `CUSTOMER_VISIBLE`; a constraint makes non-approved evidence always `INTERNAL`; the portal query repeats the filters |
| Internal notes, instructions, reasons, paths or staff ids reach a customer | Kept in `*_internal` tables (admins only); customer queries name their columns; content guards; the acceptance test searches every customer page |
| Tampered ids, visibility, review state, uploader or customer | The browser sends ids and choices only; the database derives the rest; replays with injected fields prove it |
| Guessing file paths, or reaching Storage directly | A private bucket; RLS on `storage.objects`; signed links only after authorisation; no link without a token works |
| A disguised or dangerous file | Bucket MIME allow-list; server check of the first bytes; database check of Storage's recorded type and size; photos re-encoded; no SVG/HTML/executables |
| Overwriting or deleting evidence | No UPDATE policy; a file replaced anyway (an overwriting upload link) no longer matches its registered fingerprint and is never served; DELETE only for never-registered uploads; SQL deletes are blocked by Supabase's `protect_delete` |
| Stale screens and double submissions | Every step checks the current state; idempotent approve, share and register; one open visit per request (a unique index) |
| An inactive team member does the work | `assignment_required` on schedule and start; the page shows "(no longer active)" |
| An inactive admin | `app.is_admin()` everywhere; file routes `404` at once |

## 15. Tests

- **Database** ([tests/db/field-operations.test.ts](../tests/db/field-operations.test.ts), 37 tests, the real migrations in PGlite with Supabase's Storage tables and the delete guard), covering:
  - the TS/SQL mirrors;
  - scheduling rules (status, active assignee, India-time dates, one visit);
  - rescheduling, starting (the request moves to In progress, and the start is internal), completing, cancelling, and invalid transitions;
  - the cascade on request cancellation;
  - timestamp constraints;
  - upload registration, from Storage's own type and size;
  - the Storage INSERT, SELECT and DELETE policies and no overwrites;
  - review and publish, with batching;
  - the constraint backstops;
  - isolation between customers A and B;
  - the completion rule;
  - closed requests;
  - cascades on account deletion.
- The Phase 2A and 2B database tests (66) run on top, unchanged.
- **Application** ([tests/admin/field-ops-app.test.ts](../tests/admin/field-ops-app.test.ts), 62 tests), covering:
  - who may call each action (signed out, customer, inactive admin);
  - exactly what reaches the database and Storage;
  - validation;
  - the content check and removal of disguised uploads;
  - error messages and refreshes;
  - both file routes.
- **Logic and guards** ([tests/field-ops-logic.test.ts](../tests/field-ops-logic.test.ts)), covering:
  - file signatures, EXIF, India-time helpers and the vocabulary;
  - route handlers only, with guards first;
  - no internal tables in customer code, no signed links in pages, no image optimiser, a private bucket;
  - the CSP (in [tests/deployment-config.test.ts](../tests/deployment-config.test.ts)).
- **Acceptance test** `npm run qa:field-ops` ([scripts/field-ops-e2e.mjs](../scripts/field-ops-e2e.mjs)), described below.
- **Regression:** `npm run qa:portal` (Phase 2A), `npm run qa:admin` (Phase 2B) and `npm run qa` (public site) are unchanged and must still pass.

### Acceptance test

Five throwaway accounts (`nfo-2c-e2e-<run>-{a,b,admin,ops,ops2}@example.net`) and generated files (a drawn "SAMPLE" photo, a one-line PDF, a one-second synthetic video in [scripts/fixtures/](../scripts/fixtures/)). At the end their evidence files are removed from Storage and the accounts are deleted; leftovers from an interrupted run are removed on the next run, after 30 minutes. The steps:

0. schema and private bucket;
1. customer A adds a property and a request;
2. customer B's own evidence, set up through the API;
3. no visit yet, and scheduling waits for assignment;
4. Under review → assign → Assigned;
5. schedule the visit (India time): customer event and notification, instructions internal;
6. start work: a stale screen can't start it again, and the request is In progress;
7. execution notes;
8. upload a before photo, an after photo, a video and a PDF, all pending and internal (8b: the dashboard lists them);
9. a disguised file is refused by the content check, and injected visibility, review, uploader and customer fields don't stick;
10. approve three and reject two, with internal reasons;
11. "Completed" greyed out, and a forced attempt refused;
12. share three, with one timeline entry and one notification;
13. repeated share, approve and upload requests change nothing;
14. complete the visit with service notes;
15. admin request page and dashboard at 320–1440 px, with axe;
16. complete the request: everything is closed, and replays and direct calls are refused;
17. an inactive assignee can't start work, and a cancelled request can't be started;
18. customer A sees the visit, service notes and shared evidence, with photos really loading, the full timeline, the notifications, and nothing internal on any page;
19. customer page at 320–1440 px, with axe;
20. evidence links: A's own works; rejected, internal, B's, cross-request, malformed and admin links are `404`; forged or missing tokens fail; signed out gets no file;
21. customer A's API: shared evidence only, no internal tables, no admin functions, no direct writes, no upload link, can't sign rejected or B's files, can't list or delete;
22. customer B sees only their own, and replaying the admin's share action changes nothing;
23. a deactivated admin loses file links, functions and reads at once.

Run it like the Phase 2B test (the app built against the project, then `QA_BROWSER=msedge|firefox|webkit npm run qa:field-ops`). The local stand-in (`npm run dev:supabase`) now also emulates Storage (signed upload and download links with Range, list, delete), checking the real Storage policies in PGlite.

## 16. Deployment

1. **Record a baseline** of production: row counts and a fingerprint of the rows in scope.
2. **Apply the migration** `20260930090000_phase_2c_field_operations.sql` in one transaction (SQL editor, or a direct connection as `postgres`). The migration:
   - creates the bucket (Storage's lifecycle columns left empty) and the Storage policies;
   - adds everything else in §5. It is additive: the deployed Phase 2B app keeps working.
   - Supabase lets `postgres` create policies on `storage.objects` through `supautils.policy_grants`.
3. **Verify** with `scripts/sql/schema-fingerprint.sql` (production) against `node scripts/schema-fingerprint.mjs` (repository). The categories `m storage policies` and `n evidence bucket` are new. The two differences documented in PHASE_2B.md are expected.
4. **Deploy the app**: push to `main`, and Vercel builds it.
5. **Run** the three acceptance tests in Edge, Firefox and WebKit, plus the public QA with `QA_READONLY=true`. Then compare the baseline: real records unchanged, no test accounts, no orphans.

## 17. Operations notes

- **Withdrawing shared evidence** (for example shared by mistake) is not in the console. The owner can do it in the SQL editor:
  - run `update public.request_evidence set visibility = 'INTERNAL', published_at = null where id = '…';`
  - optionally follow it with `update public.request_evidence set review_status = 'REJECTED' where id = '…';` and a reason in `request_evidence_internal.review_note`.
  - The file becomes unreadable to the customer immediately, apart from signed links already issued in the last 5 or 30 minutes.
- **Deleting a customer account** deletes their visits and evidence records (cascade) but **not the files**. Remove the files first: the service key's Storage `list` / `remove` under each request id, as `removeEvidenceFiles` in the acceptance test does.
- **Abandoned uploads**, where the file was uploaded but never registered (the browser was closed in between), stay private and invisible to customers. Find them with:

  ```sql
  select name from storage.objects o
  where o.bucket_id = 'request-evidence'
    and not exists (select 1 from public.request_evidence_internal i where i.storage_path = o.name);
  ```

  Remove them through the Storage API (dashboard or service key). SQL deletes are blocked.

## 18. Limitations

- **No interface for operations staff:** admins record visits and upload evidence for them. A field-team interface is a later phase.
- **One file per upload.** Photos are stored resized (at most 2,560 px, JPEG); the original photo file is not kept.
- **Formats:** HEIC photos work only in browsers that can open them (Safari); QuickTime (`.mov`) videos are refused (use MP4); videos are uploaded as they are (no transcoding or thumbnails), up to 50 MB.
- **Capture time** is what the camera recorded (India time assumed when it recorded no offset); it is shown as "Taken …", not verified.
- **Shared evidence can't be withdrawn from the console** (§17 has the SQL). Signed links already issued keep working until they expire (5 or 30 minutes); anyone holding such a link in that window can open the file (and, if the file were replaced in that window, its new contents).
- **One visit per request** at a time (a cancelled one can be replaced); evidence links to the request's current visit automatically.
- Timeline entries written before Phase 2C (status changes, team updates) carry the acting admin's profile id in `created_by`, which a customer's own API access can read: an opaque id, never a name. Phase 2C entries don't. Changing the earlier ones would change Phase 2A/2B behaviour, so it is left for a later phase.
- Deleting an account needs the evidence files removed separately (§17).

## 19. Out of scope

Payments, invoices, subscriptions and payment gateways. The vendor marketplace, vendor portal and partner portal. Public property listings, the marketplace and transactions. OCR, AI and image analysis. WhatsApp, SMS, email automation and push notifications. The mobile app. 2FA. Customer chat and replies. Family-member access. Workforce management, payroll, route optimisation, GPS and live location. Calendar integrations (Google, Outlook), recurring and advanced scheduling. Property health scoring. The document vault. Withdrawing shared evidence in the console, and a field-team interface: both are later phases.

## 20. Production verification

Filled in after deployment.
