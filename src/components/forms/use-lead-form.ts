"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { completeRelay } from "@/lib/leads/browser-relay";
import { initialFormState, type FormState } from "@/lib/leads/types";
import type { FieldErrors } from "@/lib/validation/leads";
import { focusFirstError, validateForm as validate } from "./client-validation";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const UNEXPECTED_ERROR: FormState = {
  status: "error",
  message: "We couldn't send your request just now. Please check your connection and try again.",
};

/**
 * Shared behaviour for enquiry forms:
 * - client-side validation with accessible inline messages
 * - server action submit without resetting the form (so data is never lost on error)
 * - when the server returns a "relay" result, the browser completes the email
 *   hand-off (see src/lib/leads/browser-relay.ts)
 * - pending state, focus management and a success hook
 *
 * With JavaScript, onSubmit calls the server action directly. Without it, the
 * form posts natively through useActionState; the relay step needs JavaScript,
 * so that path shows the direct-contact fallback instead.
 */
export function useLeadForm(action: Action, onSuccess?: (submitted: FormData) => void) {
  const [actionState, formAction, actionPending] = useActionState(action, initialFormState);
  const [result, setResult] = useState<FormState | null>(null);
  const [submitting, startSubmitting] = useTransition();
  const pending = submitting || actionPending;
  const state = useMemo<FormState>(() => {
    if (result) return result;
    if (actionState.status === "relay") return { status: "error", message: actionState.fallbackMessage };
    return actionState;
  }, [result, actionState]);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  // Fields the user has changed since the last submit; their errors are hidden.
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const startedAtRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const lastSubmittedRef = useRef<FormData | null>(null);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (startedAtRef.current) startedAtRef.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      successRef.current?.focus();
      if (lastSubmittedRef.current) onSuccessRef.current?.(lastSubmittedRef.current);
    } else if (state.status === "error" && state.fieldErrors) {
      focusFirstError(formRef.current, state.fieldErrors);
    }
  }, [state]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      setEdited(new Set());
      focusFirstError(form, errors);
      return;
    }
    setClientErrors(null);
    setEdited(new Set());
    const data = new FormData(form);
    lastSubmittedRef.current = data;
    startSubmitting(async () => {
      try {
        const serverState = await action(result ?? initialFormState, data);
        const settled = await completeRelay(serverState);
        setResult(settled);
      } catch {
        setResult(UNEXPECTED_ERROR);
      }
    });
  }

  const baseErrors: FieldErrors = clientErrors ?? (state.status === "error" ? (state.fieldErrors ?? {}) : {});
  const errors: FieldErrors = Object.fromEntries(Object.entries(baseErrors).filter(([name]) => !edited.has(name)));

  function onChange(e: FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    if (name && baseErrors[name] && !edited.has(name)) setEdited(new Set(edited).add(name));
  }
  const formError = clientErrors ? "Please check the highlighted fields." : state.status === "error" ? state.message : undefined;

  return { state, formAction, pending, errors, formError, onSubmit, onChange, formRef, startedAtRef, successRef };
}

