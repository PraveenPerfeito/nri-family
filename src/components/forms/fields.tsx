import type { ComponentProps, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const controlClasses =
  "block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink shadow-xs placeholder:text-ink-subtle/80 transition-colors hover:border-ink/30 focus:border-brand focus:outline-none focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-subtle aria-invalid:border-danger sm:text-sm";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
  className?: string;
};

/** Label + control + hint + error, wired with aria-describedby. */
export function Field({ id, label, error, hint, optional, children, className }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-subtle">(optional)</span> : null}
      </label>
      <div className="mt-1.5">{children(describedBy)}</div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "min-h-32 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        controlClasses,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%235d6776%22><path d=%22M5.5 7.5 10 12l4.5-4.5%22 stroke=%22%235d6776%22 stroke-width=%221.6%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** Group of radios or checkboxes inside a fieldset with a legend. */
export function ChoiceGroup({
  name,
  legend,
  type,
  options,
  error,
  required,
  columns = 2,
}: {
  name: string;
  legend: string;
  type: "radio" | "checkbox";
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  columns?: 2 | 3;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined} data-group={name} data-required={required ? "" : undefined}>
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className={cn("mt-2.5 grid gap-2", columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
        {options.map((o) => {
          const id = `${name}-${o.value.toLowerCase().replace(/\W+/g, "-")}`;
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-ink/30 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:shadow-focus",
                error ? "border-danger/60" : "border-line-strong",
              )}
            >
              <input id={id} type={type} name={name} value={o.value} className="size-4 shrink-0 accent-brand focus:outline-none" />
              {o.label}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

export function ConsentCheckbox({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 text-sm text-ink-muted">
        <input
          id="consent"
          type="checkbox"
          name="consent"
          required
          data-message="Please confirm you agree so we can contact you."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "consent-error" : undefined}
          className="mt-0.5 size-4 shrink-0 accent-brand"
        />
        <span>{children}</span>
      </label>
      <FieldError id="consent-error" message={error} />
    </div>
  );
}
