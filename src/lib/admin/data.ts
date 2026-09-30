import "server-only";
import type { Evidence, EvidenceInternal, FieldWork, FieldWorkInternal } from "@/lib/field-ops/domain";
import type { Profile, Property, RequestStatus, ServiceRequest, ServiceRequestEvent } from "@/lib/portal/domain";
import { openRequestStatuses } from "@/lib/portal/domain";
import { isUuid } from "@/lib/portal/validation";
import type { ViewRow } from "@/types/database";
import { requestStatuses } from "./domain";
import {
  ADMIN_PAGE_SIZE,
  searchFilter,
  type ActivityListParams,
  type CustomerListParams,
  type PropertyListParams,
  type RequestListParams,
} from "./search";
import { logAdminError, type AdminViewer } from "./session";

/*
 * Read queries for the admin console. Row Level Security lets only active
 * admins read other people's rows (app.is_admin()), and the admin views
 * return nothing to anyone else. Lists are paginated on the server with
 * exact counts and read from one view each, so there are no per-row queries.
 * Failures throw a generic error for the route's error boundary; details are
 * logged server-side without personal data.
 */

export type InboxRow = ViewRow<"admin_request_inbox">;
export type CustomerRow = ViewRow<"admin_customer_overview">;
export type PropertyRow = ViewRow<"admin_property_overview">;
export type TeamRow = ViewRow<"admin_team_overview">;
export type FeedRow = ViewRow<"admin_activity_feed">;

class AdminDataError extends Error {
  constructor(operation: string) {
    super(`Could not load ${operation}.`);
    this.name = "AdminDataError";
  }
}

function must<T>(result: { data: T | null; error: unknown }, operation: string, admin: AdminViewer): T {
  if (result.error || result.data === null) {
    logAdminError(operation, result.error, { profileId: admin.profile.id });
    throw new AdminDataError(operation);
  }
  return result.data;
}

/** Like `must`, for lookups where "no row" is a normal answer (the page shows "not found"). */
function maybe<T>(result: { data: T | null; error: unknown }, operation: string, admin: AdminViewer): T | null {
  if (result.error) {
    logAdminError(operation, result.error, { profileId: admin.profile.id });
    throw new AdminDataError(operation);
  }
  return result.data;
}

const rangeOf = (page: number) => [(page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1] as const;

const INBOX =
  "id, request_number, title, category, priority, status, created_at, updated_at, customer_id, customer_name, customer_email, property_id, property_name, property_city, assignee_id, assignee_name, assigned_at";
const FEED = "id, created_at, action, entity_type, entity_id, metadata, visibility, actor_id, actor_name, actor_role, customer_id, customer_name";
const CONTACT = "id, full_name, email, phone, country, timezone, created_at";

export type CustomerContact = Pick<Profile, "id" | "full_name" | "email" | "phone" | "country" | "timezone" | "created_at">;

// ── Dashboard ────────────────────────────────────────────────────────────────

/** New requests and urgent open work, oldest first: what the team should look at next. */
export const ATTENTION_LIMIT = 8;
const ATTENTION_FILTER = `status.eq.SUBMITTED,and(priority.eq.URGENT,status.in.(${openRequestStatuses.join(",")}))`;

export async function getAdminDashboard(admin: AdminViewer) {
  const s = admin.supabase;
  const [counts, recent, attention, activity, customers, properties, unassigned] = await Promise.all([
    s.from("admin_request_status_counts").select("status, total"),
    s.from("admin_request_inbox").select(INBOX).order("created_at", { ascending: false }).limit(6),
    s.from("admin_request_inbox").select(INBOX, { count: "exact" }).or(ATTENTION_FILTER).order("created_at", { ascending: true }).limit(ATTENTION_LIMIT),
    s.from("admin_activity_feed").select(FEED).order("created_at", { ascending: false }).limit(8),
    s.from("admin_customer_overview").select("id", { count: "exact", head: true }),
    s.from("admin_property_overview").select("id", { count: "exact", head: true }),
    s.from("admin_request_inbox").select("id", { count: "exact", head: true }).is("assignee_id", null).in("status", openRequestStatuses),
  ]);
  for (const [result, operation] of [
    [customers, "customer count"],
    [properties, "property count"],
    [unassigned, "unassigned count"],
  ] as const) {
    if (result.error) must({ data: null, error: result.error }, operation, admin);
  }
  const byStatus = Object.fromEntries(requestStatuses.map((status) => [status, 0])) as Record<RequestStatus, number>;
  for (const row of must(counts, "status counts", admin)) byStatus[row.status] = row.total;
  return {
    byStatus,
    openTotal: openRequestStatuses.reduce((sum, status) => sum + byStatus[status], 0),
    recent: must(recent, "recent requests", admin),
    attention: must(attention, "requests needing attention", admin),
    attentionTotal: attention.count ?? 0,
    activity: must(activity, "recent activity", admin),
    customerCount: customers.count ?? 0,
    propertyCount: properties.count ?? 0,
    unassignedCount: unassigned.count ?? 0,
  };
}

// ── Requests ─────────────────────────────────────────────────────────────────

export async function listAdminRequests(admin: AdminViewer, p: RequestListParams) {
  let query = admin.supabase.from("admin_request_inbox").select(INBOX, { count: "exact" });
  if (p.status === "open") query = query.in("status", openRequestStatuses);
  else if (p.status) query = query.eq("status", p.status);
  if (p.priority) query = query.eq("priority", p.priority);
  if (p.category) query = query.eq("category", p.category);
  if (p.assignee === "unassigned") query = query.is("assignee_id", null);
  else if (p.assignee) query = query.eq("assignee_id", p.assignee);
  if (p.customer) query = query.eq("customer_id", p.customer);
  if (p.property) query = query.eq("property_id", p.property);
  if (p.q) query = query.or(searchFilter(["request_number", "title", "customer_name", "customer_email", "property_name"], p.q));
  if (p.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (p.sort === "updated") query = query.order("updated_at", { ascending: false });
  else if (p.sort === "urgent") query = query.order("priority", { ascending: false }).order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const [from, to] = rangeOf(p.page);
  const result = await query.order("request_number", { ascending: false }).range(from, to);
  return { rows: must(result, "request inbox", admin), total: result.count ?? 0 };
}

export type TimelineEvent = ServiceRequestEvent & { author: { name: string; role: Profile["role"] } | null };

export type AdminRequestDetail = {
  request: ServiceRequest;
  inbox: InboxRow;
  customer: CustomerContact | null;
  property: Property | null;
  otherProperties: Pick<Property, "id" | "name" | "city" | "property_type" | "status">[];
  events: TimelineEvent[];
  activity: FeedRow[];
  team: TeamRow[];
};

/** Everything the team needs on one request, in two rounds of parallel queries. */
export async function getAdminRequest(admin: AdminViewer, id: string): Promise<AdminRequestDetail | null> {
  if (!isUuid(id)) return null;
  const s = admin.supabase;
  const [request, inbox, events, activity, team] = await Promise.all([
    s.from("service_requests").select("*").eq("id", id).maybeSingle(),
    s.from("admin_request_inbox").select(INBOX).eq("id", id).maybeSingle(),
    s.from("service_request_events").select("*").eq("request_id", id).order("created_at", { ascending: true }).limit(200),
    s.from("admin_activity_feed").select(FEED).eq("entity_type", "SERVICE_REQUEST").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
    s.from("admin_team_overview").select("*").eq("is_active", true).order("full_name", { ascending: true }).limit(200),
  ]);
  const r = maybe(request, "request", admin);
  const row = maybe(inbox, "request summary", admin);
  if (!r || !row) return null;
  const timeline = must(events, "request timeline", admin);
  const authorIds = [...new Set(timeline.map((e) => e.created_by).filter((v): v is string => Boolean(v)))];

  const [customer, property, otherProperties, authors] = await Promise.all([
    s.from("profiles").select(CONTACT).eq("id", r.customer_id).maybeSingle(),
    r.property_id ? s.from("properties").select("*").eq("id", r.property_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    s.from("properties").select("id, name, city, property_type, status").eq("owner_id", r.customer_id).order("created_at", { ascending: false }).limit(10),
    authorIds.length > 0 ? s.from("profiles").select("id, full_name, role").in("id", authorIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const names = new Map((must(authors, "timeline authors", admin) as Pick<Profile, "id" | "full_name" | "role">[]).map((p) => [p.id, { name: p.full_name, role: p.role }]));
  return {
    request: r,
    inbox: row,
    customer: maybe<CustomerContact>(customer, "request customer", admin),
    property: maybe(property, "request property", admin) as Property | null,
    otherProperties: must(otherProperties, "customer properties", admin),
    events: timeline.map((e) => ({ ...e, author: e.created_by ? (names.get(e.created_by) ?? null) : null })),
    activity: must(activity, "request activity", admin),
    team: must(team, "team", admin),
  };
}

// ── Field work and evidence (Phase 2C) ───────────────────────────────────────

export type AdminVisit = FieldWork & { internal: FieldWorkInternal | null };
export type AdminEvidence = Evidence & { internal: EvidenceInternal | null };

/** A request's visits (newest first) and evidence (oldest first), each with the team's internal record. */
export async function getAdminFieldOps(admin: AdminViewer, requestId: string): Promise<{ visits: AdminVisit[]; evidence: AdminEvidence[] }> {
  if (!isUuid(requestId)) return { visits: [], evidence: [] };
  const s = admin.supabase;
  const [visitResult, evidenceResult] = await Promise.all([
    s.from("field_work").select("*").eq("request_id", requestId).order("created_at", { ascending: false }).limit(20),
    s.from("request_evidence").select("*").eq("request_id", requestId).order("created_at", { ascending: true }).limit(200),
  ]);
  const visits = must(visitResult, "visits", admin);
  const evidence = must(evidenceResult, "evidence", admin);
  const [notesResult, recordsResult] = await Promise.all([
    visits.length > 0
      ? s.from("field_work_internal").select("*").in("field_work_id", visits.map((v) => v.id))
      : Promise.resolve({ data: [] as FieldWorkInternal[], error: null }),
    evidence.length > 0
      ? s.from("request_evidence_internal").select("*").in("evidence_id", evidence.map((e) => e.id))
      : Promise.resolve({ data: [] as EvidenceInternal[], error: null }),
  ]);
  const notes = new Map(must(notesResult, "visit notes", admin).map((n) => [n.field_work_id, n]));
  const records = new Map(must(recordsResult, "evidence records", admin).map((r) => [r.evidence_id, r]));
  return {
    visits: visits.map((v) => ({ ...v, internal: notes.get(v.id) ?? null })),
    evidence: evidence.map((e) => ({ ...e, internal: records.get(e.id) ?? null })),
  };
}

/** Where one piece of a request's evidence is stored, for the console's file link (null when it isn't there). */
export async function getAdminEvidenceFile(admin: AdminViewer, requestId: string, evidenceId: string): Promise<{ path: string; kind: Evidence["kind"] } | null> {
  if (!isUuid(requestId) || !isUuid(evidenceId)) return null;
  const s = admin.supabase;
  const [evidence, record] = await Promise.all([
    s.from("request_evidence").select("id, kind").eq("id", evidenceId).eq("request_id", requestId).maybeSingle(),
    s.from("request_evidence_internal").select("storage_path").eq("evidence_id", evidenceId).maybeSingle(),
  ]);
  const row = maybe(evidence, "evidence file", admin);
  const file = maybe(record, "evidence file record", admin);
  return row && file ? { path: file.storage_path, kind: row.kind } : null;
}

/** How many items the dashboard's field work panel lists of each kind. */
export const FIELD_OPS_LIMIT = 6;

type QueueRequest = Pick<InboxRow, "id" | "request_number" | "title" | "customer_name">;

/**
 * For the dashboard: requests with evidence waiting for review (oldest
 * first; a request can't be completed until its evidence is reviewed), and
 * the visits that are scheduled or in progress (soonest first).
 */
export async function getFieldOpsQueue(admin: AdminViewer) {
  const s = admin.supabase;
  const [pending, visits] = await Promise.all([
    s.from("request_evidence").select("request_id", { count: "exact" }).eq("review_status", "PENDING_REVIEW").order("created_at", { ascending: true }).limit(500),
    s.from("field_work").select("id, request_id, status, scheduled_start, scheduled_end", { count: "exact" }).in("status", ["SCHEDULED", "IN_PROGRESS"]).order("scheduled_start", { ascending: true }).limit(FIELD_OPS_LIMIT),
  ]);
  const waiting = new Map<string, number>();
  for (const { request_id } of must(pending, "evidence waiting for review", admin)) waiting.set(request_id, (waiting.get(request_id) ?? 0) + 1);
  const upcoming = must(visits, "open visits", admin);
  const ids = [...new Set([...[...waiting.keys()].slice(0, FIELD_OPS_LIMIT), ...upcoming.map((v) => v.request_id)])];
  const requests = ids.length > 0 ? must(await s.from("admin_request_inbox").select("id, request_number, title, customer_name").in("id", ids), "field work requests", admin) : [];
  const byId = new Map<string, QueueRequest>(requests.map((r) => [r.id, r]));
  return {
    evidence: [...waiting]
      .slice(0, FIELD_OPS_LIMIT)
      .flatMap(([id, count]) => (byId.get(id) ? [{ request: byId.get(id)!, count }] : [])),
    evidenceTotal: pending.count ?? 0,
    visits: upcoming.flatMap((v) => (byId.get(v.request_id) ? [{ ...v, request: byId.get(v.request_id)! }] : [])),
    visitTotal: visits.count ?? 0,
  };
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function listAdminCustomers(admin: AdminViewer, p: CustomerListParams) {
  let query = admin.supabase.from("admin_customer_overview").select("*", { count: "exact" });
  if (p.q) query = query.or(searchFilter(["full_name", "email", "phone"], p.q));
  if (p.country) query = query.eq("country", p.country);
  if (p.show === "open") query = query.gt("open_request_count", 0);
  if (p.show === "no-properties") query = query.eq("property_count", 0);
  const [from, to] = rangeOf(p.page);
  const result = await query.order("created_at", { ascending: false }).order("id", { ascending: true }).range(from, to);
  return { rows: must(result, "customers", admin), total: result.count ?? 0 };
}

export async function getAdminCustomer(admin: AdminViewer, id: string) {
  if (!isUuid(id)) return null;
  const s = admin.supabase;
  const [customer, properties, requests, activity] = await Promise.all([
    s.from("admin_customer_overview").select("*").eq("id", id).maybeSingle(),
    s.from("admin_property_overview").select("*").eq("owner_id", id).order("created_at", { ascending: false }).limit(50),
    s.from("admin_request_inbox").select(INBOX, { count: "exact" }).eq("customer_id", id).order("created_at", { ascending: false }).limit(10),
    s.from("admin_activity_feed").select(FEED).eq("customer_id", id).order("created_at", { ascending: false }).limit(12),
  ]);
  const row = maybe(customer, "customer", admin);
  if (!row) return null;
  return {
    customer: row,
    properties: must(properties, "customer properties", admin),
    requests: must(requests, "customer requests", admin),
    requestTotal: requests.count ?? 0,
    activity: must(activity, "customer activity", admin),
  };
}

// ── Properties ───────────────────────────────────────────────────────────────

export async function listAdminProperties(admin: AdminViewer, p: PropertyListParams) {
  let query = admin.supabase.from("admin_property_overview").select("*", { count: "exact" });
  if (p.q) query = query.or(searchFilter(["name", "city", "district", "owner_name"], p.q));
  if (p.type) query = query.eq("property_type", p.type);
  if (p.status) query = query.eq("status", p.status);
  const [from, to] = rangeOf(p.page);
  const result = await query.order("created_at", { ascending: false }).order("id", { ascending: true }).range(from, to);
  return { rows: must(result, "properties", admin), total: result.count ?? 0 };
}

export async function getAdminProperty(admin: AdminViewer, id: string) {
  if (!isUuid(id)) return null;
  const s = admin.supabase;
  const [property, overview, requests, activity] = await Promise.all([
    s.from("properties").select("*").eq("id", id).maybeSingle(),
    s.from("admin_property_overview").select("*").eq("id", id).maybeSingle(),
    s.from("admin_request_inbox").select(INBOX, { count: "exact" }).eq("property_id", id).order("created_at", { ascending: false }).limit(20),
    s.from("admin_activity_feed").select(FEED).eq("entity_type", "PROPERTY").eq("entity_id", id).order("created_at", { ascending: false }).limit(12),
  ]);
  const p = maybe(property, "property", admin) as Property | null;
  const row = maybe(overview, "property summary", admin);
  if (!p || !row) return null;
  const owner = maybe<CustomerContact>(await s.from("profiles").select(CONTACT).eq("id", p.owner_id).maybeSingle(), "property owner", admin);
  return {
    property: p,
    overview: row,
    owner,
    requests: must(requests, "property requests", admin),
    requestTotal: requests.count ?? 0,
    activity: must(activity, "property activity", admin),
  };
}

// ── Team and activity ────────────────────────────────────────────────────────

export async function listTeam(admin: AdminViewer): Promise<TeamRow[]> {
  return must(
    await admin.supabase.from("admin_team_overview").select("*").order("is_active", { ascending: false }).order("full_name", { ascending: true }).limit(200),
    "team",
    admin,
  );
}

export async function listAdminActivity(admin: AdminViewer, p: ActivityListParams) {
  let query = admin.supabase.from("admin_activity_feed").select(FEED, { count: "exact" });
  if (p.visibility) query = query.eq("visibility", p.visibility);
  if (p.entity) query = query.eq("entity_type", p.entity);
  if (p.customer) query = query.eq("customer_id", p.customer);
  const [from, to] = rangeOf(p.page);
  const result = await query.order("created_at", { ascending: false }).order("id", { ascending: true }).range(from, to);
  return { rows: must(result, "activity", admin), total: result.count ?? 0 };
}

/** Names of everyone on the team (for "assigned to …" lines in the audit trail). */
export async function teamNames(admin: AdminViewer): Promise<Map<string, string>> {
  const rows = must(await admin.supabase.from("admin_team_overview").select("profile_id, full_name").limit(200), "team names", admin);
  return new Map(rows.map((r) => [r.profile_id, r.full_name]));
}

/** The label for a "customer" or "property" filter on the request inbox (null when the id matches nothing). */
export async function filterLabels(admin: AdminViewer, ids: { customer?: string; property?: string }) {
  const s = admin.supabase;
  const [customer, property] = await Promise.all([
    ids.customer ? s.from("admin_customer_overview").select("id, full_name").eq("id", ids.customer).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ids.property ? s.from("admin_property_overview").select("id, name").eq("id", ids.property).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  return {
    customer: (maybe(customer, "customer filter", admin) as { full_name: string } | null)?.full_name ?? null,
    property: (maybe(property, "property filter", admin) as { name: string } | null)?.name ?? null,
  };
}
