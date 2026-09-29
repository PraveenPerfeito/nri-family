import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminStatusTransitions, requestStatuses } from "@/lib/admin/domain";
import { createTestDatabase, errorOf, type TestDatabase, type TestUser } from "./harness";

/*
 * Phase 2B security tests against the real migrations (2A + 2B) in Postgres:
 * who counts as an admin, what admins can read and do (only through the
 * admin functions), what customers still cannot, and that internal notes and
 * internal activity never reach a customer.
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

const ADMIN_VIEWS = [
  "admin_request_status_counts",
  "admin_customer_overview",
  "admin_property_overview",
  "admin_team_overview",
];

const newCustomer = (label = "customer") => t.createUser(nextEmail(label), { full_name: `Customer ${label}` });

/** Internal staff the way the owner creates them: an account, a role and a team membership. */
async function newStaff(role: "ADMIN" | "OPERATIONS", { active = true, member = true } = {}) {
  const user = await t.createUser(nextEmail(role.toLowerCase()), { full_name: `${role} person` });
  await t.asService(async (tx) => {
    await tx.query("update public.profiles set role = $2 where id = $1", [user.profileId, role]);
    if (member) await tx.query("insert into public.team_members (profile_id, is_active) values ($1, $2)", [user.profileId, active]);
  });
  return user;
}

async function addProperty(user: TestUser, name = "Chennai House") {
  const { rows } = await t.as(user, (tx) =>
    tx.query<{ id: string }>("insert into public.properties (name, property_type, city) values ($1, 'HOUSE', 'Chennai') returning id", [name]),
  );
  return rows[0].id;
}

async function addRequest(user: TestUser, propertyId: string | null = null, title = "Garden maintenance") {
  const { rows } = await t.as(user, (tx) =>
    tx.query<{ id: string; request_number: string }>(
      "insert into public.service_requests (property_id, category, title, description, priority) values ($1, 'GARDEN_MAINTENANCE', $2, 'Please trim the hedge.', 'NORMAL') returning id, request_number",
      [propertyId, title],
    ),
  );
  return rows[0];
}

/** Call an admin function as `user`. */
const call = (user: TestUser, fn: string, args: unknown[]) =>
  t.as(user, (tx) => tx.query(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")})`, args));

const statusOf = async (id: string) =>
  (await t.asService((tx) => tx.query<{ status: string }>("select status from public.service_requests where id = $1", [id]))).rows[0].status;

const rowsAs = async <T,>(user: TestUser, sql: string, params: unknown[] = []) => (await t.as(user, (tx) => tx.query<T>(sql, params))).rows;

/** Move a request through valid admin steps (assigning first where required). */
async function moveTo(admin: TestUser, requestId: string, path: string[], assignee?: TestUser) {
  for (const next of path) {
    if ((next === "ASSIGNED" || next === "IN_PROGRESS") && assignee) await call(admin, "admin_assign_request", [requestId, assignee.profileId]);
    await call(admin, "admin_change_request_status", [requestId, await statusOf(requestId), next]);
  }
}

describe("who counts as an admin", () => {
  const isAdmin = async (user: TestUser) => (await rowsAs<{ ok: boolean }>(user, "select app.is_admin() as ok"))[0].ok;

  it("an ADMIN with an active team membership", async () => {
    expect(await isAdmin(await newStaff("ADMIN"))).toBe(true);
  });

  it("not an ADMIN without a membership, an inactive ADMIN, OPERATIONS staff or a customer", async () => {
    expect(await isAdmin(await newStaff("ADMIN", { member: false }))).toBe(false);
    expect(await isAdmin(await newStaff("ADMIN", { active: false }))).toBe(false);
    expect(await isAdmin(await newStaff("OPERATIONS"))).toBe(false);
    expect(await isAdmin(await newCustomer("plain"))).toBe(false);
  });

  it("only ADMIN and OPERATIONS profiles can be team members", async () => {
    const customer = await newCustomer("not-staff");
    expect(await errorOf(t.asService((tx) => tx.query("insert into public.team_members (profile_id) values ($1)", [customer.profileId])))).toMatch(
      /ADMIN or OPERATIONS/,
    );
  });

  it("customers cannot make themselves staff or admin", async () => {
    const customer = await newCustomer("climber");
    const attempt = (sql: string, params: unknown[]) => errorOf(t.as(customer, (tx) => tx.query(sql, params)));
    expect(await attempt("update public.profiles set role = 'ADMIN' where id = $1", [customer.profileId])).toMatch(/permission denied/);
    expect(await attempt("insert into public.team_members (profile_id) values ($1)", [customer.profileId])).toMatch(/permission denied/);
    expect(await attempt("select app.is_active_team_member($1)", [customer.profileId])).toMatch(/permission denied/);
  });

  it("deactivating an admin removes their access at once", async () => {
    const admin = await newStaff("ADMIN");
    const customer = await newCustomer("watched");
    const request = await addRequest(customer);
    expect((await rowsAs(admin, "select id from public.service_requests where id = $1", [request.id])).length).toBe(1);
    await t.asService((tx) => tx.query("update public.team_members set is_active = false where profile_id = $1", [admin.profileId]));
    expect((await rowsAs(admin, "select id from public.service_requests where id = $1", [request.id])).length).toBe(0);
    expect(await errorOf(call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "UNDER_REVIEW"]))).toMatch(/not_authorized/);
  });
});

describe("admin read access", () => {
  it("admins read every customer's profile, properties, requests, timeline and activity", async () => {
    const admin = await newStaff("ADMIN");
    const a = await newCustomer("reader-a");
    const b = await newCustomer("reader-b");
    const property = await addProperty(a);
    const request = await addRequest(b);
    await call(admin, "admin_add_internal_note", [request.id, "Customer prefers visits after 5 PM."]);
    expect((await rowsAs(admin, "select id from public.profiles where id in ($1, $2)", [a.profileId, b.profileId])).length).toBe(2);
    expect((await rowsAs(admin, "select id from public.properties where id = $1", [property])).length).toBe(1);
    expect((await rowsAs(admin, "select id from public.service_requests where id = $1", [request.id])).length).toBe(1);
    const events = await rowsAs<{ visibility: string }>(admin, "select visibility from public.service_request_events where request_id = $1", [request.id]);
    expect(events.map((e) => e.visibility).sort()).toEqual(["CUSTOMER", "INTERNAL"]);
    const activity = await rowsAs<{ visibility: string }>(admin, "select visibility from public.activity_logs where customer_id = $1", [b.profileId]);
    expect(new Set(activity.map((e) => e.visibility))).toEqual(new Set(["CUSTOMER", "INTERNAL"]));
  });

  it("admins cannot edit customer identity or property ownership, or delete requests", async () => {
    const admin = await newStaff("ADMIN");
    const customer = await newCustomer("owner");
    const property = await addProperty(customer);
    const request = await addRequest(customer, property);
    const attempt = (sql: string, params: unknown[]) => errorOf(t.as(admin, (tx) => tx.query(sql, params)));
    // Admins have no write policy on customer rows: the update matches nothing, or is refused outright.
    await t.as(admin, (tx) => tx.query("update public.profiles set full_name = 'Changed' where id = $1", [customer.profileId]));
    await t.as(admin, (tx) => tx.query("update public.properties set name = 'Changed' where id = $1", [property]));
    const unchanged = await t.asService((tx) =>
      tx.query<{ full_name: string; name: string }>(
        "select p.full_name, pr.name from public.profiles p join public.properties pr on pr.owner_id = p.id where pr.id = $1",
        [property],
      ),
    );
    expect(unchanged.rows[0]).toEqual({ full_name: "Customer owner", name: "Chennai House" });
    expect(await attempt("update public.properties set owner_id = $2 where id = $1", [property, admin.profileId])).toMatch(/permission denied/);
    expect(await attempt("delete from public.service_requests where id = $1", [request.id])).toMatch(/permission denied/);
    expect(await attempt("update public.service_requests set status = 'COMPLETED' where id = $1", [request.id])).toBeNull();
    expect(await statusOf(request.id)).toBe("SUBMITTED");
  });

  it("customers still see only their own rows, and nothing through the admin overviews", async () => {
    const a = await newCustomer("iso-a");
    const b = await newCustomer("iso-b");
    await addRequest(a);
    await addRequest(b);
    for (const view of ADMIN_VIEWS) {
      expect((await rowsAs(b, `select * from public.${view}`)).length, view).toBe(0);
    }
    expect((await rowsAs(b, "select id from public.service_requests where customer_id = $1", [a.profileId])).length).toBe(0);
    expect((await rowsAs(b, "select * from public.team_members")).length).toBe(0);
    expect((await rowsAs(b, "select * from public.request_assignments")).length).toBe(0);
  });

  it("visitors with only the publishable key can read none of the new tables or views", async () => {
    for (const relation of ["team_members", "request_assignments", ...ADMIN_VIEWS]) {
      expect(await errorOf(t.asAnon((tx) => tx.query(`select * from public.${relation}`))), relation).toMatch(/permission denied/);
    }
    expect(await errorOf(t.asAnon((tx) => tx.query("select public.admin_add_internal_note(gen_random_uuid(), 'x')")))).toMatch(/permission denied/);
  });
});

describe("status changes", () => {
  it("an admin moves a request along; the customer gets the timeline event and a notification", async () => {
    const admin = await newStaff("ADMIN");
    const customer = await newCustomer("status");
    const request = await addRequest(customer, null, "Property inspection");
    await call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "UNDER_REVIEW"]);
    expect(await statusOf(request.id)).toBe("UNDER_REVIEW");
    const events = await rowsAs<{ title: string; visibility: string; created_by: string }>(
      customer,
      "select title, visibility, created_by from public.service_request_events where request_id = $1 order by created_at",
      [request.id],
    );
    expect(events.map((e) => e.title)).toEqual(["Request submitted", "Team review started"]);
    expect(events[1]).toMatchObject({ visibility: "CUSTOMER", created_by: admin.profileId });
    const notes = await rowsAs<{ title: string; message: string }>(customer, "select title, message from public.notifications order by created_at desc limit 1");
    expect(notes[0]).toEqual({ title: `Update on ${request.request_number}`, message: "Property inspection is now: Under review." });
    const activity = await rowsAs<{ action: string; actor_id: string }>(
      customer,
      "select action, actor_id from public.activity_logs where entity_id = $1 and action = 'REQUEST_STATUS_CHANGED'",
      [request.id],
    );
    expect(activity).toEqual([{ action: "REQUEST_STATUS_CHANGED", actor_id: admin.profileId }]);
  });

  it("refuses a status change the lifecycle doesn't allow", async () => {
    const admin = await newStaff("ADMIN");
    const request = await addRequest(await newCustomer("skip"));
    expect(await errorOf(call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "COMPLETED"]))).toMatch(/invalid_transition/);
    expect(await errorOf(call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "NONSENSE"]))).toMatch(/invalid_transition/);
    expect(await statusOf(request.id)).toBe("SUBMITTED");
  });

  it("refuses a change based on a stale screen", async () => {
    const admin = await newStaff("ADMIN");
    const request = await addRequest(await newCustomer("stale"));
    await call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "UNDER_REVIEW"]);
    expect(await errorOf(call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "CANCELLED"]))).toMatch(/stale_status/);
    expect(await statusOf(request.id)).toBe("UNDER_REVIEW");
  });

  it("ASSIGNED and IN_PROGRESS need a responsible team member", async () => {
    const admin = await newStaff("ADMIN");
    const ops = await newStaff("OPERATIONS");
    const request = await addRequest(await newCustomer("needs"));
    await call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "UNDER_REVIEW"]);
    expect(await errorOf(call(admin, "admin_change_request_status", [request.id, "UNDER_REVIEW", "ASSIGNED"]))).toMatch(/assignment_required/);
    await call(admin, "admin_assign_request", [request.id, ops.profileId]);
    await call(admin, "admin_change_request_status", [request.id, "UNDER_REVIEW", "ASSIGNED"]);
    await call(admin, "admin_change_request_status", [request.id, "ASSIGNED", "IN_PROGRESS"]);
    await call(admin, "admin_change_request_status", [request.id, "IN_PROGRESS", "COMPLETED"]);
    expect(await statusOf(request.id)).toBe("COMPLETED");
    expect(await errorOf(call(admin, "admin_change_request_status", [request.id, "COMPLETED", "UNDER_REVIEW"]))).toMatch(/invalid_transition/);
  });

  it("customers and OPERATIONS staff cannot use the admin status function", async () => {
    const customer = await newCustomer("self-service");
    const ops = await newStaff("OPERATIONS");
    const request = await addRequest(customer);
    expect(await errorOf(call(customer, "admin_change_request_status", [request.id, "SUBMITTED", "UNDER_REVIEW"]))).toMatch(/not_authorized/);
    expect(await errorOf(call(ops, "admin_change_request_status", [request.id, "SUBMITTED", "UNDER_REVIEW"]))).toMatch(/not_authorized/);
    expect(await statusOf(request.id)).toBe("SUBMITTED");
  });

  it("customers keep exactly their Phase 2A rights: cancel their own open request, nothing else", async () => {
    const customer = await newCustomer("keeps");
    const mine = await addRequest(customer);
    await t.as(customer, (tx) => tx.query("update public.service_requests set status = 'COMPLETED' where id = $1", [mine.id])).catch(() => undefined);
    expect(await statusOf(mine.id)).toBe("SUBMITTED");
    await t.as(customer, (tx) => tx.query("update public.service_requests set status = 'CANCELLED' where id = $1", [mine.id]));
    expect(await statusOf(mine.id)).toBe("CANCELLED");
  });

  it("the database lifecycle matches the app's transition table exactly", async () => {
    const pairs = await t.asService((tx) =>
      tx.query<{ from_status: string; to_status: string; allowed: boolean }>(
        `select f.s as from_status, t2.s as to_status, app.admin_status_transition_allowed(f.s, t2.s) as allowed
         from unnest($1::text[]) f(s) cross join unnest($1::text[]) t2(s)`,
        [requestStatuses],
      ),
    );
    expect(pairs.rows).toHaveLength(49);
    for (const { from_status, to_status, allowed } of pairs.rows) {
      const inApp = adminStatusTransitions[from_status as keyof typeof adminStatusTransitions].includes(to_status as never);
      expect(allowed, `${from_status} → ${to_status}`).toBe(inApp);
    }
  });
});

describe("assignment", () => {
  it("an admin assigns an active team member; only the team can see it", async () => {
    const admin = await newStaff("ADMIN");
    const ops = await newStaff("OPERATIONS");
    const customer = await newCustomer("assigned");
    const request = await addRequest(customer);
    await call(admin, "admin_assign_request", [request.id, ops.profileId]);
    const [row] = await rowsAs<{ assignee_id: string; assigned_by: string }>(admin, "select assignee_id, assigned_by from public.request_assignments where request_id = $1", [
      request.id,
    ]);
    expect(row).toEqual({ assignee_id: ops.profileId, assigned_by: admin.profileId });
    expect((await rowsAs(customer, "select * from public.request_assignments")).length).toBe(0);
    const internal = await rowsAs<{ action: string; visibility: string }>(admin, "select action, visibility from public.activity_logs where entity_id = $1 and action like 'REQUEST_%ASSIGNED'", [request.id]);
    expect(internal).toEqual([{ action: "REQUEST_ASSIGNED", visibility: "INTERNAL" }]);
    expect((await rowsAs(customer, "select * from public.activity_logs where action = 'REQUEST_ASSIGNED'")).length).toBe(0);
  });

  it("reassigning is logged; assigning the same person again changes nothing", async () => {
    const admin = await newStaff("ADMIN");
    const first = await newStaff("OPERATIONS");
    const second = await newStaff("OPERATIONS");
    const request = await addRequest(await newCustomer("reassign"));
    await call(admin, "admin_assign_request", [request.id, first.profileId]);
    await call(admin, "admin_assign_request", [request.id, first.profileId]);
    await call(admin, "admin_assign_request", [request.id, second.profileId]);
    const actions = await rowsAs<{ action: string }>(admin, "select action from public.activity_logs where entity_id = $1 and visibility = 'INTERNAL' order by created_at", [request.id]);
    expect(actions.map((a) => a.action)).toEqual(["REQUEST_ASSIGNED", "REQUEST_REASSIGNED"]);
  });

  it("only active team members can be assigned, and only to open requests", async () => {
    const admin = await newStaff("ADMIN");
    const customer = await newCustomer("assign-rules");
    const inactive = await newStaff("OPERATIONS", { active: false });
    const request = await addRequest(customer);
    expect(await errorOf(call(admin, "admin_assign_request", [request.id, customer.profileId]))).toMatch(/invalid_assignee/);
    expect(await errorOf(call(admin, "admin_assign_request", [request.id, inactive.profileId]))).toMatch(/invalid_assignee/);
    expect(await errorOf(call(admin, "admin_assign_request", [request.id, "00000000-0000-4000-8000-000000000000"]))).toMatch(/invalid_assignee/);
    await call(admin, "admin_change_request_status", [request.id, "SUBMITTED", "CANCELLED"]);
    expect(await errorOf(call(admin, "admin_assign_request", [request.id, admin.profileId]))).toMatch(/request_closed/);
  });

  it("someone stays responsible while a request is assigned or in progress", async () => {
    const admin = await newStaff("ADMIN");
    const ops = await newStaff("OPERATIONS");
    const request = await addRequest(await newCustomer("unassign"));
    await moveTo(admin, request.id, ["UNDER_REVIEW", "ASSIGNED"], ops);
    expect(await errorOf(call(admin, "admin_unassign_request", [request.id]))).toMatch(/assignment_required/);
    await call(admin, "admin_change_request_status", [request.id, "ASSIGNED", "UNDER_REVIEW"]);
    await call(admin, "admin_unassign_request", [request.id]);
    expect((await rowsAs(admin, "select * from public.request_assignments where request_id = $1", [request.id])).length).toBe(0);
    const last = await rowsAs<{ action: string }>(admin, "select action from public.activity_logs where entity_id = $1 order by created_at desc limit 1", [request.id]);
    expect(last[0].action).toBe("REQUEST_UNASSIGNED");
  });

  it("customers cannot assign anyone, even through the function", async () => {
    const customer = await newCustomer("self-assign");
    const request = await addRequest(customer);
    expect(await errorOf(call(customer, "admin_assign_request", [request.id, customer.profileId]))).toMatch(/not_authorized/);
    expect(await errorOf(t.as(customer, (tx) => tx.query("insert into public.request_assignments (request_id, assignee_id) values ($1, $2)", [request.id, customer.profileId])))).toMatch(
      /permission denied/,
    );
  });
});

describe("internal notes and customer updates", () => {
  it("an internal note is stored as INTERNAL and never reaches the customer", async () => {
    const admin = await newStaff("ADMIN");
    const customer = await newCustomer("noted");
    const request = await addRequest(customer);
    await call(admin, "admin_add_internal_note", [request.id, "  Ravi has not replied on WhatsApp yet.  "]);
    const [note] = await rowsAs<{ event_type: string; visibility: string; title: string; description: string; created_by: string }>(
      admin,
      "select event_type, visibility, title, description, created_by from public.service_request_events where request_id = $1 and event_type = 'INTERNAL_NOTE'",
      [request.id],
    );
    expect(note).toEqual({ event_type: "INTERNAL_NOTE", visibility: "INTERNAL", title: "Internal note", description: "Ravi has not replied on WhatsApp yet.", created_by: admin.profileId });
    const seen = await rowsAs<{ description: string | null }>(customer, "select description from public.service_request_events where request_id = $1", [request.id]);
    expect(seen.some((e) => e.description?.includes("Ravi"))).toBe(false);
    expect((await rowsAs(customer, "select * from public.activity_logs where action = 'INTERNAL_NOTE_ADDED'")).length).toBe(0);
    const logged = await rowsAs<{ metadata: Record<string, unknown> }>(admin, "select metadata from public.activity_logs where entity_id = $1 and action = 'INTERNAL_NOTE_ADDED'", [request.id]);
    expect(JSON.stringify(logged[0].metadata)).not.toContain("Ravi");
  });

  it("a customer update appears on the customer's timeline, with a notification and activity", async () => {
    const admin = await newStaff("ADMIN");
    const customer = await newCustomer("updated");
    const request = await addRequest(customer, null, "Security check");
    await call(admin, "admin_post_customer_update", [request.id, "Our coordinator will visit on Friday morning."]);
    const events = await rowsAs<{ title: string; description: string | null }>(customer, "select title, description from public.service_request_events where request_id = $1 order by created_at", [request.id]);
    expect(events.at(-1)).toEqual({ title: "Update from our team", description: "Our coordinator will visit on Friday morning." });
    const [note] = await rowsAs<{ type: string; title: string; message: string }>(customer, "select type, title, message from public.notifications order by created_at desc limit 1");
    expect(note).toEqual({ type: "REQUEST_UPDATE", title: `Update on ${request.request_number}`, message: "Our team added an update to Security check." });
    expect((await rowsAs(customer, "select * from public.activity_logs where action = 'TEAM_UPDATE_POSTED'")).length).toBe(1);
  });

  it("rejects empty or oversized text", async () => {
    const admin = await newStaff("ADMIN");
    const request = await addRequest(await newCustomer("empty"));
    expect(await errorOf(call(admin, "admin_add_internal_note", [request.id, "   "]))).toMatch(/invalid_text/);
    expect(await errorOf(call(admin, "admin_post_customer_update", [request.id, "x".repeat(2001)]))).toMatch(/invalid_text/);
  });

  it("the database refuses an internal note stored as customer-visible, whoever writes it", async () => {
    const request = await addRequest(await newCustomer("backstop"));
    const forged = (visibility: string, type: string) =>
      errorOf(
        t.asService((tx) =>
          tx.query("insert into public.service_request_events (request_id, event_type, title, description, visibility) values ($1, $2, 'x', 'Leaked note', $3)", [request.id, type, visibility]),
        ),
      );
    expect(await forged("CUSTOMER", "INTERNAL_NOTE")).toMatch(/note_visibility_check/);
    expect(await forged("INTERNAL", "TEAM_UPDATE")).toMatch(/note_visibility_check/);
  });

  it("customers cannot add notes or updates", async () => {
    const customer = await newCustomer("forger");
    const request = await addRequest(customer);
    expect(await errorOf(call(customer, "admin_add_internal_note", [request.id, "Hello"]))).toMatch(/not_authorized/);
    expect(await errorOf(call(customer, "admin_post_customer_update", [request.id, "Hello"]))).toMatch(/not_authorized/);
  });
});

describe("admin overviews", () => {
  it("count requests by status, customers' properties and requests, and each member's open work", async () => {
    const admin = await newStaff("ADMIN");
    const ops = await newStaff("OPERATIONS");
    const customer = await newCustomer("overview");
    const property = await addProperty(customer, "Coimbatore Apartment");
    const done = await addRequest(customer, property, "Cleaning");
    const open = await addRequest(customer, property, "Maintenance");
    await moveTo(admin, done.id, ["UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED"], ops);
    await call(admin, "admin_assign_request", [open.id, ops.profileId]);

    const counts = await rowsAs<{ status: string; total: number }>(admin, "select status, total from public.admin_request_status_counts");
    expect(counts.find((c) => c.status === "COMPLETED")?.total).toBeGreaterThanOrEqual(1);
    const [c] = await rowsAs<Record<string, unknown>>(admin, "select * from public.admin_customer_overview where id = $1", [customer.profileId]);
    expect(c).toMatchObject({ property_count: 1, request_count: 2, open_request_count: 1 });
    expect((await rowsAs(admin, "select * from public.admin_customer_overview where id = $1", [ops.profileId])).length).toBe(0);
    const [p] = await rowsAs<Record<string, unknown>>(admin, "select * from public.admin_property_overview where id = $1", [property]);
    expect(p).toMatchObject({ owner_name: "Customer overview", request_count: 2, open_request_count: 1 });
    const [m] = await rowsAs<Record<string, unknown>>(admin, "select * from public.admin_team_overview where profile_id = $1", [ops.profileId]);
    expect(m).toMatchObject({ role: "OPERATIONS", is_active: true, open_assigned_count: 1, total_assigned_count: 2 });
  });
});

describe("account deletion still cascades", () => {
  it("removing a customer removes their requests and assignments; removing staff removes their assignments", async () => {
    const admin = await newStaff("ADMIN");
    const ops = await newStaff("OPERATIONS");
    const customer = await newCustomer("leaving");
    const request = await addRequest(customer);
    await moveTo(admin, request.id, ["UNDER_REVIEW", "ASSIGNED"], ops);
    await t.db.query("delete from auth.users where id = $1", [customer.authUserId]);
    expect((await rowsAs(admin, "select * from public.request_assignments where request_id = $1", [request.id])).length).toBe(0);

    const other = await addRequest(await newCustomer("stays"));
    await call(admin, "admin_assign_request", [other.id, ops.profileId]);
    await t.db.query("delete from auth.users where id = $1", [ops.authUserId]);
    expect((await rowsAs(admin, "select * from public.request_assignments where request_id = $1", [other.id])).length).toBe(0);
    expect(await statusOf(other.id)).toBe("SUBMITTED");
  });
});
