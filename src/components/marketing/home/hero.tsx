import { Camera, CheckCheck, Lock, MapPin } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ContourLines } from "@/components/ui/contours";
import { Eyebrow } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { CommandCenter } from "./command-center";

/** Hero background: barely-there glow, faint grid and contour lines. */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-hero-glow absolute inset-0" />
      <div className="bg-grid-fade absolute inset-0 opacity-70" />
      <ContourLines />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      <HeroBackdrop />
      <div className="container-page relative grid items-center gap-16 pt-14 pb-24 sm:pt-20 lg:grid-cols-[1.08fr_1fr] lg:gap-12 lg:pt-24 lg:pb-32">
        <div className="max-w-2xl">
          <Eyebrow>For NRIs · Tamil Nadu</Eyebrow>
          <h1 id="hero-title" className="text-display mt-6 text-[2.75rem] tracking-[-0.045em] sm:text-6xl lg:text-[3.5rem] xl:text-[4.5rem]">
            Your trusted team in Tamil&nbsp;Nadu.
          </h1>
          <p className="mt-7 text-xl leading-snug font-medium tracking-tight text-balance text-ink sm:text-2xl">
            You live abroad.
            <br />
            We take care of what you own here.
          </p>
          <p className="mt-5 max-w-lg text-lg text-ink-muted">
            Property care, local execution, documents and family assistance — managed transparently from anywhere.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={routes.getStarted} size="lg" arrow track="hero_get_started_clicked" trackProps={{ location: "hero" }}>
              Get Started
            </ButtonLink>
            <ButtonLink href={routes.services} size="lg" variant="secondary" track="hero_explore_services_clicked" trackProps={{ location: "hero" }}>
              Explore Services
            </ButtonLink>
          </div>
          <p className="mt-7 text-sm text-ink-subtle">Built for NRIs with property, family and assets in Tamil Nadu.</p>
        </div>
        <CommandCenter />
      </div>
    </section>
  );
}

const principles = [
  { icon: Lock, label: "Private by default" },
  { icon: MapPin, label: "Local execution" },
  { icon: Camera, label: "Visible proof" },
  { icon: CheckCheck, label: "Customer approval" },
];

/** The product philosophy in one line, right under the hero. */
export function TrustStrip() {
  return (
    <div className="border-y border-line-subtle bg-surface/70">
      <ul aria-label={`How ${siteConfig.brand.name} works`} className="container-page grid grid-cols-2 gap-x-6 gap-y-3 py-5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-10">
        {principles.map(({ icon: Icon, label }, i) => (
          <li key={label} className="flex items-center gap-2.5 text-ink-muted">
            {i > 0 ? <span aria-hidden className="hidden size-1 rounded-full bg-line-strong sm:mr-7 sm:block" /> : null}
            <Icon aria-hidden className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
            <span className="text-label max-sm:tracking-[0.08em]">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
