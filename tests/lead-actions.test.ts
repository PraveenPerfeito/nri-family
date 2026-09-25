import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next.js request APIs and the server-only guard are not available in unit tests.
let clientIp = "203.0.113.1";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": clientIp }),
}));

const { submitContact, submitGetStarted } = await import("@/lib/leads/actions");
const { HONEYPOT_FIELD, STARTED_AT_FIELD, initialFormState } = await import("@/lib/leads/types");
const { siteConfig } = await import("@/config/site");
const { EMAIL_RELAY_ENDPOINT, RESEND_ENDPOINT, buildEmailBody } = await import("@/lib/leads/delivery");

const relayUrl = `${EMAIL_RELAY_ENDPOINT}${encodeURIComponent(siteConfig.leadsEmail ?? "")}`;
const calledUrls = () => fetchMock.mock.calls.map(([url]) => String(url));

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
  // Not on Vercel by default, so the email relay stays off (as in local dev and QA).
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("LEADS_EMAIL_RELAY", "");
  vi.stubEnv("RESEND_API_KEY", "");
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

describe("email relay (completed by the browser)", () => {
  it("returns a relay instruction on Vercel instead of contacting FormSubmit from the server", async () => {
    vi.stubEnv("LEADS_WEBHOOK_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");

    const state = await submitContact(initialFormState, contactForm());

    expect(state.status).toBe("relay");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.relay?.endpoint).toBe(relayUrl);
    expect(state.relay?.body).toMatchObject({ _replyto: "test@example.com", Email: "test@example.com", "Service category": "Property Care" });
    expect(state.relay?.body._subject).toMatch(/contact enquiry/i);
    expect(state.deliveredServerSide).toBe(false);
    expect(state.message).toMatch(/received your request/);
    if (siteConfig.contact.email) expect(state.fallbackMessage).toContain(siteConfig.contact.email);
    if (siteConfig.contact.whatsapp) expect(state.fallbackMessage).toContain(siteConfig.contact.whatsapp);
  });

  it("never uses the relay in local development or QA runs (no VERCEL_ENV)", async () => {
    const state = await submitContact(initialFormState, contactForm());
    expect(state.status).toBe("success");
    expect(state.relay).toBeUndefined();
    expect(calledUrls()).toEqual(["https://hooks.example.test/leads"]);
  });

  it("reports a successful webhook delivery alongside the relay", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const state = await submitContact(initialFormState, contactForm());
    expect(state.status).toBe("relay");
    expect(state.deliveredServerSide).toBe(true);
    expect(calledUrls()).toEqual(["https://hooks.example.test/leads"]);
  });

  it("does not issue a relay for invalid or spam submissions", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await submitContact(initialFormState, contactForm({ email: "nope" }))).status).toBe("error");
    expect((await submitContact(initialFormState, contactForm({ [HONEYPOT_FIELD]: "x" }))).relay).toBeUndefined();
  });

  it("formats Get Started requests readably", () => {
    const body = buildEmailBody({
      kind: "get-started",
      submittedAt: "2026-09-25T06:30:00.000Z",
      data: { name: "Test Person", ownsProperty: "no", topics: ["Buying", "Documents"], details: "", consent: true },
    });
    expect(body).toMatchObject({
      Form: "Get Started request",
      Name: "Test Person",
      "Owns property in Tamil Nadu": "No",
      "Needs help with": "Buying, Documents",
      Details: "—",
      "Agreed to be contacted": "Yes",
    });
    expect(body["Submitted at"]).toMatch(/IST$/);
    expect(body._replyto).toBeUndefined();
  });
});

describe("Resend email channel", () => {
  it("sends our own branded email from the server when RESEND_API_KEY is set on Vercel", async () => {
    vi.stubEnv("LEADS_WEBHOOK_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));

    const state = await submitContact(initialFormState, contactForm());

    expect(state.status).toBe("success");
    expect(state.relay).toBeUndefined();
    expect(calledUrls()).toEqual([RESEND_ENDPOINT]);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual([siteConfig.leadsEmail]);
    expect(body.reply_to).toBe("test@example.com");
    expect(body.from).toContain(siteConfig.name);
    expect(body.subject).toMatch(/contact enquiry from Test Person/i);
    expect(body.html).toContain("Reply by email");
    expect(body.text).toContain("Service category: Property Care");
  });

  it("falls back to the browser relay if Resend fails", async () => {
    vi.stubEnv("LEADS_WEBHOOK_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "invalid key" }), { status: 401 }));

    const state = await submitContact(initialFormState, contactForm());

    expect(state.status).toBe("relay");
    expect(state.relay?.endpoint).toBe(relayUrl);
    expect(state.deliveredServerSide).toBe(false);
  });

  it("is never used in local development or QA runs, even with a key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const state = await submitContact(initialFormState, contactForm());
    expect(state.status).toBe("success");
    expect(calledUrls()).toEqual(["https://hooks.example.test/leads"]);
  });

  it("adds a WhatsApp chat link to the FormSubmit fallback email", () => {
    const body = buildEmailBody({
      kind: "contact",
      submittedAt: "2026-09-25T06:30:00.000Z",
      data: { name: "Test", phone: "+971 50 000 0000", country: "UAE" },
    });
    expect(body["WhatsApp chat"]).toBe("https://wa.me/971500000000");
  });
});
