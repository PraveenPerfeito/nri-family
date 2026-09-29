import { Check, Circle, MessageSquare, XCircle } from "lucide-react";
import type { RequestStatus, ServiceRequestEvent } from "@/lib/portal/domain";
import { upcomingStages } from "@/lib/portal/domain";
import { formatDateTime } from "@/lib/portal/format";
import { cn } from "@/lib/utils/cn";

/**
 * The request timeline. "What happened" comes only from real events in the
 * database; stages that haven't happened are listed separately as next
 * steps and never styled as done. Updates written by the team are shown as
 * messages. Internal notes never reach this component: the query asks for
 * customer-visible events and the database refuses anything else.
 */
export function RequestTimeline({ events, status, timezone }: { events: ServiceRequestEvent[]; status: RequestStatus; timezone: string | null }) {
  const upcoming = upcomingStages(status, events);

  return (
    <div className="space-y-6">
      <ol aria-label="What has happened" className="space-y-0">
        {events.map((event, i) => {
          const cancelled = event.event_type === "STATUS_CHANGED" && (event.metadata as { to?: string }).to === "CANCELLED";
          const message = event.event_type === "TEAM_UPDATE";
          const last = i === events.length - 1;
          return (
            <li key={event.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
              {!last ? <span aria-hidden className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-brand/30" /> : null}
              <span
                aria-hidden
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border",
                  cancelled ? "border-line-strong bg-subtle text-ink-muted" : "border-brand/30 bg-brand-soft text-brand",
                )}
              >
                {cancelled ? (
                  <XCircle className="size-4" strokeWidth={2} />
                ) : message ? (
                  <MessageSquare className="size-4" strokeWidth={2} />
                ) : (
                  <Check className="size-4" strokeWidth={2.5} />
                )}
              </span>
              <div className="pt-1">
                <p className="text-sm font-semibold text-ink">
                  {event.title}
                  {message ? null : <span className="sr-only"> — done</span>}
                </p>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  <time dateTime={event.created_at}>{formatDateTime(event.created_at, timezone)}</time>
                </p>
                {event.description ? (
                  <p className={cn("mt-1 text-sm break-words", message ? "whitespace-pre-line text-ink" : "text-ink-muted")}>{event.description}</p>
                ) : null}
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
