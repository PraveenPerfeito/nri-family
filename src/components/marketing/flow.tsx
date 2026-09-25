import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/*
 * Step chain, e.g. REQUEST → ASSIGNED → … → INVOICE.
 * A vertical rail on small screens; an evenly spaced horizontal track once
 * there is room (md for short chains, xl for long ones), so no step is ever
 * orphaned on its own row.
 */
const layouts = {
  md: {
    list: "md:w-full md:grid-cols-[repeat(var(--steps),minmax(0,1fr))]",
    item: "md:flex-col md:gap-3 md:pb-0 md:text-center",
    line: "md:top-[1.125rem] md:bottom-auto md:left-[calc(50%+1.5rem)] md:right-[calc(-50%+1.5rem)] md:h-px md:w-auto",
  },
  xl: {
    list: "xl:w-full xl:grid-cols-[repeat(var(--steps),minmax(0,1fr))]",
    item: "xl:flex-col xl:gap-3 xl:pb-0 xl:text-center",
    line: "xl:top-[1.125rem] xl:bottom-auto xl:left-[calc(50%+1.5rem)] xl:right-[calc(-50%+1.5rem)] xl:h-px xl:w-auto",
  },
} as const;

export function FlowChain({
  steps,
  label,
  tone = "light",
  highlightLast = true,
}: {
  steps: string[];
  label: string;
  tone?: "light" | "night";
  highlightLast?: boolean;
}) {
  const night = tone === "night";
  const layout = layouts[steps.length > 7 ? "xl" : "md"];
  return (
    <ol aria-label={label} style={{ "--steps": steps.length } as CSSProperties} className={cn("mx-auto grid w-fit", layout.list)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const accent = last && highlightLast;
        return (
          <li key={step} className={cn("relative flex items-center gap-4 pb-5", layout.item)}>
            {!last ? (
              <span
                aria-hidden
                className={cn("absolute top-9 bottom-0 left-[1.0625rem] w-px", night ? "bg-night-line" : "bg-line-strong", layout.line)}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                accent
                  ? "border-brand bg-brand text-white"
                  : night
                    ? "border-night-line bg-night-raised text-brand-muted"
                    : "border-line-strong bg-surface text-brand",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={cn("text-xs font-semibold tracking-[0.12em] uppercase", night ? "text-night-text" : "text-ink")}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

export type TimelineStep = { title: string; body: ReactNode; meta?: ReactNode };

/** Detailed numbered steps with descriptions. */
export function Timeline({ steps, label, startAt = 1 }: { steps: TimelineStep[]; label: string; startAt?: number }) {
  return (
    <ol aria-label={label} className="relative space-y-0">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.title} className="relative grid grid-cols-[2.75rem_1fr] gap-4 pb-8 last:pb-0 sm:gap-5">
            {!last ? <span aria-hidden className="absolute top-11 bottom-0 left-[1.375rem] w-px bg-line-strong" /> : null}
            <span className="relative z-10 inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold text-brand tabular-nums shadow-card">
              {String(i + startAt).padStart(2, "0")}
            </span>
            <div className="pt-2">
              <h3 className="text-base font-semibold text-ink">{step.title}</h3>
              <div className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</div>
              {step.meta ? <div className="mt-3">{step.meta}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
