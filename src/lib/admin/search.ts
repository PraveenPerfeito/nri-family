import { adminRoutes } from "@/config/routes";
import type { PropertyStatus, PropertyType, RequestCategory, RequestPriority, RequestStatus } from "@/lib/portal/domain";
import { propertyTypes, requestCategories } from "@/lib/portal/domain";
import { isCountryCode } from "@/lib/portal/places";
import { isUuid } from "@/lib/portal/validation";
import { requestStatuses } from "./domain";

/*
 * Search, filter, sort and page parameters for the admin lists. Everything
 * comes from the URL, so it is treated as untrusted: unknown values fall back
 * to the defaults, IDs must be UUIDs, and search text is stripped of the
 * characters that have meaning in a PostgREST filter before it is used.
 */

export const ADMIN_PAGE_SIZE = 25;
const MAX_PAGE = 1000;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

/** Free text for a search box: no filter syntax, wildcards or control characters, at most 80 characters. */
export function cleanSearch(value: unknown): string {
  const text = first(value);
  if (typeof text !== "string") return "";
  return text
    .replace(/[\u0000-\u001F\u007F,()*"\\%:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** A PostgREST `or` filter matching `text` anywhere in any of `columns` (case-insensitive). */
export function searchFilter(columns: string[], text: string): string {
  return columns.map((column) => `${column}.ilike."*${text}*"`).join(",");
}

export function pageOf(value: unknown): number {
  const n = Number(first(value));
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGE ? n : 1;
}

function oneOf<T extends string>(options: readonly T[], value: unknown): T | undefined {
  const v = first(value);
  return typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : undefined;
}

const uuidOrUndefined = (value: unknown) => {
  const v = first(value);
  return isUuid(v) ? v : undefined;
};

/** A list URL with only the parameters that differ from the defaults. */
export function listHref(base: string, params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || (key === "page" && Number(value) === 1)) continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}

// ── Requests ─────────────────────────────────────────────────────────────────

export type RequestStatusFilter = RequestStatus | "open";
export type RequestSort = "newest" | "oldest" | "updated" | "urgent";

export const requestSorts: { value: RequestSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "urgent", label: "Urgent first" },
];

export type RequestListParams = {
  q: string;
  status?: RequestStatusFilter;
  priority?: RequestPriority;
  category?: RequestCategory;
  /** A team member's profile id, or "unassigned". */
  assignee?: string;
  customer?: string;
  property?: string;
  sort: RequestSort;
  page: number;
};

export function parseRequestParams(params: SearchParams): RequestListParams {
  const assignee = first(params.assignee);
  return {
    q: cleanSearch(params.q),
    status: oneOf<RequestStatusFilter>([...requestStatuses, "open"], params.status),
    priority: oneOf<RequestPriority>(["NORMAL", "URGENT"], params.priority),
    category: oneOf<RequestCategory>(
      requestCategories.map((c) => c.value),
      params.category,
    ),
    assignee: assignee === "unassigned" ? "unassigned" : uuidOrUndefined(assignee),
    customer: uuidOrUndefined(params.customer),
    property: uuidOrUndefined(params.property),
    sort: oneOf(
      requestSorts.map((s) => s.value),
      params.sort,
    ) ?? "newest",
    page: pageOf(params.page),
  };
}

export const hasRequestFilters = (p: RequestListParams) => Boolean(p.q || p.status || p.priority || p.category || p.assignee || p.customer || p.property);

export const requestListHref = (p: Partial<RequestListParams>) =>
  listHref(adminRoutes.requests, {
    q: p.q,
    status: p.status,
    priority: p.priority,
    category: p.category,
    assignee: p.assignee,
    customer: p.customer,
    property: p.property,
    sort: p.sort === "newest" ? undefined : p.sort,
    page: p.page,
  });

// ── Customers ────────────────────────────────────────────────────────────────

export type CustomerShow = "open" | "no-properties";
export const customerShowOptions: { value: CustomerShow; label: string }[] = [
  { value: "open", label: "With open requests" },
  { value: "no-properties", label: "No properties yet" },
];

export type CustomerListParams = { q: string; country?: string; show?: CustomerShow; page: number };

export function parseCustomerParams(params: SearchParams): CustomerListParams {
  const country = first(params.country);
  return {
    q: cleanSearch(params.q),
    country: typeof country === "string" && isCountryCode(country) ? country : undefined,
    show: oneOf<CustomerShow>(["open", "no-properties"], params.show),
    page: pageOf(params.page),
  };
}

export const customerListHref = (p: Partial<CustomerListParams>) =>
  listHref(adminRoutes.customers, { q: p.q, country: p.country, show: p.show, page: p.page });

// ── Properties ───────────────────────────────────────────────────────────────

export type PropertyListParams = { q: string; type?: PropertyType; status?: PropertyStatus; page: number };

export function parsePropertyParams(params: SearchParams): PropertyListParams {
  return {
    q: cleanSearch(params.q),
    type: oneOf<PropertyType>(
      propertyTypes.map((t) => t.value),
      params.type,
    ),
    status: oneOf<PropertyStatus>(["ACTIVE", "UNDER_REVIEW", "INACTIVE"], params.status),
    page: pageOf(params.page),
  };
}

export const propertyListHref = (p: Partial<PropertyListParams>) => listHref(adminRoutes.properties, { q: p.q, type: p.type, status: p.status, page: p.page });

// ── Activity ─────────────────────────────────────────────────────────────────

export type ActivityVisibilityFilter = "CUSTOMER" | "INTERNAL";
export type ActivityEntityFilter = "PROFILE" | "PROPERTY" | "SERVICE_REQUEST";

export type ActivityListParams = { visibility?: ActivityVisibilityFilter; entity?: ActivityEntityFilter; customer?: string; page: number };

export function parseActivityParams(params: SearchParams): ActivityListParams {
  return {
    visibility: oneOf<ActivityVisibilityFilter>(["CUSTOMER", "INTERNAL"], params.visibility),
    entity: oneOf<ActivityEntityFilter>(["PROFILE", "PROPERTY", "SERVICE_REQUEST"], params.entity),
    customer: uuidOrUndefined(params.customer),
    page: pageOf(params.page),
  };
}

export const activityListHref = (p: Partial<ActivityListParams>) =>
  listHref(adminRoutes.activity, { visibility: p.visibility, entity: p.entity, customer: p.customer, page: p.page });
