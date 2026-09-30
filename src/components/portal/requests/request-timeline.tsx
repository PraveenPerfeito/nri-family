import { CalendarClock, CalendarX, Camera, Check, Circle, CircleCheckBig, MessageSquare, XCircle } from "lucide-react";
import type { RequestStatus, ServiceRequestEvent } from "@/lib/portal/domain";
import { upcomingStages } from "@/lib/portal/domain";
import { describeVisitTime, visitWindowOf } from "@/lib/field-ops/schedule";
import { formatDateTime } from "@/lib/portal/format";
import { cn } from "@/lib/utils/cn";

function iconFor(event: ServiceRequestEvent) {
  switch (event.event_type) {
    case "TEAM_UPDATE":
      return MessageSquare;
    case "FIELD_WORK_SCHEDULED":
    case "FIELD_WORK_RESCHEDULED":
      return CalendarClock;
    case "FIELD_WORK_COMPLETED":
      return CircleCheckBig;
    case "FIELD_WORK_CANCELLED":
      return CalendarX;
    case "EVIDENCE_AVAILABLE":
      return Camera;
    default:
      return event.event_type === "STATUS_CHANGED" && (event.metadata as { to?: string }).to === "CANCELLED" ? XCircle : Check;
  }
}

/** The text under an entry: a team message, service notes, or when a visit is planned (India time and the customer's own). */
function detailOf(event: ServiceRequestEvent, timezone: string | null): string | null {
  if (event.event_type === "FIELD_WORK_SCHEDULED" || event.event_type === "FIELD_WORK_RESCHEDULED") {
    const visit = visitWindowOf(event.metadata);
    if (!visit) return null;
    const time = describeVisitTime(visit.start, visit.end, timezone);
    return time.local ? `${time.india} (${time.local})` : time.india;
  }
  return event.description;
}

/**
 * The request timeline. "What happened" comes only from real events in the
 * database; stages that haven't happened are listed separately as next
 * steps and never styled as done. Updates written by the team are shown as
 * messages. Internal notes and internal visit events never reach this
 * component: the query asks for customer-visible events and the database
 * refuses anything else.
 */
export function RequestTimeline({ events, status, timezone }: { events: ServiceRequestEvent[]; status: RequestStatus; timezone: string | null }) {
  const upcoming = upcomingStages(status, events);

  return (
    <div className="space-y-6">
      <ol aria-label="What has happened" className="space-y-0">
        {events.map((event, i) => {
          const Icon = iconFor(event);
          const muted = Icon === XCircle || Icon === CalendarX;
          const message = event.event_type === "TEAM_UPDATE";
          const notes = message || event.event_type === "FIELD_WORK_COMPLETED";
          const detail = detailOf(event, timezone);
          const last = i === events.length - 1;
          return (
            <li key={event.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
              {!last ? <span aria-hidden className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-brand/30" /> : null}
              <span
                aria-hidden
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border",
                  muted ? "border-line-strong bg-subtle text-ink-muted" : "border-brand/30 bg-brand-soft text-brand",
                )}
              >
                <Icon className="size-4" strokeWidth={Icon === Check ? 2.5 : 2} />
              </span>
              <div className="pt-1">
                <p className="text-sm font-semibold text-ink">
                  {event.title}
                  {message ? null : <span className="sr-only"> — done</span>}
                </p>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  <time dateTime={event.created_at}>{formatDateTime(event.created_at, timezone)}</time>
                </p>
                {detail ? <p className={cn("mt-1 text-sm break-words", notes ? "whitespace-pre-line text-ink" : "text-ink-muted")}>{detail}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>

      {upcoming.length > 0 ? (
        <div>
          <h3 className="text-label text-ink-subtle">Next steps</h3>
          <ol aria-label="Next steps" className="mt-3 space-y-3">
            {upcoming.map((stage) => (
              <li key={stage.status} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
                <span aria-hidden className="flex size-8 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-subtle">
                  <Circle className="size-3" strokeWidth={2} />
                </span>
                <div className="pt-1">
                  <p className="text-sm font-medium text-ink-muted">
                    {stage.label}
                    <span className="sr-only"> — not started yet</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{stage.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
