import type { ReactNode } from "react";
import { ArrowRight, Camera, Check, Circle } from "lucide-react";
import Link from "next/link";
import { serviceIcons } from "@/components/marketing/service-icons";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { getService, type ServiceCategory } from "@/config/services";
import { cn } from "@/lib/utils/cn";

function ServiceLabel({ service }: { service: ServiceCategory }) {
  const Icon = serviceIcons[service.slug];
  return (
    <p className="text-label flex items-center gap-2 text-brand">
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      {service.name}
    </p>
  );
}

function Highlights({ items, columns = 1 }: { items: string[]; columns?: 1 | 2 }) {
  return (
    <ul className={cn("grid gap-x-6 gap-y-2 text-sm text-ink", columns === 2 && "sm:grid-cols-2")}>
      {items.map((h) => (
        <li key={h} className="flex items-start gap-2">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />
          {h}
        </li>
      ))}
    </ul>
  );
}

function ExploreLink({ service }: { service: ServiceCategory }) {
  return (
    <Link
      href={service.href}
      data-track="service_cta_clicked"
      data-track-service={service.slug}
      data-track-location="home_services"
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
    >
      {service.cta}
      <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <li className={cn("reveal flex flex-col rounded-panel border border-line bg-surface p-6 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-raised sm:p-8", className)}>
      {children}
    </li>
  );
}

/** Mini report used in the Property Care feature (sample data). */
function CareVisual() {
  const rows = [
    ["Building", "Good"],
    ["Water", "Good"],
    ["Electricity", "Good"],
    ["Garden", "Attention"],
  ] as const;
  return (
    <div aria-hidden className="rounded-card border border-line-subtle bg-canvas/70 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label text-ink-subtle">Inspection · Chennai House</p>
          <p className="mt-1 text-xs text-ink-subtle">Mon 11:40 · Sample report</p>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
          92<span className="text-sm font-medium text-ink-subtle">/100</span>
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {rows.map(([area, status]) => (
          <li key={area} className="flex items-center justify-between rounded-md border border-line-subtle bg-surface px-3 py-2 text-xs">
            <span className="text-ink">{area}</span>
            <span className={cn("flex items-center gap-1.5 font-medium", status === "Good" ? "text-good" : "text-attention")}>
              <span className={cn("size-1.5 rounded-full", status === "Good" ? "bg-good" : "bg-attention-bright")} />
              {status}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex aspect-[4/3] items-center justify-center rounded-md border border-line-subtle bg-[linear-gradient(135deg,var(--color-subtle),var(--color-surface))]">
            {i === 3 ? <span className="text-xs font-semibold text-ink-muted">+14</span> : <Camera className="size-3.5 text-ink-subtle/60" />}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line-subtle pt-3 text-xs text-ink-subtle">
        <span>18 photos · 1 video</span>
        <span className="font-medium text-attention">1 recommendation</span>
      </div>
    </div>
  );
}

function RentVisual() {
  const log = [
    ["September rent received", "done"],
    ["Tenant request: ceiling fan", "done"],
    ["Periodic inspection", "next"],
  ] as const;
  return (
    <ul aria-hidden className="space-y-2">
      {log.map(([label, state]) => (
        <li key={label} className="flex items-center justify-between rounded-md border border-line-subtle bg-canvas/70 px-3 py-2 text-xs">
          <span className="flex items-center gap-2 text-ink">
            {state === "done" ? <Check className="size-3.5 text-good" strokeWidth={2.25} /> : <Circle className="size-3.5 text-info" strokeWidth={2.25} />}
            {label}
          </span>
          <span className="text-ink-subtle">{state === "done" ? "Done" : "12 Oct"}</span>
        </li>
      ))}
    </ul>
  );
}

function VisibilityMini() {
  const levels = ["Private", "Verified network", "Public"];
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-1.5 text-xs">
      {levels.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className={cn("rounded-full border px-2.5 py-1 font-medium", i === 1 ? "border-brand/40 bg-brand-soft text-brand-strong" : "border-line bg-canvas text-ink-muted")}>{l}</span>
          {i < levels.length - 1 ? <ArrowRight className="size-3 text-ink-subtle" /> : null}
        </span>
      ))}
    </div>
  );
}

/** Services with hierarchy: three primary services, two secondary, one prompt. */
export function ServicesShowcase() {
  const care = getService("property-care");
  const management = getService("property-management");
  const transactions = getService("property-transactions");
  const documents = getService("document-assistance");
  const family = getService("family-assistance");

  return (
    <ul className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
      {/* Flagship: Property Care */}
      <Panel className="md:col-span-2 lg:col-span-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
          <div className="flex flex-col">
            <ServiceLabel service={care} />
            <h3 className="text-display mt-4 text-3xl sm:text-4xl xl:text-[2.5rem]">Inspect · Maintain · Protect</h3>
            <p className="mt-4 max-w-md text-ink-muted">{care.summary}</p>
            <div className="mt-7">
              <Highlights items={care.highlights} columns={2} />
            </div>
            <div className="pt-8">
              <ExploreLink service={care} />
            </div>
          </div>
          <CareVisual />
        </div>
      </Panel>

      <Panel className="lg:col-span-6">
        <ServiceLabel service={management} />
        <h3 className="text-display mt-4 text-2xl">Tenants · Rent · Upkeep</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{management.summary}</p>
        <div className="mt-5">
          <RentVisual />
        </div>
        <div className="mt-5 max-sm:hidden">
          <Highlights items={management.highlights} />
        </div>
        <div className="mt-auto pt-6">
          <ExploreLink service={management} />
        </div>
      </Panel>

      <Panel className="lg:col-span-6">
        <ServiceLabel service={transactions} />
        <h3 className="text-display mt-4 text-2xl">Sell · Buy · Rent</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{transactions.summary}</p>
        <div className="mt-5">
          <VisibilityMini />
        </div>
        <div className="mt-5 max-sm:hidden">
          <Highlights items={transactions.highlights} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-subtle">{transactions.scopeNote}</p>
        <div className="mt-auto pt-6">
          <ExploreLink service={transactions} />
        </div>
      </Panel>

      <Panel className="lg:col-span-4">
        <ServiceLabel service={documents} />
        <h3 className="text-display mt-4 text-xl">Organise · Collect · Remind</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{documents.summary}</p>
        <div className="mt-5 max-sm:hidden">
          <Highlights items={documents.highlights} />
        </div>
        <div className="mt-auto pt-6">
          <ExploreLink service={documents} />
        </div>
      </Panel>

      <Panel className="lg:col-span-4">
        <ServiceLabel service={family} />
        <h3 className="text-display mt-4 text-xl">Coordinate · Assist · Respond</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{family.summary}</p>
        <div className="mt-5 max-sm:hidden">
          <Highlights items={family.highlights} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-subtle">{family.scopeNote}</p>
        <div className="mt-auto pt-6">
          <ExploreLink service={family} />
        </div>
      </Panel>

      <li className="reveal flex flex-col justify-between rounded-panel border border-dashed border-line-strong p-6 sm:p-8 md:col-span-2 lg:col-span-4">
        <div>
          <p className="text-label text-ink-subtle">Not sure where to start?</p>
          <p className="text-display mt-4 text-xl">Tell us about your situation.</p>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">We&apos;ll suggest what makes sense, what it involves and what it costs.</p>
        </div>
        <div className="pt-8">
          <ButtonLink href={routes.getStarted} arrow track="cta_clicked" trackProps={{ label: "tell_us", location: "home_services" }}>
            Tell Us What You Need
          </ButtonLink>
        </div>
      </li>
    </ul>
  );
}
