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

-- Storage, as Supabase sets it up: the two tables the Storage API keeps its
-- records in (only the columns this project relies on), Row Level Security
-- switched on with no policies (so nothing is allowed until a migration
-- adds policies), full table grants to the API roles, and the guard that
-- refuses deletes that don't come through the Storage API. The Storage API
-- runs every request as the caller's role with their JWT claims, so the same
-- `SET LOCAL ROLE` the harness uses reproduces its permission checks.
create schema storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb
);
create unique index objects_bucket_id_name on storage.objects (bucket_id, name);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on table storage.buckets, storage.objects to anon, authenticated, service_role;

create function storage.protect_delete()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('storage.allow_delete_query', true), 'false') != 'true' then
    raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.' using errcode = '42501';
  end if;
  return null;
end;
$$;

create trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();
