import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next.js request APIs and the server-only guard are not available in unit tests.
let clientIp = "203.0.113.1";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": clientIp }),
}));

const { submitContact, submitGetStarted } = await import("@/lib/leads/actions");
const { HONEYPOT_FIELD, STARTED_AT_FIELD, initialFormState } = await import("@/lib/leads/types");

function contactForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const fields = {
    name: "Test Person",
    country: "Canada",
    email: "test@example.com",
    phone: "+1 416 555 0100",
    category: "Property Care",
    message: "Please check my house.",
    consent: "on",
    [STARTED_AT_FIELD]: String(Date.now() - 10_000),
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let ipCounter = 0;
const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));

beforeEach(() => {
  clientIp = `203.0.113.${++ipCounter}`;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("LEADS_WEBHOOK_URL", "https://hooks.example.test/leads");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("submitContact", () => {
  it("delivers a valid enquiry to the webhook", async () => {
    const state = await submitContact(initialFormState, contactForm());
    expect(state.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.example.test/leads");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ kind: "contact", data: { email: "test@example.com", category: "Property Care", consent: true } });
    // Anti-spam fields are never forwarded.
    expect(body.data[HONEYPOT_FIELD]).toBeUndefined();
    expect(body.data[STARTED_AT_FIELD]).toBeUndefined();
  });

  it("returns field errors for invalid input without delivering", async () => {
    const state = await submitContact(initialFormState, contactForm({ email: "nope", consent: "" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeDefined();
    expect(state.fieldErrors?.consent).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("silently drops honeypot submissions", async () => {
    const state = await submitContact(initialFormState, contactForm({ [HONEYPOT_FIELD]: "http://spam.example" }));
    expect(state.status).toBe("success");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("silently drops submissions made faster than a person could type", async () => {
    const state = await submitContact(initialFormState, contactForm({ [STARTED_AT_FIELD]: String(Date.now()) }));
    expect(state.status).toBe("success");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits repeated submissions from one client", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await submitContact(initialFormState, contactForm())).status);
    expect(results.slice(0, 5)).toEqual(["success", "success", "success", "success", "success"]);
    expect(results[5]).toBe("error");
  });

  it("tells the visitor honestly when delivery is not configured in production", async () => {
    vi.stubEnv("LEADS_WEBHOOK_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const state = await submitContact(initialFormState, contactForm());
    expect(state.status).toBe("error");
    expect(state.message).toMatch(/not enabled yet/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a failure when the webhook errors, without logging personal data", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await submitContact(initialFormState, contactForm());
    expect(state.status).toBe("error");
    const logged = errorLog.mock.calls.flat().join(" ");
    expect(logged).not.toContain("test@example.com");
    expect(logged).not.toContain("416");
  });
});

describe("submitGetStarted", () => {
  it("accepts multiple topics", async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({
      name: "Test Person",
      country: "Singapore",
      email: "test@example.com",
      phone: "+65 6000 0000",
      ownsProperty: "no",
      details: "",
      consent: "on",
      [STARTED_AT_FIELD]: String(Date.now() - 10_000),
    }))
      fd.set(k, v);
    fd.append("topics", "Buying");
    fd.append("topics", "Documents");
    const state = await submitGetStarted(initialFormState, fd);
    expect(state.status).toBe("success");
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.data.topics).toEqual(["Buying", "Documents"]);
  });
});
