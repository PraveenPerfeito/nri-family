import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/*
 * Runs the real Supabase migrations in PGlite (Postgres 17 in WASM) behind a
 * small Supabase shim, then lets tests act exactly like the Data API does:
 * `SET LOCAL ROLE authenticated` plus the caller's JWT claims, inside a
 * transaction. Row Level Security, column privileges, constraints and
 * triggers are therefore the genuine Postgres behaviour, not mocks.
 */

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase", "migrations");

export type TestUser = { authUserId: string; profileId: string; email: string };

export type TestDatabase = {
  db: PGlite;
  /** Create an auth user the way Supabase Auth does (fires the sign-up trigger). */
  createUser(email: string, metadata?: Record<string, unknown>): Promise<TestUser>;
  /** Run statements as a signed-in customer (role `authenticated`, JWT sub = auth user id). */
  as<T>(user: TestUser, fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Run statements as a visitor with only the publishable key (role `anon`). */
  asAnon<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Run statements with the service-role key (what the future operations backend uses). */
  asService<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = await PGlite.create();
  await db.exec(readFileSync(join(ROOT, "tests", "db", "supabase-shim.sql"), "utf8"));
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }

  const withRole = <T>(role: "authenticated" | "anon" | "service_role", claims: Record<string, unknown> | null, fn: (tx: Transaction) => Promise<T>) =>
    db.transaction(async (tx) => {
      if (claims) await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      await tx.exec(`set local role ${role}`);
      return fn(tx);
    });

  return {
    db,
    async createUser(email, metadata = {}) {
      const { rows } = await db.query<{ id: string }>(
        "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
        [email, JSON.stringify(metadata)],
      );
      const authUserId = rows[0].id;
      const profile = await db.query<{ id: string }>("select id from public.profiles where auth_user_id = $1", [authUserId]);
      return { authUserId, profileId: profile.rows[0].id, email };
    },
    as: (user, fn) => withRole("authenticated", { sub: user.authUserId, role: "authenticated" }, fn),
    asAnon: (fn) => withRole("anon", { role: "anon" }, fn),
    asService: (fn) => withRole("service_role", { role: "service_role" }, fn),
    close: () => db.close(),
  };
}

/** Postgres error helper: resolves to the error message, or null when the statement succeeded. */
export async function errorOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
