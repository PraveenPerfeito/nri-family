#!/usr/bin/env node
/**
 * Prints the schema fingerprint of the repository's migrations (scripts/sql/schema-fingerprint.sql
 * run on supabase/migrations in a local Postgres, behind the same Supabase shim as tests/db).
 * Run the same SQL in the Supabase SQL editor: equal hashes mean production matches the
 * repository. Read-only; needs no keys.
 *
 *   node scripts/schema-fingerprint.mjs            # all migrations
 *   node scripts/schema-fingerprint.mjs 20260929   # only migrations whose name sorts up to that prefix
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const upTo = process.argv[2];
const db = await PGlite.create();
await db.exec(readFileSync(join(ROOT, "tests/db/supabase-shim.sql"), "utf8"));
const files = readdirSync(join(ROOT, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .filter((f) => !upTo || f.slice(0, upTo.length) <= upTo);
for (const file of files) await db.exec(readFileSync(join(ROOT, "supabase/migrations", file), "utf8"));
const { rows } = await db.query(readFileSync(join(ROOT, "scripts/sql/schema-fingerprint.sql"), "utf8"));
console.log(`migrations: ${files.join(", ")}`);
for (const r of rows) console.log(`${r.category.padEnd(18)} ${String(r.items).padStart(4)}  ${r.hash}`);
await db.close();
