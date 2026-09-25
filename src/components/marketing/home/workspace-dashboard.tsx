import type { CSSProperties, ReactNode } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  FileText,
  House,
  LayoutGrid,
  Lock,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { DemoLabel } from "@/components/ui/badge";
import { commandCenter, sampleApproval, workspaceOverview as w, type SampleActivity } from "@/data/demo";
import { Sparkline } from "./command-center";
import { cn } from "@/lib/utils/cn";

/*
 * Dashboard section: a fuller concept of the private workspace.
 * Desktop: sidebar + content. Tablet: icon rail + content. Phone: summary →
 * property health → activity → approval. Exposed to assistive technology as
 * one image with a summary (it is a mock-up, not a working interface).
 */

const summary =
  "Concept preview with sample data: the workspace overview shows 3 properties, 2 open requests and 1 approval. " +
  "Property health: Chennai House 92, good; Chengalpattu Land 96, good; Coimbatore Apartment 88, needs review. " +
  "Activity: Chennai property inspection completed, quote received, plumbing repair completed and a land inspection scheduled. " +
  "An approval card asks the owner to review or approve garden maintenance at Chennai House for ₹8,500.";

const nav: { label: string; icon: LucideIcon; count?: number; active?: boolean }[] = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Properties", icon: House },
  { label: "Requests", icon: Wrench, count: 2 },
  { label: "Approvals", icon: CheckSquare, count: 1 },
  { label: "Documents", icon: FileText },
  { label: "Family", icon: Users },
];

function StateIcon({ state }: { state: SampleActivity["state"] }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-good" strokeWidth={2} />;
  if (state === "pending") return <AlertCircle className="size-4 text-attention" strokeWidth={2} />;
  return <CalendarClock className="size-4 text-info" strokeWidth={2} />;
}

function Panel({ title, meta, className, children }: { title: string; meta?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-card border border-line-subtle bg-surface p-4 sm:p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label text-ink-subtle">{title}</p>
        {meta ? <p className="text-[0.6875rem] text-ink-subtle">{meta}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function WorkspaceDashboard() {
  return (
    <figure aria-labelledby="workspace-caption" className="min-w-0">
      <div role="img" aria-label={summary} className="overflow-hidden rounded-panel border border-line bg-surface shadow-float">
        {/* Window bar */}
        <div className="flex items-center justify-between gap-3 border-b border-line-subtle bg-canvas/70 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-5 shrink-0 text-brand" />
            <span className="truncate text-sm font-semibold tracking-tight text-ink">My Family Office</span>
            <span className="hidden text-sm text-ink-subtle sm:inline">/ Overview</span>
          </div>
          <div className="hidden w-64 items-center gap-2 rounded-control border border-line-subtle bg-surface px-3 py-1.5 text-xs text-ink-subtle md:flex">
            <Search className="size-3.5" />
            Search properties, requests…
          </div>
          <div className="flex items-center gap-2.5">
            <DemoLabel className="max-sm:hidden">Concept preview · Sample data</DemoLabel>
            <span className="flex size-7 items-center justify-center rounded-full bg-night text-[0.6875rem] font-semibold text-white">A</span>
          </div>
        </div>

        <div className="grid md:grid-cols-[4.25rem_1fr] lg:grid-cols-[13rem_1fr]">
          {/* Sidebar (desktop) / icon rail (tablet) */}
          <div className="hidden border-r border-line-subtle bg-canvas/50 px-2.5 py-4 md:flex md:flex-col lg:px-3">
            <ul className="space-y-1">
              {nav.map(({ label, icon: Icon, count, active }) => (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm max-lg:justify-center",
                    active ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line-subtle" : "text-ink-muted",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-brand" : "text-ink-subtle")} strokeWidth={1.75} />
                  <span className="hidden flex-1 lg:inline">{label}</span>
                  {count ? (
                    <span
                      className={cn(
                        "hidden min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] font-semibold tabular-nums lg:inline",
                        label === "Approvals" ? "bg-attention-soft text-attention" : "bg-subtle text-ink-muted",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-auto hidden items-center gap-2 rounded-control border border-line-subtle bg-surface px-2.5 py-2 text-[0.6875rem] text-ink-muted lg:flex">
              <Lock className="size-3.5 text-brand" strokeWidth={2.25} />
              Private workspace
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 bg-canvas/40 p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <p className="text-xs text-ink-subtle">{commandCenter.when}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-ink">Overview</p>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
                <Lock className="size-3 text-brand" strokeWidth={2.25} />
                Only you and your authorised team can see this
              </p>
            </div>

            {/* Summary */}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Properties", value: 3 },
                { label: "Open requests", value: 2 },
                { label: "Approval", value: 1, attention: true },
              ].map((s) => (
                <div key={s.label} className="rounded-card border border-line-subtle bg-surface px-3 py-3 sm:px-5 sm:py-4">
                  <p
                    className={cn("count-up text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl", s.attention ? "text-attention" : "text-ink")}
                    style={{ "--to": s.value } as CSSProperties}
                  />
                  <p className="mt-2 text-xs text-ink-subtle sm:text-[0.8125rem]">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
              {/* Property health */}
              <Panel title="Property health" meta="Score out of 100" className="lg:col-start-1 lg:row-start-1">
                <ul className="mt-4 space-y-4">
                  {w.health.map((p) => (
                    <li key={p.id}>
                      <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{p.name}</span>
                          <span className="block text-xs text-ink-subtle">{p.detail}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2.5">
                          <span className={cn("flex items-center gap-1.5 text-xs font-medium", p.status === "good" ? "text-good" : "text-attention")}>
                            <span className={cn("size-1.5 rounded-full", p.status === "good" ? "bg-good" : "bg-attention-bright")} />
                            {p.label}
                          </span>
                          <span className="w-6 text-right text-sm font-semibold text-ink tabular-nums">{p.score}</span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-subtle">
                        <div className={cn("h-full rounded-full", p.status === "good" ? "bg-brand" : "bg-attention-bright")} style={{ width: `${p.score}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-end justify-between gap-4 border-t border-line-subtle pt-4">
                  <div>
                    <p className="text-xs text-ink-subtle">Average across properties</p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold tracking-tight text-ink tabular-nums">92</span>
                      <span className="text-xs font-medium text-good">+10 in 6 months</span>
                    </p>
                  </div>
                  <Sparkline values={commandCenter.trend} />
                </div>
              </Panel>

              {/* Activity */}
              <Panel title="Activity" meta="Last 7 days" className="lg:col-start-1 lg:row-start-2">
                <ol className="relative mt-4 space-y-4">
                  {w.timeline.map((a, i) => (
                    <li key={a.id} className="relative grid grid-cols-[1rem_1fr_auto] items-start gap-3">
                      {i < w.timeline.length - 1 ? <span className="absolute top-5 bottom-[-0.875rem] left-[0.4375rem] w-px bg-line" /> : null}
                      <span className="relative mt-0.5 bg-surface">
                        <StateIcon state={a.state} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] font-medium text-ink">{a.label}</span>
                        <span className="block text-xs text-ink-subtle">{a.detail}</span>
                      </span>
                      <span className="mt-0.5 text-[0.6875rem] text-ink-subtle tabular-nums">{a.time}</span>
                    </li>
                  ))}
                </ol>
              </Panel>

              {/* Approval */}
              <div className="rounded-card border border-attention/25 bg-surface p-4 shadow-raised sm:p-5 lg:col-start-2 lg:row-start-1">
                <p className="text-label flex items-center gap-1.5 text-attention">
                  <span className="animate-pulse-soft size-1.5 rounded-full bg-attention-bright" />
                  Approval required
                </p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-ink">{sampleApproval.title}</p>
                <p className="text-xs text-ink-subtle">
                  {sampleApproval.property} · Quote from a {sampleApproval.by.toLowerCase()}
                </p>
                <ul className="mt-4 space-y-2 border-y border-line-subtle py-3 text-[0.8125rem]">
                  {sampleApproval.lines.map((l) => (
                    <li key={l.label} className="flex justify-between gap-3 text-ink-muted">
                      <span>{l.label}</span>
                      <span className="text-ink tabular-nums">{l.amount}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xs text-ink-subtle">Total</span>
                  <span className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{sampleApproval.amount}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <span className="rounded-control border border-line-strong py-2 text-center text-sm font-medium text-ink">Review</span>
                  <span className="rounded-control bg-brand py-2 text-center text-sm font-medium text-white">Approve</span>
                </div>
                <p className="mt-3 text-[0.6875rem] text-ink-subtle">Nothing proceeds until you approve.</p>
              </div>

              {/* Upcoming */}
              <Panel title="Upcoming" className="lg:col-start-2 lg:row-start-2">
                <ul className="mt-3 divide-y divide-line-subtle">
                  {w.upcoming.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-[0.8125rem] first:pt-1 last:pb-0">
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{u.label}</span>
                        <span className="block text-xs text-ink-subtle">{u.detail}</span>
                      </span>
                      <span className="shrink-0 rounded-md bg-subtle px-2 py-1 text-[0.6875rem] font-medium text-ink-muted tabular-nums">{u.when}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      </div>
      <figcaption id="workspace-caption" className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-ink-subtle">
        <span className="text-label">Concept preview · Sample data</span>
        <span aria-hidden className="max-sm:hidden">—</span>
        <span>The private online workspace is being built now.</span>
      </figcaption>
    </figure>
  );
}
