"use client";

import Link from "next/link";
import { commonCountries, helpTopics } from "@/config/leads";
import { routes } from "@/config/routes";
import { submitGetStarted } from "@/lib/leads/actions";
import { track } from "@/lib/analytics/track";
import { PHONE_HTML_PATTERN } from "@/lib/validation/patterns";
import { buttonClasses } from "@/components/ui/button";
import { ChoiceGroup, ConsentCheckbox, Field, Input, Textarea } from "./fields";
import { FormAlert, SpamFields, SubmitButton, SuccessPanel } from "./form-parts";
import { useLeadForm } from "./use-lead-form";

export function GetStartedForm() {
  const { state, formAction, pending, errors, formError, onSubmit, onChange, formRef, startedAtRef, successRef } = useLeadForm(
    submitGetStarted,
    (data) => track("get_started_submitted", { topics_count: data.getAll("topics").length }),
  );

  if (state.status === "success") {
    return (
      <SuccessPanel message={state.message} successRef={successRef}>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={routes.howItWorks} className={buttonClasses({ variant: "secondary" })}>
            See how it works
          </Link>
          <Link href={routes.trust} className={buttonClasses({ variant: "secondary" })}>
            How we protect your data
          </Link>
        </div>
      </SuccessPanel>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate aria-busy={pending} className="relative space-y-7">
      <SpamFields startedAtRef={startedAtRef} />

      <fieldset className="space-y-5">
        <legend className="text-xs font-semibold tracking-[0.14em] text-ink-subtle uppercase">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Full name" error={errors.name}>
            {(d) => <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={100} data-label="your full name" aria-invalid={!!errors.name || undefined} aria-describedby={d} />}
          </Field>
          <Field id="country" label="Country you live in" error={errors.country}>
            {(d) => (
              <>
                <Input id="country" name="country" list="gs-country-options" autoComplete="country-name" required minLength={2} maxLength={60} data-label="your country" aria-invalid={!!errors.country || undefined} aria-describedby={d} />
                <datalist id="gs-country-options">
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
          <Field id="phone" label="WhatsApp / Phone" hint="Include your country code" error={errors.phone}>
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
      </fieldset>

      <fieldset className="space-y-6 border-t border-line pt-7">
        <legend className="sr-only">Your needs</legend>
        <ChoiceGroup
          name="ownsProperty"
          legend="Do you currently own property in Tamil Nadu?"
          type="radio"
          required
          error={errors.ownsProperty}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
        <ChoiceGroup
          name="topics"
          legend="What do you need help with? Choose all that apply."
          type="checkbox"
          required
          columns={3}
          error={errors.topics}
          options={helpTopics.map((t) => ({ value: t, label: t }))}
        />
        <Field id="details" label="Tell us more" optional hint="Location (city or district is enough), timing, anything we should know. Please don't include documents or ID numbers." error={errors.details}>
          {(d) => <Textarea id="details" name="details" rows={5} maxLength={2000} data-label="more details" aria-invalid={!!errors.details || undefined} aria-describedby={d} />}
        </Field>
      </fieldset>

      <ConsentCheckbox error={errors.consent}>
        I agree that my details may be used to respond to this request, as described in the{" "}
        <Link href={routes.privacy} className="font-medium text-brand underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </ConsentCheckbox>

      <FormAlert message={formError} />
      <SubmitButton pending={pending}>Send my request</SubmitButton>
    </form>
  );
}
