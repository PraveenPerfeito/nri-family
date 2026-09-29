/*
 * A tiny stand-in for the Supabase JS client, for testing portal Server
 * Actions and the session gate without a network. It records every query
 * (table, operation, payload, filters) and every function call, and answers
 * from canned results keyed by "table.operation" or "rpc.function_name".
 * Database security itself is tested for real in tests/db (PGlite); these
 * tests check the application layer on top of it.
 */

export type RecordedQuery = { table: string; op: "select" | "insert" | "update" | "delete"; payload?: unknown; filters: [string, ...unknown[]][] };
export type RecordedRpc = { fn: string; args: Record<string, unknown> };
type Result = { data?: unknown; error?: unknown; count?: number | null };

export function createFakeSupabase() {
  const queries: RecordedQuery[] = [];
  const rpcs: RecordedRpc[] = [];
  const results = new Map<string, Result>();
  const auth = {
    claims: null as Record<string, unknown> | null,
    signInResult: { error: null as unknown },
    signUpResult: { data: { session: null as unknown, user: {} }, error: null as unknown },
    /** What Supabase answers to a password-reset or resend-confirmation email request. */
    emailResult: { data: {}, error: null as unknown },
    calls: [] as { method: string; args: unknown[] }[],
  };

  function from(table: string) {
    const query: RecordedQuery = { table, op: "select", filters: [] };
    queries.push(query);
    const settle = () => {
      const r = results.get(`${table}.${query.op}`) ?? { data: null, error: null };
      return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
    };
    const chain: Record<string, unknown> = {};
    const passthrough = (name: string) => (...args: unknown[]) => {
      query.filters.push([name, ...args]);
      return chain;
    };
    for (const name of ["eq", "neq", "in", "is", "not", "or", "ilike", "gte", "lte", "order", "limit", "range", "returns", "overrideTypes"]) chain[name] = passthrough(name);
    chain.select = (...args: unknown[]) => {
      if (query.op === "select") query.filters.push(["select", ...args]);
      return chain;
    };
    for (const op of ["insert", "update"] as const) {
      chain[op] = (payload: unknown) => {
        query.op = op;
        query.payload = payload;
        return chain;
      };
    }
    chain.delete = () => {
      query.op = "delete";
      return chain;
    };
    chain.single = async () => settle();
    chain.maybeSingle = async () => settle();
    chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(settle()).then(resolve, reject);
    return chain;
  }

  async function rpc(fn: string, args: Record<string, unknown> = {}) {
    rpcs.push({ fn, args });
    const r = results.get(`rpc.${fn}`) ?? { data: null, error: null };
    return { data: r.data ?? null, error: r.error ?? null };
  }

  const client = {
    from,
    rpc,
    auth: {
      getClaims: async () => ({ data: auth.claims ? { claims: auth.claims } : null, error: null }),
      signInWithPassword: async (...args: unknown[]) => {
        auth.calls.push({ method: "signInWithPassword", args });
        return auth.signInResult;
      },
      signUp: async (...args: unknown[]) => {
        auth.calls.push({ method: "signUp", args });
        return auth.signUpResult;
      },
      signOut: async (...args: unknown[]) => {
        auth.calls.push({ method: "signOut", args });
        return { error: null };
      },
      resetPasswordForEmail: async (...args: unknown[]) => {
        auth.calls.push({ method: "resetPasswordForEmail", args });
        return auth.emailResult;
      },
      updateUser: async (...args: unknown[]) => {
        auth.calls.push({ method: "updateUser", args });
        return { data: {}, error: null };
      },
      resend: async (...args: unknown[]) => {
        auth.calls.push({ method: "resend", args });
        return auth.emailResult;
      },
    },
  };

  return {
    client,
    queries,
    rpcs,
    auth,
    /** Canned answer for e.g. "properties.insert" or "rpc.admin_assign_request". */
    respond(key: string, result: Result) {
      results.set(key, result);
    },
    reset() {
      queries.length = 0;
      rpcs.length = 0;
      results.clear();
      auth.calls.length = 0;
      auth.claims = null;
      auth.signInResult = { error: null };
      auth.signUpResult = { data: { session: null, user: {} }, error: null };
      auth.emailResult = { data: {}, error: null };
    },
  };
}

/** A signed-in customer: JWT claims plus the profile row RLS would return. */
export function signInAs(fake: ReturnType<typeof createFakeSupabase>, profile: Partial<{ id: string; role: string; full_name: string; timezone: string | null }> = {}) {
  const row = {
    id: "11111111-1111-4111-8111-111111111111",
    auth_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "CUSTOMER",
    full_name: "Priya Raman",
    email: "priya@example.test",
    phone: null,
    country: "AE",
    timezone: "Asia/Dubai",
    avatar_url: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...profile,
  };
  fake.auth.claims = { sub: row.auth_user_id, email: row.email };
  fake.respond("profiles.select", { data: row });
  return row;
}

/** A signed-in admin: role ADMIN plus an active team membership. */
export function signInAsAdmin(fake: ReturnType<typeof createFakeSupabase>, profile: Partial<{ id: string; full_name: string }> = {}, membership: { is_active: boolean } | null = { is_active: true }) {
  const row = signInAs(fake, { id: "99999999-9999-4999-8999-999999999999", role: "ADMIN", full_name: "Meena Admin", ...profile });
  fake.respond("team_members.select", { data: membership });
  return row;
}
