"use client";

import Link from "next/link";
import { commonCountries, contactCategories } from "@/config/leads";
import { routes } from "@/config/routes";
import { submitContact } from "@/lib/leads/actions";
import { track } from "@/lib/analytics/track";
import { PHONE_HTML_PATTERN } from "@/lib/validation/patterns";
import { ConsentCheckbox, Field, Input, Select, Textarea } from "./fields";
import { FormAlert, SpamFields, SubmitButton, SuccessPanel } from "./form-parts";
import { useLeadForm } from "./use-lead-form";

export function ContactForm() {
  const { state, formAction, pending, errors, formError, onSubmit, onChange, formRef, startedAtRef, successRef } = useLeadForm(
    submitContact,
    (data) => track("contact_submitted", { category: String(data.get("category") ?? "") }),
  );

  if (state.status === "success") return <SuccessPanel message={state.message} successRef={successRef} />;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate aria-busy={pending} className="relative space-y-5">
      <SpamFields startedAtRef={startedAtRef} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name}>
          {(d) => <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={100} data-label="your name" aria-invalid={!!errors.name || undefined} aria-describedby={d} />}
        </Field>
        <Field id="country" label="Country you live in" error={errors.country}>
          {(d) => (
            <>
              <Input id="country" name="country" list="country-options" autoComplete="country-name" required minLength={2} maxLength={60} data-label="your country" aria-invalid={!!errors.country || undefined} aria-describedby={d} />
              <datalist id="country-options">
                {commonCountries.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          {(d) => <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} data-label="your email address" aria-invalid={!!errors.email || undefined} aria-describedby={d} />}
        </Field>
        <Field id="phone" label="Phone / WhatsApp" hint="Include your country code, e.g. +971 50 123 4567" error={errors.phone}>
          {(d) => (
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              pattern={PHONE_HTML_PATTERN}
              data-label="a phone or WhatsApp number"
              data-pattern-message="Please enter a valid phone number, including the country code."
              aria-invalid={!!errors.phone || undefined}
              aria-describedby={d}
            />
          )}
        </Field>
      </div>

      <Field id="category" label="Service category" error={errors.category}>
        {(d) => (
          <Select id="category" name="category" required defaultValue="" data-label="a service category" aria-invalid={!!errors.category || undefined} aria-describedby={d}>
            <option value="" disabled>
              Choose one…
            </option>
            {contactCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field id="message" label="Message" hint="Please don't include documents, ID numbers or financial details." error={errors.message}>
        {(d) => <Textarea id="message" name="message" rows={5} required minLength={10} maxLength={2000} data-label="a short message" aria-invalid={!!errors.message || undefined} aria-describedby={d} />}
      </Field>

      <ConsentCheckbox error={errors.consent}>
        I agree that my details may be used to respond to this enquiry, as described in the{" "}
        <Link href={routes.privacy} className="font-medium text-brand underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </ConsentCheckbox>

      <FormAlert message={formError} />
      <SubmitButton pending={pending}>Send message</SubmitButton>
    </form>
  );
}
