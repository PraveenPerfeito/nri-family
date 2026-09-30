import { CalendarClock, CalendarX, Camera, Check, CircleCheckBig, Lock, MessageSquare, Play, XCircle } from "lucide-react";
import type { TimelineEvent } from "@/lib/admin/data";
import { teamRoleLabels, type TeamRole } from "@/lib/admin/domain";
import { formatVisitWindow, visitWindowOf } from "@/lib/field-ops/schedule";
import { formatDateTime } from "@/lib/portal/format";
import { cn } from "@/lib/utils/cn";
import { VisibilityBadge } from "../ui";

/** Visit and evidence events (Phase 2C). Customer-visible ones carry no author; the internal activity records who acted. */
const fieldOpsEvents = new Set(["FIELD_WORK_SCHEDULED", "FIELD_WORK_RESCHEDULED", "FIELD_WORK_STARTED", "FIELD_WORK_COMPLETED", "FIELD_WORK_CANCELLED", "EVIDENCE_AVAILABLE"]);

function authorLabel(event: TimelineEvent): string {
  if (!event.author) return event.created_by ? "Former account" : fieldOpsEvents.has(event.event_type) ? "Team (see activity)" : "System";
  if (event.author.role === "CUSTOMER") return `${event.author.name} (Customer)`;
  const role = teamRoleLabels[event.author.role as TeamRole];
  return role ? `${event.author.name} (${role})` : event.author.name;
}

function iconFor(event: TimelineEvent) {
  switch (event.event_type) {
    case "INTERNAL_NOTE":
      return Lock;
    case "TEAM_UPDATE":
      return MessageSquare;
    case "FIELD_WORK_SCHEDULED":
    case "FIELD_WORK_RESCHEDULED":
      return CalendarClock;
    case "FIELD_WORK_STARTED":
      return Play;
    case "FIELD_WORK_COMPLETED":
      return CircleCheckBig;
    case "FIELD_WORK_CANCELLED":
      return CalendarX;
    case "EVIDENCE_AVAILABLE":
      return Camera;
    default:
      return event.event_type === "STATUS_CHANGED" && (event.metadata as { to?: string } | null)?.to === "CANCELLED" ? XCircle : Check;
  }
}

/**
 * Every timeline entry the team can see, customer-visible and internal,
 * each marked with who can see it. Internal notes are set apart so they are
 * never mistaken for something the customer has read.
 */
export function AdminTimeline({ events, timezone }: { events: TimelineEvent[]; timezone: string | null }) {
  if (events.length === 0) return <p className="text-sm text-ink-muted">No timeline entries yet.</p>;
  return (
    <ol aria-label="Request timeline" className="space-y-0">
      {events.map((event, i) => {
        const internal = event.visibility === "INTERNAL";
        const note = event.event_type === "INTERNAL_NOTE";
        const message = event.event_type === "TEAM_UPDATE";
        const muted = iconFor(event) === XCircle || event.event_type === "FIELD_WORK_CANCELLED";
        const Icon = iconFor(event);
        const visitTime = event.event_type === "FIELD_WORK_SCHEDULED" || event.event_type === "FIELD_WORK_RESCHEDULED" ? visitWindowOf(event.metadata) : null;
        const detail = visitTime ? `For ${formatVisitWindow(visitTime.start, visitTime.end)} India time` : event.description;
        const last = i === events.length - 1;
        return (
          <li key={event.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
            {!last ? <span aria-hidden className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-line" /> : null}
            <span
              aria-hidden
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full border",
                note ? "border-attention/30 bg-attention-soft text-attention" : muted ? "border-line-strong bg-subtle text-ink-muted" : "border-brand/30 bg-brand-soft text-brand",
              )}
            >
              <Icon className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-ink">{event.title}</p>
                <VisibilityBadge internal={internal} />
              </div>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {authorLabel(event)} · <time dateTime={event.created_at}>{formatDateTime(event.created_at, timezone)}</time>
              </p>
              {detail ? (
                <p
                  className={cn(
                    "mt-2 text-sm break-words whitespace-pre-line",
                    note ? "rounded-control border border-attention/20 bg-attention-soft/50 px-3 py-2 text-ink" : message ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
