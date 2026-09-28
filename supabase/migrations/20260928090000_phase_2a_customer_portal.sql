-- ============================================================================
-- Phase 2A — NRI customer portal foundation
--
-- Tables:  profiles, properties, service_requests, service_request_events,
--          activity_logs, notifications
--
-- Security model (see docs/PHASE_2A.md):
--   1. Row Level Security on every table: a customer only ever sees rows that
--      belong to their own profile.
--   2. Table privileges are revoked from `anon` and `authenticated` and
--      re-granted per column, so server-controlled columns (owner, role,
--      status, request number, timestamps) cannot be written by customers
--      even through the public Data API.
--   3. Timeline events, activity logs and notifications are written only by
--      SECURITY DEFINER triggers, in the same transaction as the change that
--      caused them. Customers can read them but never write them.
--   4. Internal helpers live in the `app` schema, which the Data API does not
--      expose.
-- ============================================================================

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- profiles: one per auth user. Created automatically on sign-up.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null default 'CUSTOMER'
    constraint profiles_role_check check (role in ('CUSTOMER', 'ADMIN', 'VENDOR', 'PARTNER')),
  full_name text not null
    constraint profiles_full_name_check check (char_length(btrim(full_name)) between 1 and 120),
  email text
    constraint profiles_email_check check (email is null or char_length(email) <= 320),
  phone text
    constraint profiles_phone_check check (phone is null or phone ~ '^\+?[0-9 ().-]{7,22}$'),
  country text
    constraint profiles_country_check check (country is null or country ~ '^[A-Z]{2}$'),
  timezone text
    constraint profiles_timezone_check check (
      timezone is null or (char_length(timezone) <= 64 and timezone ~ '^[A-Za-z]+(/[A-Za-z0-9_+-]+)*$')
    ),
  avatar_url text
    constraint profiles_avatar_url_check check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One profile per auth user. role is set by the system, never by the user.';

-- The profile id of the signed-in user (null when there is no user).
create function app.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.auth_user_id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- properties
-- ----------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default app.current_profile_id() references public.profiles (id) on delete cascade,
  name text not null
    constraint properties_name_check check (char_length(btrim(name)) between 1 and 120),
  property_type text not null
    constraint properties_type_check check (
      property_type in ('HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL', 'AGRICULTURAL_LAND', 'OTHER')
    ),
  address_line_1 text
    constraint properties_address_line_1_check check (address_line_1 is null or char_length(address_line_1) <= 200),
  address_line_2 text
    constraint properties_address_line_2_check check (address_line_2 is null or char_length(address_line_2) <= 200),
  city text not null
    constraint properties_city_check check (char_length(btrim(city)) between 1 and 80),
  district text
    constraint properties_district_check check (district is null or char_length(district) <= 80),
  state text not null default 'Tamil Nadu'
    constraint properties_state_check check (char_length(state) <= 80),
  postal_code text
    constraint properties_postal_code_check check (postal_code is null or postal_code ~ '^[1-9][0-9]{5}$'),
  country text not null default 'India'
    constraint properties_country_check check (char_length(country) <= 80),
  ownership_type text
    constraint properties_ownership_type_check check (
      ownership_type is null or ownership_type in ('SOLE', 'JOINT', 'FAMILY', 'POWER_OF_ATTORNEY', 'OTHER')
    ),
  notes text
    constraint properties_notes_check check (notes is null or char_length(notes) <= 2000),
  status text not null default 'ACTIVE'
    constraint properties_status_check check (status in ('ACTIVE', 'UNDER_REVIEW', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_owner_id_idx on public.properties (owner_id);

comment on column public.properties.status is 'Set by the operations team (Phase 2B). Customers cannot change it.';

-- ----------------------------------------------------------------------------
-- service_requests
-- ----------------------------------------------------------------------------
create sequence app.service_request_number_seq;

-- REQ-000001, REQ-000002, … (never truncated past six digits).
create function app.next_request_number()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'REQ-' || lpad(n::text, greatest(6, char_length(n::text)), '0')
  from (select nextval('app.service_request_number_seq') as n) s
$$;

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default app.next_request_number(),
  customer_id uuid not null default app.current_profile_id() references public.profiles (id) on delete cascade,
  -- NO ACTION (not RESTRICT): a property with requests cannot be deleted on its
  -- own, but deleting a whole account still cascades cleanly.
  property_id uuid references public.properties (id),
  category text not null
    constraint service_requests_category_check check (
      category in (
        'PROPERTY_INSPECTION', 'MAINTENANCE', 'CLEANING', 'GARDEN_MAINTENANCE', 'SECURITY_CHECK',
        'DOCUMENT_ASSISTANCE', 'RENTAL_MANAGEMENT', 'FAMILY_ASSISTANCE', 'OTHER'
      )
    ),
  title text not null
    constraint service_requests_title_check check (char_length(btrim(title)) between 3 and 120),
  description text
    constraint service_requests_description_check check (description is null or char_length(description) <= 4000),
  priority text not null default 'NORMAL'
    constraint service_requests_priority_check check (priority in ('NORMAL', 'URGENT')),
  status text not null default 'SUBMITTED'
    constraint service_requests_status_check check (
      status in ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'COMPLETED', 'CANCELLED')
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_requests_customer_id_created_at_idx on public.service_requests (customer_id, created_at desc);
create index service_requests_property_id_idx on public.service_requests (property_id);

-- ----------------------------------------------------------------------------
-- service_request_events: the request timeline. Written only by triggers.
-- ----------------------------------------------------------------------------
create table public.service_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  event_type text not null
    constraint service_request_events_type_check check (
      event_type in ('REQUEST_CREATED', 'REQUEST_REVIEWED', 'STATUS_CHANGED', 'CUSTOMER_COMMENT')
    ),
  title text not null
    constraint service_request_events_title_check check (char_length(title) <= 160),
  description text
    constraint service_request_events_description_check check (description is null or char_length(description) <= 2000),
  -- INTERNAL events (for the future operations team) are never shown to customers.
  visibility text not null default 'CUSTOMER'
    constraint service_request_events_visibility_check check (visibility in ('CUSTOMER', 'INTERNAL')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index service_request_events_request_id_created_at_idx on public.service_request_events (request_id, created_at);

-- ----------------------------------------------------------------------------
-- activity_logs: the foundation of the audit trail. Written only by triggers.
-- customer_id is the workspace the entry belongs to; actor_id is who did it
-- (the customer today; staff in later phases). Metadata never holds addresses,
-- phone numbers or other personal values, only names of changed fields.
-- ----------------------------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  customer_id uuid references public.profiles (id) on delete cascade,
  action text not null
    constraint activity_logs_action_check check (char_length(action) <= 64),
  entity_type text not null
    constraint activity_logs_entity_type_check check (entity_type in ('PROFILE', 'PROPERTY', 'SERVICE_REQUEST')),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_actor_id_idx on public.activity_logs (actor_id);
create index activity_logs_customer_id_created_at_idx on public.activity_logs (customer_id, created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- notifications: in-app only in Phase 2A. Written only by triggers.
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    constraint notifications_type_check check (type in ('REQUEST_RECEIVED', 'REQUEST_STATUS_CHANGED', 'GENERAL')),
  title text not null
    constraint notifications_title_check check (char_length(title) <= 160),
  message text not null
    constraint notifications_message_check check (char_length(message) <= 1000),
  entity_type text
    constraint notifications_entity_type_check check (entity_type is null or entity_type in ('PROPERTY', 'SERVICE_REQUEST')),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ============================================================================
-- Helpers used by the triggers
-- ============================================================================

create function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Writes an activity entry. Skipped when the workspace no longer exists
-- (e.g. while an account is being deleted), so deletions always cascade.
create function app.log_activity(
  p_customer_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_customer_id is null or not exists (select 1 from public.profiles where id = p_customer_id) then
    return;
  end if;
  insert into public.activity_logs (actor_id, customer_id, action, entity_type, entity_id, metadata)
  values (coalesce(p_actor_id, app.current_profile_id()), p_customer_id, p_action, p_entity_type, p_entity_id,
          coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create function app.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;
  insert into public.notifications (user_id, type, title, message, entity_type, entity_id)
  values (p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id);
end;
$$;

-- Customer-facing wording for a request status (mirrors src/lib/portal/domain.ts).
create function app.request_status_label(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'SUBMITTED' then 'Submitted'
    when 'UNDER_REVIEW' then 'Under review'
    when 'ASSIGNED' then 'Assigned'
    when 'IN_PROGRESS' then 'In progress'
    when 'WAITING_FOR_CUSTOMER' then 'Waiting for you'
    when 'COMPLETED' then 'Completed'
    when 'CANCELLED' then 'Cancelled'
    else p_status
  end
$$;

-- Timeline title for a status change.
create function app.status_event_title(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'SUBMITTED' then 'Request submitted again'
    when 'UNDER_REVIEW' then 'Team review started'
    when 'ASSIGNED' then 'Local team assigned'
    when 'IN_PROGRESS' then 'Work in progress'
    when 'WAITING_FOR_CUSTOMER' then 'Waiting for your input'
    when 'COMPLETED' then 'Request completed'
    when 'CANCELLED' then 'Request cancelled'
    else 'Status changed'
  end
$$;

-- ============================================================================
-- Triggers
-- ============================================================================

-- New auth user → profile (always CUSTOMER; metadata can never choose a role).
create function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := left(nullif(btrim(v_meta ->> 'full_name'), ''), 120);
  v_country text := upper(nullif(btrim(v_meta ->> 'country'), ''));
  v_timezone text := nullif(btrim(v_meta ->> 'timezone'), '');
  v_profile_id uuid;
begin
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    v_country := null;
  end if;
  if v_timezone is not null and (char_length(v_timezone) > 64 or v_timezone !~ '^[A-Za-z]+(/[A-Za-z0-9_+-]+)*$') then
    v_timezone := null;
  end if;

  insert into public.profiles (auth_user_id, full_name, email, country, timezone)
  values (
    new.id,
    coalesce(v_name, left(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 120), 'Customer'),
    new.email,
    v_country,
    v_timezone
  )
  returning id into v_profile_id;

  perform app.log_activity(v_profile_id, 'ACCOUNT_CREATED', 'PROFILE', v_profile_id, '{}'::jsonb, v_profile_id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- Keep the profile email in step with the auth email.
create function app.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where auth_user_id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function app.sync_user_email();

-- profiles
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function app.touch_updated_at();

create function app.on_profile_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[] := array[]::text[];
begin
  if new.full_name is distinct from old.full_name then v_fields := array_append(v_fields, 'full_name'); end if;
  if new.phone is distinct from old.phone then v_fields := array_append(v_fields, 'phone'); end if;
  if new.country is distinct from old.country then v_fields := array_append(v_fields, 'country'); end if;
  if new.timezone is distinct from old.timezone then v_fields := array_append(v_fields, 'timezone'); end if;
  if cardinality(v_fields) > 0 then
    perform app.log_activity(new.id, 'PROFILE_UPDATED', 'PROFILE', new.id, jsonb_build_object('fields', to_jsonb(v_fields)));
  end if;
  return null;
end;
$$;

create trigger profiles_log_update
  after update on public.profiles
  for each row execute function app.on_profile_updated();

-- properties
create trigger properties_touch_updated_at
  before update on public.properties
  for each row execute function app.touch_updated_at();

create function app.on_property_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.log_activity(new.owner_id, 'PROPERTY_CREATED', 'PROPERTY', new.id, jsonb_build_object('name', new.name));
  return null;
end;
$$;

create trigger properties_log_insert
  after insert on public.properties
  for each row execute function app.on_property_created();

create function app.on_property_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[] := array[]::text[];
begin
  if new.name is distinct from old.name then v_fields := array_append(v_fields, 'name'); end if;
  if new.property_type is distinct from old.property_type then v_fields := array_append(v_fields, 'property_type'); end if;
  if new.address_line_1 is distinct from old.address_line_1 then v_fields := array_append(v_fields, 'address_line_1'); end if;
  if new.address_line_2 is distinct from old.address_line_2 then v_fields := array_append(v_fields, 'address_line_2'); end if;
  if new.city is distinct from old.city then v_fields := array_append(v_fields, 'city'); end if;
  if new.district is distinct from old.district then v_fields := array_append(v_fields, 'district'); end if;
  if new.postal_code is distinct from old.postal_code then v_fields := array_append(v_fields, 'postal_code'); end if;
  if new.ownership_type is distinct from old.ownership_type then v_fields := array_append(v_fields, 'ownership_type'); end if;
  if new.notes is distinct from old.notes then v_fields := array_append(v_fields, 'notes'); end if;
  if new.status is distinct from old.status then v_fields := array_append(v_fields, 'status'); end if;
  if cardinality(v_fields) > 0 then
    perform app.log_activity(new.owner_id, 'PROPERTY_UPDATED', 'PROPERTY', new.id,
      jsonb_build_object('name', new.name, 'fields', to_jsonb(v_fields)));
  end if;
  return null;
end;
$$;

create trigger properties_log_update
  after update on public.properties
  for each row execute function app.on_property_updated();

create function app.on_property_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.log_activity(old.owner_id, 'PROPERTY_DELETED', 'PROPERTY', old.id, jsonb_build_object('name', old.name));
  return null;
end;
$$;

create trigger properties_log_delete
  after delete on public.properties
  for each row execute function app.on_property_deleted();

-- service_requests
create trigger service_requests_touch_updated_at
  before update on public.service_requests
  for each row execute function app.touch_updated_at();

-- A new request gets its first timeline event, an activity entry and a
-- notification, all in the same transaction as the insert.
create function app.on_service_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property_name text;
begin
  select p.name into v_property_name from public.properties p where p.id = new.property_id;

  insert into public.service_request_events (request_id, event_type, title, created_by, metadata)
  values (new.id, 'REQUEST_CREATED', 'Request submitted', app.current_profile_id(),
          jsonb_build_object('status', new.status));

  perform app.log_activity(new.customer_id, 'REQUEST_CREATED', 'SERVICE_REQUEST', new.id,
    jsonb_build_object(
      'request_number', new.request_number,
      'title', new.title,
      'category', new.category,
      'property_id', new.property_id,
      'property_name', v_property_name
    ));

  perform app.notify(new.customer_id, 'REQUEST_RECEIVED', 'Your service request has been received.',
    format('%s · %s. Our team will review it and post updates here.', new.request_number, new.title),
    'SERVICE_REQUEST', new.id);
  return null;
end;
$$;

create trigger service_requests_on_insert
  after insert on public.service_requests
  for each row execute function app.on_service_request_created();

-- Every status change becomes a timeline event and an activity entry. The
-- customer is notified when someone else (the team, later) changed it.
create function app.on_service_request_status_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_profile_id();
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  insert into public.service_request_events (request_id, event_type, title, created_by, metadata)
  values (new.id, 'STATUS_CHANGED', app.status_event_title(new.status), v_actor,
          jsonb_build_object('from', old.status, 'to', new.status));

  perform app.log_activity(new.customer_id,
    case when new.status = 'CANCELLED' then 'REQUEST_CANCELLED' else 'REQUEST_STATUS_CHANGED' end,
    'SERVICE_REQUEST', new.id,
    jsonb_build_object('request_number', new.request_number, 'title', new.title, 'from', old.status, 'to', new.status));

  if v_actor is distinct from new.customer_id then
    perform app.notify(new.customer_id, 'REQUEST_STATUS_CHANGED', format('Update on %s', new.request_number),
      format('%s is now: %s.', new.title, app.request_status_label(new.status)), 'SERVICE_REQUEST', new.id);
  end if;
  return null;
end;
$$;

create trigger service_requests_on_status_change
  after update of status on public.service_requests
  for each row execute function app.on_service_request_status_changed();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_request_events enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "Users read their own profile" on public.profiles
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- properties
create policy "Customers read their own properties" on public.properties
  for select to authenticated
  using (owner_id = (select app.current_profile_id()));

create policy "Customers add their own properties" on public.properties
  for insert to authenticated
  with check (owner_id = (select app.current_profile_id()));

create policy "Customers edit their own properties" on public.properties
  for update to authenticated
  using (owner_id = (select app.current_profile_id()))
  with check (owner_id = (select app.current_profile_id()));

create policy "Customers delete their own properties" on public.properties
  for delete to authenticated
  using (owner_id = (select app.current_profile_id()));

-- service_requests
create policy "Customers read their own requests" on public.service_requests
  for select to authenticated
  using (customer_id = (select app.current_profile_id()));

-- A request may only point at one of the customer's own properties.
create policy "Customers create their own requests" on public.service_requests
  for insert to authenticated
  with check (
    customer_id = (select app.current_profile_id())
    and (
      property_id is null
      or exists (
        select 1 from public.properties p
        where p.id = property_id and p.owner_id = (select app.current_profile_id())
      )
    )
  );

-- The only change a customer can make: cancel a request the team has not started.
create policy "Customers cancel their own open requests" on public.service_requests
  for update to authenticated
  using (customer_id = (select app.current_profile_id()) and status in ('SUBMITTED', 'UNDER_REVIEW'))
  with check (customer_id = (select app.current_profile_id()) and status = 'CANCELLED');

-- service_request_events
create policy "Customers read the timeline of their own requests" on public.service_request_events
  for select to authenticated
  using (
    visibility = 'CUSTOMER'
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.customer_id = (select app.current_profile_id())
    )
  );

-- activity_logs
create policy "Customers read their own activity" on public.activity_logs
  for select to authenticated
  using (customer_id = (select app.current_profile_id()));

-- notifications
create policy "Users read their own notifications" on public.notifications
  for select to authenticated
  using (user_id = (select app.current_profile_id()));

create policy "Users mark their own notifications read" on public.notifications
  for update to authenticated
  using (user_id = (select app.current_profile_id()))
  with check (user_id = (select app.current_profile_id()));

-- ============================================================================
-- Privileges: nothing for anon; column-level writes for authenticated.
-- ============================================================================

revoke all on table
  public.profiles, public.properties, public.service_requests,
  public.service_request_events, public.activity_logs, public.notifications
from anon, authenticated;

grant select on table
  public.profiles, public.properties, public.service_requests,
  public.service_request_events, public.activity_logs, public.notifications
to authenticated;

grant update (full_name, phone, country, timezone) on public.profiles to authenticated;

grant insert (name, property_type, address_line_1, address_line_2, city, district, postal_code, ownership_type, notes)
  on public.properties to authenticated;
grant update (name, property_type, address_line_1, address_line_2, city, district, postal_code, ownership_type, notes)
  on public.properties to authenticated;
grant delete on public.properties to authenticated;

grant insert (property_id, category, title, description, priority) on public.service_requests to authenticated;
grant update (status) on public.service_requests to authenticated;

grant update (read_at) on public.notifications to authenticated;

-- Functions: nothing is executable by default; authenticated needs the two
-- helpers used in column defaults and policies.
revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function app.current_profile_id() to authenticated;
grant execute on function app.next_request_number() to authenticated;
grant all on all tables in schema public to service_role;
grant all on all functions in schema app to service_role;
grant all on all sequences in schema app to service_role;
