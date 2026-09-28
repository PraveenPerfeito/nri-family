-- Minimal stand-in for the parts of Supabase that the migrations rely on, so
-- the real migration SQL can run in PGlite (Postgres compiled to WASM).
--
-- Mirrors Supabase closely where it matters for security:
--   * the API roles `anon`, `authenticated` and `service_role` (BYPASSRLS);
--   * auth.uid(), read from the request's JWT claims exactly as PostgREST sets them;
--   * Supabase's default privileges, which grant every new table in `public`
--     to the API roles. The migration must revoke them itself; this shim makes
--     sure a forgotten revoke fails the tests.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
