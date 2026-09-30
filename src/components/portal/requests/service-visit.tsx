import { CalendarClock, CalendarX, CircleCheckBig, Wrench } from "lucide-react";
import { DetailList } from "@/components/portal/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { customerVisitLabels, type FieldWorkStatus } from "@/lib/field-ops/domain";
import { describeVisitTime } from "@/lib/field-ops/schedule";
import type { CustomerVisit } from "@/lib/portal/data";
import { formatDate, formatDateTime } from "@/lib/portal/format";

/*
 * The service visit for a customer's request: when it is planned (in India
 * time, where it happens, and in the customer's own time), and once done,
 * when it was completed and the team's service notes. Only customer-safe
 * fields reach this component (the portal query selects no internal ones).
 */

const tones: Record<FieldWorkStatus, "info" | "brand" | "good" | "neutral"> = {
  SCHEDULED: "info",
  IN_PROGRESS: "brand",
  COMPLETED: "good",
  CANCELLED: "neutral",
};
const icons = { SCHEDULED: CalendarClock, IN_PROGRESS: Wrench, COMPLETED: CircleCheckBig, CANCELLED: CalendarX };

export function VisitBadge({ status }: { status: FieldWorkStatus }) {
  const Icon = icons[status];
  return (
    <Badge tone={tones[status]}>
      <Icon aria-hidden className="size-3" strokeWidth={2.25} />
      {customerVisitLabels[status]}
    </Badge>
  );
}

export function ServiceVisit({ visit, timezone, awaitingEvidence = false }: { visit: CustomerVisit; timezone: string | null; awaitingEvidence?: boolean }) {
  const time = describeVisitTime(visit.scheduled_start, visit.scheduled_end, timezone);
  const when = (
    <span className="flex flex-col gap-0.5">
      <span>{time.india}</span>
      {time.local ? <span className="font-normal text-ink-muted">{time.local}</span> : null}
    </span>
  );
  const items =
    visit.status === "COMPLETED"
      ? [
          { label: "Completed", value: visit.completed_at ? formatDateTime(visit.completed_at, timezone) : "Yes" },
          { label: "Planned for", value: when },
          ...(visit.summary ? [{ label: "Service notes", value: <span className="font-normal whitespace-pre-line">{visit.summary}</span> }] : []),
        ]
      : visit.status === "CANCELLED"
        ? [
            { label: "Was planned for", value: when },
            { label: "Cancelled", value: visit.cancelled_at ? formatDate(visit.cancelled_at, timezone) : "Yes" },
          ]
        : [{ label: visit.status === "IN_PROGRESS" ? "Planned for" : "When", value: when }];

  return (
    <div className="space-y-4">
      <VisitBadge status={visit.status} />
      <DetailList items={items} />
      {visit.status === "SCHEDULED" ? <p className="text-sm text-ink-muted">A member of our local team will carry out the visit. We&apos;ll post updates here.</p> : null}
      {visit.status === "IN_PROGRESS" ? <p className="text-sm text-ink-muted">The work has started. Photos and notes will appear here once our team has checked them.</p> : null}
      {visit.status === "CANCELLED" ? <p className="text-sm text-ink-muted">Our team will be in touch about next steps.</p> : null}
      {awaitingEvidence ? <p className="text-sm text-ink-muted">Photos and documents from the visit will appear on this page once our team has checked them.</p> : null}
    </div>
  );
}
