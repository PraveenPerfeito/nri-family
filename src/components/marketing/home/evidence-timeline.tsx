import { BadgeCheck, Camera, CheckCircle2, ClipboardCheck, FileText, Hammer, Inbox, ReceiptText, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DemoLabel } from "@/components/ui/badge";
import { evidenceTimeline } from "@/data/demo";
import { cn } from "@/lib/utils/cn";

const icons: LucideIcon[] = [Inbox, UserCheck, ClipboardCheck, Camera, BadgeCheck, Hammer, CheckCircle2, ReceiptText];

/**
 * The signature view: one service record, step by step, each stamped with a
 * time and the question it answers. As the visitor scrolls, the rail fills and
 * each step lights up at the centre of the screen (scroll-driven CSS, see
 * .timeline-fill / .timeline-node in globals.css); static when motion is reduced.
 */
export function EvidenceTimeline() {
  const last = evidenceTimeline.length - 1;
  return (
    <figure aria-label="Sample service record: kitchen leak at Chennai House" className="min-w-0 rounded-panel border border-line bg-surface shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle px-5 py-4 sm:px-7 sm:py-5">
        <div>
          <p className="text-label flex items-center gap-2 text-ink-subtle">
            <span aria-hidden className="size-1.5 rounded-full bg-good" />
            Service record · Closed
          </p>
          <p className="mt-1.5 text-base font-semibold tracking-tight text-ink">Kitchen leak · Chennai House</p>
          <p className="mt-0.5 text-xs text-ink-subtle tabular-nums">Opened 09:42 · Closed 16:30 · Same day</p>
        </div>
        <DemoLabel />
      </div>

      <ol className="px-5 py-6 sm:px-7 sm:py-7">
        {evidenceTimeline.map((step, i) => {
          const Icon = icons[i] ?? FileText;
          const current = step.state === "current";
          return (
            <li key={step.title} className="relative grid grid-cols-[2rem_1fr] gap-x-3.5 pb-6 last:pb-0 sm:grid-cols-[3.25rem_2rem_1fr_auto] sm:gap-x-4">
              <p className="pt-1.5 text-xs font-medium text-ink-subtle tabular-nums max-sm:hidden">{step.time}</p>
              <div className="relative flex justify-center">
                {i < last ? (
                  <span aria-hidden className="absolute top-8 bottom-[-1.5rem] w-px bg-line">
                    <span className="timeline-fill absolute inset-0 origin-top bg-brand/60" />
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full border",
                    current ? "border-brand bg-brand text-white" : "timeline-node border-brand/30 bg-brand-soft text-brand",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
              </div>
              <div className="min-w-0 sm:pt-1">
                <p className="text-xs font-medium text-ink-subtle tabular-nums sm:hidden">
                  {step.time} · {step.answers}
                </p>
                <p className="text-[0.9375rem] font-semibold tracking-tight text-ink max-sm:mt-0.5">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
              </div>
              <p className="pt-1.5 max-sm:hidden">
                <span className="text-label rounded-md border border-line-subtle px-1.5 py-0.5 text-[0.625rem] text-ink-subtle">
                  <span className="sr-only">Answers: </span>
                  {step.answers}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
