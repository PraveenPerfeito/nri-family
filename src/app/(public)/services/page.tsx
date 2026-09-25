import { Check } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { ServiceCard } from "@/components/marketing/service-card";
import { ScopeNote } from "@/components/marketing/scope-note";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { REGULATED_SERVICES_NOTE, services } from "@/config/services";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Services for NRIs in Tamil Nadu",
  description:
    "Property care, property management, transaction coordination, document assistance and family assistance for NRIs with property and family in Tamil Nadu.",
  path: routes.services,
});

const plans = [
  {
    name: "Essential",
    audience: "For individual property owners.",
    points: ["One property or plot", "Scheduled inspections with photo reports", "Maintenance and repairs on request"],
  },
  {
    name: "Family",
    audience: "For multiple properties and local assistance.",
    points: ["Several properties across Tamil Nadu", "Rental and tenant coordination", "Family assistance coordination"],
    featured: true,
  },
  {
    name: "Premium",
    audience: "For comprehensive family-office support.",
    points: ["Everything in Family", "Document organisation and reminders", "Transaction coordination when you need it"],
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Everything you need, managed locally."
        lead="One trusted team for your property, assets and local needs in Tamil Nadu — with a clear record of every visit, decision and cost."
        breadcrumb={{ name: "Services", path: routes.services }}
        actions={
          <>
            <ButtonLink href={routes.getStarted} size="lg" arrow track="cta_clicked" trackProps={{ label: "get_started", location: "services_hero" }}>
              Get Started
            </ButtonLink>
            <ButtonLink href={routes.howItWorks} size="lg" variant="secondary">
              How it works
            </ButtonLink>
          </>
        }
      />

      <Section labelledBy="all-services">
        <h2 id="all-services" className="sr-only">
          All services
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} location="services_page" />
          ))}
          <li className="reveal flex flex-col justify-between rounded-panel border border-dashed border-line-strong p-6 sm:p-8">
            <div>
              <p className="text-label text-ink-subtle">Not sure where to start?</p>
              <p className="text-display mt-4 text-xl">Tell us about your situation.</p>
              <p className="mt-2 text-[0.9375rem] text-ink-muted">We&apos;ll suggest what makes sense, what it involves and what it costs.</p>
            </div>
            <div className="pt-8">
              <ButtonLink href={routes.getStarted} variant="secondary" arrow track="cta_clicked" trackProps={{ label: "tell_us", location: "services_page" }}>
                Tell Us What You Need
              </ButtonLink>
            </div>
          </li>
        </ul>
        <ScopeNote className="mt-8">{REGULATED_SERVICES_NOTE}</ScopeNote>
      </Section>

      <Section id="plans" tone="surface" labelledBy="plans-title">
        <SectionHeader
          id="plans-title"
          eyebrow="Plans"
          title="Support that fits what you own."
          lead="Every family's situation is different, so we don't publish fixed prices yet. Tell us what you need and we'll recommend a plan. Individual jobs are always quoted for your approval first."
        />
        <ul className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.name}
              className={`reveal flex flex-col rounded-card border p-7 ${plan.featured ? "border-brand bg-surface shadow-raised" : "border-line bg-canvas"}`}
            >
              <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
              <p className="mt-2 text-sm text-ink-muted">{plan.audience}</p>
              <p className="mt-6 text-sm font-medium text-ink">Pricing on request</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink">
                {plan.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <ButtonLink
                  href={routes.getStarted}
                  variant={plan.featured ? "primary" : "secondary"}
                  className="w-full"
                  track="cta_clicked"
                  trackProps={{ label: `request_plan_${plan.name.toLowerCase()}`, location: "plans" }}
                >
                  Request a plan
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-subtle">Plan contents are indicative and will be confirmed with you before you commit.</p>
      </Section>

      <CtaBand location="services" secondary={{ label: "Talk to us", href: routes.contact }} />
    </>
  );
}
