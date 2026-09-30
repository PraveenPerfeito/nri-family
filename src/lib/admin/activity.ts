import { adminRoutes } from "@/config/routes";
import type { RequestStatus } from "@/lib/portal/domain";
import type { ViewRow } from "@/types/database";
import { evidenceKindLabels, evidenceStageLabels, type EvidenceKind, type EvidenceStage } from "@/lib/field-ops/domain";
import { adminActivityLabels, adminStatusLabels, teamRoleLabels, type TeamRole } from "./domain";

/*
 * Turns audit trail rows into readable lines for the team. Metadata holds
 * only field names and safe identifiers (request number, property name,
 * team member ids, visit and evidence ids, the kind and stage of evidence),
 * never values such as addresses, phone numbers, the text of notes or file
 * locations, so nothing here can leak those either.
 */

type FeedRow = ViewRow<"admin_activity_feed">;

export type AdminActivityLine = {
  title: string;
  detail?: string;
  href?: string;
  actor: string;
  internal: boolean;
};

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

const text = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined);
const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ") || undefined;

function changedFields(metadata: Record<string, unknown>): string | undefined {
  const fields = Array.isArray(metadata.fields) ? metadata.fields.filter((f): f is string => typeof f === "string") : [];
  const labels = [...new Set(fields.map((f) => fieldLabels[f] ?? f))];
  if (labels.length === 0) return undefined;
  return `changed ${labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`}`;
}

const statusLabel = (value: unknown) => (typeof value === "string" ? (adminStatusLabels[value as RequestStatus] ?? value) : undefined);

/** Who acted, in the team's words. */
export function actorLabel(row: Pick<FeedRow, "actor_id" | "actor_name" | "actor_role">): string {
  if (!row.actor_id) return "System";
  const name = row.actor_name ?? "Former account";
  if (row.actor_role === "ADMIN" || row.actor_role === "OPERATIONS") return `${name} (${teamRoleLabels[row.actor_role as TeamRole]})`;
  return `${name} (Customer)`;
}

export function describeAdminActivity(row: FeedRow, teamNames: Map<string, string> = new Map()): AdminActivityLine {
  const m = row.metadata ?? {};
  const base = {
    title: adminActivityLabels[row.action] ?? row.action.toLowerCase().replace(/_/g, " "),
    actor: actorLabel(row),
    internal: row.visibility === "INTERNAL",
  };
  const requestHref = row.entity_type === "SERVICE_REQUEST" && row.entity_id ? adminRoutes.request(row.entity_id) : undefined;
  const person = (id: unknown) => (typeof id === "string" ? (teamNames.get(id) ?? "a former team member") : undefined);

  switch (row.action) {
    case "ACCOUNT_CREATED":
      return { ...base, detail: row.customer_name ?? undefined, href: row.customer_id ? adminRoutes.customer(row.customer_id) : undefined };
    case "PROFILE_UPDATED":
      return { ...base, detail: join(row.customer_name ?? undefined, changedFields(m)), href: row.customer_id ? adminRoutes.customer(row.customer_id) : undefined };
    case "PROPERTY_CREATED":
    case "PROPERTY_UPDATED":
      return { ...base, detail: join(text(m.name), changedFields(m)), href: row.entity_id ? adminRoutes.property(row.entity_id) : undefined };
    case "PROPERTY_DELETED":
      return { ...base, detail: text(m.name) };
    case "REQUEST_STATUS_CHANGED":
    case "REQUEST_CANCELLED":
      return { ...base, detail: join(text(m.request_number), m.from && m.to ? `${statusLabel(m.from)} → ${statusLabel(m.to)}` : undefined), href: requestHref };
    case "REQUEST_ASSIGNED":
      return { ...base, detail: join(text(m.request_number), person(m.assignee_id) ? `to ${person(m.assignee_id)}` : undefined), href: requestHref };
    case "REQUEST_REASSIGNED":
      return {
        ...base,
        detail: join(text(m.request_number), person(m.previous_assignee_id) && person(m.assignee_id) ? `${person(m.previous_assignee_id)} → ${person(m.assignee_id)}` : undefined),
        href: requestHref,
      };
    case "REQUEST_UNASSIGNED":
      return { ...base, detail: join(text(m.request_number), person(m.previous_assignee_id) ? `was ${person(m.previous_assignee_id)}` : undefined), href: requestHref };
    case "FIELD_WORK_CANCELLED":
      return { ...base, detail: join(text(m.request_number), m.reason === "request_cancelled" ? "with the request" : undefined), href: requestHref };
    case "EVIDENCE_UPLOADED":
    case "EVIDENCE_APPROVED":
    case "EVIDENCE_REJECTED":
    case "EVIDENCE_PUBLISHED":
      return {
        ...base,
        detail: join(
          text(m.request_number),
          evidenceKindLabels[m.kind as EvidenceKind]?.toLowerCase(),
          m.stage ? evidenceStageLabels[m.stage as EvidenceStage]?.toLowerCase() : undefined,
        ),
        href: requestHref,
      };
    default:
      return { ...base, detail: join(text(m.request_number), text(m.title)), href: requestHref };
  }
}
