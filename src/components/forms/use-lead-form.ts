"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { initialFormState, type FormState } from "@/lib/leads/types";
import type { FieldErrors } from "@/lib/validation/leads";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Human message for a control's native validity state. */
function messageFor(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | undefined {
  const v = el.validity;
  if (v.valid) return undefined;
  if (el.dataset.message) return el.dataset.message;
  const label = el.dataset.label ?? "this field";
  if (v.valueMissing) return el instanceof HTMLSelectElement ? `Please choose ${label}.` : `Please enter ${label}.`;
  if (v.typeMismatch && el.type === "email") return "Please enter a valid email address.";
  if (v.patternMismatch) return el.dataset.patternMessage ?? `Please check ${label}.`;
  if (v.tooShort) return `Please enter at least ${el.getAttribute("minlength")} characters.`;
  if (v.tooLong) return `Please use ${el.getAttribute("maxlength")} characters or fewer.`;
  return `Please check ${label}.`;
}

function validate(form: HTMLFormElement): FieldErrors {
  const errors: FieldErrors = {};
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
    if (!el.name || el.type === "hidden" || el.type === "radio" || (el.type === "checkbox" && el.name !== "consent")) continue;
    const msg = messageFor(el);
    if (msg && !errors[el.name]) errors[el.name] = msg;
  }
  // Required radio/checkbox groups.
  for (const group of Array.from(form.querySelectorAll<HTMLFieldSetElement>("fieldset[data-group][data-required]"))) {
    const name = group.dataset.group!;
    if (!group.querySelector("input:checked")) {
      errors[name] = group.dataset.message ?? (name === "topics" ? "Please choose at least one area you need help with." : "Please choose an option.");
    }
  }
  return errors;
}

/**
 * Shared behaviour for enquiry forms:
 * - client-side validation with accessible inline messages
 * - server action submit without resetting the form (so data is never lost on error)
 * - pending state, focus management and a success hook
 */
export function useLeadForm(action: Action, onSuccess?: (submitted: FormData) => void) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
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
    startTransition(() => formAction(data));
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

function focusFirstError(form: HTMLFormElement | null, errors: FieldErrors) {
  if (!form) return;
  const first = Object.keys(errors)[0];
  if (!first) return;
  const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`);
  el?.focus();
}
