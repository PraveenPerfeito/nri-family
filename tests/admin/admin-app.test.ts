import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, signInAs, signInAsAdmin } from "../portal/fake-supabase";

/*
 * Application-layer tests for the admin console: the admin gate
 * (requireAdmin), routing between the two workspaces, the proxy, and every
 * admin Server Action — who may call it, what it validates and exactly what
 * it sends to the database. Supabase is replaced by a recording fake; the
 * database's own checks (app.is_admin() in every admin function and policy)
 * are tested for real in tests/db/admin-operations.test.ts.
 */

vi.mock("server-only", () => ({}));

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
class NotFoundSignal extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new NotFoundSignal("not found");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9", origin: "https://nri-family.vercel.app" }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const state = vi.hoisted(() => ({ configured: true }));
vi.mock("@/lib/supabase/config", () => ({
  isPortalConfigured: () => state.configured,
  areSignupsOpen: () => false,
  supabaseConfig: () => (state.configured ? { url: "https://project.supabase.co", publishableKey: "sb_publishable_test" } : null),
  sessionCookieOptions: { httpOnly: true, sameSite: "lax", secure: true },
}));

const fake = createFakeSupabase();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => fake.client }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => fake.client }));

const { requireAdmin, getAdmin } = await import("@/lib/admin/session");
const { requireCustomer } = await import("@/lib/portal/session");
const actions = await import("@/lib/admin/actions/requests");
const { updateSession } = await import("@/lib/supabase/proxy");
const { safeNextPath, isAdminPath } = await import("@/lib/portal/redirects");
const { NextRequest } = await import("next/server");
const { generateMetadata } = await import("@/app/(admin)/admin/layout");

const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const MEMBER_ID = "44444444-4444-4444-8444-444444444444";

type Outcome = { redirect: string } | { notFound: true } | { value: unknown };
async function outcome(promise: Promise<unknown>): Promise<Outcome> {
  try {
    return { value: await promise };
  } catch (error) {
    if (error instanceof RedirectSignal) return { redirect: error.url };
    if (error instanceof NotFoundSignal) return { notFound: true };
    throw error;
  }
}

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const idle = { status: "idle" as const };

/** Every admin action with a valid form for it. */
const validCalls: [string, () => Promise<unknown>][] = [
  ["change status", () => actions.changeRequestStatusAction(idle, form({ requestId: REQUEST_ID, expectedStatus: "SUBMITTED", newStatus: "UNDER_REVIEW" }))],
  ["assign", () => actions.assignRequestAction(idle, form({ requestId: REQUEST_ID, assigneeId: MEMBER_ID }))],
  ["unassign", () => actions.unassignRequestAction(idle, form({ requestId: REQUEST_ID }))],
  ["internal note", () => actions.addInternalNoteAction(idle, form({ requestId: REQUEST_ID, body: "Keys are with the neighbour." }))],
  ["customer update", () => actions.postCustomerUpdateAction(idle, form({ requestId: REQUEST_ID, body: "Visit booked for Friday." }))],
];

beforeEach(() => {
  fake.reset();
  state.configured = true;
});

describe("admin gate (requireAdmin)", () => {
  it("sends signed-out visitors to sign-in, remembering the admin page", async () => {
    expect(await outcome(requireAdmin("/admin/requests"))).toEqual({ redirect: "/login?next=%2Fadmin%2Frequests" });
    expect(await outcome(requireAdmin())).toEqual({ redirect: "/login?next=%2Fadmin" });
  });

  it("sends visitors to sign-in while no project is connected", async () => {
    state.configured = false;
    expect(await outcome(requireAdmin("/admin"))).toEqual({ redirect: "/login?next=%2Fadmin" });
  });

  it("shows customers the ordinary not-found page", async () => {
    signInAs(fake);
    expect(await outcome(requireAdmin("/admin"))).toEqual({ notFound: true });
  });

  it("refuses an ADMIN role without an active team membership, and operations staff", async () => {
    signInAsAdmin(fake, {}, null);
    expect(await outcome(requireAdmin())).toEqual({ notFound: true });
    fake.reset();
    signInAsAdmin(fake, {}, { is_active: false });
    expect(await outcome(requireAdmin())).toEqual({ notFound: true });
    fake.reset();
    signInAs(fake, { role: "OPERATIONS" });
    fake.respond("team_members.select", { data: { is_active: true } });
    expect(await outcome(requireAdmin())).toEqual({ notFound: true });
  });

  it("refuses when the membership can't be read (fails closed)", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    signInAsAdmin(fake);
    fake.respond("team_members.select", { error: { code: "PGRST000", status: 503 } });
    expect(await outcome(requireAdmin())).toEqual({ notFound: true });
    logged.mockRestore();
  });

  it("lets an active admin in, checking their own membership", async () => {
    const profile = signInAsAdmin(fake);
    const admin = await requireAdmin();
    expect(admin.profile.id).toBe(profile.id);
    const membership = fake.queries.find((q) => q.table === "team_members");
    expect(membership?.filters).toContainEqual(["eq", "profile_id", profile.id]);
    expect(await getAdmin()).not.toBeNull();
  });
});

describe("admin page titles", () => {
  it("name the console only for an active admin", async () => {
    signInAsAdmin(fake);
    expect(await generateMetadata()).toMatchObject({ title: { template: expect.stringContaining("· Admin |") }, robots: { index: false, follow: false } });
  });

  it("are the ordinary not-found title for everyone else, so no admin page is confirmed to exist", async () => {
    for (const setup of [() => undefined, () => signInAs(fake), () => signInAsAdmin(fake, {}, { is_active: false })]) {
      fake.reset();
      setup();
      const meta = await generateMetadata();
      expect(meta.title).toEqual({ default: expect.stringMatching(/^Page not found \|/), template: expect.stringMatching(/^Page not found \|/) });
      expect(JSON.stringify(meta.title)).not.toMatch(/admin/i);
      expect(meta.robots).toMatchObject({ index: false, follow: false });
    }
  });
});

describe("the two workspaces", () => {
  it("sends an active admin from the customer workspace to the console", async () => {
    signInAsAdmin(fake);
    expect(await outcome(requireCustomer("/app"))).toEqual({ redirect: "/admin" });
  });

  it("turns away an admin whose membership is inactive, and operations staff", async () => {
    signInAsAdmin(fake, {}, { is_active: false });
    expect(await outcome(requireCustomer("/app"))).toEqual({ redirect: "/login?notice=workspace-unavailable" });
    fake.reset();
    signInAs(fake, { role: "OPERATIONS" });
    expect(await outcome(requireCustomer("/app"))).toEqual({ redirect: "/login?notice=workspace-unavailable" });
  });

  it("accepts admin return paths after sign-in, and nothing outside the site", () => {
    expect(safeNextPath("/admin/requests?status=open")).toBe("/admin/requests?status=open");
    expect(safeNextPath("/admin")).toBe("/admin");
    for (const bad of ["/administrator", "//evil.example/admin", "/admin/../../evil", "https://evil.example/admin", "/\\evil.example"]) {
      expect(safeNextPath(bad), bad).toBe("/app");
    }
    expect(isAdminPath("/admin?x=1")).toBe(true);
    expect(isAdminPath("/admins")).toBe(false);
  });
});

describe("proxy", () => {
  it("redirects signed-out page loads of /admin to sign-in with the return path", async () => {
    const res = await updateSession(new NextRequest("https://nri-family.vercel.app/admin/requests?status=SUBMITTED"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://nri-family.vercel.app/login?next=%2Fadmin%2Frequests%3Fstatus%3DSUBMITTED");
  });

  it("marks admin pages private and uncacheable", async () => {
    fake.auth.claims = { sub: "someone" };
    const res = await updateSession(new NextRequest("https://nri-family.vercel.app/admin"));
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("leaves Server Action posts to the actions, which check for themselves", async () => {
    const res = await updateSession(new NextRequest("https://nri-family.vercel.app/admin/requests/x", { method: "POST" }));
    expect(res.status).toBe(200);
  });
});

describe("admin actions: who may call them", () => {
  it.each(validCalls)("%s: signed-out callers are sent to sign-in and nothing reaches the database", async (_name, call) => {
    expect(await outcome(call())).toEqual({ redirect: "/login?next=%2Fadmin%2Frequests" });
    expect(fake.rpcs).toEqual([]);
  });

  it.each(validCalls)("%s: a customer calling the action directly gets not-found and nothing reaches the database", async (_name, call) => {
    signInAs(fake);
    expect(await outcome(call())).toEqual({ notFound: true });
    expect(fake.rpcs).toEqual([]);
  });

  it.each(validCalls)("%s: an inactive admin is refused the same way", async (_name, call) => {
    signInAsAdmin(fake, {}, { is_active: false });
    expect(await outcome(call())).toEqual({ notFound: true });
    expect(fake.rpcs).toEqual([]);
  });

  it.each(validCalls)("%s: an active admin reaches the admin database function", async (_name, call) => {
    signInAsAdmin(fake);
    const result = await call();
    expect(result).toMatchObject({ status: "success" });
    expect(fake.rpcs).toHaveLength(1);
  });
});

describe("admin actions: what reaches the database", () => {
  beforeEach(() => {
    signInAsAdmin(fake);
  });

  it("sends only the request, the expected status and the new status; never who is acting or whose request it is", async () => {
    const data = form({ requestId: REQUEST_ID, expectedStatus: "UNDER_REVIEW", newStatus: "WAITING_FOR_CUSTOMER" });
    for (const [k, v] of Object.entries({ customer_id: "x", customerId: "x", actor_id: "x", role: "ADMIN", profile_id: "x", created_by: "x" })) data.set(k, v);
    await actions.changeRequestStatusAction(idle, data);
    expect(fake.rpcs).toEqual([
      { fn: "admin_change_request_status", args: { p_request_id: REQUEST_ID, p_expected_status: "UNDER_REVIEW", p_new_status: "WAITING_FOR_CUSTOMER" } },
    ]);
  });

  it("refuses statuses outside the lifecycle before calling the database", async () => {
    for (const [from, to] of [
      ["SUBMITTED", "COMPLETED"],
      ["COMPLETED", "UNDER_REVIEW"],
      ["CANCELLED", "SUBMITTED"],
      ["SUBMITTED", "DONE"],
      ["SUBMITTED", ""],
    ]) {
      const result = await actions.changeRequestStatusAction(idle, form({ requestId: REQUEST_ID, expectedStatus: from, newStatus: to }));
      expect(result.status, `${from} → ${to}`).toBe("error");
    }
    expect(fake.rpcs).toEqual([]);
  });

  it("rejects malformed ids before calling the database", async () => {
    for (const requestId of ["", "not-a-uuid", "33333333-3333-4333-8333-33333333333", "' or 1=1 --", "../../etc"]) {
      const results = await Promise.all([
        actions.changeRequestStatusAction(idle, form({ requestId, expectedStatus: "SUBMITTED", newStatus: "UNDER_REVIEW" })),
        actions.assignRequestAction(idle, form({ requestId, assigneeId: MEMBER_ID })),
        actions.unassignRequestAction(idle, form({ requestId })),
        actions.addInternalNoteAction(idle, form({ requestId, body: "x" })),
        actions.postCustomerUpdateAction(idle, form({ requestId, body: "x" })),
      ]);
      for (const r of results) expect(r.status, requestId).toBe("error");
    }
    const badAssignee = await actions.assignRequestAction(idle, form({ requestId: REQUEST_ID, assigneeId: "someone" }));
    expect(badAssignee).toMatchObject({ status: "error", fieldErrors: { assigneeId: "Please choose a team member." } });
    expect(fake.rpcs).toEqual([]);
  });

  it("assigns by team member id only", async () => {
    await actions.assignRequestAction(idle, form({ requestId: REQUEST_ID, assigneeId: MEMBER_ID, assigned_by: "someone-else" }));
    expect(fake.rpcs).toEqual([{ fn: "admin_assign_request", args: { p_request_id: REQUEST_ID, p_assignee_id: MEMBER_ID } }]);
  });

  it("trims notes, keeps line breaks and rejects empty or oversized text", async () => {
    await actions.addInternalNoteAction(idle, form({ requestId: REQUEST_ID, body: "  First line\r\nSecond line  " }));
    expect(fake.rpcs.at(-1)).toEqual({ fn: "admin_add_internal_note", args: { p_request_id: REQUEST_ID, p_body: "First line\nSecond line" } });
    fake.rpcs.length = 0;
    expect(await actions.addInternalNoteAction(idle, form({ requestId: REQUEST_ID, body: "   " }))).toMatchObject({ status: "error", fieldErrors: { body: "Please write the note." } });
    expect(await actions.postCustomerUpdateAction(idle, form({ requestId: REQUEST_ID, body: "x".repeat(2001) }))).toMatchObject({
      status: "error",
      fieldErrors: { body: "Please keep the update to 2,000 characters or fewer." },
    });
    expect(fake.rpcs).toEqual([]);
  });

  it("uses the internal-note function for internal notes and the customer-update function for updates", async () => {
    await actions.addInternalNoteAction(idle, form({ requestId: REQUEST_ID, body: "Internal" }));
    await actions.postCustomerUpdateAction(idle, form({ requestId: REQUEST_ID, body: "For the customer" }));
    expect(fake.rpcs.map((r) => r.fn)).toEqual(["admin_add_internal_note", "admin_post_customer_update"]);
  });
});

describe("admin actions: errors", () => {
  beforeEach(() => {
    signInAsAdmin(fake);
  });

  it.each([
    ["stale_status", /Someone updated this request a moment ago/],
    ["assignment_required", /Assign a team member first/],
    ["invalid_transition", /isn't allowed from the current status/],
    ["invalid_assignee", /active team member/],
    ["request_closed", /closed/],
    ["request_not_found", /could not be found/],
    ["not_authorized", /permission/],
  ])("explains %s in plain English", async (key, message) => {
    fake.respond("rpc.admin_change_request_status", { error: { message: key, code: "P0001" } });
    const result = await actions.changeRequestStatusAction(idle, form({ requestId: REQUEST_ID, expectedStatus: "UNDER_REVIEW", newStatus: "ASSIGNED" }));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(message);
  });

  it("never shows database details, and logs only codes (not the note text)", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fake.respond("rpc.admin_add_internal_note", { error: { message: 'duplicate key value violates unique constraint "secret_idx"', code: "23505", details: "Key (id)=(1)" } });
    const result = await actions.addInternalNoteAction(idle, form({ requestId: REQUEST_ID, body: "The gate code is 4711" }));
    expect(result).toEqual({ status: "error", message: "Something went wrong on our side. Please try again in a moment." });
    const logs = JSON.stringify(logged.mock.calls);
    expect(logs).toContain("23505");
    expect(logs).not.toContain("4711");
    expect(logs).not.toContain("secret_idx");
    logged.mockRestore();
  });
});
