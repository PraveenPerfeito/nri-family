import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  completionBlocker,
  evidenceFileTypes,
  evidenceMaxBytes,
  evidenceMimeTypes,
  evidenceObjectPath,
  fieldWorkTransitions,
  visitStates,
  type EvidenceMime,
} from "@/lib/field-ops/domain";
import { indiaInstant, indiaToday } from "@/lib/field-ops/schedule";
import { createTestDatabase, errorOf, type TestDatabase, type TestUser } from "./harness";

/*
 * Phase 2C against the real migrations (2A + 2B + 2C) in Postgres, with the
 * Storage tables as Supabase sets them up: visits and their lifecycle,
 * evidence from upload to publication, the Storage policies on the private
 * bucket, the request-completion rule, and above all what a customer can
 * and cannot read.
 */

let t: TestDatabase;
let seq = 0;
const nextEmail = (label: string) => `${label}-${++seq}@example.test`;

beforeAll(async () => {
  t = await createTestDatabase();
}, 60_000);

afterAll(async () => {
  await t?.close();
});

const BUCKET = "request-evidence";
const DAY = 86_400_000;

// ── People and records ───────────────────────────────────────────────────────

const newCustomer = (label = "customer") => t.createUser(nextEmail(label), { full_name: `Customer ${label}` });

async function newStaff(role: "ADMIN" | "OPERATIONS", { active = true } = {}) {
  const user = await t.createUser(nextEmail(role.toLowerCase()), { full_name: `${role} person` });
  await t.asService(async (tx) => {
    await tx.query("update public.profiles set role = $2 where id = $1", [user.profileId, role]);
    await tx.query("insert into public.team_members (profile_id, is_active) values ($1, $2)", [user.profileId, active]);
  });
  return user;
}

const setActive = (user: TestUser, active: boolean) =>
  t.asService((tx) => tx.query("update public.team_members set is_active = $2 where profile_id = $1", [user.profileId, active]));

async function addRequest(user: TestUser, title = "Garden maintenance") {
  const { rows } = await t.as(user, (tx) =>
    tx.query<{ id: string; request_number: string }>(
      "insert into public.service_requests (category, title, description) values ('GARDEN_MAINTENANCE', $1, 'Please trim the hedge.') returning id, request_number",
      [title],
    ),
  );
  return rows[0];
}

/** Call an admin function as `user`; resolves to its result. */
async function call<T = unknown>(user: TestUser, fn: string, args: unknown[]): Promise<T> {
  const { rows } = await t.as(user, (tx) => tx.query<{ r: T }>(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args));
  return rows[0]?.r as T;
}

const rowsAs = async <T,>(user: TestUser, sql: string, params: unknown[] = []) => (await t.as(user, (tx) => tx.query<T>(sql, params))).rows;
const rowsAsService = async <T,>(sql: string, params: unknown[] = []) => (await t.asService((tx) => tx.query<T>(sql, params))).rows;

const statusOf = async (id: string) => (await rowsAsService<{ status: string }>("select status from public.service_requests where id = $1", [id]))[0].status;

/** A request that is Assigned to an active operations member, ready for field work. */
async function readyRequest(admin: TestUser, customer?: TestUser) {
  const owner = customer ?? (await newCustomer("owner"));
  const ops = await newStaff("OPERATIONS");
  const request = await addRequest(owner);
  await call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "UNDER_REVIEW"]);
  await call(admin, "admin_assign_request", [request.id, ops.profileId]);
  await call(admin, "admin_change_request_status", [request.id, "UNDER_REVIEW", "ASSIGNED"]);
  return { ...request, customer: owner, ops };
}

/** A visit tomorrow, 10:00–12:00 India time. */
function tomorrow(hour = "10:00", end: string | null = "12:00") {
  const date = indiaToday(new Date(Date.now() + DAY));
  return { start: indiaInstant(date, hour).toISOString(), end: end ? indiaInstant(date, end).toISOString() : null };
}

async function schedule(admin: TestUser, requestId: string, when = tomorrow(), instructions: string | null = "Gate code is with the neighbour.") {
  return call<string>(admin, "admin_schedule_field_work", [requestId, when.start, when.end, instructions]);
}

const visitOf = async (id: string) =>
  (await rowsAsService<Record<string, unknown>>("select * from public.field_work where id = $1", [id]))[0] as {
    status: string;
    started_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    summary: string | null;
    scheduled_start: string;
  };

/** What the Storage API does for an admin's upload: the insert, under the caller's own RLS, with Supabase's metadata. */
async function upload(admin: TestUser, requestId: string, { evidenceId = randomUUID(), mime = "image/jpeg" as EvidenceMime, size = 204_800, name }: { evidenceId?: string; mime?: string; size?: number; name?: string } = {}) {
  const path = name ?? evidenceObjectPath(requestId, evidenceId, mime as EvidenceMime);
  const eTag = `"${randomUUID().replace(/-/g, "")}"`;
  await t.as(admin, (tx) =>
    tx.query("insert into storage.objects (bucket_id, name, owner, metadata) values ($1, $2, $3, $4)", [BUCKET, path, admin.authUserId, JSON.stringify({ mimetype: mime, size, eTag })]),
  );
  return { evidenceId, path, eTag };
}

async function addEvidence(admin: TestUser, requestId: string, options: Parameters<typeof upload>[2] & { stage?: string; title?: string } = {}) {
  const { evidenceId, path, eTag } = await upload(admin, requestId, options);
  await call(admin, "admin_add_evidence", [requestId, evidenceId, options.stage ?? "AFTER", options.title ?? "Hedge after trimming", "Trimmed to one metre.", null, "IMG_2031.jpg"]);
  return { evidenceId, path, eTag };
}

async function publishedEvidence(admin: TestUser, requestId: string, options: Parameters<typeof addEvidence>[2] = {}) {
  const e = await addEvidence(admin, requestId, options);
  await call(admin, "admin_approve_evidence", [e.evidenceId]);
  await call(admin, "admin_publish_evidence", [e.evidenceId]);
  return e;
}

/** Storage reads as `user`: which of these file names can they see? */
const visibleFiles = async (user: TestUser | "anon", names: string[]) => {
  const run = (tx: Parameters<Parameters<TestDatabase["as"]>[1]>[0]) =>
    tx.query<{ name: string }>("select name from storage.objects where bucket_id = $1 and name = any($2) order by name", [BUCKET, names]);
  return (user === "anon" ? await t.asAnon(run) : await t.as(user, run)).rows.map((r) => r.name);
};

// ── Vocabulary ───────────────────────────────────────────────────────────────

describe("the database and the app agree", () => {
  it("on the visit lifecycle, pair by pair", async () => {
    const pairs = await rowsAsService<{ f: string; t: string; allowed: boolean }>(
      "select f.s as f, t2.s as t, app.field_work_transition_allowed(f.s, t2.s) as allowed from unnest($1::text[]) f(s) cross join unnest($1::text[]) t2(s)",
      [visitStates],
    );
    expect(pairs).toHaveLength(25);
    for (const { f, t: to, allowed } of pairs) {
      expect(allowed, `${f} → ${to}`).toBe(fieldWorkTransitions[f as keyof typeof fieldWorkTransitions].includes(to as never));
    }
  });

  it("on accepted files, their kinds, limits and storage paths", async () => {
    const requestId = randomUUID();
    const evidenceId = randomUUID();
    for (const mime of evidenceMimeTypes) {
      const [row] = await rowsAsService<{ kind: string; ext: string; max: number; path: string }>(
        "select app.evidence_kind($1) as kind, app.evidence_extension($1) as ext, app.evidence_max_bytes(app.evidence_kind($1)) as max, app.evidence_object_path($2, $3, $1) as path",
        [mime, requestId, evidenceId],
      );
      expect(row, mime).toEqual({
        kind: evidenceFileTypes[mime].kind,
        ext: evidenceFileTypes[mime].extension,
        max: evidenceMaxBytes[evidenceFileTypes[mime].kind],
        path: evidenceObjectPath(requestId, evidenceId, mime),
      });
    }
    for (const other of ["image/gif", "image/svg+xml", "text/html", "application/x-msdownload", "video/quicktime", ""]) {
      const [row] = await rowsAsService<{ kind: string | null }>("select app.evidence_kind($1) as kind", [other]);
      expect(row.kind, other).toBeNull();
    }
  });

  it("the evidence bucket is private and limited to the accepted types", async () => {
    const [bucket] = await rowsAsService<{ public: boolean; file_size_limit: number; allowed_mime_types: string[] }>(
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = $1",
      [BUCKET],
    );
    expect(bucket).toEqual({ public: false, file_size_limit: 50 * 1024 * 1024, allowed_mime_types: [...evidenceMimeTypes] });
  });
});

// ── Scheduling ───────────────────────────────────────────────────────────────

describe("scheduling a visit", () => {
  it("an admin schedules a visit; the customer sees it, with an event and a notification, and no team member's id", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const when = tomorrow();
    const id = await schedule(admin, r.id, when);

    const [visit] = await rowsAs<{ id: string; status: string; scheduled_start: string; customer_id: string }>(
      r.customer,
      "select id, status, scheduled_start, customer_id from public.field_work where request_id = $1",
      [r.id],
    );
    expect(visit).toMatchObject({ id, status: "SCHEDULED", customer_id: r.customer.profileId });
    expect(new Date(visit.scheduled_start).toISOString()).toBe(when.start);

    const events = await rowsAs<{ event_type: string; title: string; created_by: string | null; metadata: Record<string, unknown> }>(
      r.customer,
      "select event_type, title, created_by, metadata from public.service_request_events where request_id = $1 and event_type = 'FIELD_WORK_SCHEDULED'",
      [r.id],
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ title: "Service visit scheduled", created_by: null });
    expect(new Date(events[0].metadata.scheduled_start as string).toISOString()).toBe(when.start);

    const [note] = await rowsAs<{ type: string; title: string; message: string }>(r.customer, "select type, title, message from public.notifications order by created_at desc limit 1");
    expect(note.type).toBe("VISIT_UPDATE");
    expect(note.title).toBe(`Visit scheduled for ${r.request_number}`);
    expect(note.message).toMatch(/^Our team will visit on \d{1,2} [A-Z][a-z]{2} \d{4}, 10:00–12:00 \(India time\) for Garden maintenance\.$/);

    // The team's instructions and the activity entry are internal.
    expect(await rowsAs(r.customer, "select * from public.field_work_internal")).toEqual([]);
    const [instructions] = await rowsAs<{ instructions: string }>(admin, "select instructions from public.field_work_internal where field_work_id = $1", [id]);
    expect(instructions.instructions).toBe("Gate code is with the neighbour.");
    const activity = await rowsAs<{ action: string; visibility: string; actor_id: string }>(admin, "select action, visibility, actor_id from public.activity_logs where entity_id = $1 and action like 'FIELD_WORK_%'", [r.id]);
    expect(activity).toEqual([{ action: "FIELD_WORK_SCHEDULED", visibility: "INTERNAL", actor_id: admin.profileId }]);
    expect((await rowsAs(r.customer, "select * from public.activity_logs where action like 'FIELD_WORK_%'")).length).toBe(0);
  });

  it("needs a request the team is working on (Assigned, In progress or Awaiting customer), and never a closed one", async () => {
    const admin = await newStaff("ADMIN");
    const ops = await newStaff("OPERATIONS");
    const customer = await newCustomer("not-ready");
    const fresh = await addRequest(customer);
    expect(await errorOf(schedule(admin, fresh.id))).toMatch(/request_not_ready/);
    await call(admin, "admin_change_request_status", [fresh.id, "SUBMITTED", "UNDER_REVIEW"]);
    await call(admin, "admin_assign_request", [fresh.id, ops.profileId]);
    expect(await errorOf(schedule(admin, fresh.id)), "under review, even with an assignee").toMatch(/request_not_ready/);
    await call(admin, "admin_change_request_status", [fresh.id, "UNDER_REVIEW", "WAITING_FOR_CUSTOMER"]);
    expect(await errorOf(schedule(admin, fresh.id)), "awaiting the customer").toBeNull();

    const closed = await readyRequest(admin);
    await call(admin, "admin_change_request_status", [closed.id, "ASSIGNED", "CANCELLED"]);
    expect(await errorOf(schedule(admin, closed.id))).toMatch(/request_closed/);
    expect(await errorOf(schedule(admin, randomUUID()))).toMatch(/request_not_found/);
  });

  it("needs an ACTIVE team member responsible (the Phase 2B assignment)", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    await setActive(r.ops, false);
    expect(await errorOf(schedule(admin, r.id))).toMatch(/assignment_required/);
    await setActive(r.ops, true);
    expect(await errorOf(schedule(admin, r.id))).toBeNull();
  });

  it("accepts today onwards in India time, and an end after the start on the same day", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const today = indiaToday();
    const yesterday = indiaToday(new Date(Date.now() - DAY));
    const bad: [string, string | null][] = [
      [indiaInstant(yesterday, "10:00").toISOString(), null],
      [tomorrow().start, tomorrow("10:00", "09:00").end],
      [tomorrow().start, tomorrow().start],
      [tomorrow().start, new Date(new Date(tomorrow().start).getTime() + DAY).toISOString()],
      [new Date(Date.now() + 400 * DAY).toISOString(), null],
    ];
    for (const [start, end] of bad) expect(await errorOf(schedule(admin, r.id, { start, end })), `${start} → ${end}`).toMatch(/invalid_schedule/);
    expect(await errorOf(schedule(admin, r.id, { start: indiaInstant(today, "00:00").toISOString(), end: null })), "today, earlier than now").toBeNull();
  });

  it("keeps one visit per request: a second is refused until the first is cancelled", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const first = await schedule(admin, r.id);
    expect(await errorOf(schedule(admin, r.id))).toMatch(/field_work_exists/);
    await call(admin, "admin_cancel_field_work", [first, "SCHEDULED"]);
    const second = await schedule(admin, r.id);
    expect(second).not.toBe(first);
    const statuses = await rowsAsService<{ status: string }>("select status from public.field_work where request_id = $1 order by created_at", [r.id]);
    expect(statuses.map((s) => s.status).sort()).toEqual(["CANCELLED", "SCHEDULED"]);
  });

  it("the database backstops one open visit per request, whoever writes", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    await schedule(admin, r.id);
    const forged = errorOf(
      t.asService((tx) => tx.query("insert into public.field_work (request_id, customer_id, scheduled_start) values ($1, $2, now() + interval '2 days')", [r.id, r.customer.profileId])),
    );
    expect(await forged).toMatch(/field_work_one_open_visit_idx/);
  });

  it("customers, operations staff and inactive admins cannot schedule, and nobody writes the tables directly", async () => {
    const admin = await newStaff("ADMIN");
    const inactive = await newStaff("ADMIN", { active: false });
    const r = await readyRequest(admin);
    for (const who of [r.customer, r.ops, inactive]) expect(await errorOf(schedule(who, r.id))).toMatch(/not_authorized/);
    const attempt = (user: TestUser, sql: string, params: unknown[]) => errorOf(t.as(user, (tx) => tx.query(sql, params)));
    for (const who of [r.customer, admin]) {
      expect(await attempt(who, "insert into public.field_work (request_id, customer_id, scheduled_start) values ($1, $2, now())", [r.id, r.customer.profileId])).toMatch(/permission denied/);
      expect(await attempt(who, "update public.field_work set status = 'COMPLETED' where request_id = $1", [r.id])).toMatch(/permission denied/);
      expect(await attempt(who, "insert into public.request_evidence (id, request_id, customer_id, kind, stage, title, mime_type, size_bytes) values (gen_random_uuid(), $1, $2, 'PHOTO', 'AFTER', 'Forged', 'image/jpeg', 1)", [r.id, r.customer.profileId])).toMatch(/permission denied/);
    }
    expect(await errorOf(t.asAnon((tx) => tx.query(`select public.admin_schedule_field_work($1, now(), null, null)`, [r.id])))).toMatch(/permission denied/);
  });
});

describe("rescheduling", () => {
  it("a new time is shown to the customer and notified; new instructions stay internal; no change writes nothing", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    const later = tomorrow("14:00", "15:30");
    await call(admin, "admin_reschedule_field_work", [id, later.start, later.end, "Gate code is with the neighbour."]);
    expect(new Date((await visitOf(id)).scheduled_start).toISOString()).toBe(later.start);
    const types = async () => (await rowsAs<{ event_type: string }>(r.customer, "select event_type from public.service_request_events where request_id = $1 and event_type like 'FIELD_WORK_%' order by created_at", [r.id])).map((e) => e.event_type);
    expect(await types()).toEqual(["FIELD_WORK_SCHEDULED", "FIELD_WORK_RESCHEDULED"]);
    const [note] = await rowsAs<{ title: string; message: string }>(r.customer, "select title, message from public.notifications order by created_at desc limit 1");
    expect(note.title).toBe(`Visit rescheduled for ${r.request_number}`);
    expect(note.message).toMatch(/14:00–15:30 \(India time\)\.$/);

    await call(admin, "admin_reschedule_field_work", [id, later.start, later.end, "Call the caretaker first."]);
    expect(await types()).toEqual(["FIELD_WORK_SCHEDULED", "FIELD_WORK_RESCHEDULED"]);
    const actions = await rowsAs<{ action: string; metadata: Record<string, unknown> }>(admin, "select action, metadata from public.activity_logs where entity_id = $1 and action like 'FIELD_WORK_%' order by created_at", [r.id]);
    expect(actions.map((a) => a.action)).toEqual(["FIELD_WORK_SCHEDULED", "FIELD_WORK_RESCHEDULED", "FIELD_WORK_UPDATED"]);
    expect(actions[2].metadata.fields).toEqual(["instructions"]);
    expect(JSON.stringify(actions.map((a) => a.metadata))).not.toMatch(/caretaker|neighbour/);

    await call(admin, "admin_reschedule_field_work", [id, later.start, later.end, "Call the caretaker first."]);
    expect((await rowsAs(admin, "select 1 from public.activity_logs where entity_id = $1 and action like 'FIELD_WORK_%'", [r.id])).length).toBe(3);
  });

  it("only a scheduled visit can be rescheduled", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    await call(admin, "admin_start_field_work", [id]);
    const when = tomorrow();
    expect(await errorOf(call(admin, "admin_reschedule_field_work", [id, when.start, when.end, null]))).toMatch(/field_work_changed/);
    expect(await errorOf(call(admin, "admin_reschedule_field_work", [randomUUID(), when.start, when.end, null]))).toMatch(/field_work_not_found/);
  });
});

// ── Starting, completing, cancelling ────────────────────────────────────────

describe("carrying out a visit", () => {
  it("starting moves the visit and the request to In progress; the start itself is internal", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    await call(admin, "admin_start_field_work", [id]);
    const visit = await visitOf(id);
    expect(visit.status).toBe("IN_PROGRESS");
    expect(visit.started_at).not.toBeNull();
    expect(await statusOf(r.id)).toBe("IN_PROGRESS");

    const adminEvents = await rowsAs<{ event_type: string; visibility: string }>(admin, "select event_type, visibility from public.service_request_events where request_id = $1 and event_type = 'FIELD_WORK_STARTED'", [r.id]);
    expect(adminEvents).toEqual([{ event_type: "FIELD_WORK_STARTED", visibility: "INTERNAL" }]);
    const customerEvents = await rowsAs<{ event_type: string; title: string }>(r.customer, "select event_type, title from public.service_request_events where request_id = $1 order by created_at", [r.id]);
    expect(customerEvents.map((e) => e.event_type)).not.toContain("FIELD_WORK_STARTED");
    expect(customerEvents.at(-1)?.title).toBe("Work in progress");
  });

  it("refuses to start without an active assignee, a second time, or on a closed request", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    await setActive(r.ops, false);
    expect(await errorOf(call(admin, "admin_start_field_work", [id]))).toMatch(/assignment_required/);
    expect((await visitOf(id)).status).toBe("SCHEDULED");
    await setActive(r.ops, true);
    await call(admin, "admin_start_field_work", [id]);
    expect(await errorOf(call(admin, "admin_start_field_work", [id])), "double submission").toMatch(/field_work_changed/);

    const other = await readyRequest(admin);
    const visit = await schedule(admin, other.id);
    await call(admin, "admin_change_request_status", [other.id, "ASSIGNED", "CANCELLED"]);
    expect(await errorOf(call(admin, "admin_start_field_work", [visit]))).toMatch(/request_closed/);
  });

  it("completes with service notes for the customer; the request stays open for review", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    await call(admin, "admin_start_field_work", [id]);
    await call(admin, "admin_record_field_work_notes", [id, "Hedge trimmed, green waste removed. Neighbour's dog was loose."]);
    await call(admin, "admin_complete_field_work", [id, "  Garden maintenance completed.  ", null]);
    const visit = await visitOf(id);
    expect(visit).toMatchObject({ status: "COMPLETED", summary: "Garden maintenance completed." });
    expect(visit.completed_at).not.toBeNull();
    expect(await statusOf(r.id)).toBe("IN_PROGRESS");

    const [event] = await rowsAs<{ title: string; description: string }>(r.customer, "select title, description from public.service_request_events where request_id = $1 and event_type = 'FIELD_WORK_COMPLETED'", [r.id]);
    expect(event).toEqual({ title: "Service visit completed", description: "Garden maintenance completed." });
    const [note] = await rowsAs<{ title: string }>(r.customer, "select title from public.notifications order by created_at desc limit 1");
    expect(note.title).toBe(`Visit completed for ${r.request_number}`);
    const html = JSON.stringify(await rowsAs(r.customer, "select * from public.service_request_events where request_id = $1", [r.id]));
    expect(html).not.toContain("dog");
    const [notes] = await rowsAs<{ execution_notes: string }>(admin, "select execution_notes from public.field_work_internal where field_work_id = $1", [id]);
    expect(notes.execution_notes).toContain("dog");
    const meta = await rowsAs<{ metadata: unknown }>(admin, "select metadata from public.activity_logs where entity_id = $1", [r.id]);
    expect(JSON.stringify(meta)).not.toContain("dog");
  });

  it("refuses transitions the lifecycle doesn't allow", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    expect(await errorOf(call(admin, "admin_complete_field_work", [id, null, null])), "Scheduled → Completed").toMatch(/field_work_changed/);
    expect(await errorOf(call(admin, "admin_record_field_work_notes", [id, "Too early"])), "notes before the visit").toMatch(/field_work_changed/);
    await call(admin, "admin_start_field_work", [id]);
    await call(admin, "admin_complete_field_work", [id, null, null]);
    expect(await errorOf(call(admin, "admin_start_field_work", [id])), "Completed → In progress").toMatch(/field_work_changed/);
    const when = tomorrow();
    expect(await errorOf(call(admin, "admin_reschedule_field_work", [id, when.start, when.end, null])), "Completed → Scheduled").toMatch(/field_work_changed/);
    expect(await errorOf(call(admin, "admin_cancel_field_work", [id, "COMPLETED"])), "Completed → Cancelled").toMatch(/field_work_changed/);
    expect(await errorOf(schedule(admin, r.id)), "a second visit after completion").toMatch(/field_work_exists/);

    const other = await readyRequest(admin);
    const cancelled = await schedule(admin, other.id);
    await call(admin, "admin_cancel_field_work", [cancelled, "SCHEDULED"]);
    expect(await errorOf(call(admin, "admin_start_field_work", [cancelled])), "Cancelled → In progress").toMatch(/field_work_changed/);
    expect(await errorOf(call(admin, "admin_complete_field_work", [cancelled, null, null])), "Cancelled → Completed").toMatch(/field_work_changed/);
  });

  it("a cancel from a stale screen is refused", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    await call(admin, "admin_start_field_work", [id]);
    expect(await errorOf(call(admin, "admin_cancel_field_work", [id, "SCHEDULED"]))).toMatch(/field_work_changed/);
    expect((await visitOf(id)).status).toBe("IN_PROGRESS");
    await call(admin, "admin_cancel_field_work", [id, "IN_PROGRESS"]);
    const visit = await visitOf(id);
    expect(visit.status).toBe("CANCELLED");
    expect(visit.cancelled_at).not.toBeNull();
    const [event] = await rowsAs<{ title: string }>(r.customer, "select title from public.service_request_events where request_id = $1 and event_type = 'FIELD_WORK_CANCELLED'", [r.id]);
    expect(event.title).toBe("Service visit cancelled");
  });

  it("cancelling the request cancels its open visit, whoever cancels it (internal activity only)", async () => {
    const admin = await newStaff("ADMIN");
    const byTeam = await readyRequest(admin);
    const teamVisit = await schedule(admin, byTeam.id);
    await call(admin, "admin_change_request_status", [byTeam.id, "ASSIGNED", "CANCELLED"]);
    expect((await visitOf(teamVisit)).status).toBe("CANCELLED");

    // The customer may cancel while the request is Under review, even with a visit booked.
    const byCustomer = await readyRequest(admin);
    const customerVisit = await schedule(admin, byCustomer.id);
    await call(admin, "admin_change_request_status", [byCustomer.id, "ASSIGNED", "UNDER_REVIEW"]);
    await t.as(byCustomer.customer, (tx) => tx.query("update public.service_requests set status = 'CANCELLED' where id = $1", [byCustomer.id]));
    expect(await statusOf(byCustomer.id)).toBe("CANCELLED");
    expect((await visitOf(customerVisit)).status).toBe("CANCELLED");
    const [log] = await rowsAs<{ visibility: string; metadata: Record<string, unknown> }>(admin, "select visibility, metadata from public.activity_logs where entity_id = $1 and action = 'FIELD_WORK_CANCELLED'", [byCustomer.id]);
    expect(log).toMatchObject({ visibility: "INTERNAL", metadata: { reason: "request_cancelled" } });
    const events = await rowsAs<{ event_type: string }>(byCustomer.customer, "select event_type from public.service_request_events where request_id = $1 and event_type = 'FIELD_WORK_CANCELLED'", [byCustomer.id]);
    expect(events).toEqual([]);
  });

  it("the database keeps timestamps consistent with the status, whoever writes", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const id = await schedule(admin, r.id);
    const forge = (sql: string) => errorOf(t.asService((tx) => tx.query(sql, [id])));
    expect(await forge("update public.field_work set status = 'COMPLETED' where id = $1")).toMatch(/field_work_timestamps_check/);
    expect(await forge("update public.field_work set status = 'IN_PROGRESS' where id = $1")).toMatch(/field_work_timestamps_check/);
    expect(await forge("update public.field_work set summary = 'Done' where id = $1")).toMatch(/field_work_summary_status_check/);
    expect(await forge("update public.field_work set request_id = gen_random_uuid() where id = $1")).toMatch(/another request/);
  });
});

// ── Evidence ─────────────────────────────────────────────────────────────────

describe("uploading evidence", () => {
  it("a file becomes evidence waiting for review, internal, with its real type and size from Storage", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const visit = await schedule(admin, r.id);
    const { evidenceId, path } = await upload(admin, r.id, { mime: "image/png", size: 123_456 });
    await call(admin, "admin_add_evidence", [r.id, evidenceId, "BEFORE", "  Front gate before work ", null, "2026-09-29T04:10:00Z", "C:\\fakepath\\gate.png"]);
    const [e] = await rowsAs<Record<string, unknown>>(admin, "select * from public.request_evidence where id = $1", [evidenceId]);
    expect(e).toMatchObject({
      request_id: r.id,
      customer_id: r.customer.profileId,
      field_work_id: visit,
      kind: "PHOTO",
      stage: "BEFORE",
      title: "Front gate before work",
      mime_type: "image/png",
      size_bytes: 123_456,
      review_status: "PENDING_REVIEW",
      visibility: "INTERNAL",
      published_at: null,
    });
    const [record] = await rowsAs<Record<string, unknown>>(admin, "select storage_path, uploaded_by, reviewed_by from public.request_evidence_internal where evidence_id = $1", [evidenceId]);
    expect(record).toEqual({ storage_path: path, uploaded_by: admin.profileId, reviewed_by: null });
    const [log] = await rowsAs<{ visibility: string; metadata: Record<string, unknown> }>(admin, "select visibility, metadata from public.activity_logs where entity_id = $1 and action = 'EVIDENCE_UPLOADED'", [r.id]);
    expect(log).toEqual({ visibility: "INTERNAL", metadata: { request_number: r.request_number, evidence_id: evidenceId, kind: "PHOTO", stage: "BEFORE" } });
    // Nothing about it reaches the customer yet.
    expect(await rowsAs(r.customer, "select * from public.request_evidence")).toEqual([]);
    expect(await visibleFiles(r.customer, [path])).toEqual([]);
  });

  it("registering the same upload twice changes nothing (double submission)", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const { evidenceId } = await addEvidence(admin, r.id);
    await call(admin, "admin_add_evidence", [r.id, evidenceId, "AFTER", "Hedge after trimming", null, null, null]);
    expect((await rowsAsService("select id from public.request_evidence where request_id = $1", [r.id])).length).toBe(1);
    expect((await rowsAsService("select id from public.activity_logs where entity_id = $1 and action = 'EVIDENCE_UPLOADED'", [r.id])).length).toBe(1);
    const other = await readyRequest(admin);
    expect(await errorOf(call(admin, "admin_add_evidence", [other.id, evidenceId, "AFTER", "Moved", null, null, null]))).toMatch(/evidence_exists/);
  });

  it("refuses a missing file, a file whose type or size is not accepted, and bad text", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const add = (evidenceId: string, stage = "AFTER", title = "Hedge after trimming", captured: string | null = null) =>
      errorOf(call(admin, "admin_add_evidence", [r.id, evidenceId, stage, title, null, captured, null]));
    expect(await add(randomUUID())).toMatch(/upload_missing/);

    // A file stored as one type under another type's name.
    const disguised = randomUUID();
    await upload(admin, r.id, { evidenceId: disguised, mime: "text/html", name: `${r.id}/${disguised}/original.jpg` });
    expect(await add(disguised)).toMatch(/file_not_allowed/);
    const mismatched = randomUUID();
    await upload(admin, r.id, { evidenceId: mismatched, mime: "application/pdf", name: `${r.id}/${mismatched}/original.jpg` });
    expect(await add(mismatched)).toMatch(/file_not_allowed/);

    const huge = randomUUID();
    await upload(admin, r.id, { evidenceId: huge, mime: "image/jpeg", size: evidenceMaxBytes.PHOTO + 1 });
    expect(await add(huge)).toMatch(/file_too_large/);
    const bigVideo = randomUUID();
    await upload(admin, r.id, { evidenceId: bigVideo, mime: "video/mp4", size: evidenceMaxBytes.VIDEO });
    expect(await add(bigVideo), "a video up to the limit").toBeNull();

    const ok = randomUUID();
    await upload(admin, r.id, { evidenceId: ok });
    expect(await add(ok, "SOMETIME")).toMatch(/invalid_stage/);
    expect(await add(ok, "AFTER", "Hi")).toMatch(/invalid_title/);
    expect(await add(ok, "AFTER", "x".repeat(121))).toMatch(/invalid_title/);
    expect(await add(ok, "AFTER", "Hedge", new Date(Date.now() + 3 * DAY).toISOString())).toMatch(/invalid_capture_time/);
    expect(await add(ok)).toBeNull();
  });

  it("Storage takes uploads only from admins, only into open requests, under an unused evidence id, with an accepted name", async () => {
    const admin = await newStaff("ADMIN");
    const inactive = await newStaff("ADMIN", { active: false });
    const r = await readyRequest(admin);
    const put = (user: TestUser | "anon", name: string) => {
      const run = (tx: Parameters<Parameters<TestDatabase["as"]>[1]>[0]) =>
        tx.query("insert into storage.objects (bucket_id, name, metadata) values ($1, $2, '{\"mimetype\":\"image/jpeg\",\"size\":10}')", [BUCKET, name]);
      return errorOf(user === "anon" ? t.asAnon(run) : t.as(user, run));
    };
    const good = () => evidenceObjectPath(r.id, randomUUID(), "image/jpeg");
    for (const who of [r.customer, r.ops, inactive, "anon" as const]) expect(await put(who, good()), String(typeof who === "string" ? who : who.email)).toMatch(/row-level security/);
    for (const name of [
      `${r.id}/../${randomUUID()}/original.jpg`,
      `${r.id}/${randomUUID()}/original.svg`,
      `${r.id}/${randomUUID()}/original.jpg.html`,
      `${r.id}/${randomUUID()}/photo.jpg`,
      `${r.id.toUpperCase()}/${randomUUID()}/original.jpg`,
      `${randomUUID()}/${randomUUID()}/original.jpg`,
      `${r.id}/original.jpg`,
    ]) {
      expect(await put(admin, name), name).toMatch(/row-level security/);
    }
    expect(await put(admin, good())).toBeNull();

    // A second file for the same evidence id, and an evidence id already registered, are refused.
    const id = randomUUID();
    expect(await put(admin, evidenceObjectPath(r.id, id, "image/jpeg"))).toBeNull();
    expect(await put(admin, evidenceObjectPath(r.id, id, "image/png"))).toMatch(/row-level security/);
    const { evidenceId } = await addEvidence(admin, r.id);
    expect(await put(admin, evidenceObjectPath(r.id, evidenceId, "application/pdf"))).toMatch(/row-level security/);

    // Other buckets get nothing.
    await t.asService((tx) => tx.query("insert into storage.buckets (id, name, public) values ('elsewhere', 'elsewhere', false) on conflict do nothing"));
    expect(await errorOf(t.as(admin, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('elsewhere', $1)", [good()])))).toMatch(/row-level security/);

    // Closed requests take no new files.
    await call(admin, "admin_change_request_status", [r.id, "ASSIGNED", "CANCELLED"]);
    expect(await put(admin, good())).toMatch(/row-level security/);
  });

  it("a file replaced after it was registered is never served, to the team or the customer", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const shared = await publishedEvidence(admin, r.id);
    const fresh = await upload(admin, r.id);
    const [record] = await rowsAs<{ file_etag: string }>(admin, "select file_etag from public.request_evidence_internal where evidence_id = $1", [shared.evidenceId]);
    expect(record.file_etag).toBe(shared.eTag);
    expect(await visibleFiles(r.customer, [shared.path])).toEqual([shared.path]);
    // What an overwriting upload link would do: the same name, new contents (Storage records a new eTag).
    await t.asService((tx) => tx.query("update storage.objects set metadata = metadata || '{\"eTag\": \"\\\"replaced\\\"\", \"size\": 99}'::jsonb where name = $1", [shared.path]));
    expect(await visibleFiles(r.customer, [shared.path]), "the customer").toEqual([]);
    expect(await visibleFiles(admin, [shared.path, fresh.path]), "the team, who can still check fresh uploads").toEqual([fresh.path]);
    // Nor can a replaced file be approved or shared.
    const pending = await addEvidence(admin, r.id, { title: "Replaced before review" });
    await t.asService((tx) => tx.query("update storage.objects set metadata = jsonb_set(metadata, '{eTag}', '\"other\"'::jsonb) where name = $1", [pending.path]));
    expect(await errorOf(call(admin, "admin_approve_evidence", [pending.evidenceId]))).toMatch(/evidence_file_changed/);
    const approved = await addEvidence(admin, r.id, { title: "Replaced after approval" });
    await call(admin, "admin_approve_evidence", [approved.evidenceId]);
    await t.asService((tx) => tx.query("update storage.objects set metadata = jsonb_set(metadata, '{eTag}', '\"other\"'::jsonb) where name = $1", [approved.path]));
    expect(await errorOf(call(admin, "admin_publish_evidence", [approved.evidenceId]))).toMatch(/evidence_file_changed/);
    const [still] = await rowsAsService<{ visibility: string }>("select visibility from public.request_evidence where id = $1", [approved.evidenceId]);
    expect(still.visibility).toBe("INTERNAL");
    // Put back as registered, it is served again.
    await t.asService((tx) => tx.query("update storage.objects set metadata = jsonb_set(metadata, '{eTag}', to_jsonb($2::text)) where name = $1", [shared.path, shared.eTag]));
    expect(await visibleFiles(r.customer, [shared.path])).toEqual([shared.path]);
  });

  it("no one can overwrite an evidence file, and only never-registered uploads can be removed", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const registered = await addEvidence(admin, r.id);
    const abandoned = await upload(admin, r.id);
    const overwrite = await t.as(admin, (tx) => tx.query("update storage.objects set metadata = '{}' where bucket_id = $1 and name = $2 returning name", [BUCKET, registered.path]));
    expect(overwrite.rows).toEqual([]);
    const remove = (user: TestUser, name: string) =>
      t.as(user, async (tx) => {
        await tx.query("select set_config('storage.allow_delete_query', 'true', true)");
        return (await tx.query<{ name: string }>("delete from storage.objects where bucket_id = $1 and name = $2 returning name", [BUCKET, name])).rows.length;
      });
    expect(await remove(r.customer, abandoned.path)).toBe(0);
    expect(await remove(admin, registered.path)).toBe(0);
    expect(await remove(admin, abandoned.path)).toBe(1);
    // Without going through the Storage API, even the owner of the data can't delete file records.
    expect(await errorOf(t.asService((tx) => tx.query("delete from storage.objects where name = $1", [registered.path])))).toMatch(/Storage API/);
  });
});

describe("reviewing and publishing evidence", () => {
  it("approve keeps it internal; publish makes it visible to the customer, with one event and one notification per batch", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const first = await addEvidence(admin, r.id, { stage: "BEFORE", title: "Before trimming" });
    const second = await addEvidence(admin, r.id, { stage: "AFTER", title: "After trimming" });
    await call(admin, "admin_approve_evidence", [first.evidenceId]);
    await call(admin, "admin_approve_evidence", [first.evidenceId]);
    expect(await rowsAs(r.customer, "select id from public.request_evidence")).toEqual([]);
    expect(await visibleFiles(r.customer, [first.path])).toEqual([]);
    const [review] = await rowsAs<{ reviewed_by: string }>(admin, "select reviewed_by from public.request_evidence_internal where evidence_id = $1", [first.evidenceId]);
    expect(review.reviewed_by).toBe(admin.profileId);

    await call(admin, "admin_publish_evidence", [first.evidenceId]);
    await call(admin, "admin_publish_evidence", [first.evidenceId]);
    await call(admin, "admin_approve_evidence", [second.evidenceId]);
    await call(admin, "admin_publish_evidence", [second.evidenceId]);

    const seen = await rowsAs<{ id: string; title: string; visibility: string }>(r.customer, "select id, title, visibility from public.request_evidence order by title");
    expect(seen.map((e) => e.title)).toEqual(["After trimming", "Before trimming"]);
    expect(await visibleFiles(r.customer, [first.path, second.path])).toEqual([first.path, second.path].sort());
    const evidenceEvents = await rowsAs<{ title: string; created_by: string | null }>(r.customer, "select title, created_by from public.service_request_events where request_id = $1 and event_type = 'EVIDENCE_AVAILABLE'", [r.id]);
    expect(evidenceEvents).toEqual([{ title: "New evidence shared", created_by: null }]);
    const notes = await rowsAs<{ title: string; message: string }>(r.customer, "select title, message from public.notifications where type = 'EVIDENCE_AVAILABLE'");
    expect(notes).toEqual([{ title: `New evidence on ${r.request_number}`, message: "New service evidence is available for Garden maintenance." }]);
    const published = await rowsAs<{ action: string }>(admin, "select action from public.activity_logs where entity_id = $1 and action = 'EVIDENCE_PUBLISHED'", [r.id]);
    expect(published).toHaveLength(2);

    // Once the customer has read it, the next batch gets a new notification, and a new
    // timeline entry once something else happened on the timeline in between.
    await t.as(r.customer, (tx) => tx.query("update public.notifications set read_at = now() where type = 'EVIDENCE_AVAILABLE'"));
    await call(admin, "admin_post_customer_update", [r.id, "More photos coming."]);
    await publishedEvidence(admin, r.id, { title: "Side path" });
    expect((await rowsAs(r.customer, "select id from public.notifications where type = 'EVIDENCE_AVAILABLE'")).length).toBe(2);
    expect((await rowsAs(r.customer, "select id from public.service_request_events where request_id = $1 and event_type = 'EVIDENCE_AVAILABLE'", [r.id])).length).toBe(2);
  });

  it("publishing needs approval first; rejected evidence can never be published; published evidence can't be rejected", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const pending = await addEvidence(admin, r.id);
    expect(await errorOf(call(admin, "admin_publish_evidence", [pending.evidenceId]))).toMatch(/evidence_not_approved/);
    await call(admin, "admin_reject_evidence", [pending.evidenceId, "Blurred. Neighbour's house in view."]);
    await call(admin, "admin_reject_evidence", [pending.evidenceId, "Again"]);
    expect(await errorOf(call(admin, "admin_publish_evidence", [pending.evidenceId]))).toMatch(/evidence_changed/);
    expect(await errorOf(call(admin, "admin_approve_evidence", [pending.evidenceId]))).toMatch(/evidence_changed/);
    const [rejected] = await rowsAs<{ review_status: string; visibility: string }>(admin, "select review_status, visibility from public.request_evidence where id = $1", [pending.evidenceId]);
    expect(rejected).toEqual({ review_status: "REJECTED", visibility: "INTERNAL" });
    const [record] = await rowsAs<{ review_note: string }>(admin, "select review_note from public.request_evidence_internal where evidence_id = $1", [pending.evidenceId]);
    expect(record.review_note).toBe("Blurred. Neighbour's house in view.");
    const log = await rowsAs<{ metadata: unknown }>(admin, "select metadata from public.activity_logs where entity_id = $1 and action = 'EVIDENCE_REJECTED'", [r.id]);
    expect(log).toHaveLength(1);
    expect(JSON.stringify(log)).not.toContain("Blurred");

    // Approved but not yet shared can still be rejected.
    const approved = await addEvidence(admin, r.id);
    await call(admin, "admin_approve_evidence", [approved.evidenceId]);
    await call(admin, "admin_reject_evidence", [approved.evidenceId, null]);

    const shared = await publishedEvidence(admin, r.id);
    expect(await errorOf(call(admin, "admin_reject_evidence", [shared.evidenceId, "Too late"]))).toMatch(/evidence_published/);
    expect(await errorOf(call(admin, "admin_approve_evidence", [randomUUID()]))).toMatch(/evidence_not_found/);

    // The customer sees the shared piece only.
    expect((await rowsAs<{ id: string }>(r.customer, "select id from public.request_evidence")).map((e) => e.id)).toEqual([shared.evidenceId]);
    expect(await rowsAs(r.customer, "select * from public.request_evidence_internal")).toEqual([]);
  });

  it("the database refuses customer-visible evidence that is not approved, whoever writes", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const pending = await addEvidence(admin, r.id);
    const forge = (sql: string) => errorOf(t.asService((tx) => tx.query(sql, [pending.evidenceId])));
    expect(await forge("update public.request_evidence set visibility = 'CUSTOMER_VISIBLE', published_at = now() where id = $1")).toMatch(/request_evidence_visibility_check/);
    await call(admin, "admin_reject_evidence", [pending.evidenceId, null]);
    expect(await forge("update public.request_evidence set visibility = 'CUSTOMER_VISIBLE', published_at = now() where id = $1")).toMatch(/request_evidence_visibility_check/);
    expect(await forge("update public.request_evidence set review_status = 'APPROVED', visibility = 'CUSTOMER_VISIBLE' where id = $1")).toMatch(/request_evidence_published_check/);
    expect(await forge("update public.request_evidence set kind = 'VIDEO' where id = $1")).toMatch(/request_evidence_file_check/);
  });

  it("customers, operations staff and inactive admins cannot review or publish", async () => {
    const admin = await newStaff("ADMIN");
    const inactive = await newStaff("ADMIN", { active: false });
    const r = await readyRequest(admin);
    const e = await addEvidence(admin, r.id);
    await call(admin, "admin_approve_evidence", [e.evidenceId]);
    for (const who of [r.customer, r.ops, inactive]) {
      for (const [fn, args] of [
        ["admin_approve_evidence", [e.evidenceId]],
        ["admin_reject_evidence", [e.evidenceId, null]],
        ["admin_publish_evidence", [e.evidenceId]],
        ["admin_add_evidence", [r.id, randomUUID(), "AFTER", "Forged", null, null, null]],
      ] as const) {
        expect(await errorOf(call(who, fn, [...args])), `${fn} as ${who.email}`).toMatch(/not_authorized/);
      }
    }
    const [row] = await rowsAsService<{ visibility: string }>("select visibility from public.request_evidence where id = $1", [e.evidenceId]);
    expect(row.visibility).toBe("INTERNAL");
  });
});

// ── Customer isolation ──────────────────────────────────────────────────────

describe("customer isolation", () => {
  it("customer A never reaches customer B's visits, evidence or files, and the other way round", async () => {
    const admin = await newStaff("ADMIN");
    const a = await readyRequest(admin, await newCustomer("iso-a"));
    const b = await readyRequest(admin, await newCustomer("iso-b"));
    await schedule(admin, a.id);
    await schedule(admin, b.id);
    const aFile = await publishedEvidence(admin, a.id, { title: "A's garden" });
    const bFile = await publishedEvidence(admin, b.id, { title: "B's garden" });
    const aInternal = await addEvidence(admin, a.id, { title: "A internal" });

    for (const [me, mine, theirs] of [
      [a, aFile, bFile],
      [b, bFile, aFile],
    ] as const) {
      const visits = await rowsAs<{ request_id: string }>(me.customer, "select request_id from public.field_work");
      expect(visits.map((v) => v.request_id)).toEqual([me.id]);
      const evidence = await rowsAs<{ id: string }>(me.customer, "select id from public.request_evidence");
      expect(evidence.map((e) => e.id)).toEqual([mine.evidenceId]);
      expect(await rowsAs(me.customer, "select id from public.request_evidence where id = $1", [theirs.evidenceId])).toEqual([]);
      expect(await visibleFiles(me.customer, [mine.path, theirs.path, aInternal.path])).toEqual([mine.path]);
      // Tampering with the filters changes nothing: RLS decides.
      expect(await rowsAs(me.customer, "select id from public.request_evidence where customer_id = $1 or true", [theirs === bFile ? b.customer.profileId : a.customer.profileId])).toEqual([{ id: mine.evidenceId }]);
    }
    expect(await visibleFiles("anon", [aFile.path, bFile.path])).toEqual([]);
    for (const relation of ["field_work", "field_work_internal", "request_evidence", "request_evidence_internal"]) {
      expect(await errorOf(t.asAnon((tx) => tx.query(`select * from public.${relation}`))), relation).toMatch(/permission denied/);
    }
  });

  it("the file-access helpers answer for the signed-in person only", async () => {
    const admin = await newStaff("ADMIN");
    const a = await readyRequest(admin, await newCustomer("helper-a"));
    const b = await newCustomer("helper-b");
    const file = await publishedEvidence(admin, a.id);
    const can = async (user: TestUser) => (await rowsAs<{ ok: boolean }>(user, "select app.can_read_published_evidence_file($1, $2) as ok", [file.path, file.eTag]))[0].ok;
    expect(await can(a.customer)).toBe(true);
    expect(await can(b)).toBe(false);
    expect((await rowsAs<{ ok: boolean }>(b, "select app.can_upload_evidence_file($1) as ok", [evidenceObjectPath(a.id, randomUUID(), "image/jpeg")]))[0].ok).toBe(false);
    expect((await rowsAs<{ ok: boolean }>(b, "select app.can_remove_evidence_file($1) as ok", [file.path]))[0].ok).toBe(false);
  });
});

// ── Completing the request ──────────────────────────────────────────────────

describe("completing a request that had field work", () => {
  const complete = (admin: TestUser, id: string) => errorOf(call(admin, "admin_change_request_status", [id, "IN_PROGRESS", "COMPLETED"]));

  it("needs the visit completed, all evidence reviewed and at least one piece published", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const visit = await schedule(admin, r.id);
    await call(admin, "admin_start_field_work", [visit]);
    expect(await complete(admin, r.id)).toMatch(/field_work_open/);
    await call(admin, "admin_complete_field_work", [visit, "Garden maintenance completed.", null]);
    expect(await complete(admin, r.id)).toMatch(/evidence_required/);
    const pending = await addEvidence(admin, r.id);
    expect(await complete(admin, r.id)).toMatch(/evidence_pending/);
    await call(admin, "admin_approve_evidence", [pending.evidenceId]);
    expect(await complete(admin, r.id), "approved but not shared").toMatch(/evidence_required/);
    await call(admin, "admin_publish_evidence", [pending.evidenceId]);
    expect(await complete(admin, r.id)).toBeNull();
    expect(await statusOf(r.id)).toBe("COMPLETED");
  });

  it("a request without field work completes as before (Phase 2B)", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    await call(admin, "admin_change_request_status", [r.id, "ASSIGNED", "IN_PROGRESS"]);
    expect(await complete(admin, r.id)).toBeNull();
  });

  it("a cancelled visit doesn't hold the request up, but evidence waiting for review does", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const visit = await schedule(admin, r.id);
    await call(admin, "admin_cancel_field_work", [visit, "SCHEDULED"]);
    await call(admin, "admin_change_request_status", [r.id, "ASSIGNED", "IN_PROGRESS"]);
    const e = await addEvidence(admin, r.id);
    expect(await complete(admin, r.id)).toMatch(/evidence_pending/);
    await call(admin, "admin_reject_evidence", [e.evidenceId, null]);
    expect(await complete(admin, r.id)).toBeNull();
  });

  it("the app's completion check matches the database's", async () => {
    const cases: [Parameters<typeof completionBlocker>[0], Parameters<typeof completionBlocker>[1], string | null][] = [
      [[{ status: "IN_PROGRESS" }], [], "field_work_open"],
      [[{ status: "COMPLETED" }], [], "evidence_required"],
      [[{ status: "COMPLETED" }], [{ review_status: "PENDING_REVIEW", visibility: "INTERNAL" }], "evidence_pending"],
      [[{ status: "COMPLETED" }], [{ review_status: "APPROVED", visibility: "CUSTOMER_VISIBLE" }], null],
      [[{ status: "CANCELLED" }], [], null],
      [[], [], null],
    ];
    for (const [visits, evidence, expected] of cases) expect(completionBlocker(visits, evidence)).toBe(expected);
  });

  it("a closed request can no longer be changed: no visits, notes, evidence, reviews or publishing", async () => {
    const admin = await newStaff("ADMIN");
    const r = await readyRequest(admin);
    const visit = await schedule(admin, r.id);
    await call(admin, "admin_start_field_work", [visit]);
    await call(admin, "admin_complete_field_work", [visit, null, null]);
    const approved = await addEvidence(admin, r.id);
    await call(admin, "admin_approve_evidence", [approved.evidenceId]);
    const shared = await publishedEvidence(admin, r.id);
    const pending = await upload(admin, r.id);
    await call(admin, "admin_change_request_status", [r.id, "IN_PROGRESS", "COMPLETED"]);

    const when = tomorrow();
    const attempts: [string, unknown[]][] = [
      ["admin_schedule_field_work", [r.id, when.start, when.end, null]],
      ["admin_record_field_work_notes", [visit, "Late note"]],
      ["admin_add_evidence", [r.id, pending.evidenceId, "AFTER", "Late photo", null, null, null]],
      ["admin_publish_evidence", [approved.evidenceId]],
      ["admin_reject_evidence", [approved.evidenceId, null]],
    ];
    for (const [fn, args] of attempts) expect(await errorOf(call(admin, fn, args)), fn).toMatch(/request_closed/);
    expect(await errorOf(call(admin, "admin_unassign_request", [r.id])), "Phase 2B: a closed request keeps its assignment").toMatch(/request_closed/);
    expect((await rowsAs<{ id: string }>(r.customer, "select id from public.request_evidence")).map((e) => e.id)).toEqual([shared.evidenceId]);
  });
});

describe("account deletion still cascades", () => {
  it("removing a customer removes their visits and evidence records; removing staff keeps the evidence", async () => {
    const admin = await newStaff("ADMIN");
    const leaving = await readyRequest(admin, await newCustomer("leaving"));
    await schedule(admin, leaving.id);
    await publishedEvidence(admin, leaving.id);
    await t.db.query("delete from auth.users where id = $1", [leaving.customer.authUserId]);
    expect(await rowsAsService("select id from public.field_work where request_id = $1", [leaving.id])).toEqual([]);
    expect(await rowsAsService("select id from public.request_evidence where request_id = $1", [leaving.id])).toEqual([]);

    const staying = await readyRequest(admin, await newCustomer("staying"));
    const uploader = await newStaff("ADMIN");
    const e = await addEvidence(uploader, staying.id);
    await t.db.query("delete from auth.users where id = $1", [uploader.authUserId]);
    const [record] = await rowsAsService<{ uploaded_by: string | null }>("select uploaded_by from public.request_evidence_internal where evidence_id = $1", [e.evidenceId]);
    expect(record.uploaded_by).toBeNull();
  });
});
