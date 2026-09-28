"use client";

import { Field, Input, Select } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { usePortalForm } from "@/components/portal/forms/use-portal-form";
import type { Profile } from "@/lib/portal/domain";
import { updateProfileAction } from "@/lib/portal/actions/account";
import { PHONE_HTML_PATTERN } from "@/lib/validation/patterns";

type Option = { value: string; label: string };

export function ProfileForm({
  profile,
  email,
  countries,
  timeZones,
}: {
  profile: Pick<Profile, "full_name" | "phone" | "country" | "timezone">;
  email: string;
  countries: { common: Option[]; all: Option[] };
  timeZones: { region: string; zones: string[] }[];
}) {
  const { formAction, pending, errors, formError, success, onSubmit, onChange, formRef, statusRef } = usePortalForm(updateProfileAction);

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-6">
      <FormStatus error={formError} success={success} statusRef={statusRef} />
      <Field id="fullName" label="Full name" error={errors.fullName}>
        {(describedBy) => (
          <Input
            id="fullName"
            name="fullName"
            defaultValue={profile.full_name}
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
      <Field id="email" label="Email" hint="Your sign-in address. To change it, contact our team.">
        {(describedBy) => <Input id="email" value={email} readOnly aria-readonly="true" aria-describedby={describedBy} className="bg-subtle text-ink-muted" />}
      </Field>
      <Field id="phone" label="Phone or WhatsApp" optional error={errors.phone} hint="Include the country code, e.g. +971 50 123 4567.">
        {(describedBy) => (
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            autoComplete="tel"
            pattern={PHONE_HTML_PATTERN}
            data-pattern-message="Please enter a valid phone number, including the country code."
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="country" label="Country you live in" optional error={errors.country}>
          {(describedBy) => (
            <Select id="country" name="country" defaultValue={profile.country ?? ""} autoComplete="country" aria-invalid={errors.country ? true : undefined} aria-describedby={describedBy}>
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
        <Field id="timezone" label="Time zone" optional error={errors.timezone} hint="Dates in your workspace use this time zone.">
          {(describedBy) => (
            <Select id="timezone" name="timezone" defaultValue={profile.timezone ?? ""} aria-invalid={errors.timezone ? true : undefined} aria-describedby={describedBy}>
              <option value="">India time (default)</option>
              {timeZones.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="flex justify-end border-t border-line-subtle pt-6">
        <PendingButton pending={pending}>Save profile</PendingButton>
      </div>
    </form>
  );
}
