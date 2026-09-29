#!/usr/bin/env node
/**
 * DEVELOPMENT AND QA ONLY. A local stand-in for a Supabase project, so the
 * customer portal can be run and tested on a machine without Docker or a
 * Supabase project. Never deploy it; it is not a security boundary.
 *
 * What is real: the DATABASE. The repo's migrations run in PGlite (Postgres
 * compiled to WASM) behind tests/db/supabase-shim.sql, and every REST call
 * runs as `authenticated` / `anon` / `service_role` with the caller's JWT
 * claims, so Row Level Security, column privileges, constraints and triggers
 * behave exactly as in Supabase.
 *
 * What is emulated: Auth (GoTrue) and the REST API (PostgREST), only the
 * endpoints and query features supabase-js uses in this app (tables, views
 * and POST /rest/v1/rpc/<function> with named arguments). Differences
 * from a real project: tokens are HS256 (so getClaims() verifies through
 * /auth/v1/user rather than JWKS), no email is sent (links are printed and
 * listed at /__mail), sign-up rate limits and password-strength rules beyond
 * the 10-character minimum are not applied, and all data is in memory
 * (restarting starts empty). Always re-run scripts/portal-e2e.mjs against a
 * real project before relying on a change.
 *
 *   npm run dev:supabase                  # http://127.0.0.1:54321
 *   # in another shell:
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_dev_only \
 *     CUSTOMER_SIGNUPS_OPEN=true npm run dev
 *
 * Env: PORT (54321), SITE_URL for emailed links (http://localhost:3000),
 * AUTOCONFIRM=true to skip email confirmation, TEAM_EMAILS=a@x,b@y to email only
 * those addresses (like Supabase's built-in email), SIGNUPS=false to refuse
 * sign-ups (like "Allow new users to sign up" off), LOG=true to log requests.
 * Keys: publishable sb_publishable_local_dev_only; admin (for
 * scripts/portal-e2e.mjs and scripts/seed-demo.mjs) local-dev-service-role-key.
 */
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const PORT = Number(process.env.PORT ?? 54321);
const BASE = `http://127.0.0.1:${PORT}`;
const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const AUTOCONFIRM = process.env.AUTOCONFIRM === "true";
const SIGNUPS = process.env.SIGNUPS !== "false";
// Like Supabase's built-in email: only these addresses can be emailed (comma-separated; empty = all).
const TEAM_EMAILS = (process.env.TEAM_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const canEmail = (email) => TEAM_EMAILS.length === 0 || TEAM_EMAILS.includes(email);
const JWT_SECRET = randomBytes(32);
const PUBLISHABLE_KEY = "sb_publishable_local_dev_only";
const SERVICE_KEY = "local-dev-service-role-key";
const ACCESS_TTL = Number(process.env.ACCESS_TTL ?? 3600);

// ── Database ────────────────────────────────────────────────────────────────
const db = await PGlite.create();
await db.exec(readFileSync(join(ROOT, "tests/db/supabase-shim.sql"), "utf8"));
for (const file of readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(join(ROOT, "supabase/migrations", file), "utf8"));
}

// ── Auth state (GoTrue emulation) ───────────────────────────────────────────
const users = new Map(); // id -> user
const tokens = new Map(); // sha256(token) hex -> { userId, type, used }
const refreshTokens = new Map(); // token -> { userId, sessionId, revoked }
const mail = []; // { to, kind, link, at }

const now = () => new Date().toISOString();
const b64url = (buf) => Buffer.from(buf).toString("base64url");
function signJwt(payload) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const [head, body, sig] = String(token ?? "").split(".");
  if (!head || !body || !sig) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString());
  if (claims.exp * 1000 < Date.now()) return null;
  return claims;
}
const hashPassword = (password, salt = randomBytes(16).toString("hex")) => `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
const checkPassword = (password, stored) => {
  const [salt] = stored.split(":");
  return hashPassword(password, salt) === stored;
};

function userJson(u) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.confirmedAt,
    phone: "",
    confirmed_at: u.confirmedAt,
    last_sign_in_at: u.lastSignInAt,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: u.metadata,
    identities: [
      {
        identity_id: u.identityId,
        id: u.id,
        user_id: u.id,
        identity_data: { email: u.email, email_verified: Boolean(u.confirmedAt), sub: u.id },
        provider: "email",
        created_at: u.createdAt,
        updated_at: u.updatedAt,
      },
    ],
    created_at: u.createdAt,
    updated_at: u.updatedAt,
    is_anonymous: false,
  };
}

function issueSession(u, method = "password") {
  const iat = Math.floor(Date.now() / 1000);
  const sessionId = randomUUID();
  const access_token = signJwt({
    aud: "authenticated",
    exp: iat + ACCESS_TTL,
    iat,
    iss: `${BASE}/auth/v1`,
    sub: u.id,
    email: u.email,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: u.metadata,
    role: "authenticated",
    aal: "aal1",
    amr: [{ method, timestamp: iat }],
    session_id: sessionId,
    is_anonymous: false,
  });
  const refresh_token = randomBytes(24).toString("base64url");
  refreshTokens.set(refresh_token, { userId: u.id, sessionId, revoked: false });
  u.lastSignInAt = now();
  return { access_token, token_type: "bearer", expires_in: ACCESS_TTL, expires_at: iat + ACCESS_TTL, refresh_token, user: userJson(u) };
}

function newToken(u, type) {
  const token = randomBytes(24).toString("hex");
  const hashed = createHash("sha256").update(token).digest("hex");
  tokens.set(hashed, { userId: u.id, type, used: false });
  return hashed;
}

// Mirrors the email templates in docs/PHASE_2A.md (token_hash links to /auth/confirm).
function sendMail(u, kind, hashed, redirectTo) {
  const next = kind === "recovery" ? "/reset-password" : "/app";
  let site = SITE_URL;
  try {
    if (redirectTo) site = new URL(redirectTo).origin;
  } catch {}
  const link = `${site}/auth/confirm?token_hash=${hashed}&type=${kind === "recovery" ? "recovery" : "email"}&next=${encodeURIComponent(next)}`;
  mail.push({ to: u.email, kind, link, at: now() });
  console.log(`[email] ${kind === "recovery" ? "Reset password" : "Confirm sign-up"} for ${u.email}: ${link}`);
}

async function createAuthUser(email, password, metadata, confirmed) {
  const id = randomUUID();
  // Fires the real on_auth_user_created trigger (profile + ACCOUNT_CREATED).
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, email, JSON.stringify(metadata ?? {})]);
  const u = {
    id,
    identityId: randomUUID(),
    email,
    password: password ? hashPassword(password) : null,
    metadata: metadata ?? {},
    confirmedAt: confirmed ? now() : null,
    createdAt: now(),
    updatedAt: now(),
    lastSignInAt: null,
  };
  users.set(id, u);
  return u;
}
const findByEmail = (email) => [...users.values()].find((u) => u.email === String(email ?? "").toLowerCase());

const authError = (status, code, msg) => ({ status, body: { code: status, error_code: code, msg } });

async function handleAuth(method, path, query, headers, body) {
  const apikey = headers.apikey;
  const bearer = (headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const isService = apikey === SERVICE_KEY || bearer === SERVICE_KEY;
  if (apikey !== PUBLISHABLE_KEY && apikey !== SERVICE_KEY) return authError(401, "no_api_key", "Invalid API key");

  if (method === "GET" && path === "/.well-known/jwks.json") return { status: 200, body: { keys: [] } };

  if (method === "POST" && path === "/signup") {
    if (!SIGNUPS) return authError(422, "signup_disabled", "Signups not allowed for this instance");
    const email = String(body.email ?? "").toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return authError(400, "validation_failed", "Unable to validate email address: invalid format");
    if (String(body.password ?? "").length < 10) return { status: 422, body: { code: 422, error_code: "weak_password", msg: "Password should be at least 10 characters.", weak_password: { reasons: ["length"] } } };
    const existing = findByEmail(email);
    if (existing) {
      // Like GoTrue with confirmations on: an obfuscated user, no session, no email.
      return { status: 200, body: { ...userJson({ ...existing, id: randomUUID() }), identities: [] } };
    }
    if (!AUTOCONFIRM && !canEmail(email)) {
      // Supabase refuses before creating the user when its built-in email can't reach the address.
      return authError(400, "email_address_not_authorized", `Email address "${email}" cannot be used as it is not authorized`);
    }
    const u = await createAuthUser(email, body.password, body.data, AUTOCONFIRM);
    if (AUTOCONFIRM) return { status: 200, body: issueSession(u) };
    sendMail(u, "signup", newToken(u, "signup"), query.get("redirect_to"));
    u.confirmationSentAt = now();
    return { status: 200, body: userJson(u) };
  }

  if (method === "POST" && path === "/token") {
    const grant = query.get("grant_type");
    if (grant === "password") {
      const u = findByEmail(body.email);
      if (!u || !u.password || !checkPassword(String(body.password ?? ""), u.password)) return authError(400, "invalid_credentials", "Invalid login credentials");
      if (!u.confirmedAt) return authError(400, "email_not_confirmed", "Email not confirmed");
      return { status: 200, body: issueSession(u) };
    }
    if (grant === "refresh_token") {
      const entry = refreshTokens.get(body.refresh_token);
      if (!entry || entry.revoked || !users.has(entry.userId)) return authError(400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
      entry.revoked = true;
      return { status: 200, body: issueSession(users.get(entry.userId)) };
    }
    return authError(400, "unsupported_grant_type", "unsupported grant type");
  }

  if (path === "/user") {
    const claims = verifyJwt(bearer);
    const u = claims && users.get(claims.sub);
    if (!u) return authError(403, "bad_jwt", "invalid JWT: unable to parse or verify signature");
    if (method === "GET") return { status: 200, body: userJson(u) };
    if (method === "PUT") {
      if (body.password !== undefined) {
        if (String(body.password).length < 10) return { status: 422, body: { code: 422, error_code: "weak_password", msg: "Password should be at least 10 characters.", weak_password: { reasons: ["length"] } } };
        if (u.password && checkPassword(body.password, u.password)) return authError(422, "same_password", "New password should be different from the old password.");
        u.password = hashPassword(body.password);
      }
      if (body.data) u.metadata = { ...u.metadata, ...body.data };
      u.updatedAt = now();
      return { status: 200, body: userJson(u) };
    }
  }

  if (method === "POST" && path === "/logout") {
    const claims = verifyJwt(bearer);
    if (claims) for (const entry of refreshTokens.values()) if (entry.sessionId === claims.session_id) entry.revoked = true;
    return { status: 204, body: null };
  }

  if (method === "POST" && path === "/verify") {
    const entry = tokens.get(String(body.token_hash ?? ""));
    const typeOk = entry && (entry.type === body.type || (["signup", "email"].includes(entry.type) && ["signup", "email"].includes(body.type)));
    if (!entry || entry.used || !typeOk || !users.has(entry.userId)) return authError(403, "otp_expired", "Email link is invalid or has expired");
    entry.used = true;
    const u = users.get(entry.userId);
    if (!u.confirmedAt) u.confirmedAt = now();
    return { status: 200, body: issueSession(u, "otp") };
  }

  if (method === "POST" && path === "/recover") {
    const u = findByEmail(body.email);
    if (u) sendMail(u, "recovery", newToken(u, "recovery"), query.get("redirect_to"));
    return { status: 200, body: {} };
  }

  if (method === "POST" && path === "/resend") {
    const u = findByEmail(body.email);
    if (u && !u.confirmedAt) sendMail(u, "signup", newToken(u, "signup"), query.get("redirect_to"));
    return { status: 200, body: {} };
  }

  // ── Admin API (service key only) ──
  if (path.startsWith("/admin/")) {
    if (!isService) return authError(403, "not_admin", "User not allowed");
    if (method === "POST" && path === "/admin/generate_link") {
      const email = String(body.email ?? "").toLowerCase();
      let u = findByEmail(email);
      if (body.type === "signup") {
        if (u?.confirmedAt) return authError(422, "email_exists", "A user with this email address has already been registered");
        if (!u) u = await createAuthUser(email, body.password, body.data, false);
      } else if (!u) return authError(404, "user_not_found", "User with this email not found");
      const type = body.type === "magiclink" ? "magiclink" : body.type;
      const hashed = newToken(u, type === "signup" ? "signup" : type);
      return {
        status: 200,
        body: { ...userJson(u), action_link: `${BASE}/auth/v1/verify?token=${hashed}&type=${type}`, email_otp: "000000", hashed_token: hashed, redirect_to: body.redirect_to ?? "", verification_type: type },
      };
    }
    if (method === "POST" && path === "/admin/users") {
      const email = String(body.email ?? "").toLowerCase();
      if (findByEmail(email)) return authError(422, "email_exists", "A user with this email address has already been registered");
      const u = await createAuthUser(email, body.password, body.user_metadata, Boolean(body.email_confirm));
      return { status: 200, body: userJson(u) };
    }
    const match = path.match(/^\/admin\/users\/([0-9a-f-]{36})$/);
    if (method === "DELETE" && match) {
      await db.query("delete from auth.users where id = $1", [match[1]]);
      users.delete(match[1]);
      return { status: 200, body: {} };
    }
    if (method === "GET" && path === "/admin/users") return { status: 200, body: { users: [...users.values()].map(userJson), aud: "authenticated" } };
  }
  return authError(404, "not_found", `No auth route ${method} ${path}`);
}

// ── REST (PostgREST emulation over the real schema) ─────────────────────────
const IDENT = /^[a-z_][a-z0-9_]*$/;
const quoteIdent = (name) => {
  if (!IDENT.test(name)) throw restError(400, "PGRST100", `invalid identifier: ${name}`);
  return `"${name}"`;
};
function restError(status, code, message, details = null) {
  const e = new Error(message);
  e.rest = { status, body: { code, message, details, hint: null } };
  return e;
}

/** Split on commas at paren depth 0 (outside double quotes). */
function splitTop(text) {
  const parts = [];
  let depth = 0;
  let quoted = false;
  let current = "";
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth--;
    if (!quoted && depth === 0 && ch === ",") {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

/** A column reference, optionally with a JSON path (metadata->>property_id). */
function columnSql(field, alias = "t") {
  const m = field.match(/^([a-z_][a-z0-9_]*)((?:->>?[a-z_][a-z0-9_]*)*)$/);
  if (!m) throw restError(400, "PGRST100", `invalid column: ${field}`);
  let sql = `${alias}.${quoteIdent(m[1])}`;
  for (const [, arrow, key] of m[2].matchAll(/(->>?)([a-z_][a-z0-9_]*)/g)) sql += `${arrow}'${key}'`;
  return sql;
}

const unquote = (v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v);

function filterSql(field, opValue, params) {
  const dot = opValue.indexOf(".");
  let op = opValue.slice(0, dot);
  let value = opValue.slice(dot + 1);
  let negate = false;
  if (op === "not") {
    negate = true;
    const d2 = value.indexOf(".");
    op = value.slice(0, d2);
    value = value.slice(d2 + 1);
  }
  const col = columnSql(field);
  let sql;
  const ops = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };
  if (ops[op]) {
    params.push(unquote(value).replace(/\*/g, op.includes("like") ? "%" : "*"));
    sql = `${col} ${ops[op]} $${params.length}`;
  } else if (op === "is") {
    const v = value.toLowerCase();
    if (!["null", "true", "false", "unknown"].includes(v)) throw restError(400, "PGRST100", `bad is value ${value}`);
    sql = `${col} is ${v}`;
  } else if (op === "in") {
    const list = splitTop(value.replace(/^\(/, "").replace(/\)$/, "")).map(unquote);
    params.push(list);
    sql = `${col} = any($${params.length})`;
  } else throw restError(400, "PGRST100", `unsupported operator ${op}`);
  return negate ? `not (${sql})` : sql;
}

/** or=(a.eq.1,and(b.eq.2,c.is.null)) */
function logicSql(kind, inner, params) {
  const items = splitTop(inner.replace(/^\(/, "").replace(/\)$/, "")).map((item) => {
    const nested = item.match(/^(and|or)\((.*)\)$/);
    if (nested) return `(${logicSql(nested[1], `(${nested[2]})`, params)})`;
    const m = item.match(/^([a-z_][a-z0-9_>-]*?)\.((?:not\.)?[a-z]+\..*)$/);
    if (!m) throw restError(400, "PGRST100", `bad logic item ${item}`);
    return `(${filterSql(m[1], m[2], params)})`;
  });
  return items.join(kind === "and" ? " and " : " or ");
}

const RESERVED = new Set(["select", "order", "limit", "offset", "columns", "on_conflict"]);
function whereSql(query, params) {
  const clauses = [];
  for (const [key, value] of query) {
    if (RESERVED.has(key)) continue;
    if (key === "or" || key === "and") clauses.push(`(${logicSql(key, value, params)})`);
    else clauses.push(filterSql(key, value, params));
  }
  return clauses.length ? `where ${clauses.join(" and ")}` : "";
}

async function foreignKeyColumn(fromTable, toTable) {
  const { rows } = await db.query(
    `select a.attname as col from pg_constraint c
       join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.contype = 'f' and c.conrelid = ('public.' || $1)::regclass and c.confrelid = ('public.' || $2)::regclass`,
    [fromTable, toTable],
  );
  if (rows.length !== 1) throw restError(400, "PGRST200", `Could not find a relationship between '${fromTable}' and '${toTable}'`);
  return rows[0].col;
}

async function selectListSql(table, select, alias = "t") {
  const items = splitTop(select || "*");
  const out = [];
  for (const item of items) {
    const embed = item.match(/^(?:([a-z_][a-z0-9_]*):)?([a-z_][a-z0-9_]*)\((.*)\)$/);
    if (embed) {
      const [, name, target, cols] = embed;
      const fk = await foreignKeyColumn(table, target);
      const inner = await selectListSql(target, cols, "e0");
      out.push(`(select row_to_json(e) from (select ${inner} from public.${quoteIdent(target)} e0 where e0."id" = ${alias}.${quoteIdent(fk)}) e) as ${quoteIdent(name ?? target)}`);
    } else if (item === "*") out.push(`${alias}.*`);
    else {
      const [col, rename] = item.includes(":") ? item.split(":").reverse() : [item, null];
      out.push(`${columnSql(col, alias)}${rename ? ` as ${quoteIdent(rename)}` : ""}`);
    }
  }
  return out.join(", ");
}

function orderSql(order) {
  if (!order) return "";
  return `order by ${order
    .split(",")
    .map((part) => {
      const [col, dir, nulls] = part.split(".");
      return `${columnSql(col)} ${dir === "desc" ? "desc" : "asc"}${nulls === "nullsfirst" ? " nulls first" : nulls === "nullslast" ? " nulls last" : ""}`;
    })
    .join(", ")}`;
}

function roleFor(headers) {
  const apikey = headers.apikey;
  const bearer = (headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (apikey !== PUBLISHABLE_KEY && apikey !== SERVICE_KEY) throw restError(401, "PGRST301", "Invalid API key");
  if (bearer === SERVICE_KEY || (apikey === SERVICE_KEY && !bearer.includes("."))) return { role: "service_role", claims: { role: "service_role" } };
  if (bearer.includes(".")) {
    const claims = verifyJwt(bearer);
    if (!claims) throw restError(401, "PGRST303", "JWT expired or invalid");
    return { role: "authenticated", claims };
  }
  return { role: "anon", claims: { role: "anon" } };
}

function pgStatus(code, role) {
  if (code === "42501") return role === "anon" ? 401 : 403;
  if (code === "23505" || code === "23503") return 409;
  if (code === "PGRST116") return 406;
  if (code?.startsWith("22") || code?.startsWith("23") || code === "P0001") return 400;
  if (code === "42P01") return 404;
  return 400;
}

async function handleRest(method, table, query, headers, body) {
  quoteIdent(table);
  const { role, claims } = roleFor(headers);
  const prefer = headers.prefer ?? "";
  const wantCount = /count=exact/.test(prefer);
  const wantRows = /return=representation/.test(prefer) || method === "GET" || method === "HEAD";
  const single = (headers.accept ?? "").includes("application/vnd.pgrst.object+json");
  const params = [];
  let where;
  let select;
  try {
    // Resolved before the transaction: PGlite has one connection, and the
    // relationship lookup must not wait on the transaction it runs inside.
    where = whereSql(query, params);
    select = await selectListSql(table, query.get("select") ?? "*");
  } catch (error) {
    if (error.rest) return error.rest;
    throw error;
  }

  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${role}`);
    let rows = [];
    let total = null;

    if (method === "GET" || method === "HEAD") {
      const limit = query.get("limit") ? `limit ${Number(query.get("limit"))}` : "";
      const offset = query.get("offset") ? `offset ${Number(query.get("offset"))}` : "";
      const res = await tx.query(`select row_to_json(q) as r from (select ${select} from public.${quoteIdent(table)} t ${where} ${orderSql(query.get("order"))} ${limit} ${offset}) q`, params);
      rows = res.rows.map((x) => x.r);
      if (wantCount) total = Number((await tx.query(`select count(*)::int as n from public.${quoteIdent(table)} t ${where}`, params)).rows[0].n);
    } else if (method === "POST") {
      const list = Array.isArray(body) ? body : [body];
      const columns = query.get("columns") ? query.get("columns").split(",").map((c) => unquote(c)) : [...new Set(list.flatMap((r) => Object.keys(r)))];
      const cols = columns.map(quoteIdent).join(", ");
      params.push(JSON.stringify(list));
      const res = await tx.query(
        `with t as (insert into public.${quoteIdent(table)} (${cols}) select ${cols} from json_populate_recordset(null::public.${quoteIdent(table)}, $${params.length}::json) returning *)
         select row_to_json(q) as r from (select ${select} from t) q`,
        params,
      );
      rows = res.rows.map((x) => x.r);
    } else if (method === "PATCH") {
      const cols = Object.keys(body ?? {});
      if (cols.length === 0) throw restError(400, "PGRST100", "empty update");
      params.push(JSON.stringify(body));
      const setList = cols.map((c) => `${quoteIdent(c)} = s.${quoteIdent(c)}`).join(", ");
      const res = await tx.query(
        `with t as (update public.${quoteIdent(table)} t set ${setList} from (select * from json_populate_record(null::public.${quoteIdent(table)}, $${params.length}::json)) s ${where} returning t.*)
         select row_to_json(q) as r from (select ${select} from t) q`,
        params,
      );
      rows = res.rows.map((x) => x.r);
    } else if (method === "DELETE") {
      const res = await tx.query(`with t as (delete from public.${quoteIdent(table)} t ${where} returning t.*) select row_to_json(q) as r from (select ${select} from t) q`, params);
      rows = res.rows.map((x) => x.r);
    } else throw restError(405, "PGRST117", `unsupported method ${method}`);

    if (single && rows.length !== 1) {
      throw restError(406, "PGRST116", "JSON object requested, multiple (or no) rows returned", `The result contains ${rows.length} rows`);
    }
    const offset = Number(query.get("offset") ?? 0);
    const range = rows.length ? `${offset}-${offset + rows.length - 1}` : "*";
    const responseHeaders = { "content-range": `${range}/${total ?? "*"}` };
    if (method === "HEAD") return { status: 200, headers: responseHeaders, body: null };
    if (!wantRows) return { status: method === "POST" ? 201 : 204, headers: responseHeaders, body: null };
    return { status: method === "POST" ? 201 : 200, headers: responseHeaders, body: single ? rows[0] : rows };
  }).catch((error) => {
    if (error.rest) return error.rest;
    const code = error.code ?? "XX000";
    return { status: pgStatus(code, role), body: { code, message: error.message, details: error.detail ?? null, hint: error.hint ?? null } };
  });
}

/** POST /rest/v1/rpc/<name>: call public.<name>(arg => value, ...) as the caller, like PostgREST. */
async function handleRpc(method, name, headers, body) {
  let role;
  let claims;
  let isVoid;
  const args = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const names = Object.keys(args);
  try {
    if (method !== "POST") throw restError(405, "PGRST117", `unsupported method ${method}`);
    quoteIdent(name);
    names.forEach(quoteIdent);
    ({ role, claims } = roleFor(headers));
    // Resolved before the transaction (PGlite has a single connection).
    const fn = await db.query(
      "select p.prorettype = 'void'::regtype as is_void from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1",
      [name],
    );
    if (fn.rows.length === 0) throw restError(404, "PGRST202", `Could not find the function public.${name} in the schema cache`);
    isVoid = fn.rows[0].is_void;
  } catch (error) {
    if (error.rest) return error.rest;
    throw error;
  }
  const list = names.map((n, i) => `${quoteIdent(n)} => $${i + 1}`).join(", ");
  return db
    .transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      await tx.exec(`set local role ${role}`);
      const res = await tx.query(`select public.${quoteIdent(name)}(${list}) as r`, names.map((n) => args[n]));
      return isVoid ? { status: 204, body: null } : { status: 200, body: res.rows[0]?.r ?? null };
    })
    .catch((error) => {
      const code = error.code ?? "XX000";
      return { status: pgStatus(code, role), body: { code, message: error.message, details: error.detail ?? null, hint: error.hint ?? null } };
    });
}

// ── HTTP ────────────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  let result;
  try {
    if (url.pathname === "/__mail") {
      const to = url.searchParams.get("email")?.toLowerCase();
      result = { status: 200, body: mail.filter((m) => !to || m.to === to) };
    } else if (url.pathname.startsWith("/auth/v1")) {
      result = await handleAuth(req.method, url.pathname.slice("/auth/v1".length), url.searchParams, req.headers, body);
    } else if (url.pathname.startsWith("/rest/v1/rpc/")) {
      result = await handleRpc(req.method, url.pathname.slice("/rest/v1/rpc/".length), req.headers, body);
    } else if (url.pathname.startsWith("/rest/v1/")) {
      result = await handleRest(req.method, url.pathname.slice("/rest/v1/".length), url.searchParams, req.headers, body);
    } else result = { status: 404, body: { message: "not found" } };
  } catch (error) {
    console.error(error);
    result = error.rest ?? { status: 500, body: { message: String(error.message) } };
  }
  if (process.env.LOG === "true") console.log(`${req.method} ${url.pathname}${url.search} → ${result.status}`);
  res.writeHead(result.status, { "content-type": "application/json; charset=utf-8", ...(result.headers ?? {}) });
  res.end(result.body === null || result.body === undefined ? "" : JSON.stringify(result.body));
});
server.listen(PORT, "127.0.0.1", () =>
  console.log(`Local Supabase stand-in (development only) on ${BASE}: email confirmation ${AUTOCONFIRM ? "off" : "on"}, sign-ups ${SIGNUPS ? "open" : "closed"}`),
);
