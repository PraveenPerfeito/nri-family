import type { FieldErrors } from "@/lib/validation/leads";

/*
 * Browser-side form checks shared by the enquiry forms and the customer
 * portal. They only improve the experience: every Server Action validates
 * again, and the database has its own constraints.
 */

/** Human message for a control's native validity state. */
export function messageFor(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | undefined {
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

export function validateForm(form: HTMLFormElement): FieldErrors {
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

export function focusFirstError(form: HTMLFormElement | null, errors: FieldErrors) {
  if (!form) return;
  const first = Object.keys(errors)[0];
  if (!first) return;
  const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`);
  el?.focus();
}
