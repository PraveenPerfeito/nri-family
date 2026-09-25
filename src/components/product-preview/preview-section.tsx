import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** A padded block inside the window, optionally with a small label and a right-hand aside. */
export function PreviewSection({ label, aside, children, className }: { label?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-4 sm:px-5", className)}>
      {label ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-label text-ink-subtle">{label}</p>
          {aside}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** The subject of the screen: a property, request, folder or record. */
export function PreviewTitle({ eyebrow, title, meta, aside }: { eyebrow?: string; title: string; meta?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs text-ink-subtle">{eyebrow}</p> : null}
        <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-ink">{title}</p>
        {meta ? <p className="mt-0.5 text-xs text-ink-subtle">{meta}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
