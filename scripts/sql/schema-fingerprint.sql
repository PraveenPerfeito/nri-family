-- Schema fingerprint (read-only). Run in the Supabase SQL editor and compare with
-- `node scripts/schema-fingerprint.mjs`, which runs the same query on the repository's
-- migrations in a local Postgres. Equal hashes mean production matches the repository.
-- Covers the public and app schemas: columns, constraints, indexes, triggers, policies,
-- RLS flags, function bodies, views, and what anonymous and signed-in users may do.
with
tables as (
  select c.oid, n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.reloptions
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'app') and c.relkind in ('r', 'v', 'p')
),
cols as (
  select format('%s.%s.%s:%s:%s:%s', t.nspname, t.relname, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, coalesce(pg_get_expr(d.adbin, d.adrelid), '')) as e
  from tables t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
),
cons as (
  select format('%s.%s:%s:%s', t.relname, co.conname, co.contype, pg_get_constraintdef(co.oid)) as e
  from pg_constraint co join tables t on t.oid = co.conrelid
),
idx as (
  select format('%s:%s', indexname, indexdef) as e from pg_indexes where schemaname in ('public', 'app')
),
trg as (
  select format('%s:%s', tg.tgname, pg_get_triggerdef(tg.oid)) as e
  from pg_trigger tg
  join pg_proc p on p.oid = tg.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where not tg.tgisinternal and pn.nspname in ('public', 'app')
),
pol as (
  select format('%s.%s:%s:%s:%s:%s|%s', tablename, policyname, permissive, cmd, roles::text, coalesce(qual, ''), coalesce(with_check, '')) as e
  from pg_policies where schemaname in ('public', 'app')
),
rls as (
  select format('%s:%s:%s', relname, relrowsecurity, relforcerowsecurity) as e from tables where relkind in ('r', 'p')
),
fns as (
  select format('%s.%s(%s):%s:%s:%s:%s', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef, p.provolatile, coalesce(p.proconfig::text, ''), md5(p.prosrc)) as e
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app')
),
vws as (
  select format('%s:%s:%s', relname, coalesce(reloptions::text, ''), md5(pg_get_viewdef(oid))) as e from tables where relkind = 'v'
),
tpriv as (
  select format('%s:%s.%s:%s', r.role, t.nspname, t.relname, string_agg(pr.p, ',' order by pr.p)) as e
  from tables t
  cross join (values ('anon'), ('authenticated')) r(role)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) pr(p)
  where has_table_privilege(r.role, t.oid, pr.p)
  group by r.role, t.nspname, t.relname
),
cpriv as (
  select format('%s:%s.%s.%s:%s', r.role, t.nspname, t.relname, a.attname, string_agg(pr.p, ',' order by pr.p)) as e
  from tables t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  cross join (values ('anon'), ('authenticated')) r(role)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE')) pr(p)
  where has_column_privilege(r.role, t.oid, a.attnum, pr.p)
  group by r.role, t.nspname, t.relname, a.attname
),
fpriv as (
  select format('%s:%s.%s(%s)', r.role, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as e
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join (values ('anon'), ('authenticated')) r(role)
  where n.nspname in ('public', 'app') and has_function_privilege(r.role, p.oid, 'EXECUTE')
),
spriv as (
  select format('%s:%s:%s', r.role, n.nspname, has_schema_privilege(r.role, n.oid, 'USAGE')) as e
  from pg_namespace n cross join (values ('anon'), ('authenticated')) r(role)
  where n.nspname in ('public', 'app')
),
summary as (
  select 'a columns' as category, count(*) as items, left(md5(string_agg(e, E'\n' order by e collate "C")), 12) as hash from cols
  union all select 'b constraints', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from cons
  union all select 'c indexes', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from idx
  union all select 'd triggers', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from trg
  union all select 'e policies', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from pol
  union all select 'f rls', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from rls
  union all select 'g functions', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from fns
  union all select 'h views', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from vws
  union all select 'i table grants', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from tpriv
  union all select 'j column grants', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from cpriv
  union all select 'k function grants', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from fpriv
  union all select 'l schema usage', count(*), left(md5(string_agg(e, E'\n' order by e collate "C")), 12) from spriv
)
select category, items, hash from summary
union all select 'm postgres', 0, current_setting('server_version')
order by category;
