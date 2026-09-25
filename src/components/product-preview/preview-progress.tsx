import { cn } from "@/lib/utils/cn";
import { toneDot, type PreviewTone } from "./types";

/** A thin progress bar with an optional caption. The fill grows in once on load (`.animate-progress`). */
export function PreviewProgress({ value, max = 100, tone = "brand", label, detail }: { value: number; max?: number; tone?: PreviewTone; label?: string; detail?: string }) {
  return (
    <div>
      {label || detail ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          {label ? <span className="font-medium text-ink">{label}</span> : <span />}
          {detail ? <span className="text-ink-subtle tabular-nums">{detail}</span> : null}
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
        <div className={cn("animate-progress h-full origin-left rounded-full", toneDot[tone])} style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

/** A segmented strip of named stages: everything before `current` is done, `current` is highlighted. */
export function PreviewStages({ stages, current }: { stages: string[]; current: number }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink">
        Stage {current + 1} of {stages.length} · {stages[current]}
      </p>
      <ol className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((stage, i) => (
          <li key={stage} className={cn("h-1.5 rounded-full", i < current ? "bg-brand/50" : i === current ? "bg-brand" : "bg-subtle")} />
        ))}
      </ol>
      <ol className="mt-1.5 grid gap-1 text-[0.5625rem] text-ink-subtle max-sm:hidden" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((stage, i) => (
          <li key={stage} className={cn("truncate", i === current && "font-semibold text-brand")}>
            {stage}
          </li>
        ))}
      </ol>
    </div>
  );
}
