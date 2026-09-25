import type { ReactNode } from "react";
import { ArrowRight, Check, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { serviceIcons } from "@/components/marketing/service-icons";
import { DemoLabel } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { getService, type ServiceCategory } from "@/config/services";
import { cn } from "@/lib/utils/cn";

function ServiceLabel({ service, children }: { service: ServiceCategory; children?: ReactNode }) {
  const Icon = serviceIcons[service.slug];
  return (
    <p className="flex flex-wrap items-center gap-2.5">
      <span className="text-label flex items-center gap-2 text-brand">
        <Icon aria-hidden className="size-3.5" strokeWidth={2} />
        {service.name}
      </span>
      {children}
    </p>
  );
}

/** Primary service: a check list in two columns. */
function Highlights({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-2 text-sm text-ink sm:grid-cols-2">
      {items.map((h) => (
        <li key={h} className="flex items-start gap-2">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />
          {h}
        </li>
      ))}
    </ul>
  );
}

/** Secondary and supporting services: the same items, as quiet tags. */
function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((h) => (
        <li key={h} className="rounded-full border border-line-subtle bg-canvas px-2.5 py-1 text-xs text-ink-muted">
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
  return <li className={cn("reveal flex flex-col rounded-panel border p-6 transition-[border-color,box-shadow] duration-200 sm:p-8", className)}>{children}</li>;
}

/** Property Care: the care plan a family starts with (illustrative). */
function CarePlan() {
  const plan = [
    { label: "Property inspection", cadence: "Monthly" },
    { label: "Maintenance and repairs", cadence: "On request, quoted first" },
    { label: "Garden care", cadence: "Monthly" },
    { label: "Security checks", cadence: "Every visit" },
  ];
  return (
    <div aria-hidden className="rounded-card border border-line-subtle bg-canvas/80 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label text-ink-subtle">Care plan</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-ink">Chennai House</p>
        </div>
        <DemoLabel />
      </div>
      <ul className="mt-4 divide-y divide-line-subtle rounded-control border border-line-subtle bg-surface">
        {plan.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.8125rem]">
            <span className="flex items-center gap-2 text-ink">
              <CheckCircle2 className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
              {p.label}
            </span>
            <span className="text-right text-xs text-ink-subtle">{p.cadence}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-control border border-line-subtle bg-surface px-3.5 py-3">
          <p className="text-xs text-ink-subtle">Next visit</p>
          <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">12 Oct · 10:00</p>
        </div>
        <div className="rounded-control border border-line-subtle bg-surface px-3.5 py-3">
          <p className="text-xs text-ink-subtle">After every visit</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">Photos and a report</p>
        </div>
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

/**
 * Services with a clear hierarchy: Property Care is where the platform starts;
 * Management and Transactions are the next steps; Documents and Family support them.
 */
export function ServicesShowcase() {
  const care = getService("property-care");
  const management = getService("property-management");
  const transactions = getService("property-transactions");
  const documents = getService("document-assistance");
  const family = getService("family-assistance");

  return (
    <ul className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
      {/* Primary */}
      <Panel className="border-line bg-surface bg-[radial-gradient(44rem_22rem_at_100%_0%,rgb(15_90_79/0.06),transparent_65%)] shadow-raised md:col-span-2 lg:col-span-12 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div className="flex flex-col">
            <ServiceLabel service={care}>
              <span className="rounded-full bg-brand px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.12em] text-white uppercase">Start here</span>
            </ServiceLabel>
            <h3 className="text-display mt-5 text-3xl sm:text-4xl xl:text-[2.5rem]">Inspect · Maintain · Protect</h3>
            <p className="mt-4 max-w-md text-ink-muted">{care.summary}</p>
            <div className="mt-7">
              <Highlights items={care.highlights} />
            </div>
            <div className="pt-8">
              <ExploreLink service={care} />
            </div>
          </div>
          <CarePlan />
        </div>
      </Panel>

      {/* Secondary */}
      <Panel className="border-line bg-surface hover:border-line-strong hover:shadow-raised lg:col-span-6">
        <ServiceLabel service={management} />
        <h3 className="text-display mt-4 text-2xl">Tenants · Rent · Upkeep</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{management.summary}</p>
        <div className="mt-6">
          <RentVisual />
        </div>
        <div className="mt-5 max-sm:hidden">
          <Tags items={management.highlights} />
        </div>
        <div className="mt-auto pt-7">
          <ExploreLink service={management} />
        </div>
      </Panel>

      <Panel className="border-line bg-surface hover:border-line-strong hover:shadow-raised lg:col-span-6">
        <ServiceLabel service={transactions} />
        <h3 className="text-display mt-4 text-2xl">Sell · Buy · Rent</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{transactions.summary}</p>
        <div className="mt-6">
          <VisibilityMini />
        </div>
        <div className="mt-5 max-sm:hidden">
          <Tags items={transactions.highlights} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-subtle">{transactions.scopeNote}</p>
        <div className="mt-auto pt-7">
          <ExploreLink service={transactions} />
        </div>
      </Panel>

      {/* Supporting */}
      <Panel className="border-line-subtle hover:border-line lg:col-span-4">
        <ServiceLabel service={documents} />
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">Organise · Collect · Remind</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{documents.summary}</p>
        <div className="mt-5 max-sm:hidden">
          <Tags items={documents.highlights} />
        </div>
        <div className="mt-auto pt-7">
          <ExploreLink service={documents} />
        </div>
      </Panel>

      <Panel className="border-line-subtle hover:border-line lg:col-span-4">
        <ServiceLabel service={family} />
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">Coordinate · Assist · Respond</h3>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{family.summary}</p>
        <div className="mt-5 max-sm:hidden">
          <Tags items={family.highlights} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-subtle">{family.scopeNote}</p>
        <div className="mt-auto pt-7">
          <ExploreLink service={family} />
        </div>
      </Panel>

      <li className="reveal flex flex-col justify-between rounded-panel border border-dashed border-line-strong p-6 sm:p-8 md:col-span-2 lg:col-span-4">
        <div>
          <p className="text-label text-ink-subtle">Not sure where to start?</p>
          <p className="mt-4 text-lg font-semibold tracking-tight text-ink">Tell us about your situation.</p>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">We&apos;ll suggest what makes sense, what it involves and what it costs.</p>
        </div>
        <div className="pt-8">
          <ButtonLink href={routes.getStarted} variant="secondary" arrow track="cta_clicked" trackProps={{ label: "tell_us", location: "home_services" }}>
            Tell Us What You Need
          </ButtonLink>
        </div>
      </li>
    </ul>
  );
}
