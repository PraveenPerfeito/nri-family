import { Check, Lock, MessageSquare, XCircle } from "lucide-react";
import type { TimelineEvent } from "@/lib/admin/data";
import { teamRoleLabels, type TeamRole } from "@/lib/admin/domain";
import { formatDateTime } from "@/lib/portal/format";
import { cn } from "@/lib/utils/cn";
import { VisibilityBadge } from "../ui";

function authorLabel(event: TimelineEvent): string {
  if (!event.author) return event.created_by ? "Former account" : "System";
  if (event.author.role === "CUSTOMER") return `${event.author.name} (Customer)`;
  const role = teamRoleLabels[event.author.role as TeamRole];
  return role ? `${event.author.name} (${role})` : event.author.name;
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
        const cancelled = event.event_type === "STATUS_CHANGED" && (event.metadata as { to?: string } | null)?.to === "CANCELLED";
        const Icon = note ? Lock : message ? MessageSquare : cancelled ? XCircle : Check;
        const last = i === events.length - 1;
        return (
          <li key={event.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
            {!last ? <span aria-hidden className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-line" /> : null}
            <span
              aria-hidden
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full border",
                note ? "border-attention/30 bg-attention-soft text-attention" : cancelled ? "border-line-strong bg-subtle text-ink-muted" : "border-brand/30 bg-brand-soft text-brand",
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
              {event.description ? (
                <p
                  className={cn(
                    "mt-2 text-sm break-words whitespace-pre-line",
                    note ? "rounded-control border border-attention/20 bg-attention-soft/50 px-3 py-2 text-ink" : message ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {event.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
