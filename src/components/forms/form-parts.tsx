import type { ReactNode, Ref } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { HONEYPOT_FIELD, STARTED_AT_FIELD } from "@/lib/leads/types";
import { Button } from "@/components/ui/button";

/** Honeypot + timing field. Hidden from people and assistive tech. */
export function SpamFields({ startedAtRef }: { startedAtRef: Ref<HTMLInputElement> }) {
  return (
    <>
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input ref={startedAtRef} type="hidden" name={STARTED_AT_FIELD} defaultValue="" />
    </>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={pending} aria-disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
          Sending…
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function FormAlert({ message }: { message?: string }) {
  return (
    <div role="alert" aria-live="assertive">
      {message ? (
        <p className="flex items-start gap-2.5 rounded-control border border-attention/25 bg-attention-soft px-4 py-3 text-sm text-ink">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-attention" />
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function SuccessPanel({ message, successRef, children }: { message?: string; successRef: Ref<HTMLDivElement>; children?: ReactNode }) {
  return (
    <div
      ref={successRef}
      tabIndex={-1}
      role="status"
      className="rounded-panel border border-good/20 bg-good-soft p-8 text-center focus:outline-none sm:p-10"
    >
      <CheckCircle2 aria-hidden className="mx-auto size-10 text-good" strokeWidth={1.5} />
      <h2 className="text-display mt-4 text-2xl text-ink sm:text-3xl">Request received</h2>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-muted">{message}</p>
      {children}
    </div>
  );
}
