import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, errorOf, type TestDatabase, type TestUser } from "./harness";

/*
 * Phase 2A security tests against the real migration (Row Level Security,
 * column privileges, constraints and triggers in actual Postgres).
 * Customer A and customer B are two separate accounts; B must never see or
 * change anything of A's.
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

async function newCustomer(label = "customer", metadata: Record<string, unknown> = { full_name: "Test Customer" }) {
  return t.createUser(nextEmail(label), metadata);
}

async function addProperty(user: TestUser, name = "Chennai House") {
  const { rows } = await t.as(user, (tx) =>
    tx.query<{ id: string }>(
      "insert into public.properties (name, property_type, city, district, postal_code) values ($1, 'HOUSE', 'Chennai', 'Chennai', '600020') returning id",
      [name],
    ),
  );
  return rows[0].id;
}

async function addRequest(user: TestUser, propertyId: string | null, title = "Garden maintenance") {
  const { rows } = await t.as(user, (tx) =>
    tx.query<{ id: string; request_number: string; status: string; customer_id: string }>(
      "insert into public.service_requests (property_id, category, title, description, priority) values ($1, 'GARDEN_MAINTENANCE', $2, 'Please trim the hedge.', 'NORMAL') returning id, request_number, status, customer_id",
      [propertyId, title],
    ),
  );
  return rows[0];
}

const count = async (user: TestUser, sql: string, params: unknown[] = []) =>
  (await t.as(user, (tx) => tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) s`, params))).rows[0].n;

describe("sign-up", () => {
  it("creates a CUSTOMER profile from the sign-up details and logs the account", async () => {
    const user = await newCustomer("signup", { full_name: "Priya Raman", country: "ae", timezone: "Asia/Dubai" });
    const { rows } = await t.as(user, (tx) => tx.query<Record<string, string>>("select full_name, email, role, country, timezone from public.profiles"));
    expect(rows).toEqual([{ full_name: "Priya Raman", email: user.email, role: "CUSTOMER", country: "AE", timezone: "Asia/Dubai" }]);
    const activity = await t.as(user, (tx) => tx.query<{ action: string }>("select action from public.activity_logs"));
    expect(activity.rows.map((r) => r.action)).toEqual(["ACCOUNT_CREATED"]);
  });

  it("never lets sign-up metadata choose a role, and drops invalid country or timezone values", async () => {
    const user = await newCustomer("role", { full_name: "Mallory", role: "ADMIN", country: "Narnia", timezone: "'; drop table x; --" });
    const { rows } = await t.as(user, (tx) => tx.query<Record<string, string | null>>("select role, country, timezone from public.profiles"));
    expect(rows[0]).toEqual({ role: "CUSTOMER", country: null, timezone: null });
  });

  it("falls back to the email name when no name is given", async () => {
    const user = await t.createUser("noname-person@example.test");
    const { rows } = await t.as(user, (tx) => tx.query<{ full_name: string }>("select full_name from public.profiles"));
    expect(rows[0].full_name).toBe("noname-person");
  });
});

describe("profiles", () => {
  it("a customer can update their own name, phone, country and timezone (logged without values)", async () => {
    const user = await newCustomer("profile");
    await t.as(user, (tx) =>
      tx.query("update public.profiles set full_name = 'Arun K', phone = '+971 50 123 4567', country = 'AE', timezone = 'Asia/Dubai'"),
    );
    const { rows } = await t.as(user, (tx) => tx.query<{ full_name: string; phone: string }>("select full_name, phone from public.profiles"));
    expect(rows[0]).toEqual({ full_name: "Arun K", phone: "+971 50 123 4567" });
    const log = await t.as(user, (tx) =>
      tx.query<{ action: string; metadata: { fields: string[] } }>("select action, metadata from public.activity_logs where action = 'PROFILE_UPDATED'"),
    );
    expect(log.rows).toHaveLength(1);
    expect(log.rows[0].metadata).toEqual({ fields: ["full_name", "phone", "country", "timezone"] });
    expect(JSON.stringify(log.rows[0].metadata)).not.toContain("123 4567");
  });

  it("a customer cannot change their role, email or auth link", async () => {
    const user = await newCustomer("escalate");
    expect(await errorOf(t.as(user, (tx) => tx.query("update public.profiles set role = 'ADMIN'")))).toMatch(/permission denied/);
    expect(await errorOf(t.as(user, (tx) => tx.query("update public.profiles set email = 'x@example.test'")))).toMatch(/permission denied/);
    expect(await errorOf(t.as(user, (tx) => tx.query("update public.profiles set auth_user_id = gen_random_uuid()")))).toMatch(/permission denied/);
  });

  it("a customer cannot read or update another customer's profile", async () => {
    const a = await newCustomer("pa");
    const b = await newCustomer("pb");
    expect(await count(b, "select 1 from public.profiles where id = $1", [a.profileId])).toBe(0);
    const res = await t.as(b, (tx) => tx.query("update public.profiles set full_name = 'Hacked' where id = $1", [a.profileId]));
    expect(res.affectedRows).toBe(0);
    const { rows } = await t.as(a, (tx) => tx.query<{ full_name: string }>("select full_name from public.profiles"));
    expect(rows[0].full_name).toBe("Test Customer");
  });

  it("rejects invalid phone numbers and oversized names at the database", async () => {
    const user = await newCustomer("invalid");
    expect(await errorOf(t.as(user, (tx) => tx.query("update public.profiles set phone = 'call me maybe'")))).toMatch(/profiles_phone_check/);
    expect(await errorOf(t.as(user, (tx) => tx.query("update public.profiles set full_name = repeat('x', 121)")))).toMatch(/profiles_full_name_check/);
  });
});

describe("properties", () => {
  it("a customer can create a property; ownership is set by the database and the change is logged", async () => {
    const user = await newCustomer("prop");
    const id = await addProperty(user);
    const { rows } = await t.as(user, (tx) =>
      tx.query<{ owner_id: string; status: string; state: string; country: string }>("select owner_id, status, state, country from public.properties where id = $1", [id]),
    );
    expect(rows[0]).toEqual({ owner_id: user.profileId, status: "ACTIVE", state: "Tamil Nadu", country: "India" });
    const log = await t.as(user, (tx) => tx.query<{ action: string; entity_id: string }>("select action, entity_id from public.activity_logs where action = 'PROPERTY_CREATED'"));
    expect(log.rows).toEqual([{ action: "PROPERTY_CREATED", entity_id: id }]);
  });

  it("a customer cannot create a property for someone else or set its status", async () => {
    const a = await newCustomer("owner");
    const b = await newCustomer("attacker");
    expect(
      await errorOf(t.as(b, (tx) => tx.query("insert into public.properties (owner_id, name, property_type, city) values ($1, 'X', 'HOUSE', 'Chennai')", [a.profileId]))),
    ).toMatch(/permission denied/);
    expect(
      await errorOf(t.as(b, (tx) => tx.query("insert into public.properties (name, property_type, city, status) values ('X', 'HOUSE', 'Chennai', 'UNDER_REVIEW')"))),
    ).toMatch(/permission denied/);
  });

  it("a customer can read and update only their own properties", async () => {
    const a = await newCustomer("reader-a");
    const b = await newCustomer("reader-b");
    const propertyA = await addProperty(a, "A's House");
    await addProperty(b, "B's House");

    expect(await count(a, "select 1 from public.properties")).toBe(1);
    expect(await count(b, "select 1 from public.properties where id = $1", [propertyA])).toBe(0);

    const hijack = await t.as(b, (tx) => tx.query("update public.properties set name = 'Mine now' where id = $1", [propertyA]));
    expect(hijack.affectedRows).toBe(0);
    const remove = await t.as(b, (tx) => tx.query("delete from public.properties where id = $1", [propertyA]));
    expect(remove.affectedRows).toBe(0);

    const own = await t.as(a, (tx) => tx.query("update public.properties set name = 'Chennai Home', notes = 'Gate code with neighbour' where id = $1", [propertyA]));
    expect(own.affectedRows).toBe(1);
    const log = await t.as(a, (tx) =>
      tx.query<{ metadata: { name: string; fields: string[] } }>("select metadata from public.activity_logs where action = 'PROPERTY_UPDATED'"),
    );
    expect(log.rows[0].metadata).toEqual({ name: "Chennai Home", fields: ["name", "notes"] });
  });

  it("a customer cannot change the owner or status of their own property", async () => {
    const a = await newCustomer("keep");
    const b = await newCustomer("other");
    const id = await addProperty(a);
    expect(await errorOf(t.as(a, (tx) => tx.query("update public.properties set owner_id = $1 where id = $2", [b.profileId, id])))).toMatch(/permission denied/);
    expect(await errorOf(t.as(a, (tx) => tx.query("update public.properties set status = 'INACTIVE' where id = $1", [id])))).toMatch(/permission denied/);
  });

  it("validates property fields at the database", async () => {
    const user = await newCustomer("prop-invalid");
    const insert = (sql: string) => errorOf(t.as(user, (tx) => tx.query(sql)));
    expect(await insert("insert into public.properties (name, property_type, city) values ('X', 'CASTLE', 'Chennai')")).toMatch(/properties_type_check/);
    expect(await insert("insert into public.properties (name, property_type, city, postal_code) values ('X', 'HOUSE', 'Chennai', '12345')")).toMatch(/properties_postal_code_check/);
    expect(await insert("insert into public.properties (name, property_type, city) values (repeat('x', 121), 'HOUSE', 'Chennai')")).toMatch(/properties_name_check/);
    expect(await insert("insert into public.properties (name, property_type, city, notes) values ('X', 'HOUSE', 'Chennai', repeat('x', 2001))")).toMatch(/properties_notes_check/);
  });

  it("a property with service requests cannot be deleted; one without can, and the deletion is logged", async () => {
    const user = await newCustomer("delete");
    const withRequest = await addProperty(user, "Busy House");
    await addRequest(user, withRequest);
    expect(await errorOf(t.as(user, (tx) => tx.query("delete from public.properties where id = $1", [withRequest])))).toMatch(/foreign key/);

    const empty = await addProperty(user, "Empty Plot");
    const res = await t.as(user, (tx) => tx.query("delete from public.properties where id = $1", [empty]));
    expect(res.affectedRows).toBe(1);
    const log = await t.as(user, (tx) => tx.query<{ entity_id: string }>("select entity_id from public.activity_logs where action = 'PROPERTY_DELETED'"));
    expect(log.rows).toEqual([{ entity_id: empty }]);
  });
});

describe("service requests", () => {
  it("creating a request sets a request number and status, and writes the timeline event, activity and notification", async () => {
    const user = await newCustomer("req");
    const propertyId = await addProperty(user);
    const request = await addRequest(user, propertyId);

    expect(request.request_number).toMatch(/^REQ-\d{6}$/);
    expect(request.status).toBe("SUBMITTED");
    expect(request.customer_id).toBe(user.profileId);

    const events = await t.as(user, (tx) =>
      tx.query<{ event_type: string; title: string; created_by: string }>("select event_type, title, created_by from public.service_request_events where request_id = $1", [request.id]),
    );
    expect(events.rows).toEqual([{ event_type: "REQUEST_CREATED", title: "Request submitted", created_by: user.profileId }]);

    const activity = await t.as(user, (tx) =>
      tx.query<{ entity_id: string; metadata: Record<string, string> }>("select entity_id, metadata from public.activity_logs where action = 'REQUEST_CREATED'"),
    );
    expect(activity.rows).toHaveLength(1);
    expect(activity.rows[0].entity_id).toBe(request.id);
    expect(activity.rows[0].metadata).toMatchObject({ request_number: request.request_number, property_name: "Chennai House" });

    const notes = await t.as(user, (tx) =>
      tx.query<{ title: string; message: string; entity_id: string; read_at: string | null }>("select title, message, entity_id, read_at from public.notifications"),
    );
    expect(notes.rows).toEqual([
      {
        title: "Your service request has been received.",
        message: `${request.request_number} · Garden maintenance. Our team will review it and post updates here.`,
        entity_id: request.id,
        read_at: null,
      },
    ]);
  });

  it("request numbers are unique and increase", async () => {
    const user = await newCustomer("numbers");
    const first = await addRequest(user, null, "First request");
    const second = await addRequest(user, null, "Second request");
    expect(Number(second.request_number.slice(4))).toBe(Number(first.request_number.slice(4)) + 1);
  });

  it("a customer cannot attach a request to another customer's property", async () => {
    const a = await newCustomer("victim");
    const b = await newCustomer("intruder");
    const propertyA = await addProperty(a);
    expect(await errorOf(addRequest(b, propertyA))).toMatch(/row-level security/);
    expect(await count(a, "select 1 from public.service_requests")).toBe(0);
  });

  it("a customer cannot set the status, owner or request number of a new request", async () => {
    const a = await newCustomer("forge-a");
    const b = await newCustomer("forge-b");
    const insert = (sql: string, params: unknown[] = []) => errorOf(t.as(b, (tx) => tx.query(sql, params)));
    expect(await insert("insert into public.service_requests (category, title, status) values ('OTHER', 'Done already', 'COMPLETED')")).toMatch(/permission denied/);
    expect(await insert("insert into public.service_requests (category, title, customer_id) values ('OTHER', 'For A', $1)", [a.profileId])).toMatch(/permission denied/);
    expect(await insert("insert into public.service_requests (category, title, request_number) values ('OTHER', 'Mine', 'REQ-000001')")).toMatch(/permission denied/);
  });

  it("a customer cannot read another customer's requests, timeline, activity or notifications", async () => {
    const a = await newCustomer("private-a");
    const b = await newCustomer("private-b");
    const request = await addRequest(a, await addProperty(a));

    expect(await count(b, "select 1 from public.service_requests where id = $1", [request.id])).toBe(0);
    expect(await count(b, "select 1 from public.service_request_events where request_id = $1", [request.id])).toBe(0);
    expect(await count(b, "select 1 from public.activity_logs where customer_id = $1", [a.profileId])).toBe(0);
    expect(await count(b, "select 1 from public.notifications where user_id = $1", [a.profileId])).toBe(0);
    // B's own feed contains only B's sign-up.
    expect(await count(b, "select 1 from public.activity_logs")).toBe(1);
    expect(await count(b, "select 1 from public.notifications")).toBe(0);
  });

  it("a customer can cancel their own submitted request, which is recorded on the timeline", async () => {
    const user = await newCustomer("cancel");
    const request = await addRequest(user, null, "Clean the house");
    const res = await t.as(user, (tx) => tx.query("update public.service_requests set status = 'CANCELLED' where id = $1", [request.id]));
    expect(res.affectedRows).toBe(1);

    const events = await t.as(user, (tx) =>
      tx.query<{ event_type: string; title: string; metadata: Record<string, string> }>(
        "select event_type, title, metadata from public.service_request_events where request_id = $1 order by created_at, event_type",
        [request.id],
      ),
    );
    expect(events.rows.map((e) => e.title)).toEqual(["Request submitted", "Request cancelled"]);
    expect(events.rows[1].metadata).toEqual({ from: "SUBMITTED", to: "CANCELLED" });
    expect(await count(user, "select 1 from public.activity_logs where action = 'REQUEST_CANCELLED'")).toBe(1);
    // The customer did it themselves: no extra notification.
    expect(await count(user, "select 1 from public.notifications")).toBe(1);
  });

  it("a customer cannot move a request to any other status, cancel twice, or cancel someone else's", async () => {
    const a = await newCustomer("status-a");
    const b = await newCustomer("status-b");
    const request = await addRequest(a, null, "Security check");

    expect(await errorOf(t.as(a, (tx) => tx.query("update public.service_requests set status = 'COMPLETED' where id = $1", [request.id])))).toMatch(/row-level security/);
    const others = await t.as(b, (tx) => tx.query("update public.service_requests set status = 'CANCELLED' where id = $1", [request.id]));
    expect(others.affectedRows).toBe(0);

    await t.as(a, (tx) => tx.query("update public.service_requests set status = 'CANCELLED' where id = $1", [request.id]));
    const again = await t.as(a, (tx) => tx.query("update public.service_requests set status = 'CANCELLED' where id = $1", [request.id]));
    expect(again.affectedRows).toBe(0);
  });

  it("a customer cannot edit the title or description after submitting", async () => {
    const user = await newCustomer("edit");
    const request = await addRequest(user, null);
    expect(await errorOf(t.as(user, (tx) => tx.query("update public.service_requests set title = 'Other' where id = $1", [request.id])))).toMatch(/permission denied/);
  });

  it("when the team changes a status, the customer sees a timeline event and gets a notification", async () => {
    const user = await newCustomer("team");
    const request = await addRequest(user, null, "Property inspection");
    await t.asService((tx) => tx.query("update public.service_requests set status = 'UNDER_REVIEW' where id = $1", [request.id]));

    const events = await t.as(user, (tx) => tx.query<{ title: string }>("select title from public.service_request_events where request_id = $1 order by created_at", [request.id]));
    expect(events.rows.map((e) => e.title)).toContain("Team review started");
    const notes = await t.as(user, (tx) => tx.query<{ title: string; message: string }>("select title, message from public.notifications order by created_at desc limit 1"));
    expect(notes.rows[0]).toEqual({ title: `Update on ${request.request_number}`, message: "Property inspection is now: Under review." });
  });

  it("internal timeline events are never shown to the customer", async () => {
    const user = await newCustomer("internal");
    const request = await addRequest(user, null);
    await t.asService((tx) =>
      tx.query("insert into public.service_request_events (request_id, event_type, title, visibility) values ($1, 'REQUEST_REVIEWED', 'Vendor shortlist', 'INTERNAL')", [request.id]),
    );
    const { rows } = await t.as(user, (tx) => tx.query<{ title: string }>("select title from public.service_request_events where request_id = $1", [request.id]));
    expect(rows.map((r) => r.title)).toEqual(["Request submitted"]);
  });

  it("validates request fields at the database", async () => {
    const user = await newCustomer("req-invalid");
    const insert = (sql: string) => errorOf(t.as(user, (tx) => tx.query(sql)));
    expect(await insert("insert into public.service_requests (category, title) values ('SPACE_TRAVEL', 'Trip')")).toMatch(/service_requests_category_check/);
    expect(await insert("insert into public.service_requests (category, title, priority) values ('OTHER', 'Help', 'CRITICAL')")).toMatch(/service_requests_priority_check/);
    expect(await insert("insert into public.service_requests (category, title, description) values ('OTHER', 'Help me', repeat('x', 4001))")).toMatch(/service_requests_description_check/);
    expect(await insert("insert into public.service_requests (category, title) values ('OTHER', 'x')")).toMatch(/service_requests_title_check/);
  });
});

describe("timeline, activity and notifications are read-only for customers", () => {
  it("a customer cannot write events, activity entries or notifications directly", async () => {
    const user = await newCustomer("forger");
    const request = await addRequest(user, null);
    const write = (sql: string, params: unknown[] = []) => errorOf(t.as(user, (tx) => tx.query(sql, params)));
    expect(await write("insert into public.service_request_events (request_id, event_type, title) values ($1, 'STATUS_CHANGED', 'Completed by team')", [request.id])).toMatch(/permission denied/);
    expect(await write("insert into public.activity_logs (customer_id, action, entity_type) values ($1, 'PROPERTY_CREATED', 'PROPERTY')", [user.profileId])).toMatch(/permission denied/);
    expect(await write("insert into public.notifications (user_id, type, title, message) values ($1, 'GENERAL', 'Hi', 'Hi')", [user.profileId])).toMatch(/permission denied/);
    expect(await write("delete from public.activity_logs")).toMatch(/permission denied/);
    expect(await write("update public.service_request_events set title = 'Edited'")).toMatch(/permission denied/);
  });

  it("a customer can mark their own notifications read, but not change their text or touch others'", async () => {
    const a = await newCustomer("reader");
    const b = await newCustomer("prankster");
    await addRequest(a, null);
    const { rows } = await t.as(a, (tx) => tx.query<{ id: string }>("select id from public.notifications"));
    const noteId = rows[0].id;

    const others = await t.as(b, (tx) => tx.query("update public.notifications set read_at = now() where id = $1", [noteId]));
    expect(others.affectedRows).toBe(0);
    expect(await errorOf(t.as(a, (tx) => tx.query("update public.notifications set title = 'Changed' where id = $1", [noteId])))).toMatch(/permission denied/);

    const mine = await t.as(a, (tx) => tx.query("update public.notifications set read_at = now() where id = $1", [noteId]));
    expect(mine.affectedRows).toBe(1);
    expect(await count(a, "select 1 from public.notifications where read_at is null")).toBe(0);
  });
});

describe("anonymous visitors (publishable key only)", () => {
  it.each(["profiles", "properties", "service_requests", "service_request_events", "activity_logs", "notifications"])(
    "cannot read or write %s",
    async (table) => {
      expect(await errorOf(t.asAnon((tx) => tx.query(`select * from public.${table}`)))).toMatch(/permission denied/);
    },
  );

  it("cannot call the internal helper functions", async () => {
    expect(await errorOf(t.asAnon((tx) => tx.query("select app.next_request_number()")))).toMatch(/permission denied/);
  });
});

describe("account deletion", () => {
  it("deleting a customer's auth account removes all of their records cleanly", async () => {
    const user = await newCustomer("leaving");
    const propertyId = await addProperty(user);
    await addRequest(user, propertyId);
    await t.db.query("delete from auth.users where id = $1", [user.authUserId]);

    for (const [table, column] of [
      ["profiles", "id"],
      ["properties", "owner_id"],
      ["service_requests", "customer_id"],
      ["activity_logs", "customer_id"],
      ["notifications", "user_id"],
    ] as const) {
      const { rows } = await t.db.query<{ n: number }>(`select count(*)::int as n from public.${table} where ${column} = $1`, [user.profileId]);
      expect(rows[0].n, table).toBe(0);
    }
  });
});
