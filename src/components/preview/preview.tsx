import type { ReactNode } from "react";
import { AlertCircle, Check, CheckCircle2, Circle, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DemoLabel } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

/*
 * Building blocks for the concept previews in page heroes. Every preview is a
 * mock-up of the future platform: fictional data, a visible DemoLabel, no
 * working controls. The window is exposed to assistive technology as one image
 * with a plain-language summary; floating cards are decorative.
 */

export type PreviewTone = "good" | "attention" | "info" | "neutral" | "brand";

const toneText: Record<PreviewTone, string> = {
  good: "text-good",
  attention: "text-attention",
  info: "text-info",
  neutral: "text-ink-muted",
  brand: "text-brand",
};
const toneDot: Record<PreviewTone, string> = {
  good: "bg-good",
  attention: "bg-attention-bright",
  info: "bg-info",
  neutral: "bg-line-strong",
  brand: "bg-brand",
};

/** The floating window, with a quiet back plate for depth and optional floating cards (desktop). */
export function ProductPreviewShell({
  label,
  summary,
  floating,
  children,
  className,
}: {
  /** Short accessible name for the figure, e.g. "Concept preview: rental management". */
  label: string;
  /** Plain-language description of everything the preview shows. */
  summary: string;
  floating?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure aria-label={label} className={cn("relative mx-auto w-full max-w-lg lg:mr-0", className)}>
      <div aria-hidden className="absolute inset-x-6 -bottom-3 top-6 rounded-panel border border-line bg-surface/60" />
      <div role="img" aria-label={summary} className="animate-preview-in relative overflow-hidden rounded-panel border border-line bg-surface shadow-float">
        {children}
      </div>
      {floating}
    </figure>
  );
}

/** Title bar: a small icon tile, the area name, and the sample-data badge. */
export function PreviewHeader({
  icon: Icon,
  title,
  kind = "concept",
}: {
  icon: LucideIcon;
  title: string;
  kind?: "concept" | "illustrative";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-subtle bg-canvas/60 px-4 py-3 sm:px-5">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-white">
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
        <span className="text-label truncate text-ink max-sm:tracking-[0.06em]">{title}</span>
      </span>
      <DemoLabel kind={kind} />
    </div>
  );
}

/** A padded block, optionally with a small uppercase label. */
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

export function PreviewDivider() {
  return <div className="border-t border-line-subtle" />;
}

/** The subject of the preview: a property, request or folder. */
export function PreviewTitle({ eyebrow, title, meta, aside }: { eyebrow?: string; title: string; meta?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs text-ink-subtle">{eyebrow}</p> : null}
        <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-ink">{title}</p>
        {meta ? <p className="mt-0.5 text-xs text-ink-subtle">{meta}</p> : null}
      </div>
      {aside}
    </div>
  );
}

/** A labelled value, e.g. "Monthly rent / ₹32,000". */
export function PreviewMetric({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: ReactNode; tone?: PreviewTone }) {
  return (
    <div className="min-w-0 rounded-control bg-canvas px-3 py-2.5">
      <p className="text-[0.6875rem] leading-tight text-ink-subtle">{label}</p>
      <p className={cn("mt-0.5 truncate text-sm font-semibold tracking-tight", tone ? toneText[tone] : "text-ink")}>{value}</p>
      {detail ? <p className="mt-0.5 truncate text-[0.6875rem] text-ink-subtle">{detail}</p> : null}
    </div>
  );
}

/** A status with a dot. Always a word, never colour alone. */
export function PreviewStatus({ tone, children, pill }: { tone: PreviewTone; children: ReactNode; pill?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        toneText[tone],
        pill && "rounded-full border border-current/20 bg-surface px-2 py-0.5",
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone])} />
      {children}
    </span>
  );
}

export type ActivityState = "done" | "pending" | "next" | "attention";

function ActivityIcon({ state }: { state: ActivityState }) {
  if (state === "done") return <CheckCircle2 className="size-4 shrink-0 text-good" strokeWidth={2} />;
  if (state === "attention") return <AlertCircle className="size-4 shrink-0 text-attention" strokeWidth={2} />;
  if (state === "next") return <CircleDot className="size-4 shrink-0 text-brand" strokeWidth={2} />;
  return <Circle className="size-4 shrink-0 text-ink-subtle/70" strokeWidth={1.75} />;
}

/** A short list of events with state icons. */
export function PreviewActivity({ items }: { items: { label: string; meta?: string; state: ActivityState }[] }) {
  return (
    <ul className="animate-activity space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2.5 text-[0.8125rem]">
          <span className="mt-px">
            <ActivityIcon state={item.state} />
          </span>
          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span className={cn(item.state === "pending" ? "text-ink-muted" : "text-ink", item.state === "next" && "font-medium")}>{item.label}</span>
            {item.meta ? <span className="shrink-0 text-[0.6875rem] text-ink-subtle tabular-nums">{item.meta}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical steps with a connector; `current` is highlighted. */
export function PreviewTimeline({ steps }: { steps: { label: string; meta?: string; state: "done" | "current" | "upcoming" }[] }) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={step.label} className="relative grid grid-cols-[1.5rem_1fr_auto] items-center gap-x-3 pb-3.5 last:pb-0">
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
            {step.state === "done" ? <Check className="size-3" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current" />}
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

/** A thin progress bar with an optional caption. */
export function PreviewProgress({ value, max = 100, tone = "brand", label, detail }: { value: number; max?: number; tone?: PreviewTone; label?: string; detail?: string }) {
  return (
    <div>
      {label || detail ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          {label ? <span className="font-medium text-ink">{label}</span> : <span />}
          {detail ? <span className="text-ink-subtle tabular-nums">{detail}</span> : null}
        </div>
      ) : null}
      <div className="h-1.5 rounded-full bg-subtle">
        <div className={cn("h-full rounded-full", toneDot[tone])} style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

/** Small decorative card floating beside the window (desktop only). */
export function FloatingCard({ className, late, children }: { className?: string; late?: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute hidden rounded-card border border-line bg-surface p-3.5 shadow-float lg:block",
        late ? "animate-float-in-late" : "animate-float-in",
        className,
      )}
    >
      {children}
    </div>
  );
}
