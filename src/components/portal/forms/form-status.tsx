import type { ReactNode, Ref } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/button";

/** Form-level error or success message, announced to screen readers and focusable. */
export function FormStatus({ error, success, statusRef }: { error?: string; success?: string; statusRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
      <div role="alert">
        {error ? (
          <p className="flex items-start gap-2.5 rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
            {error}
          </p>
        ) : null}
      </div>
      <div role="status">
        {success ? (
          <p className="flex items-start gap-2.5 rounded-control border border-good/20 bg-good-soft px-4 py-3 text-sm text-ink">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-good" />
            {success}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PendingButton({
  pending,
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  className,
}: {
  pending: boolean;
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Button type="submit" size="lg" variant={variant} disabled={pending} aria-disabled={pending} className={className}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
