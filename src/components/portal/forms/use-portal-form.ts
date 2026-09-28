"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { focusFirstError, validateForm } from "@/components/forms/client-validation";
import type { ActionState } from "@/lib/portal/form-state";
import type { FieldErrors } from "@/lib/validation/leads";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Portal form behaviour:
 * - native-validity checks with accessible inline messages before sending;
 * - with JavaScript the action is dispatched in a transition, so the form is
 *   not reset and nothing typed is lost on an error; without JavaScript the
 *   form still posts natively through `formAction`;
 * - server field errors shown inline, cleared as each field is edited;
 * - focus moves to the first problem, or to the status message.
 */
export function usePortalForm(action: Action) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } satisfies ActionState);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error" && state.fieldErrors && Object.keys(state.fieldErrors).length > 0) focusFirstError(formRef.current, state.fieldErrors);
    else if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateForm(form);
    setEdited(new Set());
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      focusFirstError(form, errors);
      return;
    }
    setClientErrors(null);
    const data = new FormData(form);
    startTransition(() => formAction(data));
  }

  const base: FieldErrors = clientErrors ?? (state.status === "error" ? (state.fieldErrors ?? {}) : {});
  const errors: FieldErrors = Object.fromEntries(Object.entries(base).filter(([name]) => !edited.has(name)));

  function onChange(event: FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name;
    if (name && base[name] && !edited.has(name)) setEdited(new Set(edited).add(name));
  }

  const formError = clientErrors ? "Please check the highlighted fields." : state.status === "error" ? state.message : undefined;
  const success = !clientErrors && state.status === "success" ? state.message : undefined;

  return { state, formAction, pending, errors, formError, success, onSubmit, onChange, formRef, statusRef };
}
