"use client";

import Link from "next/link";
import { Field, Input, Select, Textarea } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { usePortalForm } from "@/components/portal/forms/use-portal-form";
import { ownershipTypes, propertyTypes, type Property } from "@/lib/portal/domain";
import type { ActionState } from "@/lib/portal/form-state";
import { tamilNaduDistricts } from "@/lib/portal/places";

/** Add or edit a property. The server validates again and sets the owner itself. */
export function PropertyForm({
  action,
  property,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  property?: Property;
  submitLabel: string;
  cancelHref: string;
}) {
  const { formAction, pending, errors, formError, success, onSubmit, onChange, formRef, statusRef } = usePortalForm(action);

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-8">
      <FormStatus error={formError} success={success} statusRef={statusRef} />

      <fieldset className="space-y-5">
        <legend className="text-label text-ink">The property</legend>
        <Field id="name" label="Property name" error={errors.name} hint="A name you'll recognise, like “Chennai House” or “Farm near Tiruvallur”.">
          {(describedBy) => (
            <Input
              id="name"
              name="name"
              defaultValue={property?.name}
              required
              maxLength={120}
              autoComplete="off"
              data-label="a property name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="propertyType" label="Type of property" error={errors.propertyType}>
            {(describedBy) => (
              <Select
                id="propertyType"
                name="propertyType"
                defaultValue={property?.property_type ?? ""}
                required
                data-label="the type of property"
                aria-invalid={errors.propertyType ? true : undefined}
                aria-describedby={describedBy}
              >
                <option value="" disabled>
                  Choose a type
                </option>
                {propertyTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="ownershipType" label="Ownership" optional error={errors.ownershipType}>
            {(describedBy) => (
              <Select
                id="ownershipType"
                name="ownershipType"
                defaultValue={property?.ownership_type ?? ""}
                aria-invalid={errors.ownershipType ? true : undefined}
                aria-describedby={describedBy}
              >
                <option value="">Prefer not to say</option>
                {ownershipTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-label text-ink">Location in Tamil Nadu</legend>
        <p className="-mt-2 text-sm text-ink-muted">The full address stays private to you and the team members who handle your requests.</p>
        <Field id="addressLine1" label="Address" optional error={errors.addressLine1}>
          {(describedBy) => (
            <Input
              id="addressLine1"
              name="addressLine1"
              defaultValue={property?.address_line_1 ?? ""}
              maxLength={200}
              autoComplete="address-line1"
              placeholder="Door number and street"
              aria-invalid={errors.addressLine1 ? true : undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Field id="addressLine2" label="Address line 2" optional error={errors.addressLine2}>
          {(describedBy) => (
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={property?.address_line_2 ?? ""}
              maxLength={200}
              autoComplete="address-line2"
              placeholder="Area or landmark"
              aria-invalid={errors.addressLine2 ? true : undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="city" label="City or town" error={errors.city}>
            {(describedBy) => (
              <Input
                id="city"
                name="city"
                defaultValue={property?.city}
                required
                maxLength={80}
                autoComplete="address-level2"
                data-label="the city or town"
                aria-invalid={errors.city ? true : undefined}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          <Field id="district" label="District" optional error={errors.district}>
            {(describedBy) => (
              <Select id="district" name="district" defaultValue={property?.district ?? ""} aria-invalid={errors.district ? true : undefined} aria-describedby={describedBy}>
                <option value="">Not sure</option>
                {tamilNaduDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="postalCode" label="PIN code" optional error={errors.postalCode}>
            {(describedBy) => (
              <Input
                id="postalCode"
                name="postalCode"
                defaultValue={property?.postal_code ?? ""}
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="[1-9][0-9]{5}"
                maxLength={7}
                data-pattern-message="Please enter a 6-digit PIN code."
                aria-invalid={errors.postalCode ? true : undefined}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <Field id="notes" label="Notes for our team" optional error={errors.notes} hint="Access details, a caretaker's timings, anything that helps. Up to 2,000 characters.">
        {(describedBy) => (
          <Textarea
            id="notes"
            name="notes"
            defaultValue={property?.notes ?? ""}
            maxLength={2000}
            rows={4}
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-line-subtle pt-6 sm:flex-row sm:items-center sm:justify-end">
        <Link href={cancelHref} className="inline-flex h-12 items-center justify-center px-4 text-sm font-medium text-ink-muted hover:text-ink">
          Cancel
        </Link>
        <PendingButton pending={pending}>{submitLabel}</PendingButton>
      </div>
    </form>
  );
}
