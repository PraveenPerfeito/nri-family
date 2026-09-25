import type { ReactNode } from "react";
import { Camera, Check, FileText, House, Lock, MapPin, ReceiptText, UserRound, Wrench } from "lucide-react";
import { journeyStages } from "@/data/marketing";
import { cn } from "@/lib/utils/cn";

type StageKey = (typeof journeyStages)[number]["key"];

/* One small, different visual per stage (decorative; the text carries the meaning). */
const visuals: Record<StageKey, ReactNode> = {
  account: (
    <div className="space-y-1.5">
      <div className="rounded-md border border-line-subtle bg-surface px-2.5 py-1.5">
        <p className="text-[0.625rem] text-ink-subtle">Living in</p>
        <p className="text-xs font-medium text-ink">United Kingdom</p>
      </div>
      <p className="flex items-center gap-1.5 px-0.5 text-[0.6875rem] font-medium text-good">
        <Check className="size-3" strokeWidth={2.5} />
        Account created
      </p>
    </div>
  ),
  property: (
    <div className="flex items-center gap-2 rounded-md border border-line-subtle bg-surface px-2.5 py-2">
      <House className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-ink">Chennai House</span>
        <span className="flex items-center gap-1 text-[0.625rem] text-ink-subtle">
          <Lock className="size-2.5" strokeWidth={2.5} />
          Private
        </span>
      </span>
    </div>
  ),
  request: (
    <div className="rounded-md border border-line-subtle bg-surface px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
        <Wrench className="size-3.5 text-brand" strokeWidth={1.75} />
        Kitchen leak
      </p>
      <p className="mt-1 inline-flex rounded-full bg-info-soft px-1.5 py-px text-[0.625rem] font-medium text-info">Request sent</p>
    </div>
  ),
  local: (
    <div className="flex items-center gap-2">
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-night text-white">
        <UserRound className="size-3.5" strokeWidth={2} />
        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-canvas bg-good" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-ink">Plumber assigned</span>
        <span className="flex items-center gap-1 text-[0.625rem] text-ink-subtle">
          <MapPin className="size-2.5" strokeWidth={2.5} />
          Visit today, 11:30
        </span>
      </span>
    </div>
  ),
  approval: (
    <div className="rounded-md border border-attention/25 bg-surface px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.625rem] text-ink-subtle">Quote</span>
        <span className="text-xs font-semibold text-ink tabular-nums">₹2,400</span>
      </div>
      <span className="mt-1.5 block rounded bg-brand py-1 text-center text-[0.625rem] font-medium text-white">Approve</span>
    </div>
  ),
  proof: (
    <div>
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex aspect-square items-center justify-center rounded border border-line-subtle bg-[linear-gradient(135deg,var(--color-subtle),var(--color-canvas))]">
            <Camera className="size-3 text-ink-subtle/70" />
          </span>
        ))}
      </div>
      <p className="mt-1.5 flex items-center gap-2 text-[0.625rem] font-medium text-ink-muted">
        <span className="flex items-center gap-1">
          <FileText className="size-2.5" strokeWidth={2.5} />
          Report
        </span>
        <span className="flex items-center gap-1">
          <ReceiptText className="size-2.5" strokeWidth={2.5} />
          Invoice
        </span>
      </p>
    </div>
  ),
};

/** Six stages: a horizontal track on desktop, a vertical rail on smaller screens. */
export function Journey() {
  const last = journeyStages.length - 1;
  return (
    <ol aria-label="How it works in six steps" className="mt-16 grid gap-y-9 sm:grid-cols-2 sm:gap-x-10 lg:mt-20 lg:grid-cols-6 lg:gap-x-5">
      {journeyStages.map((stage, i) => (
        <li key={stage.key} className="reveal relative grid grid-cols-[2.25rem_1fr] gap-x-4 lg:block">
          {/* Connector: vertical on phones, horizontal on desktop */}
          {i < last ? <span aria-hidden className="absolute top-11 -bottom-8 left-[1.125rem] w-px bg-line-strong sm:hidden" /> : null}
          {i < last ? <span aria-hidden className="absolute top-[1.125rem] left-12 -right-4 hidden h-px bg-line-strong lg:block" /> : null}
          <span
            aria-hidden
            className={cn(
              "relative z-10 flex size-9 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
              i === last ? "border-brand bg-brand text-white" : "border-line-strong bg-canvas text-ink",
            )}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="pt-1.5 lg:pt-0">
            <h3 className="text-base font-semibold tracking-tight text-ink lg:mt-6">
              <span className="sr-only">Step {i + 1}: </span>
              {stage.title}
            </h3>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted lg:min-h-[4.25rem] lg:text-sm">{stage.body}</p>
            <div aria-hidden className="mt-4 max-w-[15rem] rounded-card border border-line-subtle bg-canvas/70 p-2.5 lg:max-w-none">
              {visuals[stage.key]}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
