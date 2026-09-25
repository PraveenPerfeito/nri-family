import { ArrowDown, ArrowRight, Building2, Check, CircleDashed, FileText, HeartHandshake, KeyRound, LandPlot, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { Eyebrow } from "@/components/ui/section";
import { roadmap } from "@/data/marketing";

const areas: { label: string; icon: LucideIcon }[] = [
  { label: "Property", icon: Building2 },
  { label: "Land", icon: LandPlot },
  { label: "Documents", icon: FileText },
  { label: "Family", icon: HeartHandshake },
  { label: "Rentals", icon: KeyRound },
  { label: "Services", icon: Wrench },
];

function Step({ className }: { className?: string }) {
  return (
    <li aria-hidden className={className}>
      <span className="flex size-8 items-center justify-center rounded-full border border-night-line bg-night text-night-muted">
        <ArrowRight className="size-3.5 max-lg:hidden" />
        <ArrowDown className="size-3.5 lg:hidden" />
      </span>
    </li>
  );
}

/**
 * The long-term vision as the evolution of the product: what is available
 * today, what is coming next, and where it is going. Future items are never
 * shown as operational.
 */
export function FutureOffice() {
  const today = roadmap.filter((r) => r.availability === "available");
  const next = roadmap.filter((r) => r.availability === "coming");

  return (
    <section aria-labelledby="vision-title" className="on-night relative isolate overflow-hidden bg-night py-20 text-night-text sm:py-28 lg:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_28rem_at_50%_-6%,rgb(15_90_79/0.45),transparent_65%)]" />
        <div className="bg-grid-night absolute inset-0" />
      </div>

      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center [&>p:first-child]:justify-center">
          <Eyebrow tone="night">The bigger picture</Eyebrow>
          <h2 id="vision-title" className="text-display mt-5 text-[2rem] leading-[1.08] text-white sm:text-5xl lg:text-[3.5rem]">
            More than property management.
          </h2>
          <p className="mt-4 text-xl font-medium tracking-tight text-brand-muted sm:text-2xl">A digital family office for your life in Tamil Nadu.</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-night-muted">
            Today, you may need someone to inspect a property. Tomorrow, you may need help managing a rental, coordinating a repair,
            organising documents or assisting family locally. We are building one trusted place to manage all of it.
          </p>
        </div>

        <ol aria-label="How the platform grows" className="mt-16 grid gap-3 lg:mt-20 lg:grid-cols-[1fr_auto_1fr_auto_1.1fr] lg:items-stretch lg:gap-4">
          {/* Today */}
          <li className="rounded-panel border border-night-line bg-night-raised p-6 sm:p-7">
            <p className="text-label text-white">Today</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-night-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-good-bright" />
              Available now
            </p>
            <ul className="mt-5 space-y-2.5 text-[0.9375rem] text-night-text">
              {today.map((r) => (
                <li key={r.label} className="flex items-start gap-2.5">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-good-bright" strokeWidth={2} />
                  {r.short}
                </li>
              ))}
            </ul>
          </li>

          <Step className="flex justify-center lg:items-center" />

          {/* Next */}
          <li className="rounded-panel border border-dashed border-night-line p-6 sm:p-7">
            <p className="text-label text-white">Next</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-night-muted">
              <span aria-hidden className="size-1.5 rounded-full border border-info-bright" />
              Coming to the platform
            </p>
            <ul className="mt-5 space-y-2.5 text-[0.9375rem] text-night-muted">
              {next.map((r) => (
                <li key={r.label} className="flex items-start gap-2.5">
                  <CircleDashed aria-hidden className="mt-1 size-4 shrink-0 text-info-bright" strokeWidth={1.75} />
                  {r.short}
                </li>
              ))}
            </ul>
          </li>

          <Step className="flex justify-center lg:items-center" />

          {/* Vision */}
          <li className="relative flex flex-col justify-between overflow-hidden rounded-panel border border-brand-muted/30 bg-night-raised p-6 shadow-[0_0_0_8px_rgb(15_90_79/0.12),0_30px_80px_-30px_rgb(15_90_79/0.6)] sm:p-7">
            <div>
              <p className="text-label text-white">Vision</p>
              <p className="mt-2 text-sm text-night-muted">Where it is going</p>
            </div>
            <div className="mt-8 text-center lg:mt-0">
              <LogoMark className="mx-auto size-11" inverted />
              <p className="text-display mt-4 text-2xl text-white">Digital Family Office</p>
              <p className="mx-auto mt-2 max-w-xs text-sm text-night-muted">One private place for everything you own and manage in Tamil Nadu.</p>
            </div>
            <ul aria-label="Brought together" className="mt-8 flex flex-wrap justify-center gap-1.5">
              {areas.map(({ label, icon: Icon }) => (
                <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-night-line bg-night px-2.5 py-1 text-xs text-night-text">
                  <Icon aria-hidden className="size-3 text-brand-muted" strokeWidth={2} />
                  {label}
                </li>
              ))}
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}
