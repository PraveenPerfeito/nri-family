import { Camera, CheckCircle2, ClipboardCheck, FileText, Hammer, Inbox, ReceiptText, UserCheck, BadgeCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DemoLabel } from "@/components/ui/badge";
import { evidenceTimeline } from "@/data/demo";
import { cn } from "@/lib/utils/cn";

const icons: LucideIcon[] = [Inbox, UserCheck, ClipboardCheck, Camera, BadgeCheck, Hammer, CheckCircle2, ReceiptText];

/** A sample service record, step by step — the product's transparency, shown rather than claimed. */
export function EvidenceTimeline() {
  return (
    <figure aria-labelledby="record-caption" className="rounded-panel border border-line bg-surface shadow-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4 sm:px-6">
        <div>
          <p className="text-label text-ink-subtle">Service record</p>
          <p className="mt-1 text-sm font-semibold text-ink">Kitchen leak · Chennai House</p>
        </div>
        <DemoLabel>Sample timeline</DemoLabel>
      </div>
      <ol aria-label="Sample service record, from request to invoice" className="px-5 py-6 sm:px-6">
        {evidenceTimeline.map((step, i) => {
          const Icon = icons[i] ?? FileText;
          const last = i === evidenceTimeline.length - 1;
          return (
            <li key={step.title} className="reveal relative grid grid-cols-[2rem_1fr] gap-x-3.5 pb-6 last:pb-0 sm:grid-cols-[5.5rem_2rem_1fr] sm:gap-x-3">
              <p className="pt-1.5 text-right text-xs font-medium text-ink-subtle tabular-nums max-sm:hidden">{step.time}</p>
              <div className="relative flex justify-center">
                {!last ? <span aria-hidden className="absolute top-8 bottom-[-1.5rem] w-px bg-line" /> : null}
                <span
                  aria-hidden
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full border",
                    step.state === "current" ? "border-brand bg-brand text-white" : "border-line bg-surface text-brand",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
              </div>
              <div className="sm:pt-1">
                <p className="text-xs font-medium text-ink-subtle tabular-nums sm:hidden">{step.time}</p>
                <div className="flex flex-wrap items-center gap-2 max-sm:mt-0.5">
                  <p className="text-[0.9375rem] font-semibold tracking-tight text-ink">{step.title}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase",
                      step.state === "current" ? "bg-brand-soft text-brand-strong" : "bg-good-soft text-good",
                    )}
                  >
                    {step.state === "current" ? "Latest" : "Done"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <figcaption id="record-caption" className="border-t border-line-subtle px-5 py-3 text-xs text-ink-subtle sm:px-6">
        Illustrative record. Times, costs and findings are sample data.
      </figcaption>
    </figure>
  );
}
