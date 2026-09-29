-- ============================================================================
-- Phase 2B — Admin operations
--
-- Additive on top of 20260928090000_phase_2a_customer_portal.sql (unchanged).
--
-- Adds:  team_members, request_assignments, activity_logs.visibility,
--        two timeline event types (INTERNAL_NOTE, TEAM_UPDATE), the
--        OPERATIONS role and the REQUEST_UPDATE notification type.
--
-- Security model (see docs/PHASE_2B.md):
--   1. An admin is a profile with role ADMIN AND an active team membership
--      (app.is_admin()). Deactivating the membership revokes access at once.
--   2. Admins READ everything they need through additional RLS policies that
--      sit beside the customer policies; customer policies are unchanged,
--      except that customers now see only customer-visible activity.
--   3. Admins WRITE only through five SECURITY DEFINER functions, each of
--      which checks app.is_admin() first and validates its input. No table
--      gains a new write privilege, so customers can write nothing new.
--   4. The existing Phase 2A triggers still write the timeline event, the
--      activity entry and the customer notification for every status change.
--   5. Internal notes and internal activity are INTERNAL by construction
--      (constraints), and customers' policies never return INTERNAL rows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Roles: OPERATIONS = internal staff who can be assigned requests. They have
-- no portal access in Phase 2B (both portals turn them away).
-- ----------------------------------------------------------------------------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('CUSTOMER', 'ADMIN', 'OPERATIONS', 'VENDOR', 'PARTNER'));

-- ----------------------------------------------------------------------------
-- team_members: the internal team. Managed with SQL by the owner (never from
-- the browser); admins can read it.
-- ----------------------------------------------------------------------------
create table public.team_members (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.team_members is
  'Internal staff: profiles with role ADMIN or OPERATIONS. is_active = false removes admin access and assignability.';

create function app.check_team_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.profile_id and p.role in ('ADMIN', 'OPERATIONS')) then
    raise exception 'team members must have the ADMIN or OPERATIONS role' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger team_members_check
  before insert or update on public.team_members
  for each row execute function app.check_team_member();

create trigger team_members_touch_updated_at
  before update on public.team_members
  for each row execute function app.touch_updated_at();

-- True only for the signed-in user when they are an ADMIN with an active
-- team membership. Used by every admin policy, view and function.
create function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.team_members t on t.profile_id = p.id
    where p.auth_user_id = auth.uid() and p.role = 'ADMIN' and t.is_active
  )
$$;

-- An internal team member who can be given work.
create function app.is_active_team_member(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.team_members t on t.profile_id = p.id
    where p.id = p_profile_id and p.role in ('ADMIN', 'OPERATIONS') and t.is_active
  )
$$;

-- ----------------------------------------------------------------------------
-- request_assignments: who is responsible for a request (one at a time).
-- Kept out of service_requests so customers can never read it.
-- ----------------------------------------------------------------------------
create table public.request_assignments (
  request_id uuid primary key references public.service_requests (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now()
);

create index request_assignments_assignee_id_idx on public.request_assignments (assignee_id);

-- ----------------------------------------------------------------------------
-- Timeline: internal notes and customer-visible team updates. Visibility is
-- bound to the type by constraints, so an internal note can never be stored
-- as customer-visible (and the reverse).
-- ----------------------------------------------------------------------------
alter table public.service_request_events drop constraint service_request_events_type_check;
alter table public.service_request_events add constraint service_request_events_type_check
  check (
    event_type in ('REQUEST_CREATED', 'REQUEST_REVIEWED', 'STATUS_CHANGED', 'CUSTOMER_COMMENT', 'INTERNAL_NOTE', 'TEAM_UPDATE')
  );
alter table public.service_request_events add constraint service_request_events_note_visibility_check
  check (
    (event_type <> 'INTERNAL_NOTE' or visibility = 'INTERNAL')
    and (event_type <> 'TEAM_UPDATE' or visibility = 'CUSTOMER')
  );
alter table public.service_request_events add constraint service_request_events_note_text_check
  check (
    event_type not in ('INTERNAL_NOTE', 'TEAM_UPDATE')
    or char_length(btrim(coalesce(description, ''))) between 1 and 2000
  );

-- ----------------------------------------------------------------------------
-- Activity visibility. Existing rows (and everything the Phase 2A triggers
-- write) stay CUSTOMER. Internal operations are logged INTERNAL.
-- ----------------------------------------------------------------------------
alter table public.activity_logs
  add column visibility text not null default 'CUSTOMER'
  constraint activity_logs_visibility_check check (visibility in ('CUSTOMER', 'INTERNAL'));

-- Tightened, never loosened: a customer sees their own CUSTOMER activity only.
drop policy "Customers read their own activity" on public.activity_logs;
create policy "Customers read their own activity" on public.activity_logs
  for select to authenticated
  using (customer_id = (select app.current_profile_id()) and visibility = 'CUSTOMER');

create function app.log_internal_activity(
  p_customer_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_logs (actor_id, customer_id, action, entity_type, entity_id, metadata, visibility)
  values (app.current_profile_id(), p_customer_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb), 'INTERNAL');
end;
$$;

-- ----------------------------------------------------------------------------
-- Notifications: a type for customer-visible team updates.
-- ----------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('REQUEST_RECEIVED', 'REQUEST_STATUS_CHANGED', 'REQUEST_UPDATE', 'GENERAL'));

-- ============================================================================
-- Admin read access. Added beside the customer policies (policies are OR'ed),
-- so customers are unaffected: app.is_admin() is false for them.
-- ============================================================================
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using ((select app.is_admin()));
create policy "Admins read all properties" on public.properties
  for select to authenticated using ((select app.is_admin()));
create policy "Admins read all requests" on public.service_requests
  for select to authenticated using ((select app.is_admin()));
create policy "Admins read all request events" on public.service_request_events
  for select to authenticated using ((select app.is_admin()));
create policy "Admins read all activity" on public.activity_logs
  for select to authenticated using ((select app.is_admin()));

alter table public.team_members enable row level security;
alter table public.request_assignments enable row level security;
create policy "Admins read the team" on public.team_members
  for select to authenticated using ((select app.is_admin()));
create policy "Admins read assignments" on public.request_assignments
  for select to authenticated using ((select app.is_admin()));

-- Read-only for the API roles; all writes go through the functions below.
revoke all on table public.team_members, public.request_assignments from anon, authenticated;
grant select on table public.team_members, public.request_assignments to authenticated;

-- ============================================================================
-- Request lifecycle for the team (mirrors adminStatusTransitions in
-- src/lib/admin/domain.ts; a test keeps the two identical). Customers keep
-- their single Phase 2A transition: SUBMITTED / UNDER_REVIEW -> CANCELLED.
-- ============================================================================
create function app.admin_status_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('SUBMITTED', 'UNDER_REVIEW'), ('SUBMITTED', 'CANCELLED'),
    ('UNDER_REVIEW', 'ASSIGNED'), ('UNDER_REVIEW', 'WAITING_FOR_CUSTOMER'), ('UNDER_REVIEW', 'CANCELLED'),
    ('ASSIGNED', 'IN_PROGRESS'), ('ASSIGNED', 'WAITING_FOR_CUSTOMER'), ('ASSIGNED', 'UNDER_REVIEW'), ('ASSIGNED', 'CANCELLED'),
    ('IN_PROGRESS', 'WAITING_FOR_CUSTOMER'), ('IN_PROGRESS', 'COMPLETED'), ('IN_PROGRESS', 'CANCELLED'),
    ('WAITING_FOR_CUSTOMER', 'UNDER_REVIEW'), ('WAITING_FOR_CUSTOMER', 'ASSIGNED'),
    ('WAITING_FOR_CUSTOMER', 'IN_PROGRESS'), ('WAITING_FOR_CUSTOMER', 'CANCELLED')
  )
$$;

-- ============================================================================
-- Admin operations. Each function: admin check first, input validation, one
-- transaction. Errors are raised with stable message keys the app maps to
-- plain-English messages; database details never reach the browser.
-- ============================================================================

-- Change a request's status. p_expected_status guards against two admins
-- acting on stale screens. The Phase 2A trigger writes the timeline event,
-- the activity entry and the customer notification.
create function public.admin_change_request_status(p_request_id uuid, p_expected_status text, p_new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select r.status into v_current from public.service_requests r where r.id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  if v_current is distinct from p_expected_status then
    raise exception 'stale_status' using errcode = 'P0001';
  end if;
  if not app.admin_status_transition_allowed(v_current, p_new_status) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if p_new_status in ('ASSIGNED', 'IN_PROGRESS')
     and not exists (select 1 from public.request_assignments a where a.request_id = p_request_id) then
    raise exception 'assignment_required' using errcode = 'P0001';
  end if;
  update public.service_requests set status = p_new_status where id = p_request_id;
end;
$$;

-- Assign (or reassign) a request to an active team member. Internal only:
-- the customer sees the ASSIGNED status change, not who was assigned.
create function public.admin_assign_request(p_request_id uuid, p_assignee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_previous uuid;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select r.id, r.customer_id, r.status, r.request_number into v_request
  from public.service_requests r where r.id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if not app.is_active_team_member(p_assignee_id) then
    raise exception 'invalid_assignee' using errcode = 'P0001';
  end if;
  select a.assignee_id into v_previous from public.request_assignments a where a.request_id = p_request_id;
  if v_previous is not distinct from p_assignee_id then
    return;
  end if;
  insert into public.request_assignments (request_id, assignee_id, assigned_by, assigned_at)
  values (p_request_id, p_assignee_id, app.current_profile_id(), now())
  on conflict (request_id) do update
    set assignee_id = excluded.assignee_id, assigned_by = excluded.assigned_by, assigned_at = excluded.assigned_at;
  perform app.log_internal_activity(
    v_request.customer_id,
    case when v_previous is null then 'REQUEST_ASSIGNED' else 'REQUEST_REASSIGNED' end,
    'SERVICE_REQUEST',
    p_request_id,
    jsonb_build_object('request_number', v_request.request_number, 'assignee_id', p_assignee_id, 'previous_assignee_id', v_previous)
  );
end;
$$;

-- Remove the assignment. Not allowed while the request is ASSIGNED or
-- IN_PROGRESS: someone must stay responsible (reassign instead).
create function public.admin_unassign_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_previous uuid;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select r.id, r.customer_id, r.status, r.request_number into v_request
  from public.service_requests r where r.id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  if v_request.status in ('ASSIGNED', 'IN_PROGRESS') then
    raise exception 'assignment_required' using errcode = 'P0001';
  end if;
  delete from public.request_assignments a where a.request_id = p_request_id returning a.assignee_id into v_previous;
  if v_previous is null then
    return;
  end if;
  perform app.log_internal_activity(
    v_request.customer_id, 'REQUEST_UNASSIGNED', 'SERVICE_REQUEST', p_request_id,
    jsonb_build_object('request_number', v_request.request_number, 'previous_assignee_id', v_previous)
  );
end;
$$;

-- An internal note on the request timeline: INTERNAL by construction, never
-- returned to the customer. The note text stays in the event, not in activity.
create function public.admin_add_internal_note(p_request_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_text' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.request_number into v_request from public.service_requests r where r.id = p_request_id;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  insert into public.service_request_events (request_id, event_type, title, description, visibility, created_by)
  values (p_request_id, 'INTERNAL_NOTE', 'Internal note', v_body, 'INTERNAL', app.current_profile_id());
  perform app.log_internal_activity(
    v_request.customer_id, 'INTERNAL_NOTE_ADDED', 'SERVICE_REQUEST', p_request_id,
    jsonb_build_object('request_number', v_request.request_number)
  );
end;
$$;

-- A message to the customer on their request timeline, with a notification
-- and a customer-visible activity entry.
create function public.admin_post_customer_update(p_request_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_text' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.request_number, r.title into v_request from public.service_requests r where r.id = p_request_id;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  insert into public.service_request_events (request_id, event_type, title, description, visibility, created_by)
  values (p_request_id, 'TEAM_UPDATE', 'Update from our team', v_body, 'CUSTOMER', app.current_profile_id());
  perform app.log_activity(
    v_request.customer_id, 'TEAM_UPDATE_POSTED', 'SERVICE_REQUEST', p_request_id,
    jsonb_build_object('request_number', v_request.request_number, 'title', v_request.title)
  );
  perform app.notify(
    v_request.customer_id, 'REQUEST_UPDATE', format('Update on %s', v_request.request_number),
    format('Our team added an update to %s.', v_request.title), 'SERVICE_REQUEST', p_request_id
  );
end;
$$;

-- ============================================================================
-- Admin overviews. security_invoker: the reader's own RLS applies, and each
-- view also returns nothing unless the reader is an admin.
-- ============================================================================
create view public.admin_request_status_counts with (security_invoker = true) as
  select r.status, count(*)::int as total
  from public.service_requests r
  where (select app.is_admin())
  group by r.status;

create view public.admin_customer_overview with (security_invoker = true) as
  select
    p.id, p.full_name, p.email, p.phone, p.country, p.timezone, p.created_at,
    (select count(*) from public.properties pr where pr.owner_id = p.id)::int as property_count,
    (select count(*) from public.service_requests r where r.customer_id = p.id)::int as request_count,
    (select count(*) from public.service_requests r
      where r.customer_id = p.id and r.status not in ('COMPLETED', 'CANCELLED'))::int as open_request_count
  from public.profiles p
  where p.role = 'CUSTOMER' and (select app.is_admin());

create view public.admin_property_overview with (security_invoker = true) as
  select
    pr.id, pr.name, pr.property_type, pr.city, pr.district, pr.state, pr.status,
    pr.owner_id, o.full_name as owner_name, pr.created_at, pr.updated_at,
    (select count(*) from public.service_requests r where r.property_id = pr.id)::int as request_count,
    (select count(*) from public.service_requests r
      where r.property_id = pr.id and r.status not in ('COMPLETED', 'CANCELLED'))::int as open_request_count
  from public.properties pr
  join public.profiles o on o.id = pr.owner_id
  where (select app.is_admin());

create view public.admin_team_overview with (security_invoker = true) as
  select
    t.profile_id, p.full_name, p.email, p.role, t.is_active, t.created_at as joined_at,
    (select count(*) from public.request_assignments a
      join public.service_requests r on r.id = a.request_id
      where a.assignee_id = t.profile_id and r.status not in ('COMPLETED', 'CANCELLED'))::int as open_assigned_count,
    (select count(*) from public.request_assignments a where a.assignee_id = t.profile_id)::int as total_assigned_count
  from public.team_members t
  join public.profiles p on p.id = t.profile_id
  where (select app.is_admin());

revoke all on table
  public.admin_request_status_counts, public.admin_customer_overview,
  public.admin_property_overview, public.admin_team_overview
from anon, authenticated;
grant select on table
  public.admin_request_status_counts, public.admin_customer_overview,
  public.admin_property_overview, public.admin_team_overview
to authenticated;

-- ============================================================================
-- Indexes for the admin inbox and audit views.
-- ============================================================================
create index service_requests_status_created_at_idx on public.service_requests (status, created_at desc);
create index service_requests_created_at_idx on public.service_requests (created_at desc);
create index profiles_role_created_at_idx on public.profiles (role, created_at desc);
create index activity_logs_created_at_idx on public.activity_logs (created_at desc);

-- ============================================================================
-- Function privileges. Nothing is executable by default; authenticated users
-- may call the admin functions (which refuse anyone but an admin) and the
-- helpers used in policies, defaults and views.
-- ============================================================================
revoke execute on function
  public.admin_change_request_status(uuid, text, text),
  public.admin_assign_request(uuid, uuid),
  public.admin_unassign_request(uuid),
  public.admin_add_internal_note(uuid, text),
  public.admin_post_customer_update(uuid, text)
from public, anon;
grant execute on function
  public.admin_change_request_status(uuid, text, text),
  public.admin_assign_request(uuid, uuid),
  public.admin_unassign_request(uuid),
  public.admin_add_internal_note(uuid, text),
  public.admin_post_customer_update(uuid, text)
to authenticated, service_role;

revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function app.current_profile_id() to authenticated;
grant execute on function app.next_request_number() to authenticated;
grant execute on function app.is_admin() to authenticated;
grant all on all functions in schema app to service_role;
grant all on table public.team_members, public.request_assignments to service_role;
grant select on table
  public.admin_request_status_counts, public.admin_customer_overview,
  public.admin_property_overview, public.admin_team_overview
to service_role;
