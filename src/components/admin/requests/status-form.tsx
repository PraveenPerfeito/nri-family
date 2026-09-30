"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { changeRequestStatusAction } from "@/lib/admin/actions/requests";
import { adminStatusLabels, adminStatusTransitions, isFinalStatus, needsAssignee, transitionHints } from "@/lib/admin/domain";
import { idleState } from "@/lib/portal/form-state";
import type { RequestStatus } from "@/lib/portal/domain";
import { cn } from "@/lib/utils/cn";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Moves a request to one of the statuses the lifecycle allows next. The
 * current status travels with the form, so a change made on a stale screen
 * is refused. Completing or cancelling (both final) asks for confirmation.
 * `unavailable` greys out a choice with the reason (for example Completed,
 * while a visit or its evidence is unfinished). The server and the database
 * check every rule again.
 */
export function StatusForm({
  requestId,
  current,
  hasAssignee,
  customerName,
  unavailable,
}: {
  requestId: string;
  current: RequestStatus;
  hasAssignee: boolean;
  customerName: string;
  unavailable?: Partial<Record<RequestStatus, string>>;
}) {
  const [state, formAction, pending] = useActionState(changeRequestStatusAction, idleState);
  const [choice, setChoice] = useState<RequestStatus | null>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const allowed = adminStatusTransitions[current];

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (allowed.length === 0) {
    return (
      <div className="space-y-3">
        <FormStatus success={state.status === "success" ? state.message : undefined} statusRef={statusRef} />
        <p className="text-sm text-ink-muted">This request is {adminStatusLabels[current].toLowerCase()}. Completed and cancelled requests are final.</p>
      </div>
    );
  }

  const send = () => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startTransition(() => formAction(data));
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new FormData(event.currentTarget).get("newStatus") as RequestStatus | null;
    if (!next) {
      setLocalError("Please choose the new status.");
      statusRef.current?.focus();
      return;
    }
    setLocalError(undefined);
    if (isFinalStatus(next)) {
      setChoice(next);
      dialogRef.current?.showModal();
      return;
    }
    send();
  }

  const error = localError ?? (state.status === "error" ? state.message : undefined);
  const success = !localError && state.status === "success" ? state.message : undefined;

  return (
    <>
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="expectedStatus" value={current} />
        <fieldset>
          <legend className="text-sm font-medium text-ink">Move to</legend>
          <div className="mt-2 space-y-2">
            {allowed.map((status) => {
              const reason = needsAssignee(status) && !hasAssignee ? "Assign a team member first." : unavailable?.[status];
              const blocked = Boolean(reason);
              const id = `status-${status.toLowerCase()}`;
              return (
                <label
                  key={status}
                  htmlFor={id}
                  className={cn(
                    "flex items-start gap-3 rounded-control border px-3 py-2.5 transition-colors",
                    blocked
                      ? "cursor-not-allowed border-line bg-subtle/60 text-ink-subtle"
                      : "cursor-pointer border-line-strong bg-surface hover:border-ink/30 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:shadow-focus",
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name="newStatus"
                    value={status}
                    disabled={blocked || pending}
                    aria-describedby={`${id}-hint`}
                    className="mt-0.5 size-4 shrink-0 accent-brand focus:outline-none"
                  />
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-medium", blocked ? "text-ink-subtle" : "text-ink")}>{adminStatusLabels[status]}</span>
                    <span id={`${id}-hint`} className="block text-xs text-ink-muted">
                      {reason ?? transitionHints[status]}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <FormStatus error={error} success={success} statusRef={statusRef} />
        <div ref={submitRef}>
          <PendingButton pending={pending} pendingLabel="Updating…" className="w-full">
            Update status
          </PendingButton>
        </div>
      </form>
      <ConfirmDialog
        dialogRef={dialogRef}
        id="confirm-status"
        title={choice === "CANCELLED" ? "Cancel this request?" : "Mark this request as completed?"}
        confirmLabel={choice === "CANCELLED" ? "Cancel request" : "Mark completed"}
        confirmVariant={choice === "CANCELLED" ? "danger" : "primary"}
        onConfirm={() => {
          dialogRef.current?.close();
          send();
        }}
        onClose={() => submitRef.current?.querySelector("button")?.focus()}
      >
        <p>This is final: the request can&apos;t be moved to another status afterwards.</p>
        <p>{customerName} will see the change on their request and get a notification.</p>
      </ConfirmDialog>
    </>
  );
}
