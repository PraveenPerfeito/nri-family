-- ============================================================================
-- Phase 2B — Assignment rules (hardening)
-- Additive on top of 20260929090000 and 20260929100000 (both unchanged, both
-- applied in production).
--
-- Two rules from docs/PHASE_2B.md that the admin functions did not enforce:
--   1. A closed (completed or cancelled) request keeps its last assignment.
--      admin_assign_request already refused closed requests; now
--      admin_unassign_request does too.
--   2. Assigned and In progress need someone responsible: an ACTIVE team
--      member. A member who has been deactivated no longer counts.
-- Same signatures, so the existing grants stay as they are.
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
  update public.service_requests set status = p_new_status where id = p_request_id;
end;
$$;

create or replace function public.admin_unassign_request(p_request_id uuid)
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

-- Unchanged privileges, restated so this file is correct on its own.
revoke execute on function
  public.admin_change_request_status(uuid, text, text),
  public.admin_unassign_request(uuid)
from public, anon;
grant execute on function
  public.admin_change_request_status(uuid, text, text),
  public.admin_unassign_request(uuid)
to authenticated, service_role;
