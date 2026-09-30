import { AlertTriangle } from "lucide-react";
import { DetailList } from "@/components/portal/ui/primitives";
import type { AdminVisit } from "@/lib/admin/data";
import { isFinalStatus } from "@/lib/admin/domain";
import { currentVisit, fieldWorkRequestStatuses, type VisitState } from "@/lib/field-ops/domain";
import { FIELD_TIMEZONE, formatVisitWindow, indiaParts, indiaToday } from "@/lib/field-ops/schedule";
import type { RequestStatus } from "@/lib/portal/domain";
import { formatDateTime } from "@/lib/portal/format";
import { VisibilityBadge, VisitStatusBadge } from "../ui";
import { FeedbackRegion } from "./feedback";
import { CancelVisitForm, CompleteVisitForm, StartVisitForm, VisitNotesForm, VisitScheduleForm } from "./field-work-forms";

/*
 * Field work on the admin request page: the request's visit, carried out by
 * the request's assignee (the Phase 2B assignment; there is no second
 * assignee). The visit has its own state, shown with its own badge, next to
 * (never instead of) the request's status. Every time here is India time,
 * where the work happens.
 */

const indiaTime = (value: string) => `${formatDateTime(value, FIELD_TIMEZONE)} India time`;

/** Why a visit can't be scheduled or started right now, or null. The database checks the same. */
function blockedBecause(status: RequestStatus, assigneeActive: boolean): string | null {
  if (isFinalStatus(status)) return "This request is closed, so its field work can no longer change.";
  if (!fieldWorkRequestStatuses.includes(status)) return "Visits can be scheduled once the request is Assigned, In progress or Awaiting customer. Change its status first.";
  if (!assigneeActive) return "Assign an active team member first (under Assignment). They carry out the visit.";
  return null;
}

function Blocked({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-control border border-attention/20 bg-attention-soft px-3 py-2.5 text-sm text-ink">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-attention" />
      {children}
    </p>
  );
}

function Text({ value, empty }: { value: string | null | undefined; empty: string }) {
  return value ? <span className="font-normal whitespace-pre-line">{value}</span> : <span className="font-normal text-ink-subtle">{empty}</span>;
}

export function FieldWorkPanel({
  requestId,
  requestStatus,
  visits,
  assignee,
  customerName,
}: {
  requestId: string;
  requestStatus: RequestStatus;
  visits: AdminVisit[];
  assignee: { name: string; active: boolean } | null;
  customerName: string;
}) {
  const visit = currentVisit(visits);
  const state: VisitState = visit?.status ?? "NOT_SCHEDULED";
  const open = !isFinalStatus(requestStatus);
  const blocked = blockedBecause(requestStatus, assignee?.active ?? false);
  const earlier = visits.filter((v) => v.id !== visit?.id);
  const teamMember = assignee ? `${assignee.name}${assignee.active ? "" : " (no longer active)"}` : "Nobody assigned";
  const today = indiaToday();

  return (
    <FeedbackRegion>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <VisitStatusBadge state={state} />
          <span className="text-xs text-ink-subtle">Separate from the request&apos;s status. The team member is the request&apos;s assignee.</span>
        </div>

        {visit ? (
          <DetailList
            items={[
              { label: "When", value: `${formatVisitWindow(visit.scheduled_start, visit.scheduled_end)} India time` },
              { label: "Team member", value: teamMember },
              ...(visit.started_at ? [{ label: "Started", value: indiaTime(visit.started_at) }] : []),
              ...(visit.completed_at ? [{ label: "Completed", value: indiaTime(visit.completed_at) }] : []),
              ...(visit.cancelled_at ? [{ label: "Cancelled", value: indiaTime(visit.cancelled_at) }] : []),
              {
                label: "Instructions",
                value: (
                  <span className="flex flex-col items-start gap-1.5">
                    <VisibilityBadge internal />
                    <Text value={visit.internal?.instructions} empty="None" />
                  </span>
                ),
              },
              ...(visit.status === "IN_PROGRESS" || visit.status === "COMPLETED"
                ? [
                    {
                      label: "Execution notes",
                      value: (
                        <span className="flex flex-col items-start gap-1.5">
                          <VisibilityBadge internal />
                          <Text value={visit.internal?.execution_notes} empty="None yet" />
                        </span>
                      ),
                    },
                  ]
                : []),
              ...(visit.status === "COMPLETED"
                ? [
                    {
                      label: "Service notes",
                      value: (
                        <span className="flex flex-col items-start gap-1.5">
                          <VisibilityBadge internal={false} />
                          <Text value={visit.summary} empty="None" />
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <p className="text-sm text-ink-muted">No visit is scheduled for this request. Team member: {teamMember}.</p>
        )}

        {!open ? (
          <p className="text-sm text-ink-muted">This request is closed, so its field work can no longer change.</p>
        ) : state === "NOT_SCHEDULED" || state === "CANCELLED" ? (
          <section aria-labelledby="schedule-visit" className="border-t border-line-subtle pt-5">
            <h3 id="schedule-visit" className="text-sm font-semibold text-ink">
              {state === "CANCELLED" ? "Schedule a new visit" : "Schedule work"}
            </h3>
            <div className="mt-3">{blocked ? <Blocked>{blocked}</Blocked> : <VisitScheduleForm requestId={requestId} today={today} />}</div>
          </section>
        ) : visit && state === "SCHEDULED" ? (
          <div className="space-y-5 border-t border-line-subtle pt-5">
            {blocked ? <Blocked>{`The visit can't start yet. ${blocked}`}</Blocked> : <StartVisitForm requestId={requestId} fieldWorkId={visit.id} />}
            {blocked ? null : (
              <details className="group rounded-control border border-line bg-surface">
                <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-ink select-none hover:bg-subtle/60">Change the date, time or instructions</summary>
                <div className="border-t border-line-subtle px-3 py-4">
                  <VisitScheduleForm
                    requestId={requestId}
                    today={today}
                    visit={{
                      id: visit.id,
                      date: indiaParts(visit.scheduled_start).date,
                      startTime: indiaParts(visit.scheduled_start).time,
                      endTime: visit.scheduled_end ? indiaParts(visit.scheduled_end).time : "",
                      instructions: visit.internal?.instructions ?? "",
                    }}
                  />
                </div>
              </details>
            )}
            <CancelVisitForm requestId={requestId} fieldWorkId={visit.id} status="SCHEDULED" customerName={customerName} />
          </div>
        ) : visit && state === "IN_PROGRESS" ? (
          <div className="space-y-5 border-t border-line-subtle pt-5">
            <VisitNotesForm requestId={requestId} fieldWorkId={visit.id} current={visit.internal?.execution_notes ?? ""} />
            <div className="border-t border-line-subtle pt-5">
              <CompleteVisitForm requestId={requestId} fieldWorkId={visit.id} customerName={customerName} />
            </div>
            <CancelVisitForm requestId={requestId} fieldWorkId={visit.id} status="IN_PROGRESS" customerName={customerName} />
          </div>
        ) : visit && state === "COMPLETED" ? (
          <div className="border-t border-line-subtle pt-5">
            <VisitNotesForm requestId={requestId} fieldWorkId={visit.id} current={visit.internal?.execution_notes ?? ""} />
          </div>
        ) : null}

        {earlier.length > 0 ? (
          <div className="border-t border-line-subtle pt-4">
            <h3 className="text-xs font-medium text-ink-subtle">Earlier visits</h3>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
              {earlier.map((v) => (
                <li key={v.id}>
                  Cancelled · was planned for {formatVisitWindow(v.scheduled_start, v.scheduled_end)} India time
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </FeedbackRegion>
  );
}
