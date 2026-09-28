"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/portal/form-state";

/**
 * A destructive action behind a native <dialog> confirmation: focus is
 * trapped while it is open, Escape cancels, and focus returns to the trigger.
 * The action runs on the server and re-checks ownership there.
 */
export function ConfirmAction({
  action,
  triggerLabel,
  title,
  body,
  confirmLabel,
  pendingLabel = "Working…",
  icon,
}: {
  action: (prev: ActionState) => Promise<ActionState>;
  triggerLabel: string;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  icon?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(action, { status: "idle" } satisfies ActionState);

  useEffect(() => {
    if (state.status === "error") dialogRef.current?.close();
  }, [state]);

  return (
    <div>
      <Button ref={triggerRef} variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        {icon}
        {triggerLabel}
      </Button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        onClose={() => triggerRef.current?.focus()}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-night/40"
      >
        <form action={formAction} className="p-6">
          <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <div className="mt-2 text-sm text-ink-muted">{body}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Keep it
            </Button>
            <Button type="submit" variant="danger" disabled={pending} aria-disabled={pending}>
              {pending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                  {pendingLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
