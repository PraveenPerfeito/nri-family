#!/usr/bin/env node
/**
 * Phase 1 quality gate — browser QA against a running server.
 *
 *   npm run build && LEADS_WEBHOOK_URL=http://127.0.0.1:3199/leads npm start
 *   npm run qa
 *
 * Env:
 *   BASE_URL           default http://localhost:3000
 *   QA_BROWSER         "msedge" | "chrome" (installed channels) or "chromium" | "firefox" | "webkit"
 *                      (Playwright engines: npx playwright-core install firefox webkit). Default msedge
 *   QA_SCREENSHOTS     directory to write screenshots to (optional)
 *   QA_WEBHOOK_PORT    start a mock lead webhook on this port (default 3199; "0" to disable)
 *   QA_READONLY        "true" to skip real form submissions (safe against the live site:
 *                      nothing is emailed; empty-form validation is still checked)
 *
 * Checks every route at every target viewport for horizontal overflow and
 * console errors, then per-route SEO, links, images, headings, and the
 * interactive flows (skip link, mobile menu, FAQ, forms).
 */
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox, webkit } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const CHANNEL = process.env.QA_BROWSER ?? "msedge";
const SHOTS = process.env.QA_SCREENSHOTS;
const READONLY = process.env.QA_READONLY === "true";
const WEBHOOK_PORT = READONLY ? 0 : Number(process.env.QA_WEBHOOK_PORT ?? 3199);
const VIEWPORTS = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920];

const failures = [];
const fail = (msg) => failures.push(msg);
let checks = 0;
const ok = () => checks++;

// ── Mock webhook so form submissions can be verified end to end ──────────────
const received = [];
let webhook;
if (WEBHOOK_PORT) {
  webhook = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        received.push(JSON.parse(body));
      } catch {
        received.push({ invalid: body });
      }
      res.writeHead(204).end();
    });
  }).listen(WEBHOOK_PORT, "127.0.0.1");
}

// ── Discover routes from the sitemap ─────────────────────────────────────────
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const siteOrigin = sitemap.match(/<loc>(https?:\/\/[^/<]+)/)?.[1];
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
routes.push("/login", "/register");
console.log(`QA: ${routes.length} routes × ${VIEWPORTS.length} viewports against ${BASE} (${CHANNEL})`);

const engines = { chromium, firefox, webkit };
// WebKit (like Safari by default) never moves Tab focus to links, so Tab-order
// checks run in Chromium and Firefox; under WebKit the skip link is focused directly.
const IS_WEBKIT = CHANNEL === "webkit";
const TAB = "Tab";
const browser = engines[CHANNEL] ? await engines[CHANNEL].launch() : await chromium.launch({ channel: CHANNEL });
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

function watch(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") fail(`${label}: console ${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    // WebKit reports RSC prefetches from the previous page, cancelled by our next
    // navigation, as "access control" errors. They never reach users.
    if (IS_WEBKIT && /_rsc=.*access control checks/.test(err.message)) return;
    fail(`${label}: page error: ${err.message}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().startsWith(BASE)) fail(`${label}: ${res.status()} for ${res.url()}`);
  });
}

// ── 1. Overflow + console at every viewport ──────────────────────────────────
for (const width of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  for (const route of routes) {
    const label = `${route} @${width}`;
    watch(page, label);
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      if (sw <= vw) return null;
      const culprits = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed") {
          culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} (${Math.round(r.right)}px)`);
          if (culprits.length >= 3) break;
        }
      }
      return { vw, sw, culprits };
    });
    if (overflow) fail(`${label}: horizontal overflow ${overflow.sw}px > ${overflow.vw}px — ${overflow.culprits.join("; ")}`);
    else ok();
    if (SHOTS && ["/", "/get-started", "/property-care", "/how-it-works", "/trust", "/property"].includes(route) && [320, 390, 768, 1440].includes(width)) {
      const name = `${route === "/" ? "home" : route.slice(1)}-${width}.png`;
      await page.screenshot({ path: join(SHOTS, name), fullPage: true });
    }
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.removeAllListeners("response");
  }
  await context.close();
}

// ── 2. Per-route SEO, headings, links, images ───────────────────────────────
// A unique client address per run keeps form tests clear of the server rate limit.
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250) + 1}` },
});
const page = await context.newPage();
const internalLinks = new Set();
const titles = new Map();
const descriptions = new Map();

for (const route of routes) {
  const label = `${route}`;
  watch(page, label);
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const info = await page.evaluate(() => {
    const meta = (sel) => document.querySelector(sel)?.getAttribute("content") ?? null;
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        JSON.parse(s.textContent);
        return true;
      } catch {
        return false;
      }
    });
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      robots: meta('meta[name="robots"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogImage: meta('meta[property="og:image"]'),
      ogUrl: meta('meta[property="og:url"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      h1: document.querySelectorAll("h1").length,
      headings,
      jsonLd,
      lang: document.documentElement.lang,
      links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
      brokenImages: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
      imagesWithoutAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
      unlabelledControls: [...document.querySelectorAll("input:not([type=hidden]),select,textarea")].filter((el) => {
        if (el.closest("[aria-hidden=true]")) return false;
        return !(el.labels?.length || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
      }).length,
      unnamedButtons: [...document.querySelectorAll("button,a[href]")].filter((b) => !(b.textContent.trim() || b.getAttribute("aria-label"))).length,
    };
  });

  const expectIndexed = !["/login", "/register"].includes(route);
  if (info.h1 !== 1) fail(`${label}: expected 1 <h1>, found ${info.h1}`);
  else ok();
  for (let i = 1; i < info.headings.length; i++) {
    if (info.headings[i] > info.headings[i - 1] + 1) {
      fail(`${label}: heading level jumps from h${info.headings[i - 1]} to h${info.headings[i]}`);
      break;
    }
  }
  if (!info.title) fail(`${label}: missing <title>`);
  if (!info.description || info.description.length < 50) fail(`${label}: meta description missing/short`);
  if (info.description && info.description.length > 170) fail(`${label}: meta description long (${info.description.length})`);
  const expectedCanonical = `${siteOrigin}${route === "/" ? "" : route}`;
  if (info.canonical !== expectedCanonical) fail(`${label}: canonical ${info.canonical} ≠ ${expectedCanonical}`);
  if (!info.ogTitle || !info.ogImage || !info.ogUrl) fail(`${label}: Open Graph incomplete (${JSON.stringify({ og: info.ogTitle, img: info.ogImage, url: info.ogUrl })})`);
  if (info.twitterCard !== "summary_large_image") fail(`${label}: twitter:card missing`);
  if (info.jsonLd.includes(false)) fail(`${label}: invalid JSON-LD`);
  if (expectIndexed && info.robots?.includes("noindex")) fail(`${label}: unexpectedly noindex`);
  if (!expectIndexed && !info.robots?.includes("noindex")) fail(`${label}: should be noindex`);
  if (!info.lang) fail(`${label}: <html lang> missing`);
  if (info.brokenImages.length) fail(`${label}: broken images ${info.brokenImages.join(", ")}`);
  if (info.imagesWithoutAlt) fail(`${label}: ${info.imagesWithoutAlt} images without alt`);
  if (info.unlabelledControls) fail(`${label}: ${info.unlabelledControls} form controls without labels`);
  if (info.unnamedButtons) fail(`${label}: ${info.unnamedButtons} links/buttons without accessible names`);
  if (titles.has(info.title)) fail(`${label}: duplicate title with ${titles.get(info.title)}`);
  titles.set(info.title, route);
  if (descriptions.has(info.description)) fail(`${label}: duplicate description with ${descriptions.get(info.description)}`);
  descriptions.set(info.description, route);
  checks += 10;

  for (const href of info.links) {
    if (href.startsWith("/") && !href.startsWith("//")) internalLinks.add(href.split("#")[0] || "/");
    else if (href.startsWith("#")) {
      const exists = await page.evaluate((id) => !!document.getElementById(id), href.slice(1));
      if (!exists) fail(`${label}: in-page anchor ${href} has no target`);
    } else if (!/^(mailto:|tel:|https?:)/.test(href)) fail(`${label}: unusual href ${href}`);
  }
  page.removeAllListeners("console");
  page.removeAllListeners("pageerror");
  page.removeAllListeners("response");
}

for (const href of internalLinks) {
  const res = await fetch(BASE + href, { redirect: "manual" });
  if (res.status >= 400) fail(`broken internal link ${href} → ${res.status}`);
  else ok();
}
for (const asset of ["/robots.txt", "/sitemap.xml", "/opengraph-image", "/icon.svg"]) {
  const res = await fetch(BASE + asset);
  if (!res.ok) fail(`${asset} → ${res.status}`);
  else ok();
}
const redirect = await fetch(`${BASE}/security`, { redirect: "manual" });
if (![301, 308].includes(redirect.status) || !redirect.headers.get("location")?.endsWith("/trust")) fail("/security should redirect to /trust");
const headers = (await fetch(BASE)).headers;
for (const h of ["content-security-policy", "x-content-type-options", "referrer-policy", "x-frame-options", "permissions-policy"]) {
  if (!headers.get(h)) fail(`missing security header ${h}`);
  else ok();
}
if (headers.get("x-powered-by")) fail("x-powered-by header should be disabled");

// ── 3. Interactions ──────────────────────────────────────────────────────────
watch(page, "interactions");
try {

// Skip link is the first tab stop and moves focus to <main>.
await page.goto(BASE + "/", { waitUntil: "networkidle" });
if (IS_WEBKIT) await page.focus('a[href="#main"]');
else await page.keyboard.press(TAB);
const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
if (firstFocus !== "Skip to main content") fail(`first tab stop is "${firstFocus}", expected skip link`);
await page.keyboard.press("Enter");
if (!(await page.evaluate(() => location.hash === "#main"))) fail("skip link did not move to #main");
else ok();

// Keyboard: every focusable element shows a visible focus indicator.
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const noFocusStyle = [];
for (let i = 0; i < (IS_WEBKIT ? 0 : 25); i++) {
  await page.keyboard.press(TAB);
  const s = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const visible = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
    return visible ? null : `${el.tagName} ${el.textContent?.trim().slice(0, 30)}`;
  });
  if (s) noFocusStyle.push(s);
}
if (noFocusStyle.length) fail(`elements without visible focus: ${noFocusStyle.join(" | ")}`);
else ok();

// FAQ opens with keyboard.
await page.goto(BASE + "/faq", { waitUntil: "networkidle" });
await page.locator("summary").first().focus();
await page.keyboard.press("Enter");
if (!(await page.locator("details").first().evaluate((d) => d.open))) fail("FAQ item did not open with Enter");
else ok();
const pushed = await page.evaluate(() => (window.dataLayer ?? []).map((e) => e.event));
if (!pushed.includes("faq_opened")) fail("faq_opened analytics event not pushed");
else ok();

// Mobile menu: opens, traps focus in a modal dialog, closes on Escape, restores focus.
const mobile = await browser.newContext({ viewport: { width: 375, height: 800 } });
const m = await mobile.newPage();
watch(m, "mobile-menu");
await m.goto(BASE + "/", { waitUntil: "networkidle" });
await m.getByRole("button", { name: "Open menu" }).click();
if (!(await m.locator("dialog#mobile-menu").evaluate((d) => d.open))) fail("mobile menu did not open");
await m.keyboard.press("Escape");
if (await m.locator("dialog#mobile-menu").evaluate((d) => d.open)) fail("mobile menu did not close on Escape");
const restored = await m.evaluate(() => document.activeElement?.getAttribute("aria-controls"));
if (restored !== "mobile-menu") fail("focus not restored to menu button");
await m.getByRole("button", { name: "Open menu" }).click();
await m.getByRole("dialog").getByRole("link", { name: "How It Works" }).click();
await m.waitForURL("**/how-it-works");
if (await m.locator("dialog#mobile-menu").evaluate((d) => d.open)) fail("mobile menu stayed open after navigation");
else ok();
await mobile.close();

// Get Started form: client validation, then successful submission.
await page.goto(BASE + "/get-started", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Send my request" }).click();
const errorCount = await page.locator("[id$='-error']").count();
if (errorCount < 6) fail(`get-started: expected ≥6 validation errors on empty submit, got ${errorCount}`);
else ok();
if (!(await page.evaluate(() => document.activeElement?.getAttribute("name") === "name"))) fail("get-started: focus not moved to first invalid field");
await page.getByLabel("Full name", { exact: true }).fill("Test Person");
if (await page.locator("#name-error").count()) fail("get-started: error did not clear after editing field");
if (READONLY) console.log("QA_READONLY: skipping real form submissions");
else {
await page.getByLabel("Country you live in", { exact: true }).fill("United Arab Emirates");
await page.getByLabel("Email", { exact: true }).fill("test@example.com");
await page.getByLabel("WhatsApp / Phone", { exact: true }).fill("+971 50 000 0000");
await page.getByLabel("Yes", { exact: true }).check();
await page.getByLabel("Maintenance", { exact: true }).check();
await page.locator("#details").fill("Routine inspection for a house in Chennai.");
await page.locator("#consent").check();
await page.waitForTimeout(2600); // honour minimum fill time
await page.getByRole("button", { name: "Send my request" }).click();
await page.getByText("We've received your request").waitFor({ timeout: 10000 }).catch(() => fail("get-started: success message not shown"));
if (WEBHOOK_PORT) {
  const lead = received.find((r) => r.kind === "get-started");
  if (!lead) fail("get-started: webhook did not receive the lead (is LEADS_WEBHOOK_URL set on the server?)");
  else if (lead.data.email !== "test@example.com" || !lead.data.topics?.includes("Maintenance")) fail("get-started: webhook payload mismatch");
  else ok();
}

// Contact form: server-side validation still guards bad input when client checks are bypassed.
await page.goto(BASE + "/contact", { waitUntil: "networkidle" });
await page.getByLabel("Name", { exact: true }).fill("Test Person");
await page.getByLabel("Country you live in", { exact: true }).fill("Canada");
await page.getByLabel("Email", { exact: true }).fill("test@example.com");
await page.getByLabel("Phone / WhatsApp", { exact: true }).fill("+1 416 000 0000");
await page.getByLabel("Service category", { exact: true }).selectOption("Land Inspection");
await page.getByLabel("Message", { exact: true }).fill("Please inspect my plot near Chengalpattu.");
await page.locator("#consent").check();
await page.waitForTimeout(2600);
await page.getByRole("button", { name: "Send message" }).click();
await page.getByText("We've received your request").waitFor({ timeout: 10000 }).catch(() => fail("contact: success message not shown"));
// The event is pushed from an effect after the success state paints, so wait for it.
await page
  .waitForFunction(() => (window.dataLayer ?? []).some((e) => e.event === "contact_submitted"), null, { timeout: 5000 })
  .catch(() => fail("contact_submitted analytics event not pushed"));
const leaked = await page.evaluate(() => JSON.stringify(window.dataLayer ?? []).includes("test@example.com"));
if (leaked) fail("analytics dataLayer contains personal data");
else ok();
}

} catch (err) {
  fail(`interactions aborted: ${err.message.split("\n")[0]}`);
}

await browser.close();
webhook?.close();

console.log(`\n${checks} checks passed, ${failures.length} failures.`);
if (failures.length) {
  for (const f of [...new Set(failures)]) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("✓ QA passed");
