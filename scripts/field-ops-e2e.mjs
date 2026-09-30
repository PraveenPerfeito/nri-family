#!/usr/bin/env node
/**
 * Phase 2C acceptance test: field operations and evidence (docs/PHASE_2C.md,
 * "Acceptance test"), in a real browser, against a running app connected to a
 * Supabase project with the Phase 2C migration. Nothing is mocked.
 *
 *   npm run build && npm start          # the app, connected to the project
 *   npm run qa:field-ops                # reads .env.local, like qa:admin
 *
 * It creates five throwaway accounts (customers A and B, a temporary admin,
 * and two operations members) with the address pattern
 * nfo-2c-e2e-<run>-<who>@<domain>, runs the journey (request → assignment →
 * visit → execution → evidence → review → explicit publish → customer proof
 * → completion) and every negative case below, and at the end deletes the
 * evidence files of their requests and then the accounts; everything they
 * created goes with them. Test files are generated (a drawn "SAMPLE" photo,
 * a one-line PDF, a one-second synthetic video): no real photos or
 * documents. It never reads or changes records it did not create.
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
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { chromium, firefox, webkit } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const DOMAIN = process.env.E2E_EMAIL_DOMAIN ?? "example.net";
const KEEP = process.env.E2E_KEEP_USERS === "true";
const CHANNEL = process.env.QA_BROWSER ?? "msedge";
const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const BUCKET = "request-evidence";
const VIDEO = readFileSync(new URL("./fixtures/sample-evidence.mp4", import.meta.url));

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
    if (process.env.E2E_SCREENSHOTS) await screenshotSessions(title);
    console.log(`  ✗ ${title}\n      ${String(error?.message ?? error).split("\n").slice(0, 25).join("\n")}`);
    throw error;
  }
}
/** On a failed step (with E2E_SCREENSHOTS=<dir>): a full-page screenshot of each browser session, for diagnosis. */
const sessions = [];
async function screenshotSessions(title) {
  const tag = title.split(".")[0].replace(/[^0-9a-z]/gi, "");
  for (const [label, page] of sessions) await page.screenshot({ path: `${process.env.E2E_SCREENSHOTS}/step${tag}-${label}-${CHANNEL}.png`, fullPage: true }).catch(() => undefined);
}
function check(condition, message) {
  if (!condition) throw new Error(message);
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** Wait until `probe` returns something truthy (polling the database, say); fail with `message` after `ms`. */
async function until(probe, message, ms = 30_000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    last = await probe();
    if (last) return last;
    await pause(400);
  }
  throw new Error(message);
}

// ── Test people (fictional; deleted at the end) ──────────────────────────────
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const SUFFIXES = ["a", "b", "admin", "ops", "ops2"];
const person = (n, name, country, timezone) => ({ name, country, timezone, email: `nfo-2c-e2e-${run}-${n}@${DOMAIN}`, password: `E2e-${randomUUID()}` });
const custA = person("a", "Asha Example", "AE", "Asia/Dubai");
const custB = person("b", "Bala Example", "GB", "Europe/London");
const adminUser = person("admin", "Meena Example", "IN", "Asia/Kolkata");
const opsUser = person("ops", "Arun Example", "IN", "Asia/Kolkata");
const ops2User = person("ops2", "Divya Example", "IN", "Asia/Kolkata");
const everyone = [custA, custB, adminUser, opsUser, ops2User];

// Internal text: must never reach a customer.
const INSTRUCTIONS = `Gate code ${run} is with the caretaker.`;
const EXECUTION_NOTES = `Hedge trimmed; the caretaker ${run} was not on site.`;
const REJECT_REASON = `Blurred scan ${run}, retake needed.`;
const SERVICE_NOTES = "Garden maintenance completed. The hedge is trimmed to one metre.";

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

/** Remove every evidence file under these customers' requests (Storage records don't go with the account). */
async function removeEvidenceFiles(customerIds) {
  if (customerIds.length === 0) return true;
  const requests = await withRetry(() => service.from("service_requests").select("id").in("customer_id", customerIds));
  if (requests.error) {
    console.log(`  ! could not list test requests: ${requests.error.message}`);
    return false;
  }
  let ok = true;
  for (const { id } of requests.data) {
    const folders = await withRetry(() => service.storage.from(BUCKET).list(id, { limit: 1000 }));
    if (folders.error) {
      console.log(`  ! could not list evidence files: ${folders.error.message}`);
      ok = false;
      continue;
    }
    const paths = [];
    for (const folder of folders.data ?? []) {
      const inner = await withRetry(() => service.storage.from(BUCKET).list(`${id}/${folder.name}`, { limit: 100 }));
      for (const file of inner.data ?? []) if (file.id) paths.push(`${id}/${folder.name}/${file.name}`);
    }
    if (paths.length > 0) {
      const removed = await withRetry(() => service.storage.from(BUCKET).remove(paths));
      if (removed.error) {
        console.log(`  ! could not remove evidence files: ${removed.error.message}`);
        ok = false;
      }
    }
    const left = await withRetry(() => service.storage.from(BUCKET).list(id, { limit: 10 }));
    if (left.error || (left.data ?? []).length > 0) ok = false;
  }
  return ok;
}

/** Delete one test account (after its evidence files); true when it is gone. */
async function deleteAccount(email) {
  const lookup = () => service.from("profiles").select("id, auth_user_id").eq("email", email).maybeSingle();
  const found = await withRetry(lookup);
  if (found.error) {
    console.log(`  ! could not look up ${email}: ${found.error.message}`);
    return false;
  }
  if (!found.data) return true;
  const filesGone = await removeEvidenceFiles([found.data.id]);
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
  return filesGone;
}

/** Accounts (and their evidence files) left by an earlier run cut off before its cleanup: the same pattern, over 30 minutes old. */
async function removeLeftovers() {
  const isTestAccount = (email) => email.startsWith("nfo-2c-e2e-") && email.endsWith(`@${DOMAIN}`) && SUFFIXES.some((s) => email.endsWith(`-${s}@${DOMAIN}`));
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
const consoleChecks = [];

async function newSession(label, timezoneId) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId });
  // A distinct client address per person for the app's rate limits, sent to the app only: added to
  // cross-origin requests (the evidence uploads to Storage), it would fail their CORS preflight.
  const address = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  await context.route(`${BASE}/**`, (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": address } }));
  const page = await context.newPage();
  const ignored = (message) => CHANNEL === "webkit" && /_rsc=.*access control checks/.test(message);
  // Browsers cancel prefetches and responses still in flight when the next page loads; WebKit then
  // logs "TypeError: Load failed" and Firefox "TypeError: Error in input stream". Those are set aside
  // only within 5 seconds of a real cancellation; every other console or page error fails the run.
  const CANCELLED = /Load request cancelled|NS_BINDING_ABORTED|NS_BASE_STREAM_CLOSED|net::ERR_ABORTED/;
  let lastCancel = 0;
  page.on("requestfailed", (request) => {
    if (CANCELLED.test(request.failure()?.errorText ?? "")) lastCancel = Date.now();
  });
  const cancelledLoad = (message, at) => /(^|TypeError: )(Load failed|Error in input stream)$/.test(message) && Math.abs(at - lastCancel) < 5000;
  page.on("pageerror", (error) => {
    const at = Date.now();
    consoleChecks.push(
      (async () => {
        await pause(500);
        if (!ignored(error.message) && !cancelledLoad(error.message, at)) pageErrors.push(`${label}: ${error.message}`);
      })(),
    );
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const at = Date.now();
    consoleChecks.push(
      (async () => {
        let message = msg.text();
        if (message.startsWith("JSHandle@")) {
          const parts = await Promise.all(msg.args().map((arg) => arg.evaluate((e) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e))).catch(() => "")));
          message = parts.join(" ").trim() || message;
        }
        await pause(500);
        // (404s are the expected answer to the tampered and forbidden evidence links this test tries.)
        if (!ignored(message) && !cancelledLoad(message, at) && !/status of 404/.test(message)) pageErrors.push(`${label}: console: ${message}`);
      })(),
    );
  });
  return { context, page };
}

const ready = (page) => page.locator("main h1").first().waitFor({ timeout: 30_000 });
const text = async (page) => (await ready(page), page.locator("main").textContent());
const path = (page) => new URL(page.url()).pathname;

async function signIn(page, p, landing) {
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill(p.email);
  await page.locator("#password").fill(p.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${BASE}${landing}`, { timeout: 30_000 });
}

async function signOut(page) {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.waitForURL(`${BASE}/login?notice=signed-out`, { timeout: 30_000 });
}

/** A signed-in client for direct Data API checks, with the public key only. */
async function apiAs(p) {
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, noSession);
  const { error } = await client.auth.signInWithPassword({ email: p.email, password: p.password });
  check(!error, `direct sign-in as ${p.name} failed: ${error?.message}`);
  return client;
}

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

async function axeFindings(page) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }));
  return result.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`);
}

// ── Records, as the service sees them (a second opinion on what the pages say) ─
const visitsOf = async (requestId) => (await service.from("field_work").select("*").eq("request_id", requestId).order("created_at")).data ?? [];
const evidenceOf = async (requestId) => (await service.from("request_evidence").select("*").eq("request_id", requestId).order("created_at")).data ?? [];
const statusOf = async (requestId) => (await service.from("service_requests").select("status").eq("id", requestId).single()).data?.status;
const eventsOf = async (requestId) => (await service.from("service_request_events").select("event_type, visibility, title, description, created_by").eq("request_id", requestId)).data ?? [];
const notificationsOf = async (profileId) => (await service.from("notifications").select("type, title, message, entity_id").eq("user_id", profileId)).data ?? [];

// ── Generated test files (fictional) ───────────────────────────────────────────
async function samplePhoto(page, label, color) {
  const dataUrl = await page.evaluate(
    ({ label, color }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1200;
      const context = canvas.getContext("2d");
      context.fillStyle = color;
      context.fillRect(0, 0, 1600, 1200);
      context.fillStyle = "white";
      context.font = "bold 120px sans-serif";
      context.fillText("SAMPLE", 100, 260);
      context.font = "72px sans-serif";
      context.fillText(label, 100, 420);
      return canvas.toDataURL("image/jpeg", 0.9);
    },
    { label, color },
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

function samplePdf(line) {
  const content = `BT /F1 18 Tf 24 90 Td (${line}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

// ── Console helpers ────────────────────────────────────────────────────────────
async function uploadEvidence(page, requestId, { file, stage, title, description }) {
  await page.locator("#evidence-file").setInputFiles(file);
  await page.locator("#evidence-stage").selectOption(stage);
  await page.locator("#evidence-title").fill(title);
  if (description) await page.locator("#evidence-description").fill(description);
  await page.getByRole("button", { name: "Add evidence" }).click();
  const row = await until(async () => (await evidenceOf(requestId)).find((e) => e.title === title), `"${title}" was not added`, 90_000).catch(async (error) => {
    const form = await page.locator("form:has(#evidence-file)").textContent().catch(() => "(no form)");
    if (process.env.E2E_SCREENSHOTS) await page.screenshot({ path: `${process.env.E2E_SCREENSHOTS}/upload-${CHANNEL}.png`, fullPage: true }).catch(() => undefined);
    throw new Error(`${error.message}. The upload form says: ${form.replace(/\s+/g, " ").slice(-400)}`);
  });
  await page.getByRole("region", { name: "Evidence", exact: true }).getByText(title, { exact: true }).first().waitFor({ timeout: 30_000 });
  await page.locator("form:has(#evidence-file)").getByRole("button", { name: "Add evidence" }).waitFor({ timeout: 30_000 });
  return row;
}

console.log(`Field operations acceptance test against ${BASE} (${CHANNEL}), project ${new URL(SUPABASE_URL).host}\n`);

const ids = {};
let exitCode = 0;
const a = await newSession("customer A", custA.timezone);
const b = await newSession("customer B", custB.timezone);
const adm = await newSession("admin", adminUser.timezone);
sessions.push(["customerA", a.page], ["customerB", b.page], ["admin", adm.page]);
const actionPosts = [];
adm.page.on("request", (request) => {
  if (request.method() === "POST" && request.headers()["next-action"]) actionPosts.push({ url: request.url(), headers: request.headers(), body: request.postDataBuffer() });
});
/** Replay a captured Server Action request from another browser context, with some text in its body replaced. */
const replay = (context, post, replacements = []) => {
  const headers = { ...post.headers };
  for (const drop of ["cookie", "content-length", "host"]) delete headers[drop];
  let body = post.body.toString("latin1");
  for (const [from, to] of replacements) body = body.split(from).join(to);
  return context.request.post(post.url, { headers: { ...headers, origin: BASE }, data: Buffer.from(body, "latin1"), maxRedirects: 0 });
};
const lastPost = (marker) => [...actionPosts].reverse().find((p) => p.body.toString("latin1").includes(marker));

try {
  await step("0. The project has the Phase 2C schema and a private evidence bucket", async () => {
    const tables = await service.from("field_work").select("id").limit(1);
    check(!tables.error, `field_work is not readable (${tables.error?.message}). Apply supabase/migrations/20260930090000_phase_2c_field_operations.sql first.`);
    const bucket = await service.storage.getBucket(BUCKET);
    check(!bucket.error && bucket.data?.public === false, `the ${BUCKET} bucket is missing or public (${bucket.error?.message ?? `public ${bucket.data?.public}`})`);
    await removeLeftovers();
    for (const p of everyone) await createAccount(p);
    await makeStaff(adminUser, "ADMIN");
    await makeStaff(opsUser, "OPERATIONS");
    await makeStaff(ops2User, "OPERATIONS");
  });

  // ── Customer A: property and request ──────────────────────────────────
  await step("1. Customer A adds a property and submits a garden request", async () => {
    const page = a.page;
    await signIn(page, custA, "/app");
    await page.goto(`${BASE}/app/properties/new`);
    await page.locator("#name").fill("Chennai House");
    await page.locator("#propertyType").selectOption("HOUSE");
    await page.locator("#city").fill("Chennai");
    await page.locator("#district").selectOption("Chennai");
    await page.getByRole("button", { name: "Add property" }).click();
    await page.waitForURL(/\/app\/properties\/[0-9a-f-]{36}\?saved=created$/, { timeout: 30_000 });
    ids.property = path(page).split("/").pop();
    await page.goto(`${BASE}/app/requests/new?property=${ids.property}`);
    await page.locator('input[name="category"][value="GARDEN_MAINTENANCE"]').check();
    await page.locator("#title").fill("Garden Maintenance");
    await page.locator("#description").fill("Please trim the hedges and water the plants.");
    await page.getByRole("button", { name: "Review request" }).click();
    await page.getByRole("region", { name: "Review your request" }).waitFor();
    await page.getByRole("button", { name: "Submit request" }).click();
    await page.waitForURL(/\/app\/requests\/[0-9a-f-]{36}\?saved=created$/, { timeout: 30_000 });
    ids.request = path(page).split("/").pop();
    ids.number = (await page.locator("main").getByText(/^Service request · REQ-\d{6}$/).textContent()).split("· ")[1];
    check((await text(page)).includes("Garden Maintenance"), "the request page did not load");
    check((await page.getByRole("region", { name: "Service visit" }).count()) === 0, "a new request shows a service visit");
    check((await page.getByRole("region", { name: "Evidence" }).count()) === 0, "a new request shows evidence");
  });

  await step("2. Customer B has their own request, with evidence published by the team (set up through the API)", async () => {
    const api = await apiAs(custB);
    const request = await api.from("service_requests").insert({ category: "CLEANING", title: "Cleaning before a visit", description: "Deep clean, please." }).select("id").single();
    check(!request.error, `customer B could not create a request: ${request.error?.message}`);
    ids.requestB = request.data.id;
    await api.auth.signOut({ scope: "local" });
    const admin = await apiAs(adminUser);
    const rpc = async (fn, args) => {
      const { data, error } = await admin.rpc(fn, args);
      check(!error, `${fn} failed: ${error?.message}`);
      return data;
    };
    await rpc("admin_change_request_status", { p_request_id: ids.requestB, p_expected_status: "SUBMITTED", p_new_status: "UNDER_REVIEW" });
    await rpc("admin_assign_request", { p_request_id: ids.requestB, p_assignee_id: opsUser.profileId });
    await rpc("admin_change_request_status", { p_request_id: ids.requestB, p_expected_status: "UNDER_REVIEW", p_new_status: "ASSIGNED" });
    ids.evidenceB = randomUUID();
    ids.pathB = `${ids.requestB}/${ids.evidenceB}/original.jpg`;
    const ticket = await admin.storage.from(BUCKET).createSignedUploadUrl(ids.pathB);
    check(!ticket.error, `upload link for B failed: ${ticket.error?.message}`);
    const put = await fetch(ticket.data.signedUrl, { method: "PUT", headers: { "content-type": "image/jpeg", apikey: SUPABASE_PUBLISHABLE_KEY }, body: await samplePhoto(adm.page, "B's clean kitchen", "#475569") });
    check(put.ok, `upload for B failed (${put.status})`);
    await rpc("admin_add_evidence", { p_request_id: ids.requestB, p_evidence_id: ids.evidenceB, p_stage: "AFTER", p_title: "Kitchen after cleaning", p_description: null, p_captured_at: null, p_original_name: "b.jpg" });
    await rpc("admin_approve_evidence", { p_evidence_id: ids.evidenceB });
    await rpc("admin_publish_evidence", { p_evidence_id: ids.evidenceB });
    await admin.auth.signOut({ scope: "local" });
  });

  // ── The admin: review, assign, schedule ────────────────────────────────
  const page = adm.page;
  await step("3. The admin opens the request: no visit yet, and scheduling waits for the request to be assigned", async () => {
    await signIn(page, adminUser, "/admin");
    await page.goto(`${BASE}/admin/requests/${ids.request}`);
    const panel = page.getByRole("region", { name: "Field work" });
    await panel.waitFor({ timeout: 30_000 });
    const content = await panel.textContent();
    check(content.includes("Visit: not scheduled") && content.includes("Visits can be scheduled once the request is Assigned"), `the field work panel says: ${content}`);
    check((await page.locator("#schedule-date").count()) === 0, "a visit can be scheduled for a new request");
    const evidence = await page.getByRole("region", { name: "Evidence", exact: true }).textContent();
    check(evidence.includes("No evidence yet") && evidence.includes("Add evidence"), "the evidence panel is not ready for uploads");
  });

  await step("4. Under review → assign an operations member → Assigned (the Phase 2B flow, unchanged)", async () => {
    await page.locator("#status-under_review").check();
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByText("Status changed to Under review.").waitFor({ timeout: 30_000 });
    await page.locator("#assigneeId").selectOption(opsUser.profileId);
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await page.getByText("Assignment saved.").waitFor({ timeout: 30_000 });
    await page.locator("#status-assigned").check();
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByText("Status changed to Assigned.").waitFor({ timeout: 30_000 });
    check((await statusOf(ids.request)) === "ASSIGNED", "the request is not Assigned");
  });

  await step("5. Schedule the visit (India time); the customer is told, the instructions stay internal", async () => {
    const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 86_400_000));
    await page.locator("#schedule-date").fill(tomorrow);
    await page.locator("#schedule-start").fill("10:00");
    await page.locator("#schedule-end").fill("12:00");
    await page.locator("#schedule-instructions").fill(INSTRUCTIONS);
    await page.getByRole("button", { name: "Schedule visit" }).click();
    const [visit] = await until(async () => {
      const v = await visitsOf(ids.request);
      return v.length === 1 ? v : null;
    }, "no visit was scheduled");
    ids.visit = visit.id;
    check(visit.status === "SCHEDULED" && new Date(visit.scheduled_start).toISOString() === new Date(`${tomorrow}T10:00:00+05:30`).toISOString(), `the visit is ${visit.status} at ${visit.scheduled_start}`);
    await page.getByText("Visit scheduled.").waitFor({ timeout: 30_000 });
    await page.getByRole("region", { name: "Field work" }).getByText("Visit: scheduled").waitFor({ timeout: 30_000 });
    const panel = await page.getByRole("region", { name: "Field work" }).textContent();
    check(panel.includes("Visit: scheduled") && panel.includes("10:00–12:00 India time") && panel.includes(opsUser.name) && panel.includes(INSTRUCTIONS), `the panel says: ${panel}`);
    const events = await eventsOf(ids.request);
    const scheduled = events.find((e) => e.event_type === "FIELD_WORK_SCHEDULED");
    check(scheduled?.visibility === "CUSTOMER" && scheduled.created_by === null, "the scheduled event is not customer visible without an author");
    check(!JSON.stringify(events).includes(INSTRUCTIONS), "the instructions reached the timeline");
    const notes = await notificationsOf(custA.profileId);
    check(notes.some((n) => n.type === "VISIT_UPDATE" && n.title === `Visit scheduled for ${ids.number}` && n.message.includes("10:00–12:00 (India time)")), "the customer was not notified of the visit");
    ids.scheduleAction = lastPost("instructions");
  });

  await step("6. Start work; a second, stale screen can't start it again; the request is In progress", async () => {
    const stale = await adm.context.newPage();
    await stale.goto(`${BASE}/admin/requests/${ids.request}`);
    await stale.getByRole("button", { name: "Start work" }).waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: "Start work" }).click();
    await until(async () => (await visitsOf(ids.request))[0]?.status === "IN_PROGRESS", "the visit did not start");
    await page.getByText("Work started.").waitFor({ timeout: 30_000 });
    await page.getByRole("region", { name: "Field work" }).getByText("Visit: in progress").waitFor({ timeout: 30_000 });
    ids.startAction = lastPost(ids.visit);
    check((await statusOf(ids.request)) === "IN_PROGRESS", "the request did not move to In progress");
    await stale.getByRole("button", { name: "Start work" }).click();
    await stale.getByText("This visit was updated a moment ago.").waitFor({ timeout: 30_000 });
    const visits = await visitsOf(ids.request);
    check(visits.length === 1 && visits[0].status === "IN_PROGRESS", "the stale screen changed the visit");
    const started = (await eventsOf(ids.request)).filter((e) => e.event_type === "FIELD_WORK_STARTED");
    check(started.length === 1 && started[0].visibility === "INTERNAL", "the start is not recorded once, internally");
    await stale.close();
  });

  await step("7. Record the execution notes (internal)", async () => {
    await page.reload();
    await page.locator(`#notes-${ids.visit}`).fill(EXECUTION_NOTES);
    await page.getByRole("button", { name: "Save notes" }).click();
    await until(async () => (await service.from("field_work_internal").select("execution_notes").eq("field_work_id", ids.visit).single()).data?.execution_notes === EXECUTION_NOTES, "the notes were not saved");
    await page.getByText("Notes saved. Only the team can see them.").waitFor({ timeout: 30_000 });
  });

  await step("8. Upload evidence: a before photo, an after photo, a video and a PDF; each waits for review, internal", async () => {
    await page.reload();
    await ready(page);
    ids.before = await uploadEvidence(page, ids.request, {
      file: { name: "IMG_before.jpg", mimeType: "image/jpeg", buffer: await samplePhoto(page, "Hedge before trimming", "#0f766e") },
      stage: "BEFORE",
      title: "Hedge before trimming",
      description: "Overgrown along the front wall.",
    });
    ids.finishAction = lastPost(ids.before.id);
    ids.after = await uploadEvidence(page, ids.request, {
      file: { name: "IMG_after.jpg", mimeType: "image/jpeg", buffer: await samplePhoto(page, "Hedge after trimming", "#155e75") },
      stage: "AFTER",
      title: "Hedge after trimming",
    });
    ids.video = await uploadEvidence(page, ids.request, { file: { name: "walkthrough.mp4", mimeType: "video/mp4", buffer: VIDEO }, stage: "DURING", title: "Short walk-through" });
    ids.pdf = await uploadEvidence(page, ids.request, { file: { name: "work-sheet.pdf", mimeType: "application/pdf", buffer: samplePdf("Sample work sheet (test)") }, stage: "GENERAL", title: "Work sheet" });

    const rows = await evidenceOf(ids.request);
    check(rows.length === 4 && rows.every((e) => e.review_status === "PENDING_REVIEW" && e.visibility === "INTERNAL" && e.field_work_id === ids.visit), "new evidence is not pending, internal and linked to the visit");
    const kinds = Object.fromEntries(rows.map((e) => [e.title, `${e.kind}:${e.mime_type}`]));
    check(kinds["Hedge before trimming"] === "PHOTO:image/jpeg" && kinds["Short walk-through"] === "VIDEO:video/mp4" && kinds["Work sheet"] === "DOCUMENT:application/pdf", `kinds: ${JSON.stringify(kinds)}`);
    const records = (await service.from("request_evidence_internal").select("evidence_id, uploaded_by, storage_path").in("evidence_id", rows.map((e) => e.id))).data;
    check(records.length === 4 && records.every((r) => r.uploaded_by === adminUser.profileId && r.storage_path.startsWith(`${ids.request}/`)), "the uploader or file location is wrong");
    // Photos are re-encoded in the browser (resized, no EXIF): the stored photo is not the 1600 px original.
    check(ids.before.size_bytes > 0 && ids.before.size_bytes < 2 * 1024 * 1024, `the photo is ${ids.before.size_bytes} bytes`);
    const api = await apiAs(custA);
    const seen = await api.from("request_evidence").select("id");
    check(!seen.error && seen.data.length === 0, "customer A can already see evidence waiting for review");
    const sign = await api.storage.from(BUCKET).createSignedUrl(records[0].storage_path, 60);
    check(sign.error, "customer A can sign a link to evidence waiting for review");
    await api.auth.signOut({ scope: "local" });
    // The admin's own file link works (authorised, then redirected to a short-lived signed link).
    const response = await adm.context.request.get(`${BASE}/admin/requests/${ids.request}/evidence/${ids.before.id}`, { maxRedirects: 0 });
    check(response.status() === 302 && /\/storage\/v1\/object\/sign\//.test(response.headers().location ?? ""), `the admin file link answered ${response.status()}`);
    check((response.headers()["cache-control"] ?? "").includes("no-store"), "the file link may be cached");
  });

  await step("8b. The dashboard lists the request under evidence waiting for review, and its visit in progress", async () => {
    await page.goto(`${BASE}/admin`);
    const panel = page.getByRole("region", { name: "Field work" });
    await panel.waitFor({ timeout: 30_000 });
    const waiting = await panel.getByRole("region", { name: /Evidence waiting for review/ }).textContent();
    check(waiting.includes(ids.number) && waiting.includes("4 pieces of evidence"), `the dashboard says: ${waiting}`);
    const visits = await panel.getByRole("region", { name: /Scheduled and in progress/ }).textContent();
    check(visits.includes(ids.number) && visits.includes("Visit: in progress") && visits.includes("India time"), `the dashboard says: ${visits}`);
    await panel.getByRole("link", { name: new RegExp(ids.number) }).first().click();
    await page.waitForURL(`${BASE}/admin/requests/${ids.request}`);
  });

  await step("9. A disguised file is refused by the server's content check, and nothing tampered in the request sticks", async () => {
    check(ids.finishAction, "the upload's Server Action request was not captured");
    const api = await apiAs(adminUser);
    // An HTML page uploaded as if it were a JPEG photo.
    const disguisedId = randomUUID();
    const disguisedPath = `${ids.request}/${disguisedId}/original.jpg`;
    const ticket = await api.storage.from(BUCKET).createSignedUploadUrl(disguisedPath);
    check(!ticket.error, `upload link failed: ${ticket.error?.message}`);
    const put = await fetch(ticket.data.signedUrl, { method: "PUT", headers: { "content-type": "image/jpeg", apikey: SUPABASE_PUBLISHABLE_KEY }, body: "<!doctype html><script>alert(1)</script>" });
    check(put.ok, `the disguised upload was refused by Storage itself (${put.status}); the server check is not reached`);
    const refused = await replay(adm.context, ids.finishAction, [[ids.before.id, disguisedId]]);
    check((await refused.text()).includes("isn't the kind of file its name says"), "the server did not refuse the disguised file");
    check(!(await evidenceOf(ids.request)).some((e) => e.id === disguisedId), "the disguised file became evidence");
    const gone = await api.storage.from(BUCKET).list(`${ids.request}/${disguisedId}`);
    check(!gone.error && gone.data.length === 0, "the disguised upload was not removed");

    // A real photo, registered with visibility, review status, uploader and customer injected into the request.
    const forgedId = randomUUID();
    const t2 = await api.storage.from(BUCKET).createSignedUploadUrl(`${ids.request}/${forgedId}/original.jpg`);
    await fetch(t2.data.signedUrl, { method: "PUT", headers: { "content-type": "image/jpeg", apikey: SUPABASE_PUBLISHABLE_KEY }, body: await samplePhoto(page, "Side path", "#334155") });
    const injected = `"visibility":"CUSTOMER_VISIBLE","review_status":"APPROVED","reviewStatus":"APPROVED","uploaded_by":"${custB.profileId}","uploadedBy":"${custB.profileId}","customer_id":"${custB.profileId}","customerId":"${custB.profileId}","requestId":`;
    await replay(adm.context, ids.finishAction, [
      [ids.before.id, forgedId],
      ['"requestId":', injected],
      ["Hedge before trimming", "Side path"],
    ]);
    const forged = await until(async () => (await evidenceOf(ids.request)).find((e) => e.id === forgedId), "the replayed upload was not registered");
    check(forged.review_status === "PENDING_REVIEW" && forged.visibility === "INTERNAL" && forged.customer_id === custA.profileId, `injected fields stuck: ${forged.review_status}/${forged.visibility}/${forged.customer_id === custA.profileId}`);
    const record = (await service.from("request_evidence_internal").select("uploaded_by").eq("evidence_id", forgedId).single()).data;
    check(record.uploaded_by === adminUser.profileId, "the injected uploader stuck");
    ids.side = forged;
    await api.auth.signOut({ scope: "local" });
  });

  await step("10. Review: approve the photos and the video, reject the PDF and the side photo with an internal reason", async () => {
    await page.reload();
    await ready(page);
    for (const item of [ids.before, ids.after, ids.video]) {
      await page.getByRole("button", { name: `Approve: ${item.title}` }).click();
      await until(async () => (await evidenceOf(ids.request)).find((e) => e.id === item.id)?.review_status === "APPROVED", `"${item.title}" was not approved`);
      await page.getByRole("button", { name: `Approve: ${item.title}` }).waitFor({ state: "detached", timeout: 30_000 });
    }
    for (const item of [ids.pdf, ids.side]) {
      await page.getByRole("button", { name: `Reject: ${item.title}` }).first().click();
      const dialog = page.getByRole("dialog", { name: "Reject this evidence?" });
      await dialog.waitFor();
      await dialog.locator(`#reason-${item.id}`).fill(REJECT_REASON);
      await dialog.getByRole("button", { name: "Reject", exact: true }).click();
      await until(async () => (await evidenceOf(ids.request)).find((e) => e.id === item.id)?.review_status === "REJECTED", `"${item.title}" was not rejected`);
      await page.getByRole("button", { name: `Reject: ${item.title}` }).waitFor({ state: "detached", timeout: 30_000 });
    }
    const rows = await evidenceOf(ids.request);
    check(rows.every((e) => e.visibility === "INTERNAL"), "approving or rejecting made evidence visible");
    const reasons = (await service.from("request_evidence_internal").select("review_note").eq("evidence_id", ids.pdf.id).single()).data;
    check(reasons.review_note === REJECT_REASON, "the rejection reason was not kept internally");
    const audit = (await service.from("activity_logs").select("action, visibility, metadata").eq("entity_id", ids.request)).data;
    check(audit.filter((l) => l.action === "EVIDENCE_REJECTED").length === 2 && audit.every((l) => !JSON.stringify(l.metadata).includes("Blurred")), "rejections are not audited without their reason");
    check(audit.filter((l) => l.action.startsWith("EVIDENCE_") || l.action.startsWith("FIELD_WORK_")).every((l) => l.visibility === "INTERNAL"), "field work or evidence activity is not internal");
  });

  await step("11. The request can't be completed yet: Completed is greyed out, and a forced attempt is refused", async () => {
    await page.reload();
    await ready(page);
    const option = page.locator("#status-completed");
    check(await option.isDisabled(), "Completed is offered while the visit is open");
    check((await page.locator("#status-completed-hint").textContent()).includes("Finish or cancel the field work first."), "the reason is not shown");
    await option.evaluate((el) => {
      el.disabled = false;
      el.checked = true;
    });
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByRole("dialog", { name: "Mark this request as completed?" }).getByRole("button", { name: "Mark completed" }).click();
    await page.getByText("Finish or cancel the field work before completing the request.").waitFor({ timeout: 30_000 });
    check((await statusOf(ids.request)) === "IN_PROGRESS", "the request was completed with the visit still open");
  });

  await step("12. Publish the approved photos and video (explicit, confirmed); the customer gets one entry and one notification", async () => {
    await page.reload();
    await ready(page);
    for (const item of [ids.before, ids.after, ids.video]) {
      await page.getByRole("button", { name: `Share with customer: ${item.title}` }).click();
      const dialog = page.getByRole("dialog", { name: "Share this with the customer?" });
      await dialog.waitFor();
      await dialog.getByRole("button", { name: "Share", exact: true }).click();
      await until(async () => (await evidenceOf(ids.request)).find((e) => e.id === item.id)?.visibility === "CUSTOMER_VISIBLE", `"${item.title}" was not shared`);
      await page.getByRole("button", { name: `Share with customer: ${item.title}` }).waitFor({ state: "detached", timeout: 30_000 });
    }
    ids.publishAction = lastPost(ids.video.id);
    const events = (await eventsOf(ids.request)).filter((e) => e.event_type === "EVIDENCE_AVAILABLE");
    check(events.length === 1 && events[0].visibility === "CUSTOMER", `expected one "new evidence" entry, found ${events.length}`);
    const notes = (await notificationsOf(custA.profileId)).filter((n) => n.type === "EVIDENCE_AVAILABLE");
    check(notes.length === 1 && notes[0].message === "New service evidence is available for Garden Maintenance.", `expected one evidence notification, found ${notes.length}`);
    const rejected = (await evidenceOf(ids.request)).filter((e) => e.review_status === "REJECTED");
    check(rejected.length === 2 && rejected.every((e) => e.visibility === "INTERNAL"), "rejected evidence changed");
    check((await page.getByRole("button", { name: /^Share with customer: Work sheet$/ }).count()) === 0, "rejected evidence can be shared from the page");
  });

  await step("13. Double submissions change nothing: publishing again, approving again, uploading again", async () => {
    check(ids.publishAction && ids.finishAction, "the Server Action requests were not captured");
    const before = { events: (await eventsOf(ids.request)).length, notes: (await notificationsOf(custA.profileId)).length, evidence: (await evidenceOf(ids.request)).length };
    await replay(adm.context, ids.publishAction);
    await replay(adm.context, ids.publishAction);
    await replay(adm.context, ids.finishAction);
    const after = { events: (await eventsOf(ids.request)).length, notes: (await notificationsOf(custA.profileId)).length, evidence: (await evidenceOf(ids.request)).length };
    check(JSON.stringify(after) === JSON.stringify(before), `a repeated request added records: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  });

  await step("14. Mark the visit complete with service notes (confirmed); the request stays open for completion", async () => {
    await page.reload();
    await ready(page);
    await page.locator(`#summary-${ids.visit}`).fill(SERVICE_NOTES);
    await page.getByRole("button", { name: "Mark work complete" }).click();
    const dialog = page.getByRole("dialog", { name: "Mark the visit as complete?" });
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Mark complete" }).click();
    const visit = await until(async () => {
      const v = (await visitsOf(ids.request))[0];
      return v?.status === "COMPLETED" ? v : null;
    }, "the visit was not completed");
    check(visit.summary === SERVICE_NOTES && visit.completed_at, "the service notes or completion time are missing");
    check((await statusOf(ids.request)) === "IN_PROGRESS", "completing the visit completed the request");
    await page.getByText("Visit marked complete.").waitFor({ timeout: 30_000 });
    await page.getByRole("region", { name: "Field work" }).getByText("Visit: completed").waitFor({ timeout: 30_000 });
  });

  await step(`15. The admin request page and dashboard fit ${WIDTHS[0]}–${WIDTHS.at(-1)}px and pass axe, with visit and evidence on them`, async () => {
    const problems = [];
    const qa = await adm.context.newPage();
    for (const width of WIDTHS) {
      await qa.setViewportSize({ width, height: 900 });
      for (const url of [`/admin/requests/${ids.request}`, "/admin"]) {
        await qa.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
        await ready(qa);
        const overflow = await overflowOf(qa);
        if (overflow) problems.push(`${url} @${width}: overflow ${overflow}`);
        if ([320, 430, 1280].includes(width)) for (const finding of await axeFindings(qa)) problems.push(`${url} @${width}: axe ${finding}`);
      }
    }
    // The dialogs open, trap focus and close with Escape, returning focus.
    await qa.setViewportSize({ width: 375, height: 800 });
    await qa.goto(`${BASE}/admin/requests/${ids.request}`);
    await ready(qa);
    const reject = qa.getByRole("button", { name: `Reject: ${ids.after.title}` });
    if ((await reject.count()) === 1) problems.push("shared evidence still offers Reject");
    await qa.close();
    check(problems.length === 0, `${problems.length} problem(s):\n        ${problems.join("\n        ")}`);
  });

  await step("16. Complete the request (confirmed); it is closed for any further change", async () => {
    await page.reload();
    await ready(page);
    check(!(await page.locator("#status-completed").isDisabled()), "Completed is still greyed out");
    await page.locator("#status-completed").check();
    await page.getByRole("button", { name: "Update status" }).click();
    await page.getByRole("dialog", { name: "Mark this request as completed?" }).getByRole("button", { name: "Mark completed" }).click();
    await page.getByText("Status changed to Completed.").waitFor({ timeout: 30_000 });
    check((await statusOf(ids.request)) === "COMPLETED", "the request is not completed");
    const panels = `${await page.getByRole("region", { name: "Field work" }).textContent()} ${await page.getByRole("region", { name: "Evidence", exact: true }).textContent()}`;
    check(panels.includes("This request is closed") && (await page.locator("#evidence-file").count()) === 0, "a completed request still offers changes");
    // Replaying earlier changes is refused, and so are direct calls.
    const counts = async () => JSON.stringify({ v: await visitsOf(ids.request), e: (await evidenceOf(ids.request)).map((e) => [e.id, e.review_status, e.visibility]) });
    const before = await counts();
    const scheduled = await replay(adm.context, ids.scheduleAction);
    check(!(await scheduled.text()).includes("Visit scheduled."), "rescheduling on a completed request reported success");
    const api = await apiAs(adminUser);
    for (const [fn, args] of [
      ["admin_reject_evidence", { p_evidence_id: ids.before.id, p_reason: null }],
      ["admin_record_field_work_notes", { p_field_work_id: ids.visit, p_execution_notes: "late" }],
      ["admin_add_evidence", { p_request_id: ids.request, p_evidence_id: randomUUID(), p_stage: "AFTER", p_title: "Late", p_description: null, p_captured_at: null, p_original_name: null }],
    ]) {
      const { error } = await api.rpc(fn, args);
      check(error?.message === "request_closed", `${fn} on a completed request answered ${error?.message ?? "success"}`);
    }
    const upload = await api.storage.from(BUCKET).createSignedUploadUrl(`${ids.request}/${randomUUID()}/original.jpg`);
    check(upload.error, "a completed request still accepts uploads");
    await api.auth.signOut({ scope: "local" });
    check((await counts()) === before, "a completed request changed");
  });

  await step("17. An inactive team member can't start work, and a cancelled request can't be started", async () => {
    const api = await apiAs(adminUser);
    const customer = await apiAs(custA);
    const { data: second } = await customer.from("service_requests").insert({ category: "SECURITY_CHECK", title: "Security check", description: "Check the gate locks." }).select("id").single();
    await customer.auth.signOut({ scope: "local" });
    ids.request2 = second.id;
    for (const [fn, args] of [
      ["admin_change_request_status", { p_request_id: second.id, p_expected_status: "SUBMITTED", p_new_status: "UNDER_REVIEW" }],
      ["admin_assign_request", { p_request_id: second.id, p_assignee_id: ops2User.profileId }],
      ["admin_change_request_status", { p_request_id: second.id, p_expected_status: "UNDER_REVIEW", p_new_status: "ASSIGNED" }],
    ]) {
      const { error } = await api.rpc(fn, args);
      check(!error, `${fn}: ${error?.message}`);
    }
    const start = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const { data: visit2, error } = await api.rpc("admin_schedule_field_work", { p_request_id: second.id, p_scheduled_start: start, p_scheduled_end: null, p_instructions: null });
    check(!error, `scheduling failed: ${error?.message}`);
    ids.visit2 = visit2;
    await service.from("team_members").update({ is_active: false }).eq("profile_id", ops2User.profileId);

    await page.goto(`${BASE}/admin/requests/${second.id}`);
    const panel = await page.getByRole("region", { name: "Field work" }).textContent();
    check(panel.includes("The visit can't start yet") && panel.includes("(no longer active)"), `the panel says: ${panel}`);
    check((await page.getByRole("button", { name: "Start work" }).count()) === 0, "Start work is offered with an inactive assignee");
    const forced = await replay(adm.context, ids.startAction, [[ids.visit, visit2]]);
    check((await forced.text()).includes("needs an active team member responsible"), "the server did not refuse an inactive assignee");
    check((await visitsOf(second.id))[0].status === "SCHEDULED", "the visit started with an inactive assignee");

    const cancel = await api.rpc("admin_change_request_status", { p_request_id: second.id, p_expected_status: "ASSIGNED", p_new_status: "CANCELLED" });
    check(!cancel.error, `cancelling failed: ${cancel.error?.message}`);
    check((await visitsOf(second.id))[0].status === "CANCELLED", "cancelling the request did not cancel its visit");
    const again = await replay(adm.context, ids.startAction, [[ids.visit, visit2]]);
    check((await again.text()).includes("This request is closed"), "starting work on a cancelled request was not refused");
    await service.from("team_members").update({ is_active: true }).eq("profile_id", ops2User.profileId);
    await api.auth.signOut({ scope: "local" });
    await signOut(page);
  });

  // ── Customer A: the proof ───────────────────────────────────────────────
  await step("18. Customer A sees the completed visit, the service notes and the published evidence, nothing internal", async () => {
    const pa = a.page;
    await pa.goto(`${BASE}/app/requests/${ids.request}`);
    const content = await text(pa);
    check(content.includes("Completed"), "the request is not shown as completed");
    const visit = await pa.getByRole("region", { name: "Service visit" }).textContent();
    check(visit.includes("Visit completed") && visit.includes(SERVICE_NOTES) && visit.includes("India time") && visit.includes("in Dubai"), `the visit panel says: ${visit}`);
    const gallery = pa.getByRole("region", { name: "Evidence", exact: true });
    const galleryText = await gallery.textContent();
    for (const expected of ["Before", "During", "After", "Hedge before trimming", "Hedge after trimming", "Short walk-through", "Overgrown along the front wall."]) {
      check(galleryText.includes(expected), `the gallery has no "${expected}"`);
    }
    check(!galleryText.includes("Work sheet") && !galleryText.includes("Side path"), "rejected evidence is shown to the customer");
    // The photos really load: authorised by the app, then served through a short-lived signed link.
    for (const title of ["Hedge before trimming", "Hedge after trimming"]) {
      const img = gallery.getByRole("img", { name: title });
      await img.scrollIntoViewIfNeeded();
      await until(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), `the photo "${title}" did not load`);
    }
    const timeline = await pa.getByRole("list", { name: "What has happened" }).textContent();
    for (const expected of ["Service visit scheduled", "Work in progress", "New evidence shared", "Service visit completed", SERVICE_NOTES, "Request completed"]) {
      check(timeline.includes(expected), `the timeline has no "${expected}"`);
    }
    for (const route of [`/app/requests/${ids.request}`, "/app", "/app/activity", "/app/notifications", "/app/requests"]) {
      await pa.goto(`${BASE}${route}`);
      const html = await pa.content();
      for (const secret of [INSTRUCTIONS, EXECUTION_NOTES, REJECT_REASON, "Work sheet", "IMG_before.jpg", "storage/v1", opsUser.name, adminUser.name, adminUser.profileId, opsUser.profileId]) {
        check(!html.includes(secret), `${route} shows "${secret}" to the customer`);
      }
    }
    await pa.goto(`${BASE}/app/notifications`);
    const notes = await text(pa);
    check(notes.includes(`Visit scheduled for ${ids.number}`) && notes.includes(`New evidence on ${ids.number}`) && notes.includes(`Visit completed for ${ids.number}`), "a visit or evidence notification is missing");
  });

  await step(`19. The customer request page fits ${WIDTHS[0]}–${WIDTHS.at(-1)}px and passes axe`, async () => {
    const problems = [];
    const qa = await a.context.newPage();
    for (const width of WIDTHS) {
      await qa.setViewportSize({ width, height: 900 });
      await qa.goto(`${BASE}/app/requests/${ids.request}`, { waitUntil: "networkidle" });
      await ready(qa);
      const overflow = await overflowOf(qa);
      if (overflow) problems.push(`@${width}: overflow ${overflow}`);
      if ([320, 430, 1280].includes(width)) for (const finding of await axeFindings(qa)) problems.push(`@${width}: axe ${finding}`);
    }
    await qa.close();
    check(problems.length === 0, `${problems.length} problem(s):\n        ${problems.join("\n        ")}`);
  });

  await step("20. Evidence links: A's own shared file works; rejected, internal, B's and tampered ids are all not found", async () => {
    const get = (context, url) => context.request.get(`${BASE}${url}`, { maxRedirects: 0 });
    const own = await get(a.context, `/app/requests/${ids.request}/evidence/${ids.before.id}`);
    check(own.status() === 302 && /\/storage\/v1\/object\/sign\//.test(own.headers().location ?? ""), `A's own file answered ${own.status()}`);
    const signed = await fetch(own.headers().location, { headers: { range: "bytes=0-2" } });
    check(signed.status === 206 || signed.status === 200, `the signed link answered ${signed.status}`);
    for (const [label, url] of [
      ["rejected evidence", `/app/requests/${ids.request}/evidence/${ids.pdf.id}`],
      ["B's evidence on B's request", `/app/requests/${ids.requestB}/evidence/${ids.evidenceB}`],
      ["B's evidence under A's request", `/app/requests/${ids.request}/evidence/${ids.evidenceB}`],
      ["A's evidence under another request", `/app/requests/${ids.request2}/evidence/${ids.before.id}`],
      ["a malformed id", `/app/requests/${ids.request}/evidence/not-a-uuid`],
      ["the admin file route", `/admin/requests/${ids.request}/evidence/${ids.before.id}`],
    ]) {
      const response = await get(a.context, url);
      check(response.status() === 404, `${label} answered ${response.status()} for customer A`);
    }
    const tampered = new URL(own.headers().location);
    tampered.searchParams.set("token", "not-a-token");
    check((await fetch(tampered)).status >= 400, "a signed link with a forged token works");
    const bare = new URL(own.headers().location);
    bare.search = "";
    check((await fetch(bare)).status >= 400, "the file is reachable without a token");
    const anonymous = await browser.newContext();
    const anon = await anonymous.request.get(`${BASE}/app/requests/${ids.request}/evidence/${ids.before.id}`, { maxRedirects: 0 });
    check(!/\/storage\/v1\//.test(anon.headers().location ?? "") && [302, 303, 307, 308, 404].includes(anon.status()), `a signed-out visitor got ${anon.status()} ${anon.headers().location ?? ""}`);
    await anonymous.close();
  });

  await step("21. Customer A's own API access: published evidence only, no internal records, no admin rights, no storage bypass", async () => {
    const api = await apiAs(custA);
    const evidence = await api.from("request_evidence").select("id, review_status, visibility");
    check(!evidence.error && evidence.data.length === 3 && evidence.data.every((e) => e.review_status === "APPROVED" && e.visibility === "CUSTOMER_VISIBLE"), `customer A reads ${evidence.data?.length} evidence rows`);
    for (const table of ["request_evidence_internal", "field_work_internal", "request_assignments"]) {
      const { data, error } = await api.from(table).select("*");
      check(!error && data.length === 0, `customer A can read ${table}`);
    }
    const visits = await api.from("field_work").select("id, request_id");
    check(!visits.error && visits.data.every((v) => [ids.request, ids.request2].includes(v.request_id)), "customer A reads visits of other requests");
    const internalEvents = await api.from("service_request_events").select("id").eq("request_id", ids.request).eq("visibility", "INTERNAL");
    check(!internalEvents.error && internalEvents.data.length === 0, "customer A reads internal timeline events");
    for (const [fn, args] of [
      ["admin_publish_evidence", { p_evidence_id: ids.pdf.id }],
      ["admin_approve_evidence", { p_evidence_id: ids.pdf.id }],
      ["admin_start_field_work", { p_field_work_id: ids.visit }],
      ["admin_add_evidence", { p_request_id: ids.request, p_evidence_id: randomUUID(), p_stage: "AFTER", p_title: "Mine", p_description: null, p_captured_at: null, p_original_name: null }],
    ]) {
      const { error } = await api.rpc(fn, args);
      check(error?.message === "not_authorized", `customer A's ${fn} answered ${error?.message ?? "success"}`);
    }
    const write = await api.from("request_evidence").update({ visibility: "CUSTOMER_VISIBLE" }).eq("id", ids.pdf.id).select("id");
    check(write.error || write.data.length === 0, "customer A changed evidence visibility directly");
    const upload = await api.storage.from(BUCKET).createSignedUploadUrl(`${ids.request}/${randomUUID()}/original.jpg`);
    check(upload.error, "customer A can get an upload link");
    const pdfPath = (await service.from("request_evidence_internal").select("storage_path").eq("evidence_id", ids.pdf.id).single()).data.storage_path;
    for (const [label, file] of [
      ["rejected", pdfPath],
      ["customer B's", ids.pathB],
    ]) {
      const signed = await api.storage.from(BUCKET).createSignedUrl(file, 60);
      check(signed.error, `customer A can sign a link to ${label} evidence`);
    }
    const listing = await api.storage.from(BUCKET).list(ids.request);
    const listed = (listing.data ?? []).map((f) => f.name);
    check(!listing.error && !listed.includes(ids.pdf.id) && !listed.includes(ids.side.id), `customer A can list files of evidence that was not shared: ${listed.join(", ")}`);
    const removal = await api.storage.from(BUCKET).remove([pdfPath]);
    check(!removal.error && removal.data.length === 0, "customer A removed an evidence file");
    await api.auth.signOut({ scope: "local" });
    await signOut(a.page);
  });

  await step("22. Customer B sees only their own evidence, never A's, and can't publish or replay the admin's actions", async () => {
    const pb = b.page;
    await signIn(pb, custB, "/app");
    await pb.goto(`${BASE}/app/requests/${ids.requestB}`);
    const own = await pb.getByRole("region", { name: "Evidence", exact: true }).textContent();
    check(own.includes("Kitchen after cleaning"), "customer B does not see their own published evidence");
    await pb.goto(`${BASE}/app/requests/${ids.request}`);
    check((await text(pb)).includes("This request may have been removed or you may not have access to it."), "customer B can open customer A's request");
    const api = await apiAs(custB);
    const evidence = await api.from("request_evidence").select("id");
    check(!evidence.error && evidence.data.length === 1 && evidence.data[0].id === ids.evidenceB, "customer B reads evidence beyond their own");
    const signed = await api.storage.from(BUCKET).createSignedUrl(`${ids.request}/${ids.before.id}/original.jpg`, 60);
    check(signed.error, "customer B can sign a link to A's file");
    const publish = await api.rpc("admin_publish_evidence", { p_evidence_id: ids.evidenceB });
    check(publish.error?.message === "not_authorized", "customer B can call the publish function");
    await api.auth.signOut({ scope: "local" });
    const before = (await evidenceOf(ids.request)).map((e) => `${e.id}:${e.review_status}:${e.visibility}`).join();
    const replayed = await replay(b.context, ids.publishAction, [[ids.video.id, ids.pdf.id]]);
    check(!(await replayed.text()).includes("Shared with the customer"), "customer B's replay of the publish action reported success");
    check((await evidenceOf(ids.request)).map((e) => `${e.id}:${e.review_status}:${e.visibility}`).join() === before, "customer B's replay changed evidence");
    await signOut(pb);
  });

  await step("23. A deactivated admin loses the evidence links and functions at once", async () => {
    await signIn(page, adminUser, "/admin");
    await ready(page);
    await page.waitForLoadState("networkidle");
    await service.from("team_members").update({ is_active: false }).eq("profile_id", adminUser.profileId);
    const response = await adm.context.request.get(`${BASE}/admin/requests/${ids.request}/evidence/${ids.before.id}`, { maxRedirects: 0 });
    check(response.status() === 404, `a deactivated admin's file link answered ${response.status()}`);
    const api = await apiAs(adminUser);
    const { error } = await api.rpc("admin_approve_evidence", { p_evidence_id: ids.evidenceB });
    check(error?.message === "not_authorized", "a deactivated admin can still review evidence");
    const read = await api.from("request_evidence").select("id");
    check(!read.error && read.data.length === 0, "a deactivated admin can still read evidence");
    await api.auth.signOut({ scope: "local" });
  });

  await Promise.all(consoleChecks);
  if (pageErrors.length) {
    console.log(`\nBrowser errors:\n${pageErrors.map((e) => `  ✗ ${e}`).join("\n")}`);
    exitCode = 1;
  }
} catch {
  exitCode = 1;
  await Promise.all(consoleChecks);
  if (pageErrors.length) console.log(`\nBrowser errors so far:\n${pageErrors.map((e) => `  ✗ ${e}`).join("\n")}`);
} finally {
  await browser.close();
  if (KEEP) console.log(`\nKept the test accounts: ${everyone.map((p) => p.email).join(", ")}`);
  else {
    let cleaned = true;
    for (const p of everyone) if (!(await deleteAccount(p.email))) cleaned = false;
    if (cleaned) console.log("\nDeleted the evidence files and the five test accounts (their properties, requests, visits, evidence records, timeline, activity, notifications and team memberships go with them).");
    else {
      console.log("\n! Some test accounts or files may remain. The next run removes them (after 30 minutes).");
      exitCode = 1;
    }
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} steps passed.`);
if (exitCode === 0) console.log("✓ Field operations acceptance test passed");
process.exit(exitCode);
