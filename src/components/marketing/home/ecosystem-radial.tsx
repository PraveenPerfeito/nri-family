import type { CSSProperties } from "react";
import { Building2, FileText, HeartHandshake, Landmark, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";

type Node = { title: string; body: string; icon: LucideIcon; x: number; y: number };

/** Satellite positions (percent of the desktop canvas). */
const nodes: Node[] = [
  { title: "Property", body: "Buy, sell, rent, inspect and maintain.", icon: Building2, x: 50, y: 9 },
  { title: "Documents", body: "Securely organise and track important records.", icon: FileText, x: 13, y: 40 },
  { title: "Family", body: "Coordinate local assistance when you need it.", icon: HeartHandshake, x: 87, y: 40 },
  { title: "Assets", body: "Monitor and protect what you own.", icon: Landmark, x: 24, y: 88 },
  { title: "Local services", body: "Request, manage and verify work from anywhere.", icon: ShieldCheck, x: 76, y: 88 },
];

const CENTER = { x: 50, y: 52 };

/** "One trusted team": the family office at the centre, everything it coordinates around it. */
export function EcosystemRadial() {
  return (
    <div className="relative mt-16 lg:mt-20">
      {/* Connectors (desktop): thin lines from the centre to each area. */}
      <svg aria-hidden className="absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Faint orbits around the centre */}
        {[
          [22, 30],
          [38, 46],
        ].map(([rx, ry]) => (
          <ellipse key={rx} cx={CENTER.x} cy={CENTER.y} rx={rx} ry={ry} fill="none" stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {nodes.map((n) => (
          <line
            key={n.title}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={n.x}
            y2={n.y}
            stroke="var(--color-line-strong)"
            strokeWidth="1"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="relative lg:h-[34rem]">
        {/* Centre node */}
        <div
          className="relative z-10 mx-auto flex max-w-xs flex-col items-center rounded-panel bg-night px-8 py-8 text-center shadow-float ring-8 ring-brand/10 lg:absolute lg:top-[var(--cy)] lg:left-1/2 lg:w-72 lg:-translate-x-1/2 lg:-translate-y-1/2"
          style={{ "--cy": `${CENTER.y}%` } as CSSProperties}
        >
          <LogoMark className="size-10 text-brand-muted" inverted />
          <p className="text-label mt-4 text-brand-muted">Your family office</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-white">One trusted team in Tamil Nadu</p>
          <p className="mt-1 text-sm text-night-muted">One place to see what is happening.</p>
        </div>
        <span aria-hidden className="mx-auto block h-8 w-px bg-line-strong lg:hidden" />

        {/* Satellites: one connected list on small screens, a radial layout on desktop. */}
        <ul className="relative grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:absolute lg:inset-0 lg:block lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
          {nodes.map(({ title, body, icon: Icon, x, y }) => (
            <li
              key={title}
              className="reveal bg-surface p-5 sm:max-lg:last:col-span-2 lg:absolute lg:top-[var(--y)] lg:left-[var(--x)] lg:w-60 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-card lg:border lg:border-line lg:shadow-card"
              style={{ "--x": `${x}%`, "--y": `${y}%` } as CSSProperties}
            >
              <div className="flex items-center gap-2.5">
                <Icon aria-hidden className="size-4 text-brand" strokeWidth={1.75} />
                <h3 className="text-[0.9375rem] font-semibold tracking-tight text-ink">{title}</h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
