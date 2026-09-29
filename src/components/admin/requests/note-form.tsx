"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { focusFirstError, validateForm } from "@/components/forms/client-validation";
import { Field, Textarea } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { addInternalNoteAction, postCustomerUpdateAction } from "@/lib/admin/actions/requests";
import { NOTE_MAX } from "@/lib/admin/domain";
import { idleState } from "@/lib/portal/form-state";
import type { FieldErrors } from "@/lib/validation/leads";
import { ConfirmDialog } from "./confirm-dialog";

type Kind = "internal" | "customer";

const copy: Record<Kind, { label: string; hint: string; button: string; pending: string; noun: string }> = {
  internal: {
    label: "Internal note",
    hint: "Only the team sees this. Never shown to the customer.",
    button: "Add internal note",
    pending: "Adding…",
    noun: "the note",
  },
  customer: {
    label: "Message to the customer",
    hint: "Shown on the customer's request timeline, with a notification. It can't be edited or removed afterwards.",
    button: "Send to customer",
    pending: "Sending…",
    noun: "the update",
  },
};

/**
 * One form per audience, so an internal note can never be sent to the
 * customer by picking the wrong option: the audience is fixed by the form
 * (and by the database function it calls). Messages to the customer are
 * confirmed first.
 */
export function NoteForm({ requestId, kind, customerName }: { requestId: string; kind: Kind; customerName: string }) {
  const [state, formAction, pending] = useActionState(kind === "internal" ? addInternalNoteAction : postCustomerUpdateAction, idleState);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const text = copy[kind];
  const id = `${kind}-body`;

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const send = () => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startTransition(() => formAction(data));
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm(event.currentTarget);
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      focusFirstError(event.currentTarget, errors);
      return;
    }
    setClientErrors(null);
    if (kind === "customer") dialogRef.current?.showModal();
    else send();
  }

  const fieldError = clientErrors?.body ?? (state.status === "error" ? state.fieldErrors?.body : undefined);
  const formError = clientErrors ? undefined : state.status === "error" && !state.fieldErrors?.body ? state.message : undefined;

  return (
    <>
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate onChange={() => clientErrors && setClientErrors(null)} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <Field id={id} label={text.label} hint={text.hint} error={fieldError}>
          {(describedBy) => (
            <Textarea
              id={id}
              name="body"
              rows={4}
              required
              maxLength={NOTE_MAX}
              data-label={text.noun}
              aria-describedby={describedBy}
              aria-invalid={fieldError ? true : undefined}
              disabled={pending}
            />
          )}
        </Field>
        <FormStatus error={formError} success={state.status === "success" ? state.message : undefined} statusRef={statusRef} />
        <PendingButton pending={pending} variant="secondary" pendingLabel={text.pending}>
          {text.button}
        </PendingButton>
      </form>
      {kind === "customer" ? (
        <ConfirmDialog
          dialogRef={dialogRef}
          id="confirm-update"
          title={`Send this update to ${customerName}?`}
          confirmLabel="Send update"
          onConfirm={() => {
            dialogRef.current?.close();
            send();
          }}
          onClose={() => formRef.current?.querySelector<HTMLButtonElement>("button[type=submit]")?.focus()}
        >
          <p>They will see it on their request timeline and get a notification.</p>
          <p>Updates can&apos;t be edited or removed afterwards.</p>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
