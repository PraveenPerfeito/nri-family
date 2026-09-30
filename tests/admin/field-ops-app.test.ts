import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, signInAs, signInAsAdmin } from "../portal/fake-supabase";

/*
 * Application-layer tests for Phase 2C: the field-work and evidence Server
 * Actions (who may call them, what they validate and exactly what they send
 * to the database and to Storage), the server's check of an uploaded file's
 * real contents, and the two evidence file routes. Supabase is replaced by a
 * recording fake; the database's own rules (the admin functions, RLS and
 * the Storage policies) are tested for real in tests/db/field-operations.test.ts.
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
const revalidated = vi.hoisted(() => [] as string[]);
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidated.push(path) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9", origin: "https://nri-family.vercel.app" }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@/lib/supabase/config", () => ({
  isPortalConfigured: () => true,
  areSignupsOpen: () => false,
  supabaseConfig: () => ({ url: "https://project.supabase.co", publishableKey: "sb_publishable_test" }),
  sessionCookieOptions: { httpOnly: true, sameSite: "lax", secure: true },
}));

const fake = createFakeSupabase();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => fake.client }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => fake.client }));

const fieldWork = await import("@/lib/admin/actions/field-work");
const evidence = await import("@/lib/admin/actions/evidence");
const customerRoute = await import("@/app/(portal)/app/requests/[id]/evidence/[evidenceId]/route");
const adminRoute = await import("@/app/(admin)/admin/requests/[id]/evidence/[evidenceId]/route");
const { indiaToday } = await import("@/lib/field-ops/schedule");

const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const VISIT_ID = "55555555-5555-4555-8555-555555555555";
const EVIDENCE_ID = "66666666-6666-4666-8666-666666666666";
const OTHER_CUSTOMER = "77777777-7777-4777-8777-777777777777";
const idle = { status: "idle" as const };

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

const tomorrow = () => indiaToday(new Date(Date.now() + 86_400_000));
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1]);

/** The stored file, as Supabase would serve its first bytes through a signed link. */
function serveStoredFile(bytes: Uint8Array | null, status = 206) {
  fake.respond("storage.createSignedUrl", bytes ? { data: { signedUrl: "https://project.supabase.co/storage/v1/object/sign/request-evidence/x?token=t" } } : { error: { message: "Object not found" } });
  const fetchMock = vi.fn(async () => new Response(bytes ? Buffer.from(bytes) : null, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const finishInput = (extra: Record<string, unknown> = {}) => ({
  requestId: REQUEST_ID,
  evidenceId: EVIDENCE_ID,
  mimeType: "image/jpeg",
  stage: "AFTER",
  title: "  Hedge  after\ntrimming ",
  description: "  Trimmed to one metre.  ",
  capturedAt: "2026-09-29T04:10:00.000Z",
  originalName: "C:\\fakepath\\IMG_2031.jpg",
  ...extra,
});

/** Every Phase 2C admin action with a valid input. */
const validCalls: [string, () => Promise<unknown>][] = [
  ["schedule", () => fieldWork.scheduleFieldWorkAction(idle, form({ requestId: REQUEST_ID, date: tomorrow(), startTime: "10:00", endTime: "12:00", instructions: "Call first." }))],
  ["reschedule", () => fieldWork.rescheduleFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, date: tomorrow(), startTime: "14:00", endTime: "" }))],
  ["start", () => fieldWork.startFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID }))],
  ["notes", () => fieldWork.recordFieldWorkNotesAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, notes: "Done." }))],
  ["complete", () => fieldWork.completeFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, summary: "Completed." }))],
  ["cancel", () => fieldWork.cancelFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, expectedStatus: "SCHEDULED" }))],
  ["approve", () => evidence.approveEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID }))],
  ["reject", () => evidence.rejectEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID, reason: "Blurred." }))],
  ["publish", () => evidence.publishEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID }))],
  ["prepare upload", () => evidence.prepareEvidenceUpload({ requestId: REQUEST_ID, mimeType: "image/jpeg", size: 200_000 })],
  ["finish upload", () => evidence.finishEvidenceUpload(finishInput())],
];

beforeEach(() => {
  fake.reset();
  revalidated.length = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Phase 2C admin actions: who may call them", () => {
  it.each(validCalls)("%s: signed-out callers are sent to sign-in and nothing reaches the database or Storage", async (_name, call) => {
    expect(await outcome(call())).toEqual({ redirect: "/login?next=%2Fadmin%2Frequests" });
    expect(fake.rpcs).toEqual([]);
    expect(fake.storageCalls).toEqual([]);
  });

  it.each(validCalls)("%s: a customer calling it directly gets not-found", async (_name, call) => {
    signInAs(fake);
    expect(await outcome(call())).toEqual({ notFound: true });
    expect(fake.rpcs).toEqual([]);
    expect(fake.storageCalls).toEqual([]);
  });

  it.each(validCalls)("%s: an inactive admin is refused the same way", async (_name, call) => {
    signInAsAdmin(fake, {}, { is_active: false });
    expect(await outcome(call())).toEqual({ notFound: true });
    expect(fake.rpcs).toEqual([]);
    expect(fake.storageCalls).toEqual([]);
  });
});

describe("field work: what reaches the database", () => {
  beforeEach(() => {
    signInAsAdmin(fake);
  });

  it("schedules in India time: the date and times become instants, with only the request, the times and the instructions", async () => {
    const date = tomorrow();
    const data = form({ requestId: REQUEST_ID, date, startTime: "10:00", endTime: "12:30", instructions: "  Gate code is with the neighbour.\r\n " });
    for (const [k, v] of Object.entries({ customer_id: "x", customerId: OTHER_CUSTOMER, assignee_id: "x", status: "COMPLETED", created_by: "x" })) data.set(k, v);
    const result = await fieldWork.scheduleFieldWorkAction(idle, data);
    expect(result.status).toBe("success");
    expect(fake.rpcs).toEqual([
      {
        fn: "admin_schedule_field_work",
        args: {
          p_request_id: REQUEST_ID,
          p_scheduled_start: new Date(`${date}T10:00:00+05:30`).toISOString(),
          p_scheduled_end: new Date(`${date}T12:30:00+05:30`).toISOString(),
          p_instructions: "Gate code is with the neighbour.",
        },
      },
    ]);
    expect(revalidated).toContain(`/admin/requests/${REQUEST_ID}`);
  });

  it("refuses dates in the past, impossible dates and times, and an end before the start, before calling the database", async () => {
    const yesterday = indiaToday(new Date(Date.now() - 86_400_000));
    for (const [fields, field] of [
      [{ date: yesterday, startTime: "10:00" }, "date"],
      [{ date: "2026-02-30", startTime: "10:00" }, "date"],
      [{ date: "tomorrow", startTime: "10:00" }, "date"],
      [{ date: tomorrow(), startTime: "25:00" }, "startTime"],
      [{ date: tomorrow(), startTime: "10:00", endTime: "09:00" }, "endTime"],
      [{ date: tomorrow(), startTime: "10:00", endTime: "10:00" }, "endTime"],
      [{ date: indiaToday(new Date(Date.now() + 400 * 86_400_000)), startTime: "10:00" }, "date"],
    ] as const) {
      const result = await fieldWork.scheduleFieldWorkAction(idle, form({ requestId: REQUEST_ID, endTime: "", ...fields }));
      expect(result.status, JSON.stringify(fields)).toBe("error");
      expect(result.fieldErrors?.[field], JSON.stringify(fields)).toBeTruthy();
    }
    const tooLong = await fieldWork.scheduleFieldWorkAction(idle, form({ requestId: REQUEST_ID, date: tomorrow(), startTime: "10:00", instructions: "x".repeat(2001) }));
    expect(tooLong.fieldErrors?.instructions).toMatch(/2,000/);
    expect(fake.rpcs).toEqual([]);
  });

  it("names only the visit for start, notes, complete and cancel (the database finds its request)", async () => {
    await fieldWork.startFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, request_id: OTHER_CUSTOMER }));
    await fieldWork.recordFieldWorkNotesAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, notes: "  Hedge trimmed.\r\nWaste removed.  " }));
    await fieldWork.completeFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, summary: " Garden maintenance completed. ", notes: "" }));
    await fieldWork.cancelFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, expectedStatus: "IN_PROGRESS" }));
    expect(fake.rpcs).toEqual([
      { fn: "admin_start_field_work", args: { p_field_work_id: VISIT_ID } },
      { fn: "admin_record_field_work_notes", args: { p_field_work_id: VISIT_ID, p_execution_notes: "Hedge trimmed.\nWaste removed." } },
      { fn: "admin_complete_field_work", args: { p_field_work_id: VISIT_ID, p_summary: "Garden maintenance completed.", p_execution_notes: null } },
      { fn: "admin_cancel_field_work", args: { p_field_work_id: VISIT_ID, p_expected_status: "IN_PROGRESS" } },
    ]);
  });

  it("rejects malformed ids and states before calling the database", async () => {
    for (const bad of ["", "not-a-uuid", "' or 1=1 --", "../../etc"]) {
      expect((await fieldWork.startFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: bad }))).status, bad).toBe("error");
      expect((await fieldWork.startFieldWorkAction(idle, form({ requestId: bad, fieldWorkId: VISIT_ID }))).status, bad).toBe("error");
    }
    for (const expectedStatus of ["COMPLETED", "CANCELLED", "NOT_SCHEDULED", "anything"]) {
      expect((await fieldWork.cancelFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, expectedStatus }))).status, expectedStatus).toBe("error");
    }
    expect((await fieldWork.recordFieldWorkNotesAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, notes: "   " }))).fieldErrors?.notes).toBe("Please write the notes.");
    expect(fake.rpcs).toEqual([]);
  });

  it.each([
    ["request_closed", /closed, so it can no longer be changed/, true],
    ["request_not_ready", /Assigned, In progress or Awaiting customer/, false],
    ["assignment_required", /active team member/, false],
    ["field_work_changed", /updated a moment ago/, true],
    ["field_work_exists", /already has a visit/, true],
    ["invalid_schedule", /India time/, false],
    ["not_authorized", /permission/, false],
  ])("explains %s in plain English (refreshing the page when the record changed)", async (key, message, refreshed) => {
    fake.respond("rpc.admin_start_field_work", { error: { message: key, code: "P0001" } });
    const result = await fieldWork.startFieldWorkAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID }));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(message);
    expect(Boolean(result.refreshed)).toBe(refreshed);
    expect(revalidated.includes(`/admin/requests/${REQUEST_ID}`)).toBe(refreshed);
  });

  it("never shows database details, and logs only codes and ids (not the notes)", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fake.respond("rpc.admin_record_field_work_notes", { error: { message: 'relation "secret_table" does not exist', code: "42P01" } });
    const result = await fieldWork.recordFieldWorkNotesAction(idle, form({ requestId: REQUEST_ID, fieldWorkId: VISIT_ID, notes: "The gate code is 4711" }));
    expect(result).toEqual({ status: "error", message: "Something went wrong on our side. Please try again in a moment." });
    const logs = JSON.stringify(logged.mock.calls);
    expect(logs).toContain("42P01");
    expect(logs).not.toContain("4711");
    expect(logs).not.toContain("secret_table");
    logged.mockRestore();
  });
});

describe("evidence uploads", () => {
  beforeEach(() => {
    signInAsAdmin(fake);
  });

  it("asks Storage for a one-time upload link for a file name the server chooses", async () => {
    fake.respond("service_requests.select", { data: { status: "IN_PROGRESS" } });
    fake.respond("storage.createSignedUploadUrl", { data: { signedUrl: "https://project.supabase.co/storage/v1/object/upload/sign/request-evidence/p?token=t", token: "t" } });
    const ticket = await evidence.prepareEvidenceUpload({ requestId: REQUEST_ID.toUpperCase(), mimeType: "video/mp4", size: 40 * 1024 * 1024 });
    expect(ticket).toMatchObject({ ok: true, uploadUrl: expect.stringContaining("/object/upload/sign/"), apiKey: "sb_publishable_test" });
    if (!ticket.ok) throw new Error("no ticket");
    expect(fake.storageCalls).toEqual([{ bucket: "request-evidence", op: "createSignedUploadUrl", args: [`${REQUEST_ID}/${ticket.evidenceId}/original.mp4`] }]);
    expect(ticket.evidenceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(fake.rpcs).toEqual([]);
  });

  it("refuses unaccepted types, oversized or empty files, and closed or unknown requests, without an upload link", async () => {
    for (const [input, message] of [
      [{ mimeType: "text/html", size: 10 }, /JPEG, PNG or WebP photo, an MP4 video or a PDF/],
      [{ mimeType: "image/svg+xml", size: 10 }, /JPEG/],
      [{ mimeType: "video/quicktime", size: 10 }, /JPEG/],
      [{ mimeType: "image/jpeg", size: 11 * 1024 * 1024 }, /too large\. Photos can be up to 10 MB/],
      [{ mimeType: "video/mp4", size: 51 * 1024 * 1024 }, /Videos can be up to 50 MB/],
      [{ mimeType: "application/pdf", size: 0 }, /empty/],
    ] as const) {
      const ticket = await evidence.prepareEvidenceUpload({ requestId: REQUEST_ID, ...input });
      expect(ticket.ok, JSON.stringify(input)).toBe(false);
      if (!ticket.ok) expect(ticket.message).toMatch(message);
    }
    fake.respond("service_requests.select", { data: { status: "COMPLETED" } });
    expect(await evidence.prepareEvidenceUpload({ requestId: REQUEST_ID, mimeType: "image/jpeg", size: 100 })).toEqual({ ok: false, message: "This request is closed, so its evidence can no longer be changed." });
    fake.respond("service_requests.select", { data: null });
    expect(await evidence.prepareEvidenceUpload({ requestId: REQUEST_ID, mimeType: "image/jpeg", size: 100 })).toEqual({ ok: false, message: "This request could not be found." });
    expect(fake.storageCalls).toEqual([]);
  });

  it("registers a checked file with the admin's choices only; type, size, uploader, visibility and review come from the database", async () => {
    const fetched = serveStoredFile(JPEG_BYTES);
    const result = await evidence.finishEvidenceUpload(
      finishInput({ visibility: "CUSTOMER_VISIBLE", review_status: "APPROVED", uploaded_by: OTHER_CUSTOMER, customerId: OTHER_CUSTOMER, size: 1, storagePath: "../other/file" }) as never,
    );
    expect(result.status).toBe("success");
    expect(fetched).toHaveBeenCalledWith(expect.stringContaining("/object/sign/"), expect.objectContaining({ headers: { range: "bytes=0-15" } }));
    expect(fake.storageCalls[0]).toEqual({ bucket: "request-evidence", op: "createSignedUrl", args: [`${REQUEST_ID}/${EVIDENCE_ID}/original.jpg`, 60] });
    expect(fake.rpcs).toEqual([
      {
        fn: "admin_add_evidence",
        args: {
          p_request_id: REQUEST_ID,
          p_evidence_id: EVIDENCE_ID,
          p_stage: "AFTER",
          p_title: "Hedge after trimming",
          p_description: "Trimmed to one metre.",
          p_captured_at: "2026-09-29T04:10:00.000Z",
          p_original_name: "IMG_2031.jpg",
        },
      },
    ]);
  });

  it("refuses a file whose contents are not what its type says, and removes the upload", async () => {
    serveStoredFile(new TextEncoder().encode("<!doctype html><script>alert(1)</script>"));
    const result = await evidence.finishEvidenceUpload(finishInput());
    expect(result).toEqual({ status: "error", message: "This file isn't the kind of file its name says. Please choose the original photo, video or PDF." });
    expect(fake.rpcs).toEqual([]);
    expect(fake.storageCalls.at(-1)).toEqual({ bucket: "request-evidence", op: "remove", args: [[`${REQUEST_ID}/${EVIDENCE_ID}/original.jpg`]] });
  });

  it("says so when the upload never arrived, and never registers it", async () => {
    serveStoredFile(null);
    expect(await evidence.finishEvidenceUpload(finishInput())).toEqual({ status: "error", message: "The file didn't finish uploading. Please try again." });
    expect(fake.rpcs).toEqual([]);
  });

  it("drops an implausible capture time and a bad title before calling the database", async () => {
    serveStoredFile(JPEG_BYTES);
    await evidence.finishEvidenceUpload(finishInput({ capturedAt: "2099-01-01T00:00:00Z" }));
    expect(fake.rpcs[0].args.p_captured_at).toBeNull();
    fake.rpcs.length = 0;
    for (const title of ["", "Hi", "x".repeat(121)]) {
      const result = await evidence.finishEvidenceUpload(finishInput({ title }));
      expect(result.status, title).toBe("error");
      expect(result.fieldErrors?.title, title).toBeTruthy();
    }
    expect((await evidence.finishEvidenceUpload(finishInput({ stage: "SOMETIME" }))).fieldErrors?.stage).toBeTruthy();
    expect(fake.rpcs).toEqual([]);
  });

  it("removes the upload when the database refuses its type or size", async () => {
    serveStoredFile(JPEG_BYTES);
    fake.respond("rpc.admin_add_evidence", { error: { message: "file_too_large", code: "P0001" } });
    const result = await evidence.finishEvidenceUpload(finishInput());
    expect(result.message).toMatch(/too large/);
    expect(fake.storageCalls.at(-1)?.op).toBe("remove");
  });
});

describe("evidence review", () => {
  beforeEach(() => {
    signInAsAdmin(fake);
  });

  it("names only the evidence: approve, reject (with an internal reason) and publish", async () => {
    const extra = { visibility: "CUSTOMER_VISIBLE", customer_id: OTHER_CUSTOMER, reviewed_by: "x" };
    await evidence.approveEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID, ...extra }));
    await evidence.rejectEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID, reason: "  Blurred.  ", ...extra }));
    await evidence.rejectEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID, reason: "" }));
    await evidence.publishEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID, ...extra }));
    expect(fake.rpcs).toEqual([
      { fn: "admin_approve_evidence", args: { p_evidence_id: EVIDENCE_ID } },
      { fn: "admin_reject_evidence", args: { p_evidence_id: EVIDENCE_ID, p_reason: "Blurred." } },
      { fn: "admin_reject_evidence", args: { p_evidence_id: EVIDENCE_ID, p_reason: null } },
      { fn: "admin_publish_evidence", args: { p_evidence_id: EVIDENCE_ID } },
    ]);
  });

  it.each([
    ["evidence_not_approved", /Approve the evidence before sharing it/],
    ["evidence_published", /has been shared with the customer, so it can't be rejected/],
    ["evidence_changed", /reviewed a moment ago/],
    ["request_closed", /closed/],
    ["evidence_not_found", /could not be found/],
  ])("explains %s in plain English", async (key, message) => {
    fake.respond("rpc.admin_publish_evidence", { error: { message: key, code: "P0001" } });
    const result = await evidence.publishEvidenceAction(idle, form({ requestId: REQUEST_ID, evidenceId: EVIDENCE_ID }));
    expect(result.message).toMatch(message);
  });
});

describe("evidence file routes", () => {
  const call = (route: typeof customerRoute, id: string, evidenceId: string) =>
    route.GET(new Request(`https://nri-family.vercel.app/x`), { params: Promise.resolve({ id, evidenceId }) } as never);
  const published = { id: EVIDENCE_ID, request_id: REQUEST_ID, kind: "PHOTO", stage: "AFTER", title: "Hedge", description: null, mime_type: "image/jpeg", captured_at: null, published_at: "2026-09-30T05:00:00Z" };

  it("a customer's own published evidence: authorised first, then a short-lived signed link, never cached", async () => {
    signInAs(fake);
    fake.respond("request_evidence.select", { data: published });
    fake.respond("storage.createSignedUrl", { data: { signedUrl: "https://project.supabase.co/storage/v1/object/sign/request-evidence/f?token=t" } });
    const response = await call(customerRoute, REQUEST_ID, EVIDENCE_ID);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://project.supabase.co/storage/v1/object/sign/request-evidence/f?token=t");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const query = fake.queries.find((q) => q.table === "request_evidence")!;
    expect(query.filters).toEqual(
      expect.arrayContaining([
        ["eq", "id", EVIDENCE_ID],
        ["eq", "request_id", REQUEST_ID],
        ["eq", "customer_id", "11111111-1111-4111-8111-111111111111"],
        ["eq", "review_status", "APPROVED"],
        ["eq", "visibility", "CUSTOMER_VISIBLE"],
      ]),
    );
    expect(fake.storageCalls).toEqual([{ bucket: "request-evidence", op: "createSignedUrl", args: [`${REQUEST_ID}/${EVIDENCE_ID}/original.jpg`, 300] }]);
  });

  it("anything else is the same plain not-found, with no signed link created", async () => {
    // Signed out.
    expect((await call(customerRoute, REQUEST_ID, EVIDENCE_ID)).status).toBe(404);
    // Not theirs, not published, or not there: the query returns nothing.
    signInAs(fake);
    fake.respond("request_evidence.select", { data: null });
    expect((await call(customerRoute, REQUEST_ID, EVIDENCE_ID)).status).toBe(404);
    // Malformed ids never reach an evidence query.
    const evidenceQueries = () => fake.queries.filter((q) => q.table === "request_evidence").length;
    const before = evidenceQueries();
    for (const [id, evidenceId] of [
      ["x", EVIDENCE_ID],
      [REQUEST_ID, "../../etc/passwd"],
      [REQUEST_ID, `${EVIDENCE_ID}' or '1'='1`],
    ]) {
      expect((await call(customerRoute, id, evidenceId)).status).toBe(404);
    }
    expect(evidenceQueries()).toBe(before);
    // Storage refusing (its own policy) also ends in not-found.
    fake.respond("request_evidence.select", { data: published });
    fake.respond("storage.createSignedUrl", { error: { message: "Object not found" } });
    const refused = await call(customerRoute, REQUEST_ID, EVIDENCE_ID);
    expect(refused.status).toBe(404);
    expect(refused.headers.get("location")).toBeNull();
  });

  it("admins and operations staff get nothing from the customer route; customers and inactive admins nothing from the admin route", async () => {
    signInAsAdmin(fake);
    expect((await call(customerRoute, REQUEST_ID, EVIDENCE_ID)).status).toBe(404);
    signInAs(fake, { role: "OPERATIONS" });
    expect((await call(customerRoute, REQUEST_ID, EVIDENCE_ID)).status).toBe(404);
    fake.reset();
    signInAs(fake);
    expect((await call(adminRoute as never, REQUEST_ID, EVIDENCE_ID)).status).toBe(404);
    fake.reset();
    signInAsAdmin(fake, {}, { is_active: false });
    expect((await call(adminRoute as never, REQUEST_ID, EVIDENCE_ID)).status).toBe(404);
    expect(fake.storageCalls).toEqual([]);
  });

  it("an active admin gets any evidence of that request, from its recorded location", async () => {
    signInAsAdmin(fake);
    fake.respond("request_evidence.select", { data: { id: EVIDENCE_ID, kind: "VIDEO" } });
    fake.respond("request_evidence_internal.select", { data: { storage_path: `${REQUEST_ID}/${EVIDENCE_ID}/original.mp4` } });
    fake.respond("storage.createSignedUrl", { data: { signedUrl: "https://project.supabase.co/storage/v1/object/sign/request-evidence/v?token=t" } });
    const response = await call(adminRoute as never, REQUEST_ID, EVIDENCE_ID);
    expect(response.status).toBe(302);
    expect(fake.storageCalls).toEqual([{ bucket: "request-evidence", op: "createSignedUrl", args: [`${REQUEST_ID}/${EVIDENCE_ID}/original.mp4`, 1800] }]);
    const query = fake.queries.find((q) => q.table === "request_evidence")!;
    expect(query.filters).toEqual(expect.arrayContaining([["eq", "id", EVIDENCE_ID], ["eq", "request_id", REQUEST_ID]]));
  });
});
