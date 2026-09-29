-- ============================================================================
-- Phase 2B — Admin list views
-- Additive on top of 20260929090000_phase_2b_admin_operations.sql (unchanged;
-- applied in production on 29 Sept 2026).
--
-- Two read-only views for the admin console's request inbox and audit trail,
-- so each list can search, filter, sort and paginate in one query instead of
-- one lookup per row. Same model as the other admin views: security_invoker
-- (the reader's own RLS applies) and empty unless app.is_admin().
-- ============================================================================

-- The request inbox: one row per request with its customer, property and
-- assignee, so the list can search, filter, sort and paginate in one query.
create view public.admin_request_inbox with (security_invoker = true) as
  select
    r.id, r.request_number, r.title, r.category, r.priority, r.status, r.created_at, r.updated_at,
    r.customer_id, c.full_name as customer_name, c.email as customer_email,
    r.property_id, pr.name as property_name, pr.city as property_city,
    a.assignee_id, s.full_name as assignee_name, a.assigned_at
  from public.service_requests r
  join public.profiles c on c.id = r.customer_id
  left join public.properties pr on pr.id = r.property_id
  left join public.request_assignments a on a.request_id = r.id
  left join public.profiles s on s.id = a.assignee_id
  where (select app.is_admin());

-- The audit trail with the names of who acted and whose account it concerns.
create view public.admin_activity_feed with (security_invoker = true) as
  select
    l.id, l.created_at, l.action, l.entity_type, l.entity_id, l.metadata, l.visibility,
    l.actor_id, actor.full_name as actor_name, actor.role as actor_role,
    l.customer_id, customer.full_name as customer_name
  from public.activity_logs l
  left join public.profiles actor on actor.id = l.actor_id
  left join public.profiles customer on customer.id = l.customer_id
  where (select app.is_admin());

revoke all on table public.admin_request_inbox, public.admin_activity_feed from anon, authenticated;
grant select on table public.admin_request_inbox, public.admin_activity_feed to authenticated;
grant select on table public.admin_request_inbox, public.admin_activity_feed to service_role;
