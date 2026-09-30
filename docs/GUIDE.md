# NRI Family Office: application guide

A plain guide to what is built so far, who can do what, how a request flows, who gets notified, and how to test everything by hand. The technical detail for each phase is in [PHASE_2A.md](PHASE_2A.md), [PHASE_2B.md](PHASE_2B.md) and [PHASE_2C.md](PHASE_2C.md).

## 1. What is built

| Phase | What it is | Where |
| --- | --- | --- |
| Phase 1 | The public website | https://nri-family.vercel.app |
| Phase 2A | The **customer portal**: the customer's private workspace (properties, service requests with a timeline, notifications, activity, profile) | `/app` |
| Phase 2B | The **admin console**: request inbox, status changes, assigning a team member, internal notes and messages to the customer, customers, properties, team and activity | `/admin` |
| Phase 2C | **Field work and evidence**: visits (schedule, start, complete) and proof of work (photos, videos, PDFs) that the team reviews and then shares with the customer | Inside `/admin` (request page) and `/app` (request page) |

Everyone signs in at **https://nri-family.vercel.app/login**. The site sends each person to their own area.

## 2. Who can do what

| Who | Signs in to | Can |
| --- | --- | --- |
| **Customer** | `/app` | Add properties, submit requests, cancel a request before work starts, and see their own requests, timeline, notifications and shared evidence. Nothing else. |
| **Admin** (role `ADMIN` plus an active team membership) | `/admin` | Everything in the console: review, assign, change status, schedule and record visits, upload evidence, approve, reject, share, and complete. |
| **Operations** (field staff, role `OPERATIONS` plus an active team membership) | **Nowhere yet** (see §5) | Can be assigned requests. An admin records their visits and uploads their photos for them. |
| Signed out | The public site only | Nothing private. |

**Which accounts are admins:** sign in as an admin and open `/admin/team`, which lists every team member with their role. You can also run this in the Supabase SQL editor:

```sql
select p.email, p.role, t.is_active
from public.profiles p join public.team_members t on t.profile_id = p.id
order by p.role, p.email;
```

(Email addresses are deliberately not written in this file: the repository is public.)

**Adding people**

- **A new customer:** public sign-up is off, so add them in Supabase → Authentication → Users → Add user, with "Auto Confirm User" ticked. Their account starts as a customer.
- **A team member (admin or operations):** run the SQL in [PHASE_2B.md §3](PHASE_2B.md#3-roles) in the Supabase SQL editor. Use an account that holds no customer data. Nobody can make themselves staff from the website.

## 3. How a request flows

```text
CUSTOMER                 ADMIN (console)                            CUSTOMER SEES
submits a request   ──►  New → Under review                          "Team review started"
                         assigns a team member (internal)            (nothing; assignment is internal)
                         → Assigned                                  "Local team assigned"
                         Field work: schedule the visit              "Service visit scheduled" + time
                         Start work (request → In progress)          "Work in progress"
                         execution notes (internal)                  (nothing)
                         upload evidence → waiting for review        (nothing)
                         approve → share with customer               "New evidence shared" + the photos
                         mark work complete + service notes          "Service visit completed" + notes
                         → Completed (only now allowed)              "Request completed"
```

- **Request statuses:** New (the customer sees "Submitted"), Under review, Assigned, In progress, Awaiting customer (the customer sees "Waiting for you"), Completed and Cancelled. The last two are final.
- **Visit statuses** are separate: Not scheduled, Scheduled, In progress, Completed, Cancelled.
- **Evidence** goes through Waiting for review → Approved → Shared with the customer, or Rejected (kept, internal only). Nothing is ever shown to the customer until an admin approves it and then shares it.
- **Completing a request that had a visit** needs three things: the visit completed, all evidence reviewed, and at least one piece shared. Until then "Completed" is greyed out, with the reason.

## 4. Who gets notified

Notifications are **in-app only** (no email, SMS or WhatsApp yet) and go to the **customer only**. They appear on the customer's Notifications page (`/app/notifications`), and the menu shows an unread count.

| When | The customer gets |
| --- | --- |
| They submit a request | "Your service request has been received." |
| The team changes the status | "Update on REQ-…: … is now: {status}." |
| The team sends a message | "Update on REQ-…: Our team added an update to …" |
| A visit is scheduled / rescheduled | "Visit scheduled for REQ-…" / "Visit rescheduled for REQ-…", with the time in India time |
| A visit is completed / cancelled | "Visit completed for REQ-…" / "Visit cancelled for REQ-…" |
| Evidence is shared | "New evidence on REQ-…", once per batch while unread |
| Internal notes, assignments, uploads, approvals, rejections | Nothing: these stay internal |

**The team gets no notifications yet.** Admins see what needs doing in the console:

- the dashboard's **Needs attention** (new and urgent requests);
- the dashboard's **Field work** panel (evidence waiting for review, visits scheduled or in progress);
- the request inbox with filters (status, priority, assignee).

## 5. The field team: login, jobs and approvals

**Today (Phases 2A–2C)**

- **Admins are the office.** They sign in at `/login`, land in `/admin`, and do everything: assign, schedule, record the visit, upload the photos, approve, share and complete.
- **Field staff (operations) have no login area yet.** They can be assigned to requests, but if they sign in, the site tells them their workspace isn't available. The usual way to work today: the field person sends the photos and notes to the office, and an admin enters them on the request page.
- **Only admins approve and share evidence**, on the request page in `/admin` (Evidence panel).
- **Seeing someone's jobs:**
  - `/admin/requests` with the "Assigned to" filter set to that person;
  - `/admin/team`, which shows each member's open and total assignments;
  - the dashboard, which lists the scheduled and in-progress visits.
- **Stopgap, if a trusted supervisor must sign in now:** make them an admin. But an admin sees every customer and every request, so this is not suitable for field workers.

**A separate field-team login is possible as the next phase.** It is not built, and it will only be built when you ask for it. It could work like this:

- a mobile-friendly **team workspace** (for example `/team`) for operations staff, with their own sign-in;
- they see **only the jobs assigned to them**: today's and upcoming visits, the property address and the instructions, with no other customers' data;
- they can **start the visit, write notes, take photos and videos from the phone and upload them, and mark the work done**;
- what they upload still lands as **"Waiting for review"**: an admin still approves and shares, so the customer never sees anything unchecked;
- **team notifications** in that workspace (a new job assigned, a visit rescheduled), later perhaps by email or WhatsApp;
- the database would give each field person access to their own assignments only, the same way customers see only their own requests.

## 6. Manual testing, step by step

Use two browsers (or one normal window and one private window): one signed in as the **customer**, one as the **admin**. Start with a **new** request, because completing a request is final. Use harmless test photos (an object or a plant), never personal photos or documents.

### Phase 2A: customer portal

- [ ] Sign in as the customer and land on `/app` (dashboard).
- [ ] Properties: open yours, or add one; edit it.
- [ ] Service requests → New request: choose a service, write a title and description, then Review → Submit.
- [ ] The request page shows a REQ number, "Submitted", and a timeline starting with "Request submitted".
- [ ] Notifications shows "Your service request has been received."
- [ ] Activity lists what you did. Profile and Settings open.

### Phase 2B: admin console

- [ ] Sign in as the admin and land on `/admin` ("Operations dashboard"). The new request appears under "Needs attention".
- [ ] Requests: search for it by REQ number, then open it. It shows the customer's and the property's details.
- [ ] Status: **Under review** → Update status.
- [ ] Assignment: **assign yourself**. You are an active team member, and admins can be assigned.
- [ ] Status: **Assigned** → Update status. ("Assigned" and "In progress" stay greyed out until someone active is assigned.)
- [ ] Add an **Internal note**; the customer must never see it.
- [ ] Send a **Message to the customer** (it is confirmed first); the customer sees it and is notified.
- [ ] Customers, Properties, Team and Activity pages open and show the records.

### Phase 2C: field work and evidence (same request page)

- [ ] **Field work → Schedule work:** a date (today or later), a start time, an optional end time and instructions (internal). Times are **India time**. Click "Schedule visit".
- [ ] **Start work.** The request becomes **In progress**.
- [ ] **Execution notes → Save notes** (internal).
- [ ] **Evidence → Add evidence:** choose a photo, set "When was it taken?" to **Before**, and add a title (the customer reads it). Then add another marked **After**. Try an MP4 video or a PDF too.
- [ ] New items appear under **Waiting for review**.
- [ ] **Approve** them; they move to "Approved, not shared yet".
- [ ] **Share with customer** (confirmed); they move to "Shared with the customer".
- [ ] **Reject** one, with a reason; it stays internal and on record.
- [ ] "Completed" in the status panel is still greyed out: "Finish or cancel the field work first."
- [ ] **Service notes for the customer** (for example "Garden maintenance completed.") → **Mark work complete** (confirmed).
- [ ] Status: **Completed** is now allowed. Confirm it. Everything on the request is now closed for changes.
- [ ] Dashboard: the Field work panel showed the visit and the evidence waiting while they were open.

### Back as the customer

- [ ] The request shows **Completed**.
- [ ] The **Service visit** card shows the time in India time and in your own time zone, the completion time and the service notes.
- [ ] The **Evidence** gallery shows the shared photos under Before / After; click one to open it full size.
- [ ] The timeline shows "Service visit scheduled", "Work in progress", "New evidence shared", "Service visit completed" and "Request completed".
- [ ] Notifications has the visit and evidence entries.
- [ ] You **don't** see: instructions, execution notes, internal notes, rejected items, or who on the team did the work.

## 7. Security checks to try

- [ ] As the customer, open `/admin`: "page not found".
- [ ] Signed out, open `/app` or `/admin`: you are sent to sign in.
- [ ] Copy a photo's address from the customer's request page (right-click → copy image address) and open it in a signed-out private window: you are sent to sign in, and never see the file.
- [ ] Change one character in a request's address (`/app/requests/…`): "not found", never someone else's request.

## 8. Automated tests

Run in PowerShell from `C:\Uraavu.com` (the keys come from `.env.local`, which is never committed):

```powershell
npm run check                                   # lint, typecheck, unit + database tests, production build

$env:BASE_URL = "https://nri-family.vercel.app"
$env:QA_BROWSER = "msedge"                      # or "firefox" / "webkit"
npm run qa:portal                               # Phase 2A acceptance test (23 steps)
npm run qa:admin                                # Phase 2B acceptance test (30 steps)
npm run qa:field-ops                            # Phase 2C acceptance test (25 steps)

$env:QA_READONLY = "true"; npm run qa           # public site; always read-only against the live site
```

Each acceptance test creates throwaway `nfo-…@example.net` accounts and deletes them (and their files) at the end. They never touch your own accounts or records. Last results against production (30 Sept 2026): 23/23, 30/30 and 25/25 in Edge, Firefox and WebKit, and the public site 506 checks with 0 failures.

## 9. Good to know

- **Test data you create by hand stays** in the real database. Completed requests can't be deleted from the console, so use obvious test titles.
- **Files:** JPEG, PNG and WebP photos (HEIC only in Safari), MP4 videos up to 50 MB, PDFs up to 20 MB. Photos are resized to 2,560 px and saved as JPEG, which also removes location data.
- **Visit times are India time.** Customers abroad also see their own local time.
- **Evidence is private:** it is stored in a private bucket, and each file opens only through a short-lived link after the site checks who is asking.
- **Not built yet:** a login for field staff (§5), staff notifications, email/SMS/WhatsApp, customer replies, family access, approvals and invoices, and the document vault. The public site marks such things "Coming to the platform".
