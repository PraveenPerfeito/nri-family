-- ============================================================================
-- Phase 2C — Field operations and evidence
--
-- Additive on top of the Phase 2A and 2B migrations (all unchanged, all
-- applied in production).
--
-- Adds:  field_work (+ field_work_internal), request_evidence
--        (+ request_evidence_internal), the private `request-evidence`
--        Storage bucket and its policies, eleven admin functions, the
--        customer-visible visit and evidence timeline events, and two
--        notification types.
--
-- Security model (see docs/PHASE_2C.md):
--   1. Field work uses the Phase 2B assignment: there is no second assignee.
--      Scheduling and starting need an open request and an ACTIVE assignee.
--   2. What a customer may read and what only the team may read are in
--      different tables. Admins and customers share the `authenticated`
--      role, so column grants cannot separate them; tables with their own
--      RLS can. Customers read their own visits, and only evidence that is
--      APPROVED and explicitly published (CUSTOMER_VISIBLE). Instructions,
--      execution notes, storage paths, file names, uploaders, reviewers and
--      rejection reasons are in the *_internal tables, admins only.
--   3. Uploaded evidence starts PENDING_REVIEW and INTERNAL. A constraint
--      keeps anything that is not APPROVED internal; publishing is its own
--      step. Rejected evidence stays, internal, for the audit trail.
--   4. Files live in a private bucket. Storage RLS lets admins read and
--      upload (only into open requests), lets a customer read only the files
--      of their own published evidence, lets nobody overwrite a file, and
--      lets admins delete only uploads that were never registered.
--   5. Admins write only through SECURITY DEFINER functions that check
--      app.is_admin() first. Each writes its timeline event, activity entry
--      and notification in the same transaction. No table gains a write
--      privilege for the API roles.
--   6. A request with field work can be completed only once the visit is
--      complete, every piece of evidence has been reviewed, and at least one
--      has been published to the customer (admin_change_request_status).
--
-- Times: stored as timestamptz (UTC). Field work happens in Tamil Nadu, so
-- schedules are entered and checked in India time (Asia/Kolkata, UTC+05:30,
-- no daylight saving).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Vocabulary (mirrored in src/lib/field-ops/domain.ts; tests keep them equal)
-- ----------------------------------------------------------------------------

-- The visit lifecycle. NOT_SCHEDULED means "no visit yet" (no row).
create function app.field_work_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('NOT_SCHEDULED', 'SCHEDULED'),
    ('SCHEDULED', 'SCHEDULED'), ('SCHEDULED', 'IN_PROGRESS'), ('SCHEDULED', 'CANCELLED'),
    ('IN_PROGRESS', 'COMPLETED'), ('IN_PROGRESS', 'CANCELLED')
  )
$$;

-- Accepted evidence files: MIME type -> kind, file extension, size limit.
create function app.evidence_kind(p_mime text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_mime
    when 'image/jpeg' then 'PHOTO'
    when 'image/png' then 'PHOTO'
    when 'image/webp' then 'PHOTO'
    when 'video/mp4' then 'VIDEO'
    when 'application/pdf' then 'DOCUMENT'
  end
$$;

create function app.evidence_extension(p_mime text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_mime
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
    when 'video/mp4' then 'mp4'
    when 'application/pdf' then 'pdf'
  end
$$;

create function app.evidence_max_bytes(p_kind text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'PHOTO' then 10485760::bigint      -- 10 MB (photos are resized in the browser first)
    when 'VIDEO' then 52428800::bigint      -- 50 MB
    when 'DOCUMENT' then 20971520::bigint   -- 20 MB
  end
$$;

-- Where a file is stored in the bucket: <request id>/<evidence id>/original.<ext>.
-- Built only from ids and the file type, so it reveals nothing else.
create function app.evidence_object_path(p_request_id uuid, p_evidence_id uuid, p_mime text)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_request_id::text || '/' || p_evidence_id::text || '/original.' || app.evidence_extension(p_mime)
$$;

-- The ids in an evidence file name, or nulls when the name has any other shape.
create function app.evidence_file_parts(p_name text, out request_id uuid, out evidence_id uuid)
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/original\.(jpg|png|webp|mp4|pdf)$' then
    request_id := split_part(p_name, '/', 1)::uuid;
    evidence_id := split_part(p_name, '/', 2)::uuid;
  end if;
end;
$$;

-- "6 Oct 2026, 10:00" or "6 Oct 2026, 10:00–12:00", in India time.
create function app.visit_window(p_start timestamptz, p_end timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_start at time zone 'Asia/Kolkata', 'FMDD Mon YYYY, HH24:MI')
      || coalesce('–' || to_char(p_end at time zone 'Asia/Kolkata', 'HH24:MI'), '')
$$;

-- ----------------------------------------------------------------------------
-- field_work: one visit to carry out a request. At most one visit per request
-- that is not cancelled; a cancelled visit can be replaced by a new one.
-- Everything here may be shown to the request's customer.
-- ----------------------------------------------------------------------------
create table public.field_work (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'SCHEDULED'
    constraint field_work_status_check check (status in ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  -- "Service notes" for the customer, written when the visit is completed.
  summary text
    constraint field_work_summary_check check (summary is null or char_length(btrim(summary)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_work_window_check check (
    scheduled_end is null or (scheduled_end > scheduled_start and scheduled_end <= scheduled_start + interval '24 hours')
  ),
  -- The timestamps always agree with the status. (Every branch is true or
  -- false, never null, so the check can't pass by accident.)
  constraint field_work_timestamps_check check (
    case status
      when 'SCHEDULED' then started_at is null and completed_at is null and cancelled_at is null
      when 'IN_PROGRESS' then started_at is not null and completed_at is null and cancelled_at is null
      when 'COMPLETED' then started_at is not null and completed_at is not null and completed_at >= started_at and cancelled_at is null
      when 'CANCELLED' then cancelled_at is not null and completed_at is null
      else false
    end
  ),
  constraint field_work_summary_status_check check (summary is null or status = 'COMPLETED')
);

comment on table public.field_work is
  'Visits that carry out a service request. Written only by the admin field-work functions; the team member is the request assignee.';

create unique index field_work_one_open_visit_idx on public.field_work (request_id) where status <> 'CANCELLED';
create index field_work_request_id_created_at_idx on public.field_work (request_id, created_at desc);
create index field_work_customer_id_idx on public.field_work (customer_id);
create index field_work_status_scheduled_start_idx on public.field_work (status, scheduled_start);

-- The team's side of a visit. Admins only.
create table public.field_work_internal (
  field_work_id uuid primary key references public.field_work (id) on delete cascade,
  instructions text
    constraint field_work_internal_instructions_check check (instructions is null or char_length(btrim(instructions)) between 1 and 2000),
  execution_notes text
    constraint field_work_internal_execution_notes_check check (execution_notes is null or char_length(btrim(execution_notes)) between 1 and 4000),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- request_evidence: proof of work (photos, videos, documents). The customer
-- can read a row only once it is APPROVED and explicitly published.
-- ----------------------------------------------------------------------------
create table public.request_evidence (
  id uuid primary key,
  request_id uuid not null references public.service_requests (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  -- NO ACTION: visits are never deleted on their own; deleting an account still cascades cleanly.
  field_work_id uuid references public.field_work (id),
  kind text not null
    constraint request_evidence_kind_check check (kind in ('PHOTO', 'VIDEO', 'DOCUMENT')),
  stage text not null
    constraint request_evidence_stage_check check (stage in ('BEFORE', 'DURING', 'AFTER', 'GENERAL')),
  title text not null
    constraint request_evidence_title_check check (char_length(btrim(title)) between 3 and 120),
  description text
    constraint request_evidence_description_check check (description is null or char_length(btrim(description)) between 1 and 1000),
  mime_type text not null,
  size_bytes bigint not null,
  captured_at timestamptz,
  review_status text not null default 'PENDING_REVIEW'
    constraint request_evidence_review_status_check check (review_status in ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  visibility text not null default 'INTERNAL'
    constraint request_evidence_visibility_values_check check (visibility in ('INTERNAL', 'CUSTOMER_VISIBLE')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_evidence_file_check check (
    (kind, mime_type) in (('PHOTO', 'image/jpeg'), ('PHOTO', 'image/png'), ('PHOTO', 'image/webp'), ('VIDEO', 'video/mp4'), ('DOCUMENT', 'application/pdf'))
    and size_bytes > 0
    and size_bytes <= case kind when 'PHOTO' then 10485760 when 'VIDEO' then 52428800 else 20971520 end
  ),
  -- The customer boundary: only APPROVED evidence can ever be customer-visible
  -- (so pending and rejected evidence never can), and only once published.
  constraint request_evidence_visibility_check check (visibility = 'INTERNAL' or review_status = 'APPROVED'),
  constraint request_evidence_published_check check ((visibility = 'CUSTOMER_VISIBLE') = (published_at is not null))
);

comment on table public.request_evidence is
  'Evidence of work on a request. INTERNAL until an admin approves it and then explicitly publishes it to the customer.';

create index request_evidence_request_id_created_at_idx on public.request_evidence (request_id, created_at);
create index request_evidence_customer_published_idx on public.request_evidence (customer_id, request_id) where visibility = 'CUSTOMER_VISIBLE';
create index request_evidence_pending_idx on public.request_evidence (created_at) where review_status = 'PENDING_REVIEW';
create index request_evidence_field_work_id_idx on public.request_evidence (field_work_id);

-- The team's side of a piece of evidence. Admins only.
create table public.request_evidence_internal (
  evidence_id uuid primary key references public.request_evidence (id) on delete cascade,
  storage_path text not null unique,
  -- Storage's fingerprint (eTag) of the file when it was registered. The file is served only
  -- while it still matches, so a file replaced afterwards is never shown to anyone.
  file_etag text,
  original_name text
    constraint request_evidence_internal_original_name_check check (original_name is null or char_length(original_name) between 1 and 255),
  uploaded_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  -- Why it was rejected (or anything the reviewer noted). Never shown to the customer.
  review_note text
    constraint request_evidence_internal_review_note_check check (review_note is null or char_length(btrim(review_note)) between 1 and 1000),
  published_by uuid references public.profiles (id) on delete set null
);

create index request_evidence_internal_uploaded_by_idx on public.request_evidence_internal (uploaded_by);

-- ----------------------------------------------------------------------------
-- Integrity triggers: the customer always comes from the request, a visit or
-- piece of evidence never moves to another request, and evidence is linked
-- only to a visit of its own request.
-- ----------------------------------------------------------------------------
create function app.guard_field_work_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select r.customer_id into new.customer_id from public.service_requests r where r.id = new.request_id;
  elsif new.request_id is distinct from old.request_id or new.customer_id is distinct from old.customer_id then
    raise exception 'field work cannot move to another request' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger field_work_guard
  before insert or update on public.field_work
  for each row execute function app.guard_field_work_row();

create function app.guard_evidence_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select r.customer_id into new.customer_id from public.service_requests r where r.id = new.request_id;
  elsif new.request_id is distinct from old.request_id or new.customer_id is distinct from old.customer_id then
    raise exception 'evidence cannot move to another request' using errcode = 'P0001';
  end if;
  if new.field_work_id is not null
     and not exists (select 1 from public.field_work w where w.id = new.field_work_id and w.request_id = new.request_id) then
    raise exception 'evidence can only belong to a visit of its own request' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger request_evidence_guard
  before insert or update on public.request_evidence
  for each row execute function app.guard_evidence_row();

create trigger field_work_touch_updated_at
  before update on public.field_work
  for each row execute function app.touch_updated_at();
create trigger field_work_internal_touch_updated_at
  before update on public.field_work_internal
  for each row execute function app.touch_updated_at();
create trigger request_evidence_touch_updated_at
  before update on public.request_evidence
  for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Timeline and notifications: the new event and notification types. Each
-- event type has a fixed audience, enforced by a constraint.
-- ----------------------------------------------------------------------------
alter table public.service_request_events drop constraint service_request_events_type_check;
alter table public.service_request_events add constraint service_request_events_type_check
  check (
    event_type in (
      'REQUEST_CREATED', 'REQUEST_REVIEWED', 'STATUS_CHANGED', 'CUSTOMER_COMMENT', 'INTERNAL_NOTE', 'TEAM_UPDATE',
      'FIELD_WORK_SCHEDULED', 'FIELD_WORK_RESCHEDULED', 'FIELD_WORK_STARTED', 'FIELD_WORK_COMPLETED', 'FIELD_WORK_CANCELLED',
      'EVIDENCE_AVAILABLE'
    )
  );
alter table public.service_request_events add constraint service_request_events_field_ops_visibility_check
  check (
    (event_type not in ('FIELD_WORK_SCHEDULED', 'FIELD_WORK_RESCHEDULED', 'FIELD_WORK_COMPLETED', 'FIELD_WORK_CANCELLED', 'EVIDENCE_AVAILABLE')
      or visibility = 'CUSTOMER')
    and (event_type <> 'FIELD_WORK_STARTED' or visibility = 'INTERNAL')
  );

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('REQUEST_RECEIVED', 'REQUEST_STATUS_CHANGED', 'REQUEST_UPDATE', 'VISIT_UPDATE', 'EVIDENCE_AVAILABLE', 'GENERAL'));

-- A customer-visible visit or evidence event. The acting admin is recorded
-- in the internal activity entry written beside it, not here, so no team
-- member's id reaches the customer.
create function app.add_customer_event(p_request_id uuid, p_type text, p_title text, p_description text, p_metadata jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_request_events (request_id, event_type, title, description, visibility, metadata, created_by)
  values (p_request_id, p_type, p_title, p_description, 'CUSTOMER', coalesce(p_metadata, '{}'::jsonb), null);
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security. Customers: their own visits, and their own evidence
-- once published. Admins: everything, beside the customer policies.
-- ----------------------------------------------------------------------------
alter table public.field_work enable row level security;
alter table public.field_work_internal enable row level security;
alter table public.request_evidence enable row level security;
alter table public.request_evidence_internal enable row level security;

create policy "Customers read the visits for their own requests" on public.field_work
  for select to authenticated
  using (customer_id = (select app.current_profile_id()));
create policy "Admins read all visits" on public.field_work
  for select to authenticated
  using ((select app.is_admin()));

create policy "Admins read visit instructions and notes" on public.field_work_internal
  for select to authenticated
  using ((select app.is_admin()));

create policy "Customers read their own published evidence" on public.request_evidence
  for select to authenticated
  using (
    customer_id = (select app.current_profile_id())
    and review_status = 'APPROVED'
    and visibility = 'CUSTOMER_VISIBLE'
  );
create policy "Admins read all evidence" on public.request_evidence
  for select to authenticated
  using ((select app.is_admin()));

create policy "Admins read evidence records" on public.request_evidence_internal
  for select to authenticated
  using ((select app.is_admin()));

revoke all on table
  public.field_work, public.field_work_internal, public.request_evidence, public.request_evidence_internal
from anon, authenticated;
grant select on table
  public.field_work, public.field_work_internal, public.request_evidence, public.request_evidence_internal
to authenticated;
grant all on table
  public.field_work, public.field_work_internal, public.request_evidence, public.request_evidence_internal
to service_role;

-- ----------------------------------------------------------------------------
-- Storage: a private bucket for evidence files, and who may do what in it.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-evidence', 'request-evidence', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']
)
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- An admin may upload a file only into an open request, under an evidence id
-- that is not in use yet, with an accepted file name, and only one file per
-- evidence id. (The Storage API checks this when the admin asks for an upload URL.)
create function app.can_upload_evidence_file(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts record;
begin
  if not app.is_admin() then
    return false;
  end if;
  select * into v_parts from app.evidence_file_parts(p_name);
  if v_parts.request_id is null then
    return false;
  end if;
  return exists (select 1 from public.service_requests r where r.id = v_parts.request_id and r.status not in ('COMPLETED', 'CANCELLED'))
    and not exists (select 1 from public.request_evidence e where e.id = v_parts.evidence_id)
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'request-evidence' and o.name like v_parts.request_id::text || '/' || v_parts.evidence_id::text || '/%'
    );
end;
$$;

-- A registered evidence file is served only while Storage's fingerprint of it
-- (eTag) still matches the one recorded when it was registered and reviewed.
-- Storage can issue upload links that allow overwriting; this makes sure a
-- replaced file is never shown, to the team or the customer. Files not (yet)
-- registered as evidence pass, so an admin can check a fresh upload.
create function app.evidence_file_intact(p_name text, p_etag text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.request_evidence_internal i
    where i.storage_path = p_name and i.file_etag is distinct from p_etag
  )
$$;

-- A customer may read a file only when it belongs to their own evidence, that
-- evidence is approved and published, and the file is still the registered one.
create function app.can_read_published_evidence_file(p_name text, p_etag text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.request_evidence_internal i
    join public.request_evidence e on e.id = i.evidence_id
    where i.storage_path = p_name
      and i.file_etag is not distinct from p_etag
      and e.customer_id = app.current_profile_id()
      and e.review_status = 'APPROVED'
      and e.visibility = 'CUSTOMER_VISIBLE'
  )
$$;

-- An admin may delete only a file that was never registered as evidence (an
-- abandoned or refused upload). Registered evidence files are kept.
create function app.can_remove_evidence_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_admin() and not exists (select 1 from public.request_evidence_internal i where i.storage_path = p_name)
$$;

create policy "Evidence files: admins read" on storage.objects
  for select to authenticated
  using (bucket_id = 'request-evidence' and (select app.is_admin()) and app.evidence_file_intact(name, metadata ->> 'eTag'));
create policy "Evidence files: customers read their own published evidence" on storage.objects
  for select to authenticated
  using (bucket_id = 'request-evidence' and app.can_read_published_evidence_file(name, metadata ->> 'eTag'));
create policy "Evidence files: admins upload into open requests" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'request-evidence' and app.can_upload_evidence_file(name));
create policy "Evidence files: admins remove unregistered uploads" on storage.objects
  for delete to authenticated
  using (bucket_id = 'request-evidence' and app.can_remove_evidence_file(name));
-- No UPDATE policy: the API can't replace an evidence file. (A replacement made
-- anyway, through an overwriting upload link, is never served: see
-- app.evidence_file_intact.)

-- ============================================================================
-- Admin field-work functions. Each: admin check, locks the request then the
-- visit (always in that order), validates, and writes the timeline event,
-- internal activity and customer notification in the same transaction.
-- ============================================================================

-- Field work needs an open request that the team is working on, with an
-- ACTIVE team member responsible (the Phase 2B assignment).
create function app.assert_field_work_allowed(p_request_id uuid, p_status text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if p_status not in ('ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER') then
    raise exception 'request_not_ready' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.request_assignments a
    where a.request_id = p_request_id and app.is_active_team_member(a.assignee_id)
  ) then
    raise exception 'assignment_required' using errcode = 'P0001';
  end if;
end;
$$;

-- A visit starts today or later (India time), within a year, and ends after
-- it starts on the same day.
create function app.assert_valid_schedule(p_start timestamptz, p_end timestamptz)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  if p_start is null
     or p_start < v_today
     or p_start > now() + interval '366 days'
     or (p_end is not null and (
          p_end <= p_start
          or (p_end at time zone 'Asia/Kolkata')::date <> (p_start at time zone 'Asia/Kolkata')::date
        )) then
    raise exception 'invalid_schedule' using errcode = 'P0001';
  end if;
end;
$$;

-- Optional text: trimmed, empty becomes null, too long is refused.
create function app.optional_text(p_text text, p_max integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if v is not null and char_length(v) > p_max then
    raise exception 'invalid_text' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- Schedule the request's visit (Not scheduled -> Scheduled). Returns its id.
create function public.admin_schedule_field_work(
  p_request_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_instructions text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_id uuid;
  v_instructions text;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select r.id, r.customer_id, r.status, r.request_number, r.title into v_request
  from public.service_requests r where r.id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  perform app.assert_field_work_allowed(p_request_id, v_request.status);
  if exists (select 1 from public.field_work w where w.request_id = p_request_id and w.status <> 'CANCELLED') then
    raise exception 'field_work_exists' using errcode = 'P0001';
  end if;
  perform app.assert_valid_schedule(p_scheduled_start, p_scheduled_end);
  v_instructions := app.optional_text(p_instructions, 2000);

  insert into public.field_work (request_id, customer_id, status, scheduled_start, scheduled_end)
  values (p_request_id, v_request.customer_id, 'SCHEDULED', p_scheduled_start, p_scheduled_end)
  returning id into v_id;
  insert into public.field_work_internal (field_work_id, instructions) values (v_id, v_instructions);

  perform app.add_customer_event(p_request_id, 'FIELD_WORK_SCHEDULED', 'Service visit scheduled', null,
    jsonb_build_object('field_work_id', v_id, 'scheduled_start', p_scheduled_start, 'scheduled_end', p_scheduled_end));
  perform app.log_internal_activity(v_request.customer_id, 'FIELD_WORK_SCHEDULED', 'SERVICE_REQUEST', p_request_id,
    jsonb_build_object('request_number', v_request.request_number, 'field_work_id', v_id));
  perform app.notify(v_request.customer_id, 'VISIT_UPDATE', format('Visit scheduled for %s', v_request.request_number),
    format('Our team will visit on %s (India time) for %s.', app.visit_window(p_scheduled_start, p_scheduled_end), v_request.title),
    'SERVICE_REQUEST', p_request_id);
  return v_id;
end;
$$;

-- Move a scheduled visit, or change its instructions (Scheduled -> Scheduled).
-- The customer hears about a new time; instruction changes stay internal.
create function public.admin_reschedule_field_work(
  p_field_work_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_instructions text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_work record;
  v_old_instructions text;
  v_instructions text;
  v_fields text[] := array[]::text[];
  v_moved boolean;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select w.request_id into v_request_id from public.field_work w where w.id = p_field_work_id;
  if not found then
    raise exception 'field_work_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number, r.title into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select w.* into v_work from public.field_work w where w.id = p_field_work_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if not app.field_work_transition_allowed(v_work.status, 'SCHEDULED') then
    raise exception 'field_work_changed' using errcode = 'P0001';
  end if;
  perform app.assert_field_work_allowed(v_request.id, v_request.status);
  perform app.assert_valid_schedule(p_scheduled_start, p_scheduled_end);
  v_instructions := app.optional_text(p_instructions, 2000);
  select i.instructions into v_old_instructions from public.field_work_internal i where i.field_work_id = p_field_work_id;

  v_moved := p_scheduled_start is distinct from v_work.scheduled_start or p_scheduled_end is distinct from v_work.scheduled_end;
  if p_scheduled_start is distinct from v_work.scheduled_start then v_fields := array_append(v_fields, 'scheduled_start'); end if;
  if p_scheduled_end is distinct from v_work.scheduled_end then v_fields := array_append(v_fields, 'scheduled_end'); end if;
  if v_instructions is distinct from v_old_instructions then v_fields := array_append(v_fields, 'instructions'); end if;
  if cardinality(v_fields) = 0 then
    return;
  end if;

  if v_moved then
    update public.field_work set scheduled_start = p_scheduled_start, scheduled_end = p_scheduled_end where id = p_field_work_id;
  end if;
  if v_instructions is distinct from v_old_instructions then
    update public.field_work_internal set instructions = v_instructions where field_work_id = p_field_work_id;
  end if;

  perform app.log_internal_activity(v_request.customer_id, case when v_moved then 'FIELD_WORK_RESCHEDULED' else 'FIELD_WORK_UPDATED' end,
    'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'field_work_id', p_field_work_id, 'fields', to_jsonb(v_fields)));
  if v_moved then
    perform app.add_customer_event(v_request.id, 'FIELD_WORK_RESCHEDULED', 'Service visit rescheduled', null,
      jsonb_build_object('field_work_id', p_field_work_id, 'scheduled_start', p_scheduled_start, 'scheduled_end', p_scheduled_end));
    perform app.notify(v_request.customer_id, 'VISIT_UPDATE', format('Visit rescheduled for %s', v_request.request_number),
      format('The visit for %s is now on %s (India time).', v_request.title, app.visit_window(p_scheduled_start, p_scheduled_end)),
      'SERVICE_REQUEST', v_request.id);
  end if;
end;
$$;

-- Start the visit (Scheduled -> In progress). Needs an active assignee. The
-- request moves to In progress too, through the normal status change (the
-- Phase 2A trigger writes its event, activity and notification).
create function public.admin_start_field_work(p_field_work_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_work record;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select w.request_id into v_request_id from public.field_work w where w.id = p_field_work_id;
  if not found then
    raise exception 'field_work_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select w.* into v_work from public.field_work w where w.id = p_field_work_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if not app.field_work_transition_allowed(v_work.status, 'IN_PROGRESS') then
    raise exception 'field_work_changed' using errcode = 'P0001';
  end if;
  perform app.assert_field_work_allowed(v_request.id, v_request.status);

  update public.field_work set status = 'IN_PROGRESS', started_at = now() where id = p_field_work_id;
  insert into public.service_request_events (request_id, event_type, title, visibility, metadata, created_by)
  values (v_request.id, 'FIELD_WORK_STARTED', 'Field work started', 'INTERNAL',
          jsonb_build_object('field_work_id', p_field_work_id), app.current_profile_id());
  perform app.log_internal_activity(v_request.customer_id, 'FIELD_WORK_STARTED', 'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'field_work_id', p_field_work_id));
  if v_request.status <> 'IN_PROGRESS' and app.admin_status_transition_allowed(v_request.status, 'IN_PROGRESS') then
    update public.service_requests set status = 'IN_PROGRESS' where id = v_request.id;
  end if;
end;
$$;

-- Record what was done (internal), while the visit is in progress or after
-- it, as long as the request is open.
create function public.admin_record_field_work_notes(p_field_work_id uuid, p_execution_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_work record;
  v_notes text := btrim(coalesce(p_execution_notes, ''));
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if char_length(v_notes) not between 1 and 4000 then
    raise exception 'invalid_text' using errcode = 'P0001';
  end if;
  select w.request_id into v_request_id from public.field_work w where w.id = p_field_work_id;
  if not found then
    raise exception 'field_work_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select w.* into v_work from public.field_work w where w.id = p_field_work_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if v_work.status not in ('IN_PROGRESS', 'COMPLETED') then
    raise exception 'field_work_changed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.field_work_internal i where i.field_work_id = p_field_work_id and i.execution_notes = v_notes) then
    return;
  end if;
  update public.field_work_internal set execution_notes = v_notes where field_work_id = p_field_work_id;
  perform app.log_internal_activity(v_request.customer_id, 'FIELD_WORK_NOTES_RECORDED', 'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'field_work_id', p_field_work_id));
end;
$$;

-- Complete the visit (In progress -> Completed), with optional service notes
-- for the customer and optional final execution notes for the team. The
-- request itself stays open until the evidence is reviewed and an admin
-- completes it.
create function public.admin_complete_field_work(p_field_work_id uuid, p_summary text, p_execution_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_work record;
  v_summary text;
  v_notes text;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select w.request_id into v_request_id from public.field_work w where w.id = p_field_work_id;
  if not found then
    raise exception 'field_work_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number, r.title into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select w.* into v_work from public.field_work w where w.id = p_field_work_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if not app.field_work_transition_allowed(v_work.status, 'COMPLETED') then
    raise exception 'field_work_changed' using errcode = 'P0001';
  end if;
  v_summary := app.optional_text(p_summary, 2000);
  v_notes := app.optional_text(p_execution_notes, 4000);

  update public.field_work set status = 'COMPLETED', completed_at = now(), summary = v_summary where id = p_field_work_id;
  if v_notes is not null then
    update public.field_work_internal set execution_notes = v_notes where field_work_id = p_field_work_id;
  end if;
  perform app.add_customer_event(v_request.id, 'FIELD_WORK_COMPLETED', 'Service visit completed', v_summary,
    jsonb_build_object('field_work_id', p_field_work_id));
  perform app.log_internal_activity(v_request.customer_id, 'FIELD_WORK_COMPLETED', 'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'field_work_id', p_field_work_id));
  perform app.notify(v_request.customer_id, 'VISIT_UPDATE', format('Visit completed for %s', v_request.request_number),
    format('The service visit for %s is complete. Our team will share the evidence on your request.', v_request.title),
    'SERVICE_REQUEST', v_request.id);
end;
$$;

-- Cancel a visit that is scheduled or in progress. p_expected_status guards
-- against stale screens. The request stays as it is.
create function public.admin_cancel_field_work(p_field_work_id uuid, p_expected_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_work record;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select w.request_id into v_request_id from public.field_work w where w.id = p_field_work_id;
  if not found then
    raise exception 'field_work_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number, r.title into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select w.* into v_work from public.field_work w where w.id = p_field_work_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if v_work.status is distinct from p_expected_status or not app.field_work_transition_allowed(v_work.status, 'CANCELLED') then
    raise exception 'field_work_changed' using errcode = 'P0001';
  end if;

  update public.field_work set status = 'CANCELLED', cancelled_at = now() where id = p_field_work_id;
  perform app.add_customer_event(v_request.id, 'FIELD_WORK_CANCELLED', 'Service visit cancelled', null,
    jsonb_build_object('field_work_id', p_field_work_id));
  perform app.log_internal_activity(v_request.customer_id, 'FIELD_WORK_CANCELLED', 'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'field_work_id', p_field_work_id));
  perform app.notify(v_request.customer_id, 'VISIT_UPDATE', format('Visit cancelled for %s', v_request.request_number),
    format('The planned visit for %s has been cancelled. Our team will be in touch about next steps.', v_request.title),
    'SERVICE_REQUEST', v_request.id);
end;
$$;

-- When a request is cancelled (by the team, or by the customer while it is
-- New or Under review), any visit still open is cancelled with it. The
-- customer already hears about the cancelled request, so this writes internal
-- activity only.
create function app.on_request_cancelled_close_field_work()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in
    update public.field_work w set status = 'CANCELLED', cancelled_at = now()
    where w.request_id = new.id and w.status in ('SCHEDULED', 'IN_PROGRESS')
    returning w.id
  loop
    perform app.log_internal_activity(new.customer_id, 'FIELD_WORK_CANCELLED', 'SERVICE_REQUEST', new.id,
      jsonb_build_object('request_number', new.request_number, 'field_work_id', v_id, 'reason', 'request_cancelled'));
  end loop;
  return null;
end;
$$;

create trigger service_requests_close_field_work
  after update of status on public.service_requests
  for each row
  when (new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED')
  execute function app.on_request_cancelled_close_field_work();

-- ============================================================================
-- Admin evidence functions
-- ============================================================================

-- Register an uploaded file as evidence. The browser only names the request,
-- the evidence id it was given for the upload, and the customer-safe title,
-- description and stage. The file's real type and size are read from the
-- Storage record; the uploader is the signed-in admin. New evidence is
-- PENDING_REVIEW and INTERNAL. Registering the same upload twice changes nothing.
create function public.admin_add_evidence(
  p_request_id uuid,
  p_evidence_id uuid,
  p_stage text,
  p_title text,
  p_description text,
  p_captured_at timestamptz,
  p_original_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_prefix text := p_request_id::text || '/' || p_evidence_id::text || '/';
  v_count integer;
  v_object record;
  v_mime text;
  v_size bigint;
  v_kind text;
  v_title text := btrim(coalesce(p_title, ''));
  v_description text;
  v_name text := nullif(left(btrim(coalesce(p_original_name, '')), 255), '');
  v_field_work uuid;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select r.id, r.customer_id, r.status, r.request_number into v_request
  from public.service_requests r where r.id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.request_evidence e where e.id = p_evidence_id) then
    if exists (select 1 from public.request_evidence e where e.id = p_evidence_id and e.request_id = p_request_id) then
      return;
    end if;
    raise exception 'evidence_exists' using errcode = 'P0001';
  end if;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if p_stage is null or p_stage not in ('BEFORE', 'DURING', 'AFTER', 'GENERAL') then
    raise exception 'invalid_stage' using errcode = 'P0001';
  end if;
  if char_length(v_title) not between 3 and 120 then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;
  v_description := app.optional_text(p_description, 1000);
  if p_captured_at is not null and (p_captured_at > now() + interval '1 day' or p_captured_at < timestamptz '2000-01-01 00:00+00') then
    raise exception 'invalid_capture_time' using errcode = 'P0001';
  end if;

  select count(*) into v_count from storage.objects o where o.bucket_id = 'request-evidence' and o.name like v_prefix || '%';
  if v_count = 0 then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  if v_count > 1 then
    raise exception 'file_not_allowed' using errcode = 'P0001';
  end if;
  select o.name, o.metadata into v_object from storage.objects o where o.bucket_id = 'request-evidence' and o.name like v_prefix || '%';
  v_mime := lower(coalesce(v_object.metadata ->> 'mimetype', ''));
  v_kind := app.evidence_kind(v_mime);
  if v_kind is null or v_object.name is distinct from app.evidence_object_path(p_request_id, p_evidence_id, v_mime) then
    raise exception 'file_not_allowed' using errcode = 'P0001';
  end if;
  if coalesce(v_object.metadata ->> 'size', '') !~ '^[0-9]{1,12}$' then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  v_size := (v_object.metadata ->> 'size')::bigint;
  if v_size = 0 or v_size > app.evidence_max_bytes(v_kind) then
    raise exception 'file_too_large' using errcode = 'P0001';
  end if;

  select w.id into v_field_work from public.field_work w where w.request_id = p_request_id and w.status <> 'CANCELLED';
  insert into public.request_evidence (id, request_id, customer_id, field_work_id, kind, stage, title, description, mime_type, size_bytes, captured_at)
  values (p_evidence_id, p_request_id, v_request.customer_id, v_field_work, v_kind, p_stage, v_title, v_description, v_mime, v_size, p_captured_at);
  insert into public.request_evidence_internal (evidence_id, storage_path, file_etag, original_name, uploaded_by)
  values (p_evidence_id, v_object.name, v_object.metadata ->> 'eTag', v_name, app.current_profile_id());
  perform app.log_internal_activity(v_request.customer_id, 'EVIDENCE_UPLOADED', 'SERVICE_REQUEST', p_request_id,
    jsonb_build_object('request_number', v_request.request_number, 'evidence_id', p_evidence_id, 'kind', v_kind, 'stage', p_stage));
end;
$$;

-- Approve evidence that is waiting for review (and whose file is unchanged). It stays INTERNAL.
create function public.admin_approve_evidence(p_evidence_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_evidence record;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select e.request_id into v_request_id from public.request_evidence e where e.id = p_evidence_id;
  if not found then
    raise exception 'evidence_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select e.* into v_evidence from public.request_evidence e where e.id = p_evidence_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if v_evidence.review_status = 'APPROVED' then
    return;
  end if;
  if v_evidence.review_status <> 'PENDING_REVIEW' then
    raise exception 'evidence_changed' using errcode = 'P0001';
  end if;
  -- The file must still be the one that was registered (see app.evidence_file_intact).
  if not exists (
    select 1 from public.request_evidence_internal i
    join storage.objects o on o.bucket_id = 'request-evidence' and o.name = i.storage_path
    where i.evidence_id = p_evidence_id and i.file_etag is not distinct from (o.metadata ->> 'eTag')
  ) then
    raise exception 'evidence_file_changed' using errcode = 'P0001';
  end if;
  update public.request_evidence set review_status = 'APPROVED' where id = p_evidence_id;
  update public.request_evidence_internal set reviewed_by = app.current_profile_id(), reviewed_at = now(), review_note = null
  where evidence_id = p_evidence_id;
  perform app.log_internal_activity(v_request.customer_id, 'EVIDENCE_APPROVED', 'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'evidence_id', p_evidence_id, 'kind', v_evidence.kind));
end;
$$;

-- Reject evidence that is waiting for review, or approved but not yet
-- published. It stays, INTERNAL, with the (internal) reason.
create function public.admin_reject_evidence(p_evidence_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_evidence record;
  v_reason text;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  v_reason := app.optional_text(p_reason, 1000);
  select e.request_id into v_request_id from public.request_evidence e where e.id = p_evidence_id;
  if not found then
    raise exception 'evidence_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select e.* into v_evidence from public.request_evidence e where e.id = p_evidence_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if v_evidence.review_status = 'REJECTED' then
    return;
  end if;
  if v_evidence.visibility = 'CUSTOMER_VISIBLE' then
    raise exception 'evidence_published' using errcode = 'P0001';
  end if;
  update public.request_evidence set review_status = 'REJECTED' where id = p_evidence_id;
  update public.request_evidence_internal set reviewed_by = app.current_profile_id(), reviewed_at = now(), review_note = v_reason
  where evidence_id = p_evidence_id;
  perform app.log_internal_activity(v_request.customer_id, 'EVIDENCE_REJECTED', 'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'evidence_id', p_evidence_id, 'kind', v_evidence.kind));
end;
$$;

-- Publish approved evidence to the customer (INTERNAL -> CUSTOMER_VISIBLE).
-- The customer gets one timeline entry and one notification per batch:
-- nothing new is added while the latest customer entry is already "New
-- evidence shared" and the notification about it is unread.
create function public.admin_publish_evidence(p_evidence_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request record;
  v_evidence record;
  v_last_event text;
begin
  if not app.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select e.request_id into v_request_id from public.request_evidence e where e.id = p_evidence_id;
  if not found then
    raise exception 'evidence_not_found' using errcode = 'P0001';
  end if;
  select r.id, r.customer_id, r.status, r.request_number, r.title into v_request
  from public.service_requests r where r.id = v_request_id for update;
  select e.* into v_evidence from public.request_evidence e where e.id = p_evidence_id for update;
  if v_request.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  if v_evidence.visibility = 'CUSTOMER_VISIBLE' then
    return;
  end if;
  if v_evidence.review_status = 'REJECTED' then
    raise exception 'evidence_changed' using errcode = 'P0001';
  end if;
  if v_evidence.review_status <> 'APPROVED' then
    raise exception 'evidence_not_approved' using errcode = 'P0001';
  end if;

  -- The file must still be the one that was registered (see app.evidence_file_intact).
  if not exists (
    select 1 from public.request_evidence_internal i
    join storage.objects o on o.bucket_id = 'request-evidence' and o.name = i.storage_path
    where i.evidence_id = p_evidence_id and i.file_etag is not distinct from (o.metadata ->> 'eTag')
  ) then
    raise exception 'evidence_file_changed' using errcode = 'P0001';
  end if;
  update public.request_evidence set visibility = 'CUSTOMER_VISIBLE', published_at = now() where id = p_evidence_id;
  update public.request_evidence_internal set published_by = app.current_profile_id() where evidence_id = p_evidence_id;
  perform app.log_internal_activity(v_request.customer_id, 'EVIDENCE_PUBLISHED', 'SERVICE_REQUEST', v_request.id,
    jsonb_build_object('request_number', v_request.request_number, 'evidence_id', p_evidence_id, 'kind', v_evidence.kind));

  select e.event_type into v_last_event from public.service_request_events e
  where e.request_id = v_request.id and e.visibility = 'CUSTOMER'
  order by e.created_at desc, e.id desc limit 1;
  if v_last_event is distinct from 'EVIDENCE_AVAILABLE' then
    perform app.add_customer_event(v_request.id, 'EVIDENCE_AVAILABLE', 'New evidence shared', null, '{}'::jsonb);
  end if;
  if not exists (
    select 1 from public.notifications n
    where n.user_id = v_request.customer_id and n.type = 'EVIDENCE_AVAILABLE' and n.entity_id = v_request.id and n.read_at is null
  ) then
    perform app.notify(v_request.customer_id, 'EVIDENCE_AVAILABLE', format('New evidence on %s', v_request.request_number),
      format('New service evidence is available for %s.', v_request.title), 'SERVICE_REQUEST', v_request.id);
  end if;
end;
$$;

-- ============================================================================
-- Request completion (replaces the Phase 2B version; same signature, so its
-- grants stay). Unchanged: admin check, stale-screen check, the lifecycle
-- and the active-assignee rule. New: a request that has field work can be
-- completed only when the visit is complete, no evidence is waiting for
-- review, and at least one piece of evidence has been published. Requests
-- without field work complete as before.
-- ============================================================================
create or replace function public.admin_change_request_status(p_request_id uuid, p_expected_status text, p_new_status text)
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
     and not exists (
       select 1 from public.request_assignments a
       where a.request_id = p_request_id and app.is_active_team_member(a.assignee_id)
     ) then
    raise exception 'assignment_required' using errcode = 'P0001';
  end if;
  if p_new_status = 'COMPLETED' then
    if exists (select 1 from public.field_work w where w.request_id = p_request_id and w.status in ('SCHEDULED', 'IN_PROGRESS')) then
      raise exception 'field_work_open' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.request_evidence e where e.request_id = p_request_id and e.review_status = 'PENDING_REVIEW') then
      raise exception 'evidence_pending' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.field_work w where w.request_id = p_request_id and w.status = 'COMPLETED')
       and not exists (select 1 from public.request_evidence e where e.request_id = p_request_id and e.visibility = 'CUSTOMER_VISIBLE') then
      raise exception 'evidence_required' using errcode = 'P0001';
    end if;
  end if;
  update public.service_requests set status = p_new_status where id = p_request_id;
end;
$$;

-- ============================================================================
-- Function privileges. Nothing is executable by default. Authenticated users
-- may call the admin functions (which refuse anyone but an admin) and the
-- helpers used in policies and defaults, including the three the Storage API
-- evaluates for evidence files.
-- ============================================================================
revoke execute on function
  public.admin_schedule_field_work(uuid, timestamptz, timestamptz, text),
  public.admin_reschedule_field_work(uuid, timestamptz, timestamptz, text),
  public.admin_start_field_work(uuid),
  public.admin_record_field_work_notes(uuid, text),
  public.admin_complete_field_work(uuid, text, text),
  public.admin_cancel_field_work(uuid, text),
  public.admin_add_evidence(uuid, uuid, text, text, text, timestamptz, text),
  public.admin_approve_evidence(uuid),
  public.admin_reject_evidence(uuid, text),
  public.admin_publish_evidence(uuid),
  public.admin_change_request_status(uuid, text, text)
from public, anon;
grant execute on function
  public.admin_schedule_field_work(uuid, timestamptz, timestamptz, text),
  public.admin_reschedule_field_work(uuid, timestamptz, timestamptz, text),
  public.admin_start_field_work(uuid),
  public.admin_record_field_work_notes(uuid, text),
  public.admin_complete_field_work(uuid, text, text),
  public.admin_cancel_field_work(uuid, text),
  public.admin_add_evidence(uuid, uuid, text, text, text, timestamptz, text),
  public.admin_approve_evidence(uuid),
  public.admin_reject_evidence(uuid, text),
  public.admin_publish_evidence(uuid),
  public.admin_change_request_status(uuid, text, text)
to authenticated, service_role;

revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function app.current_profile_id() to authenticated;
grant execute on function app.next_request_number() to authenticated;
grant execute on function app.is_admin() to authenticated;
grant execute on function
  app.can_upload_evidence_file(text),
  app.can_read_published_evidence_file(text, text),
  app.evidence_file_intact(text, text),
  app.can_remove_evidence_file(text)
to authenticated;
grant all on all functions in schema app to service_role;
