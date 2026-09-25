import type { CSSProperties } from "react";
import { AlertCircle, CheckCircle2, Lock, MapPin } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { commandCenter as d, sampleApproval } from "@/data/demo";
import { cn } from "@/lib/utils/cn";

/*
 * Hero visual: a concept "Family Office Command Center" built from HTML/CSS.
 * Sample data only. The whole preview is exposed to assistive technology as a
 * single image with a plain-language summary, so screen readers don't read a
 * mock interface as if it were real.
 */

const summary =
  "Concept preview with sample data: a private workspace showing 3 properties, 2 open requests and 1 approval. " +
  "Chennai House and Chengalpattu Land are in good condition; Coimbatore Apartment needs review. " +
  "Recent activity: inspection completed, maintenance completed, and approval required for garden maintenance at ₹8,500.";

export function Sparkline({ values }: { values: number[] }) {
  const w = 76;
  const h = 22;
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 1;
  const points = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / (max - min)) * h] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[22px] w-[76px] overflow-visible" aria-hidden>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="rgb(15 90 79 / 0.08)" stroke="none" />
      <polyline points={line} fill="none" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill="var(--color-brand)" />
    </svg>
  );
}

function ActivityIcon({ state }: { state: "done" | "pending" | "scheduled" }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-good" strokeWidth={2} />;
  return <AlertCircle className="size-4 text-attention" strokeWidth={2} />;
}

export function CommandCenter() {
  return (
    <figure className="mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none" aria-labelledby="command-caption">
      <div className="relative">
      {/* A second surface behind the window gives the stack its depth. */}
      <div aria-hidden className="absolute inset-x-6 -bottom-3 top-6 rounded-panel border border-line bg-surface/60 sm:inset-x-10" />

      <div role="img" aria-label={summary} className="relative overflow-hidden rounded-panel border border-line bg-surface shadow-float">
        <div className="flex items-center justify-between gap-3 border-b border-line-subtle bg-canvas/70 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-2.5">
              <LogoMark className="size-5 text-brand" />
              <span className="text-label text-ink max-sm:tracking-[0.1em]">My Family Office</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.14em] whitespace-nowrap text-ink-muted uppercase max-sm:px-2 max-sm:tracking-[0.08em]">
              <Lock className="size-3 text-brand" strokeWidth={2.25} />
              Private workspace
            </span>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:gap-6 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
              <p className="text-xs text-ink-subtle">{d.when}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-ink sm:text-xl">{d.greeting}</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
              <span className="size-1.5 rounded-full bg-good" />3 properties · Tamil Nadu
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {d.stats.map((s) => (
              <div key={s.label} className="rounded-card border border-line-subtle bg-canvas/60 px-3 py-3 sm:px-4 sm:py-3.5">
                <p
                  className={cn("count-up text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-[1.75rem]", s.attention ? "text-attention" : "text-ink")}
                  style={{ "--to": s.value } as CSSProperties}
                />
                <p className="mt-1.5 text-xs text-ink-subtle">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-label text-ink-subtle">Property health</p>
                  <p className="mt-1 text-[0.6875rem] text-ink-subtle">6-month trend</p>
                </div>
                <Sparkline values={d.trend} />
              </div>
              <ul className="mt-4 space-y-3.5">
                {d.health.map((p) => (
                  <li key={p.id}>
                    <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("size-1.5 shrink-0 rounded-full", p.status === "good" ? "bg-good" : "bg-attention-bright")} />
                        <span className="truncate font-medium text-ink">{p.name}</span>
                      </span>
                      <span className={cn("shrink-0 text-xs font-medium", p.status === "good" ? "text-good" : "text-attention")}>{p.label}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-subtle">
                      <div className={cn("h-full rounded-full", p.status === "good" ? "bg-brand" : "bg-attention-bright")} style={{ width: `${p.score}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sm:border-l sm:border-line-subtle sm:pl-6">
              <p className="text-label text-ink-subtle">Recent activity</p>
              <ol className="animate-activity relative mt-4 space-y-4">
                {d.activity.map((a, i) => (
                  <li key={a.id} className="relative grid grid-cols-[1rem_1fr] items-start gap-2.5">
                    {i < d.activity.length - 1 ? <span className="absolute top-5 bottom-[-0.875rem] left-[0.4375rem] w-px bg-line" /> : null}
                    <span className="relative mt-0.5 bg-surface">
                      <ActivityIcon state={a.state} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[0.8125rem] font-medium text-ink">{a.label}</span>
                        <span className={cn("shrink-0 text-[0.6875rem] tabular-nums", a.state === "pending" ? "font-semibold text-attention" : "text-ink-subtle")}>
                          {a.time}
                        </span>
                      </span>
                      <span className="block text-xs text-ink-subtle">{a.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Floating layer: an approval waiting for the owner (desktop). */}
      <div aria-hidden className="animate-float-in absolute -bottom-[6.5rem] -left-16 hidden w-64 rounded-card border border-line bg-surface p-4 shadow-float lg:block">
        <p className="text-label flex items-center gap-1.5 text-attention">
          <span className="size-1.5 rounded-full bg-attention-bright" />
          Approval required
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">{sampleApproval.title}</p>
        <p className="text-xs text-ink-subtle">
          {sampleApproval.property} · {sampleApproval.by}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-ink tabular-nums">{sampleApproval.amount}</span>
          <span className="flex gap-1.5">
            <span className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink">Review</span>
            <span className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white">Approve</span>
          </span>
        </div>
      </div>

      {/* Floating layer: where the properties are (wide desktop). */}
      <div aria-hidden className="animate-float-in-late absolute -top-8 -right-6 hidden w-48 rounded-card border border-line bg-surface p-3 shadow-float xl:block">
        <p className="text-label flex items-center gap-1.5 text-ink-subtle">
          <MapPin className="size-3 text-brand" strokeWidth={2.25} />
          Tamil Nadu
        </p>
        <div className="relative mt-2 h-24 rounded-md bg-[radial-gradient(circle,rgb(14_26_43/0.14)_1px,transparent_1.2px)] bg-[length:8px_8px]">
          {d.pins.map((p) => (
            <span key={p.name} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <span className="size-2 rounded-full bg-brand ring-4 ring-brand/15" />
              <span className="mt-0.5 rounded bg-surface/90 px-1 text-[0.5625rem] font-medium whitespace-nowrap text-ink-muted">{p.name}</span>
            </span>
          ))}
        </div>
      </div>

      </div>
      <figcaption id="command-caption" className="mt-6 text-center text-xs text-ink-subtle lg:mt-8 lg:pr-1 lg:text-right">
        Sample data · Concept preview of the private workspace
      </figcaption>
    </figure>
  );
}
