"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { focusFirstError, validateForm } from "@/components/forms/client-validation";
import { Field, Input, Textarea } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { Button } from "@/components/ui/button";
import {
  cancelFieldWorkAction,
  completeFieldWorkAction,
  recordFieldWorkNotesAction,
  rescheduleFieldWorkAction,
  scheduleFieldWorkAction,
  startFieldWorkAction,
} from "@/lib/admin/actions/field-work";
import { EXECUTION_NOTES_MAX, INSTRUCTIONS_MAX, SUMMARY_MAX } from "@/lib/field-ops/domain";
import { idleState, type ActionState } from "@/lib/portal/form-state";
import type { FieldErrors } from "@/lib/validation/leads";
import { ConfirmDialog } from "./confirm-dialog";
import { useReportingAction } from "./feedback";

/*
 * The forms of the Field work panel. Each sends only the request, the visit
 * and the admin's own input; the server and the database check every rule
 * again (who may act, the request's status, the active assignee, the visit's
 * lifecycle). Changes the customer sees are confirmed first.
 */

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Shared wiring: client-side checks first, then the Server Action; errors stay
 * by the form. The component owns the form and status refs and passes them in.
 */
function useVisitForm(action: Action, formRef: RefObject<HTMLFormElement | null>, statusRef: RefObject<HTMLDivElement | null>) {
  const [state, formAction, pending] = useActionState(useReportingAction(action), idleState);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);

  useEffect(() => {
    if (state.status === "error" && !state.refreshed) statusRef.current?.focus();
  }, [state, statusRef]);

  const send = () => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startTransition(() => formAction(data));
  };

  /** Validate in the browser; true when the form may be sent. */
  const check = (form: HTMLFormElement) => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      focusFirstError(form, errors);
      return false;
    }
    setClientErrors(null);
    return true;
  };

  const fieldErrors = clientErrors ?? (state.status === "error" ? state.fieldErrors : undefined) ?? {};
  // Refusals that refreshed the page are shown by the panel's feedback region instead.
  const formError = clientErrors ? undefined : state.status === "error" && !state.fieldErrors && !state.refreshed ? state.message : undefined;
  return { state, formAction, pending, send, check, fieldErrors, formError, clearErrors: () => clientErrors && setClientErrors(null) };
}

/** Schedule a visit, or change a scheduled one (date, times, instructions). Times are India time. */
export function VisitScheduleForm({
  requestId,
  today,
  visit,
}: {
  requestId: string;
  /** Today in India, YYYY-MM-DD (the earliest date allowed). */
  today: string;
  visit?: { id: string; date: string; startTime: string; endTime: string; instructions: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const f = useVisitForm(visit ? rescheduleFieldWorkAction : scheduleFieldWorkAction, formRef, statusRef);
  const prefix = visit ? "reschedule" : "schedule";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (f.check(event.currentTarget)) f.send();
  }

  return (
    <form ref={formRef} action={f.formAction} onSubmit={onSubmit} onChange={f.clearErrors} noValidate className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      {visit ? <input type="hidden" name="fieldWorkId" value={visit.id} /> : null}
      <fieldset>
        <legend className="text-sm font-medium text-ink">When</legend>
        <p id={`${prefix}-when-hint`} className="mt-0.5 text-xs text-ink-subtle">
          India time (IST, UTC+05:30). The customer also sees it in their own time zone.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field id={`${prefix}-date`} label="Date" error={f.fieldErrors.date}>
            {(describedBy) => (
              <Input
                id={`${prefix}-date`}
                type="date"
                name="date"
                required
                min={today}
                defaultValue={visit?.date}
                data-label="a date"
                aria-describedby={[`${prefix}-when-hint`, describedBy].filter(Boolean).join(" ")}
                aria-invalid={f.fieldErrors.date ? true : undefined}
                disabled={f.pending}
              />
            )}
          </Field>
          <Field id={`${prefix}-start`} label="Start time" error={f.fieldErrors.startTime}>
            {(describedBy) => (
              <Input
                id={`${prefix}-start`}
                type="time"
                name="startTime"
                required
                defaultValue={visit?.startTime}
                data-label="a start time"
                aria-describedby={describedBy}
                aria-invalid={f.fieldErrors.startTime ? true : undefined}
                disabled={f.pending}
              />
            )}
          </Field>
          <Field id={`${prefix}-end`} label="End time" optional error={f.fieldErrors.endTime}>
            {(describedBy) => (
              <Input
                id={`${prefix}-end`}
                type="time"
                name="endTime"
                defaultValue={visit?.endTime}
                aria-describedby={describedBy}
                aria-invalid={f.fieldErrors.endTime ? true : undefined}
                disabled={f.pending}
              />
            )}
          </Field>
        </div>
      </fieldset>
      <Field id={`${prefix}-instructions`} label="Instructions for the team" optional hint="Internal: never shown to the customer." error={f.fieldErrors.instructions}>
        {(describedBy) => (
          <Textarea
            id={`${prefix}-instructions`}
            name="instructions"
            rows={3}
            maxLength={INSTRUCTIONS_MAX}
            defaultValue={visit?.instructions}
            aria-describedby={describedBy}
            aria-invalid={f.fieldErrors.instructions ? true : undefined}
            disabled={f.pending}
            className="min-h-20"
          />
        )}
      </Field>
      <FormStatus error={f.formError} statusRef={statusRef} />
      <PendingButton pending={f.pending} variant="secondary" pendingLabel="Saving…">
        {visit ? "Save changes" : "Schedule visit"}
      </PendingButton>
    </form>
  );
}

/** Start the visit. The request moves to In progress too (the customer sees that). */
export function StartVisitForm({ requestId, fieldWorkId }: { requestId: string; fieldWorkId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const f = useVisitForm(startFieldWorkAction, formRef, statusRef);
  return (
    <form action={f.formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="fieldWorkId" value={fieldWorkId} />
      <FormStatus error={f.formError} statusRef={statusRef} />
      <PendingButton pending={f.pending} variant="secondary" pendingLabel="Starting…">
        Start work
      </PendingButton>
      <p className="text-xs text-ink-subtle">Records the start time. The request moves to In progress, and the customer sees that.</p>
    </form>
  );
}

/** What was done on site. Internal. */
export function VisitNotesForm({ requestId, fieldWorkId, current }: { requestId: string; fieldWorkId: string; current: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const f = useVisitForm(recordFieldWorkNotesAction, formRef, statusRef);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (f.check(event.currentTarget)) f.send();
  }

  return (
    <form ref={formRef} action={f.formAction} onSubmit={onSubmit} onChange={f.clearErrors} noValidate className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="fieldWorkId" value={fieldWorkId} />
      <Field id={`notes-${fieldWorkId}`} label="Execution notes" hint="Internal: what was done and anything the team should know. Never shown to the customer." error={f.fieldErrors.notes}>
        {(describedBy) => (
          <Textarea
            id={`notes-${fieldWorkId}`}
            name="notes"
            rows={4}
            required
            maxLength={EXECUTION_NOTES_MAX}
            defaultValue={current}
            data-label="the notes"
            aria-describedby={describedBy}
            aria-invalid={f.fieldErrors.notes ? true : undefined}
            disabled={f.pending}
          />
        )}
      </Field>
      <FormStatus error={f.formError} statusRef={statusRef} />
      <PendingButton pending={f.pending} variant="secondary" pendingLabel="Saving…">
        Save notes
      </PendingButton>
    </form>
  );
}

/** Mark the visit complete, with optional service notes the customer will see. Confirmed first. */
export function CompleteVisitForm({ requestId, fieldWorkId, customerName }: { requestId: string; fieldWorkId: string; customerName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const f = useVisitForm(completeFieldWorkAction, formRef, statusRef);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (f.check(event.currentTarget)) dialogRef.current?.showModal();
  }

  return (
    <>
      <form ref={formRef} action={f.formAction} onSubmit={onSubmit} onChange={f.clearErrors} noValidate className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="fieldWorkId" value={fieldWorkId} />
        <Field
          id={`summary-${fieldWorkId}`}
          label="Service notes for the customer"
          optional
          hint="Shown to the customer on their request, for example “Garden maintenance completed.”"
          error={f.fieldErrors.summary}
        >
          {(describedBy) => (
            <Textarea
              id={`summary-${fieldWorkId}`}
              name="summary"
              rows={3}
              maxLength={SUMMARY_MAX}
              aria-describedby={describedBy}
              aria-invalid={f.fieldErrors.summary ? true : undefined}
              disabled={f.pending}
              className="min-h-20"
            />
          )}
        </Field>
        <FormStatus error={f.formError} statusRef={statusRef} />
        <PendingButton pending={f.pending} variant="secondary" pendingLabel="Saving…">
          Mark work complete
        </PendingButton>
      </form>
      <ConfirmDialog
        dialogRef={dialogRef}
        id={`confirm-complete-${fieldWorkId}`}
        title="Mark the visit as complete?"
        confirmLabel="Mark complete"
        onConfirm={() => {
          dialogRef.current?.close();
          f.send();
        }}
        onClose={() => formRef.current?.querySelector<HTMLButtonElement>("button[type=submit]")?.focus()}
      >
        <p>{customerName} will see that the visit is complete, with your service notes, and get a notification.</p>
        <p>This can&apos;t be undone. The request stays open until the evidence is reviewed and you complete it.</p>
      </ConfirmDialog>
    </>
  );
}

/** Cancel a scheduled or started visit. Confirmed first; a new visit can be scheduled afterwards. */
export function CancelVisitForm({
  requestId,
  fieldWorkId,
  status,
  customerName,
}: {
  requestId: string;
  fieldWorkId: string;
  status: "SCHEDULED" | "IN_PROGRESS";
  customerName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const f = useVisitForm(cancelFieldWorkAction, formRef, statusRef);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <form ref={formRef} action={f.formAction} className="space-y-2">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="fieldWorkId" value={fieldWorkId} />
        <input type="hidden" name="expectedStatus" value={status} />
        <FormStatus error={f.formError} statusRef={statusRef} />
        <Button ref={triggerRef} variant="quiet" disabled={f.pending} onClick={() => dialogRef.current?.showModal()}>
          {f.pending ? "Cancelling…" : "Cancel visit"}
        </Button>
      </form>
      <ConfirmDialog
        dialogRef={dialogRef}
        id={`confirm-cancel-visit-${fieldWorkId}`}
        title="Cancel this visit?"
        confirmLabel="Cancel visit"
        confirmVariant="danger"
        onConfirm={() => {
          dialogRef.current?.close();
          f.send();
        }}
        onClose={() => triggerRef.current?.focus()}
      >
        <p>{customerName} will see that the visit was cancelled and get a notification.</p>
        <p>The request stays open, and you can schedule a new visit.</p>
      </ConfirmDialog>
    </>
  );
}
