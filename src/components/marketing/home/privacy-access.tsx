import { Check, Globe2, House, Lock, Minus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Role = {
  who: string;
  scope: string;
  sees: string[];
  hidden: string[];
  emphasis?: boolean;
};

/* How access is designed: each role sees only what its part of the work requires (see /trust). */
const roles: Role[] = [
  {
    who: "Owner",
    scope: "Full access",
    sees: ["Documents", "Reports and photos", "Costs and approvals", "Visibility settings"],
    hidden: [],
    emphasis: true,
  },
  {
    who: "Team",
    scope: "Required data",
    sees: ["Request details", "Property location", "Reports and photos"],
    hidden: ["Unrelated documents"],
  },
  {
    who: "Partner",
    scope: "Assigned data",
    sees: ["The assigned task", "Visit time and access"],
    hidden: ["Your documents", "Other properties"],
  },
];

const levels: { label: string; icon: LucideIcon; lines: string[]; checks: boolean; current?: boolean }[] = [
  { label: "Private", icon: Lock, lines: ["Owner", "Authorised team"], checks: true, current: true },
  { label: "Verified network", icon: Users, lines: ["Approved parties"], checks: true },
  { label: "Public", icon: Globe2, lines: ["Only when the owner chooses"], checks: false },
];

/** Access-control diagram: one private property record, three roles, three visibility levels. */
export function PrivacyAccess() {
  return (
    <figure aria-labelledby="access-caption" className="min-w-0">
      <div className="rounded-panel border border-line bg-surface p-5 shadow-raised sm:p-8">
        {/* Root: the property record */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3 rounded-card border border-line bg-canvas px-4 py-3">
            <span aria-hidden className="flex size-9 items-center justify-center rounded-control bg-night text-white">
              <House className="size-4" strokeWidth={1.75} />
            </span>
            <span>
              <span className="text-label block text-ink-subtle">Property record</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                Chennai House
                <Lock aria-hidden className="size-3.5 text-brand" strokeWidth={2.25} />
                <span className="sr-only">(private)</span>
              </span>
            </span>
          </div>
        </div>

        {/* Connectors: trunk + bus (from sm), a single rail on phones */}
        <div aria-hidden className="relative mx-auto h-8 w-px bg-line-strong" />
        <div aria-hidden className="relative mx-[calc((100%_-_2rem)/6)] hidden h-px bg-line-strong sm:block" />

        <ul aria-label="Who can see what" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {roles.map((r) => (
            <li key={r.who} className="relative flex flex-col sm:pt-6">
              <span aria-hidden className="absolute top-0 left-1/2 hidden h-6 w-px bg-line-strong sm:block" />
              <div
                className={cn(
                  "flex-1 rounded-card border p-4",
                  r.emphasis ? "border-brand/35 bg-brand-soft/40" : "border-line bg-surface",
                )}
              >
                <p className="text-label text-ink">{r.who}</p>
                <p className={cn("mt-1 text-sm font-medium", r.emphasis ? "text-brand-strong" : "text-ink-muted")}>{r.scope}</p>
                <ul className="mt-3 space-y-1.5 border-t border-line-subtle pt-3 text-[0.8125rem]">
                  {r.sees.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-ink">
                      <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={2.25} />
                      <span>
                        <span className="sr-only">Can see: </span>
                        {s}
                      </span>
                    </li>
                  ))}
                  {r.hidden.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-ink-subtle">
                      <Minus aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.25} />
                      <span>
                        <span className="sr-only">Cannot see: </span>
                        <span className="line-through decoration-line-strong">{s}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>

        {/* Listing visibility */}
        <div className="mt-6 border-t border-line-subtle pt-6">
          <p className="text-label text-ink-subtle">Listing visibility</p>
          <ol aria-label="Listing visibility levels" className="mt-3 grid gap-2 sm:grid-cols-3">
            {levels.map(({ label, icon: Icon, lines, checks, current }) => (
              <li
                key={label}
                className={cn(
                  "rounded-control border px-3.5 py-3",
                  current ? "border-brand/40 bg-surface shadow-[0_0_0_3px_rgb(15_90_79/0.08)]" : "border-line-subtle bg-canvas/60",
                )}
              >
                <p className="flex items-center justify-between gap-2">
                  <span className="text-label flex items-center gap-1.5 text-ink">
                    <Icon aria-hidden className="size-3.5 text-brand" strokeWidth={2} />
                    {label}
                  </span>
                  {current ? <span className="text-[0.625rem] font-semibold tracking-wide text-brand uppercase">Default</span> : null}
                </p>
                <ul className="mt-2 space-y-1 text-[0.8125rem] text-ink-muted">
                  {lines.map((l) => (
                    <li key={l} className="flex items-start gap-1.5">
                      {checks ? <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={2.25} /> : null}
                      {l}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <figcaption id="access-caption" className="mt-3 text-center text-xs text-ink-subtle">
        How access is designed: each person sees only what their role requires. Illustrative example.
      </figcaption>
    </figure>
  );
}
