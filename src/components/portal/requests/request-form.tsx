"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Check } from "lucide-react";
import { focusFirstError, validateForm } from "@/components/forms/client-validation";
import { Field, FieldError, Input, Textarea } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { usePortalForm } from "@/components/portal/forms/use-portal-form";
import { Button } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { labelOf, requestCategories, requestPriorities } from "@/lib/portal/domain";
import type { ActionState } from "@/lib/portal/form-state";
import type { FieldErrors } from "@/lib/validation/leads";
import { cn } from "@/lib/utils/cn";

type PropertyChoice = { id: string; name: string; city: string };

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${number}`} className="grid grid-cols-1 gap-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
      <p aria-hidden className="flex size-8 items-center justify-center rounded-full border border-line-strong bg-surface text-xs font-semibold text-brand tabular-nums">
        {number}
      </p>
      <div className="min-w-0">
        <h2 id={`step-${number}`} className="text-base font-semibold tracking-tight text-ink">
          <span className="sr-only">Step {Number(number)}: </span>
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </section>
  );
}

function RadioCard({ name, value, label, hint, defaultChecked }: { name: string; value: string; label: string; hint?: string; defaultChecked?: boolean }) {
  const id = `${name}-${(value || "none").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label
      htmlFor={id}
      className="flex min-h-12 cursor-pointer items-start gap-3 rounded-control border border-line-strong bg-surface px-3.5 py-3 text-sm transition-colors hover:border-ink/30 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/60 has-[:focus-visible]:shadow-focus"
    >
      <input id={id} type="radio" name={name} value={value} defaultChecked={defaultChecked} className="mt-0.5 size-4 shrink-0 accent-brand focus:outline-none" />
      <span className="min-w-0">
        <span className="block font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Request a service in one form: property, service, description and
 * priority (steps 1–4), then a review (step 5) before anything is sent (6).
 * Pressing Enter in a field opens the review; it never submits directly.
 */
export function RequestForm({
  action,
  properties,
  initialPropertyId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  properties: PropertyChoice[];
  initialPropertyId?: string;
}) {
  const { state, formAction, pending, errors: serverErrors, formError, onSubmit: submitAction, onChange: trackChange, formRef, statusRef } = usePortalForm(action);
  // Review is open for one server state; a new response (an error) returns to the fields.
  const [reviewFor, setReviewFor] = useState<ActionState | null>(null);
  const mode = reviewFor !== null && reviewFor === state ? "review" : "edit";
  const [summary, setSummary] = useState<Record<string, string>>({});
  const [stepErrors, setStepErrors] = useState<FieldErrors | null>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);

  const errors = stepErrors ?? serverErrors;

  function toReview() {
    const el = formRef.current;
    if (!el) return;
    const found = validateForm(el);
    if (Object.keys(found).length > 0) {
      setStepErrors(found);
      focusFirstError(el, found);
      return;
    }
    setStepErrors(null);
    setSummary(Object.fromEntries([...new FormData(el).entries()].map(([k, v]) => [k, String(v)])));
    setReviewFor(state);
    requestAnimationFrame(() => reviewRef.current?.focus());
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (mode === "edit") {
      event.preventDefault();
      toReview();
      return;
    }
    submitAction(event);
  }

  const propertyLabel = (id: string | undefined) => {
    if (!id) return "Not linked to a property";
    const p = properties.find((x) => x.id === id);
    return p ? `${p.name}, ${p.city}` : "—";
  };
  const status = mode === "edit" ? (stepErrors ? "Please check the highlighted fields." : formError) : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      onChange={(e) => {
        setStepErrors(null);
        trackChange(e);
      }}
      noValidate
      className="space-y-10"
    >
      <FormStatus error={status} statusRef={statusRef} />

      <div hidden={mode === "review"} className="space-y-10">
        <Step number="01" title="Which property is this for?">
          <fieldset data-group="propertyId" data-required data-message="Please choose a property, or “Not linked to a property”." aria-describedby={errors.propertyId ? "propertyId-error" : undefined}>
            <legend className="sr-only">Property</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {properties.map((p) => (
                <RadioCard key={p.id} name="propertyId" value={p.id} label={p.name} hint={p.city} defaultChecked={p.id === initialPropertyId || (!initialPropertyId && properties.length === 1)} />
              ))}
              <RadioCard name="propertyId" value="" label="Not linked to a property" hint="For example, help for a family member." defaultChecked={properties.length === 0} />
            </div>
            <FieldError id="propertyId-error" message={errors.propertyId} />
          </fieldset>
          {properties.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
              <Building2 aria-hidden className="size-4 shrink-0 text-ink-subtle" />
              <span>
                For work at a property,{" "}
                <Link href={portalRoutes.newProperty} className="font-medium text-brand underline-offset-4 hover:underline">
                  add the property first
                </Link>
                .
              </span>
            </p>
          ) : null}
        </Step>

        <Step number="02" title="What do you need?">
          <fieldset data-group="category" data-required data-message="Please choose the service you need." aria-describedby={errors.category ? "category-error" : undefined}>
            <legend className="sr-only">Service</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {requestCategories.map((c) => (
                <RadioCard key={c.value} name="category" value={c.value} label={c.label} hint={c.hint} />
              ))}
            </div>
            <FieldError id="category-error" message={errors.category} />
          </fieldset>
        </Step>

        <Step number="03" title="Describe what you need">
          <div className="space-y-5">
            <Field id="title" label="Short summary" optional error={errors.title} hint="Leave blank to use the service name.">
              {(describedBy) => (
                <Input id="title" name="title" maxLength={120} autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={describedBy} />
              )}
            </Field>
            <Field id="description" label="Details" error={errors.description} hint="What should our team know? When did you notice it? Anyone to contact locally?">
              {(describedBy) => (
                <Textarea
                  id="description"
                  name="description"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                  data-label="a short description"
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
          </div>
        </Step>

        <Step number="04" title="How soon?">
          <fieldset data-group="priority" data-required aria-describedby={errors.priority ? "priority-error" : undefined}>
            <legend className="sr-only">Priority</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {requestPriorities.map((p) => (
                <RadioCard key={p.value} name="priority" value={p.value} label={p.label} hint={p.hint} defaultChecked={p.value === "NORMAL"} />
              ))}
            </div>
            <FieldError id="priority-error" message={errors.priority} />
          </fieldset>
        </Step>

        <div className="flex flex-col-reverse gap-3 border-t border-line-subtle pt-6 sm:flex-row sm:items-center sm:justify-end">
          <Link href={portalRoutes.requests} className="inline-flex h-12 items-center justify-center px-4 text-sm font-medium text-ink-muted hover:text-ink">
            Cancel
          </Link>
          <Button size="lg" onClick={toReview}>
            Review request
          </Button>
        </div>
      </div>

      {mode === "review" ? (
        <section aria-labelledby="review-title" className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-brand tabular-nums">05</p>
            <h2 id="review-title" ref={reviewRef} tabIndex={-1} className="mt-1 text-lg font-semibold tracking-tight text-ink focus:outline-none">
              Review your request
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Nothing is sent until you submit. Our team reviews every request before any work or cost.</p>
          </div>
          <dl className="divide-y divide-line-subtle rounded-card border border-line bg-canvas/60 px-5">
            {[
              ["Property", propertyLabel(summary.propertyId)],
              ["Service", labelOf(requestCategories, summary.category)],
              ["Summary", summary.title?.trim() || labelOf(requestCategories, summary.category)],
              ["Details", summary.description],
              ["Priority", labelOf(requestPriorities, summary.priority)],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm text-ink-subtle">{label}</dt>
                <dd className={cn("text-sm font-medium break-words text-ink", label === "Details" && "font-normal whitespace-pre-line")}>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="quiet" size="lg" onClick={() => setReviewFor(null)} disabled={pending}>
              <ArrowLeft aria-hidden className="size-4" />
              Edit request
            </Button>
            <PendingButton pending={pending} pendingLabel="Submitting…">
              <Check aria-hidden className="size-4" />
              Submit request
            </PendingButton>
          </div>
        </section>
      ) : null}
    </form>
  );
}
