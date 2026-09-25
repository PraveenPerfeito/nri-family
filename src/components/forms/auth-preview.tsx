import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { Field, Input } from "./fields";

/**
 * Phase 1 placeholder for authentication forms. The fields are shown so the
 * layout is ready for Phase 2, but the fieldset is disabled and there is no
 * submit handler — we never pretend an account was created or signed in.
 */
export function AuthPreview({
  fields,
  submitLabel,
  children,
}: {
  fields: { id: string; label: string; type?: string; autoComplete?: string }[];
  submitLabel: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <div role="note" className="flex gap-3 rounded-card border border-info/15 bg-info-soft p-4 text-sm">
        <Construction aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
        <p className="leading-relaxed text-ink-muted">
          <strong className="text-ink">Coming in Phase 2.</strong> Customer accounts are not open yet. In the meantime, our team can
          help you directly.
        </p>
      </div>
      <form aria-label={`${submitLabel} (not yet available)`} className="mt-6" action="#">
        <fieldset disabled className="space-y-4">
          <legend className="sr-only">{submitLabel} — not yet available</legend>
          {fields.map((f) => (
            <Field key={f.id} id={f.id} label={f.label}>
              {(d) => <Input id={f.id} name={f.id} type={f.type ?? "text"} autoComplete={f.autoComplete} aria-describedby={d} />}
            </Field>
          ))}
          <button
            type="submit"
            className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-control bg-brand/50 text-[0.9375rem] font-medium text-white disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </fieldset>
      </form>
      {children}
    </div>
  );
}
