"use client";

import type { ReactNode, RefObject } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";

/**
 * A confirmation step on the native <dialog>: focus is trapped while open,
 * Escape or "Go back" cancels, and `onClose` lets the caller return focus.
 */
export function ConfirmDialog({
  dialogRef,
  id,
  title,
  children,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  onClose,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  id: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onClose?: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      onClose={onClose}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-night/40"
    >
      <div className="p-6">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <div id={`${id}-body`} className="mt-2 space-y-2 text-sm text-ink-muted">
          {children}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
            Go back
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
