import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, signInAs } from "./fake-supabase";

/*
 * Application-layer tests for the customer portal: the session gate, the
 * proxy, and the Server Actions. Supabase is replaced by a recording fake;
 * the database's own security (RLS, grants, triggers) is tested for real in
 * tests/db/portal-rls.test.ts.
 */

vi.mock("server-only", () => ({}));

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  // A fresh client address per test keeps the app's own per-connection limits out of the way.
  headers: async () => new Headers({ "x-forwarded-for": state.clientIp, origin: "https://nri-family.vercel.app" }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const state = vi.hoisted(() => ({ configured: true, signupsOpen: true, ssrOptions: [] as unknown[], clientIp: "203.0.113.1", tests: 0 }));
vi.mock("@/lib/supabase/config", () => ({
  isPortalConfigured: () => state.configured,
  areSignupsOpen: () => state.configured && state.signupsOpen,
  supabaseConfig: () => (state.configured ? { url: "https://project.supabase.co", publishableKey: "sb_publishable_test" } : null),
  sessionCookieOptions: { httpOnly: true, sameSite: "lax", secure: true },
}));

const fake = createFakeSupabase();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => fake.client }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: unknown) => {
    state.ssrOptions.push(options);
    return fake.client;
  },
}));

const { requireCustomer } = await import("@/lib/portal/session");
const { createPropertyAction, deletePropertyAction, updatePropertyAction } = await import("@/lib/portal/actions/properties");
const { cancelRequestAction, createRequestAction } = await import("@/lib/portal/actions/requests");
const { updateProfileAction } = await import("@/lib/portal/actions/account");
const { forgotPasswordAction, resendConfirmationAction, signInAction, signUpAction } = await import("@/lib/portal/actions/auth");
const { updateSession } = await import("@/lib/supabase/proxy");
const { NextRequest } = await import("next/server");

const PROPERTY_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

async function redirectOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
}

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => {
  fake.reset();
  state.clientIp = `198.51.100.${++state.tests % 250}`;
  state.configured = true;
  state.signupsOpen = true;
});

describe("session gate (requireCustomer)", () => {
  it("sends visitors to sign-in when the portal is not connected yet", async () => {
    state.configured = false;
    expect(await redirectOf(requireCustomer("/app"))).toBe("/login?next=%2Fapp");
  });

  it("sends signed-out visitors to sign-in, remembering where they were going", async () => {
    expect(await redirectOf(requireCustomer("/app/properties"))).toBe("/login?next=%2Fapp%2Fproperties");
  });

  it("returns the signed-in customer with their own profile", async () => {
    signInAs(fake);
    const viewer = await requireCustomer("/app");
    expect(viewer.profile.full_name).toBe("Priya Raman");
    const profileQuery = fake.queries.find((q) => q.table === "profiles");
    expect(profileQuery?.filters).toContainEqual(["eq", "auth_user_id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  });

  it("turns away operations, vendor and partner accounts, and admins without an active membership", async () => {
    for (const role of ["OPERATIONS", "VENDOR", "PARTNER", "ADMIN"]) {
      fake.reset();
      signInAs(fake, { role });
      expect(await redirectOf(requireCustomer("/app")), role).toBe("/login?notice=workspace-unavailable");
    }
  });
});

describe("proxy", () => {
  it("redirects signed-out page loads of /app to sign-in with the return path", async () => {
    const res = await updateSession(new NextRequest("https://nri-family.vercel.app/app/requests?status=open"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://nri-family.vercel.app/login?next=%2Fapp%2Frequests%3Fstatus%3Dopen");
  });

  it("keeps session cookies HttpOnly and SameSite=Lax", async () => {
    await updateSession(new NextRequest("https://nri-family.vercel.app/app"));
    expect(state.ssrOptions.at(-1)).toMatchObject({ cookieOptions: { httpOnly: true, sameSite: "lax" } });
  });

  it("lets signed-in customers through, marked private and uncacheable", async () => {
    fake.auth.claims = { sub: "someone" };
    const res = await updateSession(new NextRequest("https://nri-family.vercel.app/app"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not redirect Server Action posts (each action checks the session itself)", async () => {
    const res = await updateSession(new NextRequest("https://nri-family.vercel.app/app/properties/new", { method: "POST" }));
    expect(res.status).toBe(200);
  });

  it("sends /app to sign-in while no project is connected", async () => {
    state.configured = false;
    const res = await updateSession(new NextRequest("https://nri-family.vercel.app/app"));
    expect(res.headers.get("location")).toBe("https://nri-family.vercel.app/login");
  });
});

describe("property actions", () => {
  it("require a signed-in customer", async () => {
    expect(await redirectOf(createPropertyAction({ status: "idle" }, form({ name: "Chennai House" })))).toMatch(/^\/login/);
    expect(fake.queries.some((q) => q.op === "insert")).toBe(false);
  });

  it("validate input and return field errors without writing", async () => {
    signInAs(fake);
    const result = await createPropertyAction({ status: "idle" }, form({ name: "", propertyType: "CASTLE", city: "Chennai", postalCode: "123" }));
    expect(result.status).toBe("error");
    expect(result.fieldErrors).toMatchObject({ name: expect.any(String), propertyType: expect.any(String), postalCode: expect.any(String) });
    expect(fake.queries.some((q) => q.op === "insert")).toBe(false);
  });

  it("insert only the allowed fields — ownership comes from the database, never the form", async () => {
    signInAs(fake);
    fake.respond("properties.insert", { data: { id: PROPERTY_ID } });
    const url = await redirectOf(
      createPropertyAction(
        { status: "idle" },
        form({ name: "Chennai House", propertyType: "HOUSE", city: "Chennai", district: "Chennai", postalCode: "600 020", owner_id: "someone-else", status: "INACTIVE" }),
      ),
    );
    expect(url).toBe(`/app/properties/${PROPERTY_ID}?saved=created`);
    const insert = fake.queries.find((q) => q.op === "insert");
    expect(insert?.payload).toEqual({
      name: "Chennai House",
      property_type: "HOUSE",
      address_line_1: null,
      address_line_2: null,
      city: "Chennai",
      district: "Chennai",
      postal_code: "600020",
      ownership_type: null,
      notes: null,
    });
  });

  it("scope updates to the customer's own property and report 'not found' otherwise", async () => {
    signInAs(fake);
    fake.respond("properties.update", { data: null });
    const result = await updatePropertyAction(PROPERTY_ID, { status: "idle" }, form({ name: "Mine", propertyType: "HOUSE", city: "Chennai" }));
    expect(result.message).toMatch(/may have been removed or you may not have access/);
    const update = fake.queries.find((q) => q.op === "update");
    expect(update?.filters).toEqual(expect.arrayContaining([["eq", "id", PROPERTY_ID], ["eq", "owner_id", "11111111-1111-4111-8111-111111111111"]]));
  });

  it("refuse to delete a property that has service requests", async () => {
    signInAs(fake);
    fake.respond("service_requests.select", { count: 2 });
    const result = await deletePropertyAction(PROPERTY_ID);
    expect(result.message).toMatch(/has service requests/);
    expect(fake.queries.some((q) => q.op === "delete")).toBe(false);
  });

  it("reject malformed ids before touching the database", async () => {
    signInAs(fake);
    const result = await updatePropertyAction("not-a-uuid", { status: "idle" }, form({ name: "X", propertyType: "HOUSE", city: "Chennai" }));
    expect(result.status).toBe("error");
    expect(fake.queries.some((q) => q.op === "update")).toBe(false);
  });
});

describe("service request actions", () => {
  it("reject a property that isn't the customer's, without creating anything", async () => {
    signInAs(fake);
    fake.respond("properties.select", { data: null });
    const result = await createRequestAction(
      { status: "idle" },
      form({ propertyId: PROPERTY_ID, category: "GARDEN_MAINTENANCE", description: "Please trim the hedge.", priority: "NORMAL" }),
    );
    expect(result.fieldErrors?.propertyId).toBe("Please choose one of your properties.");
    const check = fake.queries.find((q) => q.table === "properties");
    expect(check?.filters).toContainEqual(["eq", "owner_id", "11111111-1111-4111-8111-111111111111"]);
    expect(fake.queries.some((q) => q.op === "insert")).toBe(false);
  });

  it("create the request with only the customer's fields, then open it", async () => {
    signInAs(fake);
    fake.respond("properties.select", { data: { id: PROPERTY_ID } });
    fake.respond("service_requests.insert", { data: { id: REQUEST_ID } });
    const url = await redirectOf(
      createRequestAction(
        { status: "idle" },
        form({ propertyId: PROPERTY_ID, category: "GARDEN_MAINTENANCE", title: "", description: "Please trim the hedge.", priority: "NORMAL", status: "COMPLETED" }),
      ),
    );
    expect(url).toBe(`/app/requests/${REQUEST_ID}?saved=created`);
    expect(fake.queries.find((q) => q.op === "insert")?.payload).toEqual({
      property_id: PROPERTY_ID,
      category: "GARDEN_MAINTENANCE",
      title: "Garden maintenance",
      description: "Please trim the hedge.",
      priority: "NORMAL",
    });
  });

  it("require a real description", async () => {
    signInAs(fake);
    const result = await createRequestAction({ status: "idle" }, form({ category: "OTHER", description: "help", priority: "NORMAL" }));
    expect(result.fieldErrors?.description).toBeDefined();
  });

  it("cancel only the customer's own request while it is still cancellable", async () => {
    signInAs(fake);
    fake.respond("service_requests.update", { data: { id: REQUEST_ID } });
    expect(await redirectOf(cancelRequestAction(REQUEST_ID))).toBe(`/app/requests/${REQUEST_ID}?saved=cancelled`);
    const update = fake.queries.find((q) => q.op === "update");
    expect(update?.payload).toEqual({ status: "CANCELLED" });
    expect(update?.filters).toEqual(
      expect.arrayContaining([["eq", "customer_id", "11111111-1111-4111-8111-111111111111"], ["in", "status", ["SUBMITTED", "UNDER_REVIEW"]]]),
    );
  });
});

describe("profile action", () => {
  it("updates only name, phone, country and time zone of the customer's own profile", async () => {
    signInAs(fake);
    const result = await updateProfileAction(
      { status: "idle" },
      form({ fullName: "Priya R", phone: "+971 50 123 4567", country: "ae", timezone: "Asia/Dubai", role: "ADMIN", email: "x@example.test" }),
    );
    expect(result.status).toBe("success");
    const update = fake.queries.find((q) => q.op === "update");
    expect(update?.payload).toEqual({ full_name: "Priya R", phone: "+971 50 123 4567", country: "AE", timezone: "Asia/Dubai" });
    expect(update?.filters).toContainEqual(["eq", "id", "11111111-1111-4111-8111-111111111111"]);
  });
});

describe("account actions", () => {
  it("sign-in never redirects off-site, whatever `next` says", async () => {
    const url = await redirectOf(signInAction({ status: "idle" }, form({ email: "priya@example.test", password: "correct horse", next: "https://evil.example/steal" })));
    expect(url).toBe("/app");
  });

  it("sign-in reports wrong credentials without saying which part was wrong", async () => {
    fake.auth.signInResult = { error: { code: "invalid_credentials", status: 400 } };
    const result = await signInAction({ status: "idle" }, form({ email: "priya@example.test", password: "nope" }));
    expect(result.message).toBe("The email or password is incorrect.");
  });

  it("registration is refused while sign-ups are closed", async () => {
    state.signupsOpen = false;
    const result = await signUpAction({ status: "idle" }, form({ fullName: "Priya", email: "p@example.test", password: "long enough pass", consent: "on" }));
    expect(result.message).toBe("Customer accounts are not open yet.");
    expect(fake.auth.calls).toHaveLength(0);
  });

  it("registration sends the profile details as metadata and the confirmation link back to this site", async () => {
    const result = await signUpAction(
      { status: "idle" },
      form({ fullName: "Priya Raman", email: "Priya@Example.test", password: "a long passphrase", country: "AE", timezone: "Asia/Dubai", consent: "on" }),
    );
    expect(result.status).toBe("success");
    const [args] = fake.auth.calls.find((c) => c.method === "signUp")!.args as [{ email: string; options: { data: unknown; emailRedirectTo: string } }];
    expect(args.email).toBe("priya@example.test");
    expect(args.options.data).toEqual({ full_name: "Priya Raman", country: "AE", timezone: "Asia/Dubai" });
    expect(args.options.emailRedirectTo).toBe("https://nri-family.vercel.app/auth/confirm?next=%2Fapp");
  });

  it("registration requires consent and a 10+ character password", async () => {
    const result = await signUpAction({ status: "idle" }, form({ fullName: "Priya", email: "p@example.test", password: "short" }));
    expect(result.fieldErrors).toMatchObject({ password: expect.any(String), consent: expect.any(String) });
  });

  it("password reset sends the link back to this site's reset page", async () => {
    const result = await forgotPasswordAction({ status: "idle" }, form({ email: "someone@example.test" }));
    expect(result).toEqual({ status: "success", message: "If an account exists for this email, you'll receive a password reset link. It works once and expires soon." });
    const [, options] = fake.auth.calls.find((c) => c.method === "resetPasswordForEmail")!.args as [string, { redirectTo: string }];
    expect(options.redirectTo).toBe("https://nri-family.vercel.app/auth/confirm?next=%2Freset-password");
  });

  // Supabase only tries to send (and so only hits its email limit) when the address
  // has an account; any different answer would reveal who is a customer.
  const supabaseOutcomes: [string, unknown][] = [
    ["the link was sent", null],
    ["the address has no account", { code: "user_not_found", status: 404 }],
    ["Supabase's email limit was reached", { code: "over_email_send_rate_limit", status: 429 }],
    ["Supabase's request limit was reached", { code: "over_request_rate_limit", status: 429 }],
    ["Supabase failed", { code: "unexpected_failure", status: 500 }],
  ];

  it.each(supabaseOutcomes)("password reset gives the identical answer when %s", async (_outcome, error) => {
    const baseline = await forgotPasswordAction({ status: "idle" }, form({ email: "someone@example.test" }));
    fake.auth.emailResult = { data: {}, error };
    const result = await forgotPasswordAction({ status: "idle" }, form({ email: "someone@example.test" }));
    expect(result).toEqual(baseline);
    expect(result.status).toBe("success");
  });

  it.each(supabaseOutcomes)("resending the confirmation gives the identical answer when %s", async (_outcome, error) => {
    const baseline = await resendConfirmationAction({ status: "idle" }, form({ email: "someone@example.test" }));
    fake.auth.emailResult = { data: {}, error };
    const result = await resendConfirmationAction({ status: "idle" }, form({ email: "someone@example.test" }));
    expect(result).toEqual(baseline);
    expect(result.status).toBe("success");
  });

  it("logs a failed reset by error code only, never the address", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fake.auth.emailResult = { data: {}, error: { code: "over_email_send_rate_limit", status: 429 } };
    await forgotPasswordAction({ status: "idle" }, form({ email: "private.person@example.test" }));
    expect(logged).toHaveBeenCalled();
    expect(JSON.stringify(logged.mock.calls)).toContain("over_email_send_rate_limit");
    expect(JSON.stringify(logged.mock.calls)).not.toContain("private.person");
    logged.mockRestore();
  });
});
