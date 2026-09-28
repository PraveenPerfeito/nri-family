#!/usr/bin/env node
/**
 * DEVELOPMENT ONLY. Creates one demo customer with a small, clearly labelled
 * demo workspace (two properties, two service requests), so you can look
 * around the portal without typing everything in. Everything is written
 * through the normal API as that customer, so the timeline, activity and
 * notifications come from the real database triggers.
 *
 * Never runs on its own: not in the build, tests, CI or deploys. It refuses
 * to run against the live project (the supabaseUrl in src/config/site.ts),
 * on Vercel, or without --dev.
 *
 *   node --env-file=.env.local scripts/seed-demo.mjs --dev --email you+demo@yourdomain.test
 *   node --env-file=.env.local scripts/seed-demo.mjs --dev --email you+demo@yourdomain.test --delete
 *
 * Needs SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY
 * for a separate development project (see .env.example).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values: args } = parseArgs({ options: { dev: { type: "boolean" }, email: { type: "string" }, delete: { type: "boolean" } } });
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

function stop(message) {
  console.error(`seed-demo: ${message}`);
  process.exit(2);
}
if (!args.dev) stop("pass --dev to confirm this is a development project.");
if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === "production") stop("refusing to run in a production environment.");
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SERVICE_ROLE_KEY) stop("set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY.");
if (!args.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.email)) stop("pass --email for the demo account.");

const liveUrl = readFileSync(new URL("../src/config/site.ts", import.meta.url), "utf8").match(/supabaseUrl:\s*"([^"]*)"/)?.[1];
if (liveUrl && new URL(liveUrl).host === new URL(SUPABASE_URL).host) stop("SUPABASE_URL is the live project in src/config/site.ts. Use a separate development project.");

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, noSession);
const email = args.email.toLowerCase();

const { data: existing, error: lookupError } = await admin.from("profiles").select("auth_user_id").eq("email", email).maybeSingle();
if (lookupError) stop(`could not read profiles (is the migration applied?): ${lookupError.message}`);

if (args.delete) {
  if (!existing) stop(`no account for ${email}.`);
  const { error } = await admin.auth.admin.deleteUser(existing.auth_user_id);
  if (error) stop(`could not delete ${email}: ${error.message}`);
  console.log(`Deleted ${email} and everything in its workspace.`);
  process.exit(0);
}
if (existing) stop(`${email} already exists. Run again with --delete first.`);

const password = `Demo-${randomUUID()}`;
const { error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Demo Customer", country: "AE", timezone: "Asia/Dubai" },
});
if (createError) stop(`could not create the account: ${createError.message}`);

// From here on, act as the customer, exactly like the app does.
const customer = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, noSession);
const { error: signInError } = await customer.auth.signInWithPassword({ email, password });
if (signInError) stop(`could not sign in as the demo customer: ${signInError.message}`);

const properties = [
  { name: "Demo house", property_type: "HOUSE", city: "Coimbatore", district: "Coimbatore", notes: "Demo data from scripts/seed-demo.mjs." },
  { name: "Demo plot", property_type: "LAND", city: "Chengalpattu", district: "Chengalpattu", notes: "Demo data from scripts/seed-demo.mjs." },
];
const { data: created, error: propertyError } = await customer.from("properties").insert(properties).select("id, name");
if (propertyError) stop(`could not add the demo properties: ${propertyError.message}`);

const requests = [
  { property_id: created[0].id, category: "PROPERTY_INSPECTION", title: "Demo: quarterly inspection", description: "Demo request from scripts/seed-demo.mjs.", priority: "NORMAL" },
  { property_id: created[1].id, category: "SECURITY_CHECK", title: "Demo: check the boundary wall", description: "Demo request from scripts/seed-demo.mjs.", priority: "URGENT" },
];
const { error: requestError } = await customer.from("service_requests").insert(requests);
if (requestError) stop(`could not add the demo requests: ${requestError.message}`);
await customer.auth.signOut({ scope: "local" });

console.log(`Demo workspace ready (development project only).
  Email:    ${email}
  Password: ${password}
Remove it with: node --env-file=.env.local scripts/seed-demo.mjs --dev --email ${email} --delete`);
