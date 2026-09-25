import { Building2, Check, CircleDashed, FileText, HeartHandshake, KeyRound, LandPlot, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { Eyebrow } from "@/components/ui/section";
import { roadmap } from "@/data/marketing";

const inputs: { label: string; detail: string; icon: LucideIcon }[] = [
  { label: "Property", detail: "Houses and apartments", icon: Building2 },
  { label: "Land", detail: "Plots and farmland", icon: LandPlot },
  { label: "Documents", detail: "Records and renewals", icon: FileText },
  { label: "Family", detail: "Help for loved ones", icon: HeartHandshake },
  { label: "Rentals", detail: "Tenants and rent", icon: KeyRound },
  { label: "Services", detail: "Repairs and upkeep", icon: Wrench },
];

/* Curves from each of the six columns into the centre (viewBox units; columns are equal width). */
const curves = inputs.map((_, i) => {
  const x = ((i + 0.5) / inputs.length) * 1200;
  return `M${x},0 C${x},56 600,44 600,100`;
});

/** The long-term vision, with a hard line between what exists today and what is still being built. */
export function FutureOffice() {
  const available = roadmap.filter((r) => r.availability === "available");
  const coming = roadmap.filter((r) => r.availability === "coming");

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

        {/* Six areas → one family office */}
        <div className="mt-16 lg:mt-20">
          <ul
            aria-label="What your family office brings together"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-night-line bg-night-line sm:grid-cols-3 lg:grid-cols-6"
          >
            {inputs.map(({ label, detail, icon: Icon }) => (
              <li key={label} className="bg-night-raised px-4 py-5 text-center">
                <Icon aria-hidden className="mx-auto size-4 text-brand-muted" strokeWidth={1.75} />
                <p className="text-label mt-3 text-white">{label}</p>
                <p className="mt-1 text-xs text-night-muted">{detail}</p>
              </li>
            ))}
          </ul>

          <svg aria-hidden className="hidden h-24 w-full lg:block" viewBox="0 0 1200 100" preserveAspectRatio="none">
            <g fill="none" stroke="rgb(168 205 194 / 0.35)" strokeWidth="1" vectorEffect="non-scaling-stroke">
              {curves.map((d) => (
                <path key={d} d={d} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          </svg>
          <div aria-hidden className="mx-auto h-10 w-px bg-gradient-to-b from-night-line to-brand-muted/60 lg:hidden" />

          <div className="mx-auto flex max-w-md flex-col items-center rounded-panel border border-brand-muted/30 bg-night-raised px-6 py-6 text-center shadow-[0_0_0_8px_rgb(15_90_79/0.14),0_30px_80px_-30px_rgb(15_90_79/0.6)] sm:flex-row sm:gap-4 sm:text-left">
            <LogoMark className="size-10 shrink-0" inverted />
            <div className="mt-3 sm:mt-0">
              <p className="text-label text-brand-muted">Your family office</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-white">One private place for everything here.</p>
            </div>
          </div>
        </div>

        {/* Today vs. later — never blurred */}
        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:mt-20">
          <div className="rounded-panel border border-night-line bg-night-raised p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white">
                <span aria-hidden className="size-2 rounded-full bg-good-bright" />
                Available today
              </h3>
              <span className="text-label text-night-muted">Coordinated by our team</span>
            </div>
            <p className="mt-2 text-sm text-night-muted">Request any of these through Get Started.</p>
            <ul className="mt-6 grid gap-3 text-[0.9375rem] text-night-text">
              {available.map((r) => (
                <li key={r.label} className="flex items-start gap-3">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-good-bright" strokeWidth={2} />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-panel border border-dashed border-night-line p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white">
                <span aria-hidden className="size-2 rounded-full border border-info-bright" />
                Coming to the platform
              </h3>
              <span className="text-label text-night-muted">In development</span>
            </div>
            <p className="mt-2 text-sm text-night-muted">Being built now. Not yet available to customers.</p>
            <ul className="mt-6 grid gap-3 text-[0.9375rem] text-night-muted">
              {coming.map((r) => (
                <li key={r.label} className="flex items-start gap-3">
                  <CircleDashed aria-hidden className="mt-1 size-4 shrink-0 text-info-bright" strokeWidth={1.75} />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
