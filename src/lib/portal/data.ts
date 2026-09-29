import "server-only";
import type { ActivityLog, Notification, Property, RequestStatus, ServiceRequest, ServiceRequestEvent } from "./domain";
import { openRequestStatuses } from "./domain";
import { logPortalError, type Viewer } from "./session";
import { isUuid } from "./validation";

/*
 * Read queries for the portal. Row Level Security already limits every query
 * to the signed-in customer's rows; each query also filters by the
 * customer's id explicitly (defence in depth, and it uses the indexes).
 * Failures throw a generic error for the route's error boundary; details are
 * logged server-side without personal data.
 */

export const PAGE_SIZE = 20;

class PortalDataError extends Error {
  constructor(operation: string) {
    super(`Could not load ${operation}.`);
    this.name = "PortalDataError";
  }
}

function must<T>(result: { data: T | null; error: unknown }, operation: string, viewer: Viewer): T {
  if (result.error || result.data === null) {
    logPortalError(operation, result.error, { profileId: viewer.profile.id });
    throw new PortalDataError(operation);
  }
  return result.data;
}

export type RequestSummary = Pick<ServiceRequest, "id" | "request_number" | "title" | "category" | "status" | "priority" | "created_at" | "property_id"> & {
  property: { id: string; name: string } | null;
};

const REQUEST_SUMMARY = "id, request_number, title, category, status, priority, created_at, property_id, property:properties(id, name)";

export type PropertySummary = Pick<Property, "id" | "name" | "property_type" | "city" | "district" | "status" | "updated_at"> & { openRequests: number };

async function openRequestCounts(viewer: Viewer): Promise<Map<string, number>> {
  const rows = must(
    await viewer.supabase.from("service_requests").select("property_id").eq("customer_id", viewer.profile.id).in("status", openRequestStatuses),
    "open requests",
    viewer,
  );
  const counts = new Map<string, number>();
  for (const { property_id } of rows) if (property_id) counts.set(property_id, (counts.get(property_id) ?? 0) + 1);
  return counts;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(viewer: Viewer) {
  const { supabase, profile } = viewer;
  const [properties, propertyCount, open, activity, counts] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, property_type, city, district, status, updated_at")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("owner_id", profile.id),
    supabase
      .from("service_requests")
      .select(REQUEST_SUMMARY)
      .eq("customer_id", profile.id)
      .in("status", openRequestStatuses)
      .order("created_at", { ascending: false })
      .returns<RequestSummary[]>(),
    supabase.from("activity_logs").select("*").eq("customer_id", profile.id).eq("visibility", "CUSTOMER").order("created_at", { ascending: false }).limit(5),
    openRequestCounts(viewer),
  ]);
  if (propertyCount.error) must({ data: null, error: propertyCount.error }, "property count", viewer);
  const openRequests = must(open, "open requests", viewer);
  return {
    properties: must(properties, "properties", viewer).map((p) => ({ ...p, openRequests: counts.get(p.id) ?? 0 })) as PropertySummary[],
    propertyCount: propertyCount.count ?? 0,
    openRequests,
    waitingForYou: openRequests.filter((r) => r.status === "WAITING_FOR_CUSTOMER").length,
    activity: must(activity, "activity", viewer) as ActivityLog[],
  };
}

// ── Properties ───────────────────────────────────────────────────────────────

export async function listProperties(viewer: Viewer): Promise<PropertySummary[]> {
  const [properties, counts] = await Promise.all([
    viewer.supabase
      .from("properties")
      .select("id, name, property_type, city, district, status, updated_at")
      .eq("owner_id", viewer.profile.id)
      .order("created_at", { ascending: false }),
    openRequestCounts(viewer),
  ]);
  return must(properties, "properties", viewer).map((p) => ({ ...p, openRequests: counts.get(p.id) ?? 0 }));
}

/** Options for the "which property?" select. */
export async function listPropertyChoices(viewer: Viewer): Promise<{ id: string; name: string; city: string }[]> {
  return must(
    await viewer.supabase.from("properties").select("id, name, city").eq("owner_id", viewer.profile.id).order("name"),
    "property choices",
    viewer,
  );
}

/** A property the customer owns, or null (missing, malformed id, or someone else's — indistinguishable on purpose). */
export async function getProperty(viewer: Viewer, id: string): Promise<Property | null> {
  if (!isUuid(id)) return null;
  const result = await viewer.supabase.from("properties").select("*").eq("id", id).eq("owner_id", viewer.profile.id).maybeSingle();
  if (result.error) must({ data: null, error: result.error }, "property", viewer);
  return result.data;
}

export async function getPropertyDetail(viewer: Viewer, id: string) {
  const property = await getProperty(viewer, id);
  if (!property) return null;
  const [requests, activity] = await Promise.all([
    viewer.supabase
      .from("service_requests")
      .select(REQUEST_SUMMARY)
      .eq("customer_id", viewer.profile.id)
      .eq("property_id", property.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<RequestSummary[]>(),
    viewer.supabase
      .from("activity_logs")
      .select("*")
      .eq("customer_id", viewer.profile.id)
      .eq("visibility", "CUSTOMER")
      .or(`and(entity_type.eq.PROPERTY,entity_id.eq.${property.id}),metadata->>property_id.eq.${property.id}`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return { property, requests: must(requests, "property requests", viewer), activity: must(activity, "property activity", viewer) as ActivityLog[] };
}

// ── Service requests ─────────────────────────────────────────────────────────

export type RequestFilter = "all" | "open" | "completed";

export async function listRequests(viewer: Viewer, filter: RequestFilter, page: number) {
  const from = (page - 1) * PAGE_SIZE;
  let query = viewer.supabase
    .from("service_requests")
    .select(REQUEST_SUMMARY, { count: "exact" })
    .eq("customer_id", viewer.profile.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filter === "open") query = query.in("status", openRequestStatuses);
  if (filter === "completed") query = query.eq("status", "COMPLETED" satisfies RequestStatus);
  const result = await query.returns<RequestSummary[]>();
  return { requests: must(result, "requests", viewer), total: result.count ?? 0 };
}

export type RequestDetail = ServiceRequest & { property: { id: string; name: string; city: string } | null; events: ServiceRequestEvent[] };

export async function getRequest(viewer: Viewer, id: string): Promise<RequestDetail | null> {
  if (!isUuid(id)) return null;
  const result = await viewer.supabase
    .from("service_requests")
    .select("*, property:properties(id, name, city)")
    .eq("id", id)
    .eq("customer_id", viewer.profile.id)
    .maybeSingle();
  if (result.error) must({ data: null, error: result.error }, "request", viewer);
  if (!result.data) return null;
  const events = must(
    await viewer.supabase.from("service_request_events").select("*").eq("request_id", id).eq("visibility", "CUSTOMER").order("created_at", { ascending: true }),
    "request timeline",
    viewer,
  );
  return { ...(result.data as unknown as Omit<RequestDetail, "events">), events };
}

// ── Activity and notifications ───────────────────────────────────────────────

export async function listActivity(viewer: Viewer, page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const result = await viewer.supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .eq("customer_id", viewer.profile.id)
    .eq("visibility", "CUSTOMER")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  return { entries: must(result, "activity", viewer) as ActivityLog[], total: result.count ?? 0 };
}

export async function listNotifications(viewer: Viewer): Promise<Notification[]> {
  return must(
    await viewer.supabase.from("notifications").select("*").eq("user_id", viewer.profile.id).order("created_at", { ascending: false }).limit(100),
    "notifications",
    viewer,
  );
}

export async function countUnreadNotifications(viewer: Viewer): Promise<number> {
  const result = await viewer.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.profile.id)
    .is("read_at", null);
  if (result.error) {
    logPortalError("unread count", result.error, { profileId: viewer.profile.id });
    return 0;
  }
  return result.count ?? 0;
}

/** Parse ?page= safely. */
export function pageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}
