"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ConsentCheckbox, Field, Input, Select } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { usePortalForm } from "@/components/portal/forms/use-portal-form";
import { routes } from "@/config/routes";
import { forgotPasswordAction, resendConfirmationAction, resetPasswordAction, signInAction, signUpAction } from "@/lib/portal/actions/auth";

/*
 * Account forms. Every action validates on the server; these add accessible
 * inline checks and keep typed values when something needs fixing.
 */

function EmailField({ error, defaultValue }: { error?: string; defaultValue?: string }) {
  return (
    <Field id="email" label="Email" error={error}>
      {(describedBy) => (
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={defaultValue}
          maxLength={254}
          data-label="your email address"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
      )}
    </Field>
  );
}

function ResendConfirmation() {
  const { formAction, pending, errors, formError, success, onSubmit, onChange, formRef, statusRef } = usePortalForm(resendConfirmationAction);
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-4 rounded-control border border-line bg-canvas p-4">
      <p className="text-sm font-medium text-ink">Send the confirmation link again</p>
      <FormStatus error={formError} success={success} statusRef={statusRef} />
      <EmailField error={errors.email} />
      <PendingButton pending={pending} variant="secondary" pendingLabel="Sending…" className="w-full">
        Send link
      </PendingButton>
    </form>
  );
}

export function LoginForm({ next }: { next: string }) {
  const { state, formAction, pending, errors, formError, onSubmit, onChange, formRef, statusRef } = usePortalForm(signInAction);
  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-5">
        <FormStatus error={formError} statusRef={statusRef} />
        <input type="hidden" name="next" value={next} />
        <EmailField error={errors.email} />
        <Field id="password" label="Password" error={errors.password}>
          {(describedBy) => (
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              data-label="your password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <div className="flex items-center justify-end">
          <Link href={routes.forgotPassword} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <PendingButton pending={pending} pendingLabel="Signing in…" className="w-full">
          Sign in
        </PendingButton>
      </form>
      {state.needsConfirmation ? <ResendConfirmation /> : null}
    </div>
  );
}

export function RegisterForm({ countries }: { countries: { common: { value: string; label: string }[]; all: { value: string; label: string }[] } }) {
  const { state, formAction, pending, errors, formError, onSubmit, onChange, formRef, statusRef } = usePortalForm(signUpAction);
  const timezoneRef = useRef<HTMLInputElement>(null);

  // The customer's own time zone, so workspace dates make sense where they live.
  useEffect(() => {
    if (timezoneRef.current) timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  }, []);

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="space-y-5 focus:outline-none">
        <div className="rounded-card border border-good/20 bg-good-soft p-5 text-center">
          <MailCheck aria-hidden className="mx-auto size-8 text-good" strokeWidth={1.5} />
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink">Check your inbox</h2>
          <p className="mt-1.5 text-sm text-ink-muted">{state.message}</p>
        </div>
        <ResendConfirmation />
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-5">
      <FormStatus error={formError} statusRef={statusRef} />
      <input ref={timezoneRef} type="hidden" name="timezone" defaultValue="" />
      <Field id="fullName" label="Full name" error={errors.fullName}>
        {(describedBy) => (
          <Input
            id="fullName"
            name="fullName"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            data-label="your full name"
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <EmailField error={errors.email} />
      <Field id="password" label="Password" error={errors.password} hint="At least 10 characters. A few words together work well.">
        {(describedBy) => (
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
            data-label="a password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field id="country" label="Country you live in" optional error={errors.country}>
        {(describedBy) => (
          <Select id="country" name="country" defaultValue="" autoComplete="country" aria-invalid={errors.country ? true : undefined} aria-describedby={describedBy}>
            <option value="">Prefer not to say</option>
            <optgroup label="Common">
              {countries.common.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="All countries">
              {countries.all.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </Select>
        )}
      </Field>
      <ConsentCheckbox error={errors.consent} message="Please agree to the terms to create your account.">
        I agree to the{" "}
        <Link href={routes.terms} className="font-medium text-brand underline-offset-4 hover:underline">
          Terms
        </Link>{" "}
        and the{" "}
        <Link href={routes.privacy} className="font-medium text-brand underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </ConsentCheckbox>
      <PendingButton pending={pending} pendingLabel="Creating your account…" className="w-full">
        Create account
      </PendingButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { formAction, pending, errors, formError, success, onSubmit, onChange, formRef, statusRef } = usePortalForm(forgotPasswordAction);
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-5">
      <FormStatus error={formError} success={success} statusRef={statusRef} />
      <EmailField error={errors.email} />
      <PendingButton pending={pending} pendingLabel="Sending…" className="w-full">
        Send reset link
      </PendingButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const { formAction, pending, errors, formError, onSubmit, onChange, formRef, statusRef } = usePortalForm(resetPasswordAction);
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-5">
      <FormStatus error={formError} statusRef={statusRef} />
      <Field id="password" label="New password" error={errors.password} hint="At least 10 characters.">
        {(describedBy) => (
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
            data-label="a new password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field id="confirmPassword" label="Repeat new password" error={errors.confirmPassword}>
        {(describedBy) => (
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            data-label="the new password again"
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <PendingButton pending={pending} pendingLabel="Saving…" className="w-full">
        Set new password
      </PendingButton>
    </form>
  );
}
