#!/usr/bin/env node
/**
 * Phase 2B acceptance test: the admin operations journey in docs/PHASE_2B.md
 * ("Acceptance test"), in a real browser, against a running app connected to
 * a Supabase project that has both Phase 2B migrations. Nothing is mocked.
 *
 *   npm run build && npm start          # the app, connected to the project
 *   npm run qa:admin                    # reads .env.local, like qa:portal
 *
 * It creates four throwaway accounts (customer A, customer B, a temporary
 * admin and an operations team member) the way the team does (admin API,
 * auto-confirmed), makes the admin an admin with the service-role key (the
 * same two statements the owner runs in the SQL editor), runs the journey,
 * and deletes all four at the end; everything they created goes with them.
 * It reads other records only through the pages the admin opens and never
 * changes anything it did not create. Every admin page is also checked at
 * 320–1440px (no sideways scrolling, tables become cards on phones) and
 * with axe (WCAG 2.2 AA and best practice: no findings).
 *
 * Env:
 *   BASE_URL                   the app under test (default http://localhost:3000)
 *   SUPABASE_URL               the project the app is connected to
 *   SUPABASE_PUBLISHABLE_KEY   for the direct API checks, signed in as each person
 *   SUPABASE_SERVICE_ROLE_KEY  admin key (never commit it)
 *   E2E_EMAIL_DOMAIN           domain for the throwaway addresses (default example.net)
 *   E2E_KEEP_USERS             "true" to keep the test accounts afterwards
 *   QA_BROWSER                 msedge (default) | chrome | chromium | firefox | webkit
 *   E2E_HEADED                 "true" to watch the browser
 */
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { chromium, firefox, webkit } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const DOMAIN = process.env.E2E_EMAIL_DOMAIN ?? "example.net";
const KEEP = process.env.E2E_KEEP_USERS === "true";
const CHANNEL = process.env.QA_BROWSER ?? "msedge";
const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const WIDTHS = [320, 375, 390, 768, 1024, 1280, 1440];

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY (see the comment at the top of this file).");
  process.exit(2);
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, noSession);

// ── Tiny test runner: steps run in order and stop at the first failure ──────
const results = [];
async function step(title, fn) {
  try {
    await fn();
    results.push({ title, ok: true });
    console.log(`  ✓ ${title}`);
  } catch (error) {
    results.push({ title, ok: false });
    console.log(`  ✗ ${title}\n      ${String(error?.message ?? error).split("\n").slice(0, 25).join("\n")}`);
    throw error;
  }
}
function check(condition, message) {
  if (!condition) throw new Error(message);
}
const one = (rows, what) => {
  check(Array.isArray(rows) && rows.length === 1, `expected exactly one ${what}, found ${rows?.length ?? 0}`);
  return rows[0];
};

// ── Test people (fictional; deleted at the end) ──────────────────────────────
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const person = (n, name, country, timezone) => ({ name, country, timezone, email: `nfo-e2e-${run}-${n}@${DOMAIN}`, password: `E2e-${randomUUID()}` });
const custA = person("a", "Asha Example", "AE", "Asia/Dubai");
const custB = person("b", "Bala Example", "GB", "Europe/London");
const adminUser = person("admin", "Meena Example", "IN", "Asia/Kolkata");
const opsUser = person("ops", "Arun Example", "IN", "Asia/Kolkata");
const everyone = [custA, custB, adminUser, opsUser];

// Only the admin knows this; it must never reach a customer.
const INTERNAL_NOTE = `Internal check ${run}: gate key is with the neighbour.`;
const CUSTOMER_UPDATE = `Our coordinator will visit on Friday morning (${run}).`;

async function profileOf(p) {
  const { data, error } = await service.from("profiles").select("*").eq("email", p.email).maybeSingle();
  if (error) throw new Error(`service read of profiles failed: ${error.message}`);
  return data;
}

async function createAccount(p) {
  const { error } = await service.auth.admin.createUser({
    email: p.email,
    password: p.password,
    email_confirm: true,
    user_metadata: { full_name: p.name, country: p.country, timezone: p.timezone },
  });
  check(!error, `could not create ${p.email}: ${error?.message}`);
  const profile = await profileOf(p);
  check(profile?.role === "CUSTOMER", `${p.email} did not get a CUSTOMER profile`);
  p.profileId = profile.id;
  p.authId = profile.auth_user_id;
}

/** What the owner does in the SQL editor to add someone to the team. */
async function makeStaff(p, role) {
  const promote = await service.from("profiles").update({ role }).eq("id", p.profileId).select("id");
  check(!promote.error && promote.data.length === 1, `could not set the ${role} role: ${promote.error?.message}`);
  const member = await service.from("team_members").insert({ profile_id: p.profileId }).select("profile_id");
  check(!member.error, `could not add the team membership: ${member.error?.message}`);
}

// ── Cleanup that survives network blips ──────────────────────────────────────
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry a Supabase call a few times (brief network drops); returns the last result. */
async function withRetry(call, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      last = await call();
      if (!last?.error) return last;
    } catch (error) {
      last = { data: null, error };
    }
    await pause(1500 * (i + 1));
  }
  return last;
}

/** Delete one test account; true when it is gone (or never existed). Failures are reported, never hidden. */
async function deleteAccount(email) {
  const lookup = () => service.from("profiles").select("auth_user_id").eq("email", email).maybeSingle();
  const found = await withRetry(lookup);
  if (found.error) {
    console.log(`  ! could not look up ${email}: ${found.error.message}`);
    return false;
  }
  if (!found.data) return true;
  const removed = await withRetry(() => service.auth.admin.deleteUser(found.data.auth_user_id));
  if (removed.error) {
    console.log(`  ! could not delete ${email}: ${removed.error.message}`);
    return false;
  }
  const after = await withRetry(lookup);
  if (after.error || after.data) {
    console.log(`  ! ${email} may still exist (${after.error ? after.error.message : "its profile remains"})`);
    return false;
  }
  return true;
}

/**
 * Accounts left behind by an earlier run of this script that was cut off before its cleanup:
 * the same throwaway address pattern, and over 30 minutes old (so a run in progress is never touched).
 */
async function removeLeftovers() {
  const isTestAccount = (email) => email.startsWith("nfo-e2e-") && email.endsWith(`@${DOMAIN}`) && ["a", "b", "admin", "ops"].some((s) => email.endsWith(`-${s}@${DOMAIN}`));
  const stale = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await withRetry(() => service.auth.admin.listUsers({ page, perPage: 200 }));
    if (error) throw new Error(`could not list accounts to remove leftovers: ${error.message}`);
    const users = data?.users ?? [];
    stale.push(...users.filter((u) => isTestAccount(u.email ?? "") && Date.now() - new Date(u.created_at).getTime() > 30 * 60_000));
    if (users.length < 200) break;
  }
  for (const u of stale) if (!(await deleteAccount(u.email))) throw new Error("could not remove a leftover test account");
  if (stale.length > 0) console.log(`      note: removed ${stale.length} test account(s) left by an interrupted earlier run.`);
}

// ── Browser ──────────────────────────────────────────────────────────────────
const engines = { chromium, firefox, webkit };
const launchOptions = { headless: process.env.E2E_HEADED !== "true" };
const browser = engines[CHANNEL] ? await engines[CHANNEL].launch(launchOptions) : await chromium.launch({ ...launchOptions, channel: CHANNEL });
const pageErrors = [];

async function newSession(label, timezoneId) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    timezoneId,
    extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250) + 1}` },
  });
  const page = await context.newPage();
  const ignored = (message) => CHANNEL === "webkit" && /_rsc=.*access control checks/.test(message);
  page.on("pageerror", (error) => {
    if (!ignored(error.message)) pageErrors.push(`${label}: ${error.message}`);
  });
  page.on("console", (msg) => {
    // A 404 for /admin is the expected answer for customers; the browser logs it as a failed resource.
    if (msg.type() === "error" && !ignored(msg.text()) && !/status of 404/.test(msg.text())) pageErrors.push(`${label}: console: ${msg.text()}`);
  });
  return { context, page };
}

const ready = (page) => page.locator("main h1").first().waitFor({ timeout: 20_000 });
const text = async (page) => (await ready(page), page.locator("main").textContent());
const path = (page) => new URL(page.url()).pathname;

async function signIn(page, p, landing) {
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill(p.email);
  await page.locator("#password").fill(p.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${BASE}${landing}`, { timeout: 20_000 });
}

async function signOut(page) {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.waitForURL(`${BASE}/login?notice=signed-out`, { timeout: 20_000 });
}

/** A signed-in client for direct Data API checks, with the public key only. */
async function apiAs(p) {
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, noSession);
  const { error } = await client.auth.signInWithPassword({ email: p.email, password: p.password });
  check(!error, `direct sign-in as ${p.name} failed: ${error?.message}`);
  return client;
}

/** The request's status and the number of events of each visibility (service view, as a second opinion). */
async function requestState(id) {
  const [request, events] = await Promise.all([
    service.from("service_requests").select("status").eq("id", id),
    service.from("service_request_events").select("event_type, visibility, description").eq("request_id", id),
  ]);
  return { status: one(request.data, "request row").status, events: events.data };
}

/** Width of the page beyond the viewport, with the first elements that stick out. */
async function overflowOf(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    if (sw <= vw) return null;
    const culprits = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed") {
        culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} (${Math.round(r.right)}px)`);
        if (culprits.length >= 3) break;
      }
    }
    return `${sw}px > ${vw}px: ${culprits.join("; ")}`;
  });
}

/** axe findings (WCAG 2.2 AA and best practice), of any impact. */
async function axeFindings(page) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }));
  return result.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`);
}

console.log(`Admin acceptance test against ${BASE} (${CHANNEL}), project ${new URL(SUPABASE_URL).host}\n`);

const ids = {};
let exitCode = 0;
const a = await newSession("customer A", custA.timezone);
const b = await newSession("customer B", custB.timezone);
const adm = await newSession("admin", adminUser.timezone);
const actionPosts = [];
adm.page.on("request", (request) => {
  if (request.method() === "POST" && request.headers()["next-action"]) actionPosts.push({ url: request.url(), headers: request.headers(), body: request.postDataBuffer() });
});

try {
  await step("0. The project has the Phase 2B schema", async () => {
    const { error } = await service.from("team_members").select("profile_id").limit(1);
    check(!error, `team_members is not readable (${error?.message}). Apply supabase/migrations/20260929090000_phase_2b_admin_operations.sql first.`);
    const views = await service.from("admin_request_inbox").select("id").limit(0);
    check(!views.error, `admin_request_inbox is missing (${views.error?.code}). Apply supabase/migrations/20260929100000_phase_2b_admin_list_views.sql.`);
    await removeLeftovers();
    for (const p of everyone) await createAccount(p);
    await makeStaff(adminUser, "ADMIN");
    await makeStaff(opsUser, "OPERATIONS");
  });

  // ── Customer A ──────────────────────────────────────────────────────────
  await step("1. Customer A signs in", async () => {
    await signIn(a.page, custA, "/app");
  });

  await step('2. Customer A adds "Chennai House"', async () => {
    const page = a.page;
    await page.goto(`${BASE}/app/properties/new`);
    await page.locator("#name").fill("Chennai House");
    await page.locator("#propertyType").selectOption("HOUSE");
    await page.locator("#city").fill("Chennai");
    await page.locator("#district").selectOption("Chennai");
    await page.getByRole("button", { name: "Add property" }).click();
    await page.waitForURL(/\/app\/properties\/[0-9a-f-]{36}\?saved=created$/, { timeout: 20_000 });
    ids.property = path(page).split("/").pop();
  });

  await step("3. Customer A submits a request and gets a REQ number", async () => {
    const page = a.page;
    await page.goto(`${BASE}/app/requests/new?property=${ids.property}`);
    await page.locator('input[name="category"][value="GARDEN_MAINTENANCE"]').check();
    await page.locator("#title").fill("Garden Maintenance");
    await page.locator("#description").fill("Please trim the hedges and water the plants.");
    await page.getByRole("button", { name: "Review request" }).click();
    await page.getByRole("region", { name: "Review your request" }).waitFor();
    await page.getByRole("button", { name: "Submit request" }).click();
    await page.waitForURL(/\/app\/requests\/[0-9a-f-]{36}\?saved=created$/, { timeout: 20_000 });
    ids.request = path(page).split("/").pop();
    const eyebrow = await page.locator("main").getByText(/^Service request · REQ-\d{6}$/).textContent();
    ids.number = eyebrow.split("· ")[1];
    check((await requestState(ids.request)).status === "SUBMITTED", "the new request is not SUBMITTED");
  });

  await step("4. Customer A signs out", async () => {
    await signOut(a.page);
  });

  // ── Signed out ──────────────────────────────────────────────────────────
  await step("5. Signed out, /admin goes to sign-in (and comes back afterwards)", async () => {
    const page = adm.page;
    await page.goto(`${BASE}/admin/requests/${ids.request}`);
    check(page.url() === `${BASE}/login?next=${encodeURIComponent(`/admin/requests/${ids.request}`)}`, `signed-out admin page ended on ${page.url()}`);
    await page.goto(`${BASE}/admin`);
    check(page.url() === `${BASE}/login?next=%2Fadmin`, `signed-out /admin ended on ${page.url()}`);
    const body = await page.locator("main").textContent();
    check(!body.includes(ids.number), "the sign-in page shows request data");
  });

  // ── Admin ───────────────────────────────────────────────────────────────
  const page = adm.page;
  await step("6. The admin signs in and lands on /admin", async () => {
    await page.locator("#email").fill(adminUser.email);
    await page.locator("#password").fill(adminUser.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(`${BASE}/admin`, { timeout: 20_000 });
    check((await text(page)).includes("Operations dashboard"), "the admin dashboard did not load");
    // The customer workspace sends admins to the console.
    await page.goto(`${BASE}/app`);
    await page.waitForURL(`${BASE}/admin`, { timeout: 20_000 });
  });

  await step("7. The dashboard shows the new request (counts, needs attention, latest)", async () => {
    const content = await text(page);
    check(content.includes(ids.number), "the request is not on the dashboard");
    // Needs attention lists the longest-waiting first; with older new requests in the
    // project, a brand-new one can be further down the list (the inbox shows it).
    const attention = await page.getByRole("region", { name: "Needs attention" }).textContent();
    if (/Showing the \d+ that have waited longest, of \d+\./.test(attention)) {
      await page.goto(`${BASE}/admin/requests?status=SUBMITTED&q=${ids.number}`);
      check((await page.locator("main table").textContent()).includes(ids.number), "the new request is not among the new requests");
      await page.goto(`${BASE}/admin`);
      await ready(page);
    } else check(attention.includes(ids.number) && attention.includes(custA.name), "the new request is not under Needs attention");
    const newCard = page.locator(`main a[href="/admin/requests?status=SUBMITTED"]`);
    check(Number((await newCard.locator("p").first().textContent()).trim()) >= 1, "the New count is zero");
  });

  await step("8. The inbox finds it by number, with customer, property and status", async () => {
    await page.goto(`${BASE}/admin/requests`);
    await page.locator("#filter-q").fill(ids.number);
    await page.getByRole("button", { name: "Apply" }).click();
    // A plain GET form: every filter travels in the URL, empty ones included.
    await page.waitForURL((url) => url.pathname === "/admin/requests" && url.searchParams.get("q") === ids.number);
    const table = await page.locator("main table").textContent();
    for (const expected of [ids.number, "Garden Maintenance", custA.name, "Chennai House", "New", "Unassigned"]) check(table.includes(expected), `the inbox row has no "${expected}"`);
    await page.locator("main table").getByRole("link", { name: new RegExp(ids.number) }).click();
    await page.waitForURL(`${BASE}/admin/requests/${ids.request}`);
  });

  await step("9. The request page shows the customer's and the property's details", async () => {
    const customer = await page.getByRole("region", { name: "Customer" }).textContent();
    check(customer.includes(custA.name) && customer.includes(custA.email) && customer.includes("United Arab Emirates"), "customer details are missing");
    const property = await page.getByRole("region", { name: "Property", exact: true }).textContent();
    check(property.includes("Chennai House") && property.includes("Independent house") && property.includes("Chennai"), "property details are missing");
    const timeline = await page.getByRole("list", { name: "Request timeline" }).textContent();
    check(timeline.includes("Request submitted") && timeline.includes("Customer visible"), "the timeline does not show the submitted event as customer visible");
  });

  await step("10. Assigned and In progress are refused while nobody is responsible", async () => {
    check((await page.locator("#status-assigned").count()) === 0, "Assigned is offered straight from New");
    const options = await page.locator('input[name="newStatus"]').evaluateAll((els) => els.map((e) => e.value));
    check(options.join(",") === "UNDER_REVIEW,CANCELLED", `New offers ${options.join(", ")}`);
  });

  await step("11. A forged status (New → In progress) is refused by the server", async () => {
    await page.locator("#status-under_review").check();
    await page.locator("#status-under_review").evaluate((el) => {
      el.value = "IN_PROGRESS";
    });
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByText("That status change isn't allowed from the current status.").waitFor({ timeout: 20_000 });
    check((await requestState(ids.request)).status === "SUBMITTED", "the forged status was saved");
    await page.reload();
    await ready(page);
  });

  await step("12. Change the status: New → Under review", async () => {
    await page.locator("#status-under_review").check();
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByText("Status changed to Under review.").waitFor({ timeout: 20_000 });
    const state = await requestState(ids.request);
    check(state.status === "UNDER_REVIEW", `status is ${state.status}`);
    check(state.events.filter((e) => e.event_type === "STATUS_CHANGED" && e.visibility === "CUSTOMER").length === 1, "no customer-visible status event");
  });

  await step("13. Assign the request to an operations team member", async () => {
    await page.locator("#assigneeId").selectOption(opsUser.profileId);
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await page.getByText("Assignment saved.").waitFor({ timeout: 20_000 });
    const { data } = await service.from("request_assignments").select("assignee_id, assigned_by").eq("request_id", ids.request);
    const row = one(data, "assignment");
    check(row.assignee_id === opsUser.profileId && row.assigned_by === adminUser.profileId, "the assignment is not by the admin to the operations member");
    await page.getByRole("region", { name: "Assignment" }).getByText(opsUser.name).first().waitFor();
  });

  await step("14. Now Assigned is allowed: Under review → Assigned", async () => {
    await page.locator("#status-assigned").check();
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByText("Status changed to Assigned.").waitFor({ timeout: 20_000 });
    check((await requestState(ids.request)).status === "ASSIGNED", "status is not ASSIGNED");
  });

  await step("15. A change made on a stale screen is refused", async () => {
    const stale = await adm.context.newPage();
    await stale.goto(`${BASE}/admin/requests/${ids.request}`);
    await ready(stale);
    // Someone else moves the request on meanwhile…
    await page.locator("#status-in_progress").check();
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByText("Status changed to In progress.").waitFor({ timeout: 20_000 });
    // …so the stale screen's choice is refused, not applied on top.
    await stale.locator("#status-waiting_for_customer").check();
    await stale.getByRole("button", { name: "Update status" }).click();
    await stale.getByText("Someone updated this request a moment ago.").waitFor({ timeout: 20_000 });
    check((await requestState(ids.request)).status === "IN_PROGRESS", "the stale change was applied");
    await stale.close();
  });

  await step("16. Add an internal note (team only)", async () => {
    await page.locator("#internal-body").fill(INTERNAL_NOTE);
    await page.getByRole("button", { name: "Add internal note" }).click();
    await page.getByText("Internal note added. Only the team can see it.").waitFor({ timeout: 20_000 });
    const note = one((await requestState(ids.request)).events.filter((e) => e.event_type === "INTERNAL_NOTE"), "internal note");
    check(note.visibility === "INTERNAL" && note.description === INTERNAL_NOTE, "the note is not stored as INTERNAL");
    const timeline = page.getByRole("list", { name: "Request timeline" });
    await timeline.getByText(INTERNAL_NOTE).waitFor();
    check((await timeline.textContent()).includes("Internal"), "the note is not marked Internal");
    ids.noteAction = actionPosts.at(-1);
  });

  await step("17. Send a customer-visible update (confirmed first)", async () => {
    await page.locator("#customer-body").fill(CUSTOMER_UPDATE);
    await page.getByRole("button", { name: "Send to customer" }).click();
    const dialog = page.getByRole("dialog", { name: `Send this update to ${custA.name}?` });
    await dialog.waitFor();
    // Escape cancels: nothing is sent and focus returns to the button.
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    check((await page.evaluate(() => document.activeElement?.textContent)) === "Send to customer", "focus did not return to the send button");
    check(!(await requestState(ids.request)).events.some((e) => e.event_type === "TEAM_UPDATE"), "cancelling the dialog still sent the update");
    await page.getByRole("button", { name: "Send to customer" }).click();
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Send update" }).click();
    await page.getByText("Update sent.").waitFor({ timeout: 20_000 });
    const update = one((await requestState(ids.request)).events.filter((e) => e.event_type === "TEAM_UPDATE"), "team update");
    check(update.visibility === "CUSTOMER" && update.description === CUSTOMER_UPDATE, "the update is not stored as customer visible");
    ids.updateAction = actionPosts.at(-1);
  });

  await step("18. Activity records every change, internal ones marked", async () => {
    await page.reload();
    const activity = await page.getByRole("region", { name: "Activity on this request" }).textContent();
    for (const expected of ["Status changed", "Request assigned", "Internal note added", "Update sent to customer", "Internal", adminUser.name]) {
      check(activity.includes(expected), `request activity has no "${expected}"`);
    }
    check(!activity.includes(INTERNAL_NOTE), "the activity entry repeats the note text");
    await page.goto(`${BASE}/admin/activity?visibility=INTERNAL`);
    const audit = await text(page);
    check(audit.includes("Internal note added") && audit.includes(ids.number), "the audit trail has no internal note entry");
    const { data } = await service.from("activity_logs").select("action, visibility, metadata, actor_id").eq("entity_id", ids.request);
    const byAction = Object.fromEntries(data.map((r) => [r.action, r]));
    check(byAction.REQUEST_ASSIGNED?.visibility === "INTERNAL" && byAction.INTERNAL_NOTE_ADDED?.visibility === "INTERNAL", "assignment and note activity are not INTERNAL");
    check(byAction.TEAM_UPDATE_POSTED?.visibility === "CUSTOMER", "the update activity is not customer visible");
    check(!JSON.stringify(data.map((r) => r.metadata)).includes("gate key"), "activity metadata contains note text");
    check(data.filter((r) => r.actor_id === adminUser.profileId).length >= 4, "the admin's changes are not attributed to the admin");
  });

  await step("19. The customer was notified of each change", async () => {
    const { data } = await service.from("notifications").select("type, title, message").eq("user_id", custA.profileId).order("created_at", { ascending: true });
    const types = data.map((n) => n.type);
    check(types.filter((t) => t === "REQUEST_STATUS_CHANGED").length === 3, `expected 3 status notifications, found ${types.join(", ")}`);
    check(types.includes("REQUEST_UPDATE"), "no notification for the team update");
    check(data.every((n) => !n.message.includes("gate key") && !n.title.includes("gate key")), "a notification mentions the internal note");
  });

  await step("20. Customers, properties and the team are listed for the admin", async () => {
    await page.goto(`${BASE}/admin/customers?q=${encodeURIComponent(custA.email)}`);
    check((await text(page)).includes(custA.name), "customer A is not in the customer list");
    await page.goto(`${BASE}/admin/customers/${custA.profileId}`);
    const customerPage = await text(page);
    check(customerPage.includes("Chennai House") && customerPage.includes(ids.number), "the customer page lacks their property or request");
    await page.goto(`${BASE}/admin/properties/${ids.property}`);
    const propertyPage = await text(page);
    check(propertyPage.includes(custA.name) && propertyPage.includes(ids.number), "the property page lacks its owner or request");
    await page.goto(`${BASE}/admin/team`);
    const team = await text(page);
    check(team.includes(adminUser.name) && team.includes(opsUser.name) && team.includes("Operations"), "the team page lacks the team");
    const opsCard = await page.locator("main ul li", { hasText: opsUser.email }).textContent();
    check(opsCard.includes("1 open of 1 assigned"), `the operations member's workload is not shown ("${opsCard}")`);
  });

  await step(`20b. Every admin page fits ${WIDTHS[0]}–${WIDTHS.at(-1)}px, uses cards on phones and passes axe`, async () => {
    const pages = [
      "/admin",
      "/admin/requests",
      `/admin/requests/${ids.request}`,
      "/admin/customers",
      `/admin/customers/${custA.profileId}`,
      "/admin/properties",
      `/admin/properties/${ids.property}`,
      "/admin/team",
      "/admin/activity",
    ];
    const problems = [];
    const qa = await adm.context.newPage();
    for (const width of WIDTHS) {
      await qa.setViewportSize({ width, height: 900 });
      for (const url of pages) {
        await qa.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
        await ready(qa);
        const overflow = await overflowOf(qa);
        if (overflow) problems.push(`${url} @${width}: overflow ${overflow}`);
        if (url === "/admin/requests") {
          const tableShown = await qa.locator("main table").first().isVisible();
          if (tableShown !== width >= 768) problems.push(`${url} @${width}: table ${tableShown ? "shown" : "hidden"}`);
        }
        if (width === 375 || width === 1280) for (const finding of await axeFindings(qa)) problems.push(`${url} @${width}: axe ${finding}`);
      }
    }
    // The mobile menu opens as a dialog with every section, and Escape closes it.
    await qa.setViewportSize({ width: 375, height: 800 });
    await qa.goto(`${BASE}/admin`);
    await ready(qa);
    await qa.getByRole("button", { name: "Open admin menu" }).click();
    const menu = qa.getByRole("dialog", { name: "Admin menu" });
    await menu.waitFor();
    for (const section of ["Dashboard", "Requests", "Customers", "Properties", "Team", "Activity"]) {
      if ((await menu.getByRole("link", { name: section, exact: true }).count()) !== 1) problems.push(`mobile menu has no "${section}" link`);
    }
    for (const finding of await axeFindings(qa)) problems.push(`mobile menu: axe ${finding}`);
    await qa.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await qa.close();
    check(problems.length === 0, `${problems.length} problem(s):\n        ${problems.join("\n        ")}`);
  });

  await step("21. The admin signs out", async () => {
    await signOut(page);
  });

  // ── Customer A again ────────────────────────────────────────────────────
  await step("22. Customer A sees the status and the update, never the internal note", async () => {
    const pa = a.page;
    await signIn(pa, custA, "/app");
    await pa.goto(`${BASE}/app/requests/${ids.request}`);
    const content = await text(pa);
    check(content.includes("In progress"), "the customer does not see the In progress status");
    const timeline = await pa.getByRole("list", { name: "What has happened" }).textContent();
    for (const expected of ["Request submitted", "Team review started", "Local team assigned", "Work in progress", "Update from our team", CUSTOMER_UPDATE]) {
      check(timeline.includes(expected), `the customer's timeline has no "${expected}"`);
    }
    for (const route of [`/app/requests/${ids.request}`, "/app", "/app/activity", "/app/notifications", "/app/requests"]) {
      await pa.goto(`${BASE}${route}`);
      const html = await pa.content();
      check(!html.includes("gate key") && !html.includes(INTERNAL_NOTE), `${route} shows the internal note to the customer`);
      check(!html.includes(opsUser.name) && !html.includes(adminUser.name), `${route} names a team member to the customer`);
    }
    await pa.goto(`${BASE}/app/requests/${ids.request}`);
    await ready(pa);
    const findings = await axeFindings(pa);
    check(findings.length === 0, `the customer's request page has axe findings: ${findings.join("; ")}`);
    await pa.goto(`${BASE}/app/notifications`);
    const notes = await text(pa);
    check(notes.includes(`Update on ${ids.number}`) && notes.includes("Our team added an update to Garden Maintenance."), "the update notification is missing");
    await pa.goto(`${BASE}/app/activity`);
    check((await text(pa)).includes("Update from our team"), "the customer's activity has no team update");
  });

  await step("23. Customer A's own API access has no internal records and no admin rights", async () => {
    const api = await apiAs(custA);
    const events = await api.from("service_request_events").select("event_type, visibility").eq("request_id", ids.request);
    check(!events.error && events.data.length === 5 && events.data.every((e) => e.visibility === "CUSTOMER"), `customer A reads ${events.data?.length} events, visibility ${[...new Set(events.data?.map((e) => e.visibility))].join("/")}`);
    const activity = await api.from("activity_logs").select("action, visibility").eq("customer_id", custA.profileId);
    check(!activity.error && activity.data.every((e) => e.visibility === "CUSTOMER"), "customer A reads internal activity");
    check(!activity.data.some((e) => ["REQUEST_ASSIGNED", "INTERNAL_NOTE_ADDED"].includes(e.action)), "customer A reads assignment or note activity");
    const assignment = await api.from("request_assignments").select("assignee_id").eq("request_id", ids.request);
    check(!assignment.error && assignment.data.length === 0, "customer A can see who is assigned");
    const rpc = await api.rpc("admin_change_request_status", { p_request_id: ids.request, p_expected_status: "IN_PROGRESS", p_new_status: "COMPLETED" });
    check(rpc.error?.message === "not_authorized", `customer A's admin call answered ${rpc.error?.message ?? "success"}`);
    await api.auth.signOut({ scope: "local" });
    await signOut(a.page);
  });

  // ── Customer B ──────────────────────────────────────────────────────────
  await step("24. Customer B is denied the console, A's request and the admin actions", async () => {
    const pb = b.page;
    await signIn(pb, custB, "/app");
    for (const url of ["/admin", "/admin/requests", `/admin/requests/${ids.request}`, `/admin/customers/${custA.profileId}`, "/admin/team"]) {
      const response = await pb.goto(`${BASE}${url}`);
      check([200, 404].includes(response?.status() ?? 0), `${url} answered ${response?.status()}`);
      await pb.locator("h1").first().waitFor({ timeout: 20_000 });
      const html = await pb.content();
      check(html.includes("We couldn&#x27;t find that page") || html.includes("We couldn't find that page"), `${url} is not the not-found page for customer B`);
      for (const secret of ["Admin console", "Operations dashboard", ids.number, custA.name, custA.email, opsUser.name, INTERNAL_NOTE]) check(!html.includes(secret), `${url} shows "${secret}" to customer B`);
      const robots = await pb.locator('meta[name="robots"]').evaluateAll((tags) => tags.map((t) => t.getAttribute("content")).join(" "));
      check(robots.includes("noindex"), `${url} is not marked noindex`);
      check(!/admin/i.test(await pb.title()), `${url} has the title "${await pb.title()}"`);
    }
    await pb.goto(`${BASE}/app/requests/${ids.request}`);
    check((await text(pb)).includes("This request may have been removed or you may not have access to it."), "customer B can open customer A's request");
  });

  await step("25. Customer B replaying the admin's own Server Action requests changes nothing", async () => {
    check(ids.noteAction && ids.updateAction, "no admin Server Action request was captured");
    // The captured request as sent by the admin's browser, minus the admin's cookies:
    // whoever replays it is identified only by their own session.
    const replay = (context, post) => {
      const headers = { ...post.headers };
      for (const drop of ["cookie", "content-length", "host"]) delete headers[drop];
      return context.request.post(post.url, { headers: { ...headers, origin: BASE }, data: post.body, maxRedirects: 0 });
    };
    // Control: the same replay with the admin's own session works, so the refusals below are real.
    await signIn(adm.page, adminUser, "/admin");
    const start = (await requestState(ids.request)).events.length;
    const control = await replay(adm.context, ids.noteAction);
    check(control.ok() && (await requestState(ids.request)).events.length === start + 1, `the control replay as the admin did not add a note (${control.status()})`);
    ids.eventCount = start + 1;
    await signOut(adm.page);

    const before = await requestState(ids.request);
    for (const post of [ids.noteAction, ids.updateAction]) {
      const response = await replay(b.context, post);
      const body = await response.text();
      check(!body.includes("Internal note added") && !body.includes("Update sent."), `the replayed action reported success (${response.status()})`);
    }
    const after = await requestState(ids.request);
    check(after.events.length === before.events.length && after.status === before.status, "a replayed admin action changed the request");
    // Signed out, the same replay is refused too.
    const anonymous = await browser.newContext();
    await replay(anonymous, ids.noteAction);
    await anonymous.close();
    check((await requestState(ids.request)).events.length === before.events.length, "a signed-out replay changed the request");
  });

  await step("26. Customer B's direct API calls are all refused", async () => {
    const api = await apiAs(custB);
    const calls = {
      "change the status": await api.rpc("admin_change_request_status", { p_request_id: ids.request, p_expected_status: "IN_PROGRESS", p_new_status: "CANCELLED" }),
      "assign themselves": await api.rpc("admin_assign_request", { p_request_id: ids.request, p_assignee_id: custB.profileId }),
      "remove the assignment": await api.rpc("admin_unassign_request", { p_request_id: ids.request }),
      "add an internal note": await api.rpc("admin_add_internal_note", { p_request_id: ids.request, p_body: "Injected" }),
      "post a customer update": await api.rpc("admin_post_customer_update", { p_request_id: ids.request, p_body: "Injected" }),
    };
    for (const [what, { error }] of Object.entries(calls)) check(error?.message === "not_authorized", `customer B could ${what} (${error?.message ?? "success"})`);
    const reads = {
      "A's request": api.from("service_requests").select("id").eq("id", ids.request),
      "A's timeline": api.from("service_request_events").select("id").eq("request_id", ids.request),
      "the team": api.from("team_members").select("profile_id"),
      assignments: api.from("request_assignments").select("request_id"),
      "the inbox view": api.from("admin_request_inbox").select("id"),
      "the customer overview": api.from("admin_customer_overview").select("id"),
      "the activity feed": api.from("admin_activity_feed").select("id"),
      "status counts": api.from("admin_request_status_counts").select("status"),
    };
    for (const [what, query] of Object.entries(reads)) {
      const { data, error } = await query;
      check(!error && data.length === 0, `customer B can read ${what}`);
    }
    const promote = await api.from("profiles").update({ role: "ADMIN" }).eq("id", custB.profileId).select("id");
    check(promote.error || promote.data.length === 0, "customer B could change their own role");
    const join = await api.from("team_members").insert({ profile_id: custB.profileId });
    check(join.error, "customer B could add themselves to the team");
    const assignDirect = await api.from("request_assignments").insert({ request_id: ids.request, assignee_id: custB.profileId });
    check(assignDirect.error, "customer B could write an assignment directly");
    const eventDirect = await api.from("service_request_events").insert({ request_id: ids.request, event_type: "TEAM_UPDATE", title: "x", description: "x", visibility: "CUSTOMER" });
    check(eventDirect.error, "customer B could write a timeline event directly");
    await api.auth.signOut({ scope: "local" });
    const profile = await profileOf(custB);
    check(profile.role === "CUSTOMER", "customer B's role changed");
    const state = await requestState(ids.request);
    check(state.status === "IN_PROGRESS" && state.events.length === ids.eventCount, "customer B's attempts changed customer A's request");
    await signOut(b.page);
  });

  await step("27. The admin completes the request (confirmed, final)", async () => {
    await signIn(page, adminUser, "/admin");
    await page.goto(`${BASE}/admin/requests/${ids.request}`);
    await page.locator("#status-completed").check();
    await page.getByRole("button", { name: "Update status" }).click();
    const dialog = page.getByRole("dialog", { name: "Mark this request as completed?" });
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Mark completed" }).click();
    await page.getByText("Status changed to Completed.").waitFor({ timeout: 20_000 });
    check((await requestState(ids.request)).status === "COMPLETED", "the request is not COMPLETED");
    await page.getByText("Completed and cancelled requests are final.").waitFor();
    check((await page.locator('input[name="newStatus"]').count()) === 0, "a completed request still offers status changes");
    await signOut(page);
  });

  await step("28. A deactivated admin loses access at once", async () => {
    await signIn(page, adminUser, "/admin");
    // Let the dashboard finish loading first, so the next navigation does not cut its stream short.
    await ready(page);
    await page.waitForLoadState("networkidle");
    const { error } = await service.from("team_members").update({ is_active: false }).eq("profile_id", adminUser.profileId);
    check(!error, `could not deactivate the admin: ${error?.message}`);
    await page.goto(`${BASE}/admin`);
    await page.locator("h1").first().waitFor({ timeout: 20_000 });
    check((await page.content()).includes("find that page"), "a deactivated admin still sees the console");
    const api = await apiAs(adminUser);
    const rpc = await api.rpc("admin_add_internal_note", { p_request_id: ids.request, p_body: "After deactivation" });
    check(rpc.error?.message === "not_authorized", "a deactivated admin can still call admin functions");
    const inbox = await api.from("admin_request_inbox").select("id");
    check(!inbox.error && inbox.data.length === 0, "a deactivated admin can still read the inbox");
    await api.auth.signOut({ scope: "local" });
  });

  if (pageErrors.length) {
    console.log(`\nBrowser errors:\n${pageErrors.map((e) => `  ✗ ${e}`).join("\n")}`);
    exitCode = 1;
  }
} catch {
  exitCode = 1;
} finally {
  await browser.close();
  if (KEEP) console.log(`\nKept the test accounts: ${everyone.map((p) => p.email).join(", ")}`);
  else {
    let cleaned = true;
    for (const p of everyone) if (!(await deleteAccount(p.email))) cleaned = false;
    if (cleaned) console.log("\nDeleted the four test accounts (their property, request, timeline, activity, notifications, team membership and assignment go with them).");
    else {
      console.log("\n! Some test accounts may remain. The next run removes them (after 30 minutes), or delete them in Supabase → Authentication → Users.");
      exitCode = 1;
    }
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} steps passed.`);
if (exitCode === 0) console.log("✓ Admin acceptance test passed");
process.exit(exitCode);
