import { AlertCircle, Building2, CalendarClock, CheckCircle2, FileText, Home, LandPlot, LayoutGrid, ShieldCheck, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DemoLabel, StatusBadge } from "@/components/ui/badge";
import { demoProperties, heroActivity, workspaceActivity, workspaceStats, type DemoActivity } from "@/data/demo";
import type { PropertyKind } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

const kindIcon: Partial<Record<PropertyKind, LucideIcon>> = {
  "independent-house": Home,
  apartment: Building2,
  "residential-land": LandPlot,
  "agricultural-land": LandPlot,
};

function ActivityIcon({ state, tone }: { state: DemoActivity["state"]; tone: "light" | "night" }) {
  const night = tone === "night";
  if (state === "done")
    return <CheckCircle2 aria-hidden className={cn("size-4 shrink-0", night ? "text-good-bright" : "text-good")} />;
  if (state === "pending")
    return <AlertCircle aria-hidden className={cn("size-4 shrink-0", night ? "text-attention-bright" : "text-attention")} />;
  return <CalendarClock aria-hidden className={cn("size-4 shrink-0", night ? "text-info-bright" : "text-info")} />;
}

const stateLabel: Record<DemoActivity["state"], string> = { done: "Completed", pending: "Needs your approval", scheduled: "Scheduled" };

/**
 * Hero visual — a conceptual "My Family Office" panel.
 * Purely illustrative: rendered as a figure with a visible sample-data label.
 */
export function FamilyOfficePreview() {
  return (
    <figure className="relative" aria-labelledby="hero-preview-caption">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-muted/40 via-transparent to-info-soft blur-2xl" />
      <div className="on-night overflow-hidden rounded-panel border border-night-line bg-night text-night-text shadow-raised">
        <div className="flex items-center justify-between gap-3 border-b border-night-line px-5 py-3.5">
          <p className="text-xs font-semibold tracking-[0.16em] text-white uppercase">My Family Office</p>
          <DemoLabel tone="night">Sample</DemoLabel>
        </div>

        <div className="grid gap-6 p-5 sm:p-6">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-night-muted uppercase">Properties</p>
            <ul className="mt-3 divide-y divide-night-line rounded-card border border-night-line bg-night-raised">
              {demoProperties.map((p) => {
                const Icon = kindIcon[p.kind] ?? Home;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon aria-hidden className="size-4 shrink-0 text-night-muted" strokeWidth={1.75} />
                      <span className="truncate text-sm font-medium text-white">{p.name}</span>
                    </span>
                    <StatusBadge status={p.status} tone="night" />
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-night-muted uppercase">Recent activity</p>
            <ul className="animate-activity mt-3 space-y-2.5">
              {heroActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-control px-1">
                  <span className="mt-0.5">
                    <ActivityIcon state={a.state} tone="night" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-white">
                      {a.label}
                      <span className="sr-only"> — {stateLabel[a.state]}</span>
                    </span>
                    <span className="block text-xs text-night-muted">{a.when}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption id="hero-preview-caption" className="mt-3 text-center text-xs text-ink-subtle">
        Concept preview of the private customer workspace. Sample data, not a real account.
      </figcaption>
    </figure>
  );
}

const sidebar: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Properties", icon: Home },
  { label: "Requests", icon: Wrench },
  { label: "Documents", icon: FileText },
  { label: "Access", icon: ShieldCheck },
];

/** Section 20 — fuller workspace mock-up. */
export function WorkspacePreview() {
  return (
    <figure aria-labelledby="workspace-caption">
      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <DemoLabel />
        </div>

        <div className="grid md:grid-cols-[13rem_1fr]">
          <div aria-hidden className="hidden border-r border-line bg-canvas/60 p-4 md:block">
            <p className="px-2 text-xs font-semibold tracking-[0.14em] text-ink-subtle uppercase">My Family Office</p>
            <ul className="mt-4 space-y-1">
              {sidebar.map(({ label, icon: Icon, active }) => (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-control px-2 py-2 text-sm",
                    active ? "bg-brand-soft font-medium text-brand-strong" : "text-ink-muted",
                  )}
                >
                  <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-6 p-4 sm:p-6">
            <dl className="grid grid-cols-3 gap-2 sm:gap-4">
              {workspaceStats.map((s) => (
                <div key={s.label} className="rounded-card border border-line bg-canvas/60 p-3 sm:p-4">
                  <dt className="text-[0.6875rem] leading-tight font-medium text-ink-subtle sm:text-xs">{s.label}</dt>
                  <dd className={cn("mt-1 text-2xl font-semibold tabular-nums sm:text-3xl", s.label === "Approval required" ? "text-attention" : "text-ink")}>
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Recent activity</h3>
                <ul className="mt-3 space-y-3">
                  {workspaceActivity.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <span className="mt-0.5">
                        <ActivityIcon state={a.state} tone="light" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-ink">
                          {a.label}
                          <span className="sr-only"> — {stateLabel[a.state]}</span>
                        </span>
                        <span className="block text-xs text-ink-subtle">{a.when}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink">Property health</h3>
                <ul className="mt-3 space-y-3.5">
                  {demoProperties.map((p) => (
                    <li key={p.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ink">{p.name}</span>
                        <span className="font-semibold tabular-nums text-ink">
                          {p.healthScore}
                          <span className="sr-only"> out of 100</span>
                        </span>
                      </div>
                      <div aria-hidden className="mt-1.5 h-1.5 rounded-full bg-subtle">
                        <div
                          className={cn("h-full rounded-full", p.status === "good" ? "bg-brand" : "bg-attention-bright")}
                          style={{ width: `${p.healthScore}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption id="workspace-caption" className="mt-3 text-center text-xs text-ink-subtle">
        Illustrative mock-up of the private workspace planned for customers. Sample data only.
      </figcaption>
    </figure>
  );
}
