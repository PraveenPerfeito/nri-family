import { ArrowDown, Check, CircleDashed, Plus } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { roadmap } from "@/data/marketing";

const pillars = ["Property", "Assets", "Documents", "Family", "Local services"];

/** PROPERTY + ASSETS + DOCUMENTS + FAMILY + LOCAL SERVICES → DIGITAL FAMILY OFFICE */
export function EcosystemDiagram() {
  return (
    <div className="on-night rounded-panel border border-night-line bg-night-raised p-6 sm:p-10">
      <ul aria-label="What the family office brings together" className="flex flex-wrap items-center justify-center gap-2 lg:flex-nowrap">
        {pillars.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            <span className="rounded-card border border-night-line bg-night px-4 py-3 text-center text-xs font-semibold tracking-[0.14em] text-night-text uppercase">
              {p}
            </span>
            {i < pillars.length - 1 ? <Plus aria-hidden className="hidden size-4 text-night-muted lg:block" /> : null}
          </li>
        ))}
      </ul>
      <div className="flex justify-center py-4" aria-hidden>
        <ArrowDown className="size-5 text-brand-muted" />
      </div>
      <div className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-card border border-brand-muted/40 bg-brand px-6 py-4 text-white">
        <LogoMark className="size-7 text-brand-strong" />
        <span className="text-sm font-semibold tracking-[0.16em] uppercase">Digital Family Office</span>
      </div>
    </div>
  );
}

export function RoadmapLists() {
  const available = roadmap.filter((r) => r.availability === "available");
  const coming = roadmap.filter((r) => r.availability === "coming");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-card border border-line bg-surface p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
          <span className="size-2 rounded-full bg-good" aria-hidden />
          Available now
        </h3>
        <p className="mt-1 text-sm text-ink-muted">Coordinated by our team. Request through Get Started.</p>
        <ul className="mt-4 space-y-2.5 text-sm text-ink">
          {available.map((r) => (
            <li key={r.label} className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-good" />
              {r.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-card border border-dashed border-line-strong bg-canvas p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
          <span className="size-2 rounded-full bg-info" aria-hidden />
          Coming to the platform
        </h3>
        <p className="mt-1 text-sm text-ink-muted">In development. Not yet available to customers.</p>
        <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
          {coming.map((r) => (
            <li key={r.label} className="flex items-start gap-2">
              <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
              {r.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
