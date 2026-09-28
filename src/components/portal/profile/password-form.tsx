"use client";

import { Field, Input } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { usePortalForm } from "@/components/portal/forms/use-portal-form";
import { changePasswordAction } from "@/lib/portal/actions/auth";

export function ChangePasswordForm() {
  const { formAction, pending, errors, formError, success, onSubmit, onChange, formRef, statusRef } = usePortalForm(changePasswordAction);
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-5">
      <FormStatus error={formError} success={success} statusRef={statusRef} />
      <Field id="currentPassword" label="Current password" error={errors.currentPassword}>
        {(describedBy) => (
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            data-label="your current password"
            aria-invalid={errors.currentPassword ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>
      <div className="flex justify-end">
        <PendingButton pending={pending} pendingLabel="Changing…">
          Change password
        </PendingButton>
      </div>
    </form>
  );
}
