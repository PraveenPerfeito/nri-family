import { portalRoutes } from "@/config/routes";
import type { ActivityLog, RequestStatus } from "./domain";
import { activityLabels, requestStatusLabels } from "./domain";

/*
 * Turns activity log rows into readable lines. Metadata only ever holds names
 * of changed fields and a few safe identifiers (property name, request
 * number), never addresses or contact details.
 */

const fieldLabels: Record<string, string> = {
  full_name: "name",
  phone: "phone",
  country: "country",
  timezone: "time zone",
  name: "name",
  property_type: "type",
  address_line_1: "address",
  address_line_2: "address",
  city: "city",
  district: "district",
  postal_code: "PIN code",
  ownership_type: "ownership",
  notes: "notes",
  status: "status",
};

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

function changedFields(metadata: Record<string, unknown>): string | undefined {
  const fields = Array.isArray(metadata.fields) ? metadata.fields.filter((f): f is string => typeof f === "string") : [];
  const labels = [...new Set(fields.map((f) => fieldLabels[f] ?? f))];
  if (labels.length === 0) return undefined;
  const joined = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Changed ${joined}`;
}

export type ActivityLine = { title: string; detail?: string; href?: string; kind: ActivityLog["entity_type"] };

export function describeActivity(entry: ActivityLog): ActivityLine {
  const m = entry.metadata ?? {};
  const title = activityLabels[entry.action] ?? entry.action.toLowerCase().replace(/_/g, " ");
  const requestRef = [text(m.request_number), text(m.title)].filter(Boolean).join(" · ");
  switch (entry.action) {
    case "PROFILE_UPDATED":
      return { title, detail: changedFields(m), href: portalRoutes.profile, kind: entry.entity_type };
    case "PROPERTY_CREATED":
      return { title, detail: text(m.name), href: entry.entity_id ? portalRoutes.property(entry.entity_id) : undefined, kind: entry.entity_type };
    case "PROPERTY_UPDATED":
      return {
        title,
        detail: [text(m.name), changedFields(m)?.toLowerCase()].filter(Boolean).join(" · "),
        href: entry.entity_id ? portalRoutes.property(entry.entity_id) : undefined,
        kind: entry.entity_type,
      };
    case "PROPERTY_DELETED":
      return { title, detail: text(m.name), kind: entry.entity_type };
    case "REQUEST_CREATED":
    case "REQUEST_CANCELLED":
      return { title, detail: requestRef || undefined, href: entry.entity_id ? portalRoutes.request(entry.entity_id) : undefined, kind: entry.entity_type };
    case "REQUEST_STATUS_CHANGED": {
      const to = text(m.to) as RequestStatus | undefined;
      return {
        title,
        detail: [text(m.request_number), to ? `Now ${requestStatusLabels[to]?.toLowerCase() ?? to}` : undefined].filter(Boolean).join(" · "),
        href: entry.entity_id ? portalRoutes.request(entry.entity_id) : undefined,
        kind: entry.entity_type,
      };
    }
    default:
      return { title, kind: entry.entity_type };
  }
}
