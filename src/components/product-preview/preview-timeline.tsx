import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PreviewStep } from "./types";

/** Vertical steps joined by a rail; completed steps tick, the current one is highlighted. */
export function PreviewTimeline({ steps }: { steps: PreviewStep[] }) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={step.label} className="relative grid grid-cols-[1.5rem_1fr_auto] items-center gap-x-3 pb-3 last:pb-0">
          {i < steps.length - 1 ? (
            <span className={cn("absolute top-6 bottom-0 left-[0.6875rem] w-px", step.state === "done" ? "bg-brand/40" : "bg-line")} />
          ) : null}
          <span
            className={cn(
              "relative flex size-6 items-center justify-center rounded-full border",
              step.state === "done" && "border-brand/30 bg-brand-soft text-brand",
              step.state === "current" && "border-brand bg-brand text-white shadow-[0_0_0_4px_rgb(15_90_79/0.12)]",
              step.state === "upcoming" && "border-line bg-surface text-ink-subtle",
            )}
          >
            {step.state === "done" ? <Check className="size-3" strokeWidth={3} /> : <span className={cn("size-1.5 rounded-full bg-current", step.state === "current" && "animate-pulse-soft")} />}
          </span>
          <span className={cn("text-[0.8125rem]", step.state === "upcoming" ? "text-ink-muted" : "font-medium text-ink")}>{step.label}</span>
          {step.meta ? (
            <span className={cn("text-[0.6875rem] tabular-nums", step.state === "current" ? "font-semibold text-brand" : "text-ink-subtle")}>{step.meta}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
