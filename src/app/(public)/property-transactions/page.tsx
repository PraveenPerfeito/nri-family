import { Check, Home, KeyRound, Tag } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { PropertyTransactionPreview } from "@/components/product-preview/previews/property-transaction-preview";
import { ScopeNote } from "@/components/marketing/scope-note";
import { RelatedServices, ServicePageMeta } from "@/components/marketing/service-page";
import { VisibilityLevels } from "@/components/trust/visibility";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { REGULATED_SERVICES_NOTE, getService } from "@/config/services";
import { pageMetadata } from "@/lib/seo/metadata";

const service = getService("property-transactions");
const description =
  "Property sale, purchase and rental assistance for NRIs in Tamil Nadu: site visits, enquiries and coordination with qualified professionals.";

export const metadata = pageMetadata({ title: "Property Sale, Purchase & Rental Assistance for NRIs", description, path: routes.propertyTransactions });

const tracks = [
  {
    id: "sell",
    icon: Tag,
    title: "Sell",
    intro: "Sell a property in Tamil Nadu without flying back for every step.",
    steps: [
      "Property assessment coordination",
      "Documentation coordination",
      "Professional verification",
      "Listing, with visibility you control",
      "Enquiry management",
      "Site visit coordination",
      "Negotiation coordination",
    ],
  },
  {
    id: "buy",
    icon: Home,
    title: "Buy",
    intro: "Find and check a property with someone local looking out for you.",
    steps: [
      "Requirement capture",
      "Property discovery",
      "Site visits, with photos and video",
      "Document coordination",
      "Professional verification",
      "Transaction coordination",
    ],
  },
  {
    id: "rent",
    icon: KeyRound,
    title: "Rent",
    intro: "Find a suitable tenant and keep the tenancy running smoothly.",
    steps: ["Listing", "Enquiries", "Tenant coordination", "Agreement coordination", "Maintenance"],
  },
];

export default function PropertyTransactionsPage() {
  return (
    <>
      <ServicePageMeta service={service} description={description} />
      <PageHero
        eyebrow="Property Transactions"
        title="Sell, buy or rent — with someone on the ground."
        lead="We coordinate the local steps of a property transaction, keep you informed at every stage, and bring in qualified property and legal professionals where required."
        breadcrumb={{ name: service.name, path: service.href }}
        actions={
          <>
            <ButtonLink href={routes.getStarted} size="lg" arrow track="property_cta_clicked" trackProps={{ location: "transactions_hero" }}>
              List My Property
            </ButtonLink>
            <ButtonLink href={routes.getStarted} size="lg" variant="secondary" track="service_cta_clicked" trackProps={{ service: service.slug, location: "hero_buy" }}>
              I want to buy
            </ButtonLink>
          </>
        }
        aside={<PropertyTransactionPreview />}
      />

      <Section labelledBy="tx-tracks">
        <h2 id="tx-tracks" className="sr-only">
          Sell, buy and rent
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {tracks.map((t) => (
            <article key={t.id} className="reveal flex flex-col rounded-card border border-line bg-surface p-7 shadow-card">
              <div className="flex items-center gap-3">
                <IconTile icon={t.icon} />
                <h3 className="text-display text-3xl text-ink">{t.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t.intro}</p>
              <ol className="mt-6 space-y-3 border-t border-line pt-6">
                {t.steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-ink">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand tabular-nums">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
        <ScopeNote className="mt-8" title="Qualified professionals, where required">
          <p>{REGULATED_SERVICES_NOTE}</p>
          <p className="mt-2">
            We do not provide legal advice, act as your legal representative or guarantee any outcome. Title checks, agreements
            and registration are carried out by appropriately qualified professionals.
          </p>
        </ScopeNote>
      </Section>

      <Section tone="surface" labelledBy="tx-visibility">
        <SectionHeader
          id="tx-visibility"
          eyebrow="Your control"
          title="Decide who can see your property."
          lead="Your property is private by default. You choose whether it is shared with a verified network or published publicly — and enquiries always come through the platform, not to your personal phone."
        />
        <div className="mt-12">
          <VisibilityLevels />
        </div>
        <ul className="mt-8 grid gap-2 text-sm text-ink sm:grid-cols-2">
          {["Your name and number are not shown on listings", "Exact addresses are shared only with visitors you approve", "Enquiries come to our team first, not to your personal phone", "You can change visibility at any time"].map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              {p}
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <RelatedServices current={service.slug} />
      </Section>

      <CtaBand location="property_transactions" title="Planning to sell, buy or rent?" cta="List My Property" track="property_cta_clicked" />
    </>
  );
}
