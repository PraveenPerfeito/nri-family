"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { UserRoundCheck } from "lucide-react";
import { Select } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { Button } from "@/components/ui/button";
import { assignRequestAction, unassignRequestAction } from "@/lib/admin/actions/requests";
import { isFinalStatus, needsAssignee, teamRoleLabels, type TeamRole } from "@/lib/admin/domain";
import { idleState } from "@/lib/portal/form-state";
import type { RequestStatus } from "@/lib/portal/domain";

export type Assignable = { id: string; name: string; role: TeamRole; open: number };

/**
 * Who on the team is responsible. Internal only: the customer sees the
 * status (for example "Local team assigned"), never the person. Only active
 * team members are offered, and the database accepts nobody else.
 */
export function AssignmentForm({
  requestId,
  status,
  assignee,
  team,
}: {
  requestId: string;
  status: RequestStatus;
  assignee: { id: string; name: string; since: string } | null;
  team: Assignable[];
}) {
  const [state, formAction, pending] = useActionState(assignRequestAction, idleState);
  const [removeState, removeAction, removing] = useActionState(unassignRequestAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const removeStatusRef = useRef<HTMLDivElement>(null);
  const closed = isFinalStatus(status);
  const locked = needsAssignee(status);
  const choices = team.filter((m) => m.id !== assignee?.id);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);
  useEffect(() => {
    if (removeState.status !== "idle") removeStatusRef.current?.focus();
  }, [removeState]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  function onRemove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => removeAction(data));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted">
          <UserRoundCheck className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium break-words text-ink">{assignee ? assignee.name : "Nobody yet"}</p>
          <p className="text-xs text-ink-muted">{assignee ? `Responsible since ${assignee.since}` : "Assign someone before moving the request to Assigned."}</p>
        </div>
      </div>

      {closed ? (
        <p className="text-sm text-ink-muted">This request is closed, so its assignment stays as it is.</p>
      ) : (
        <>
          {choices.length === 0 ? (
            <p className="text-sm text-ink-muted">{assignee ? "Nobody else is on the active team yet." : "There are no active team members to assign yet."}</p>
          ) : (
            <form ref={formRef} action={formAction} onSubmit={onSubmit} className="space-y-3">
              <input type="hidden" name="requestId" value={requestId} />
              <div>
                <label htmlFor="assigneeId" className="block text-sm font-medium text-ink">
                  {assignee ? "Reassign to" : "Assign to"}
                </label>
                <Select id="assigneeId" name="assigneeId" required defaultValue="" className="mt-1.5" disabled={pending}>
                  <option value="" disabled>
                    Choose a team member
                  </option>
                  {choices.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {teamRoleLabels[m.role]} · {m.open} open
                    </option>
                  ))}
                </Select>
              </div>
              <FormStatus error={state.status === "error" ? state.message : undefined} success={state.status === "success" ? state.message : undefined} statusRef={statusRef} />
              <PendingButton pending={pending} variant="secondary" pendingLabel="Saving…" className="w-full">
                {assignee ? "Reassign" : "Assign"}
              </PendingButton>
            </form>
          )}

          {assignee ? (
            <form action={removeAction} onSubmit={onRemove} className="space-y-2 border-t border-line-subtle pt-4">
              <input type="hidden" name="requestId" value={requestId} />
              <FormStatus
                error={removeState.status === "error" ? removeState.message : undefined}
                success={removeState.status === "success" ? removeState.message : undefined}
                statusRef={removeStatusRef}
              />
              <Button type="submit" variant="quiet" disabled={locked || removing} aria-describedby={locked ? "unassign-hint" : undefined} className="w-full">
                {removing ? "Removing…" : "Remove assignment"}
              </Button>
              {locked ? (
                <p id="unassign-hint" className="text-xs text-ink-subtle">
                  Assigned and In progress requests need someone responsible. Reassign instead, or move the request back to Under review first.
                </p>
              ) : null}
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}
