import { CtaBand } from "@/components/marketing/cta-band";
import { FlowChain } from "@/components/marketing/flow";
import { PageHero } from "@/components/marketing/page-hero";
import { ScopeNote } from "@/components/marketing/scope-note";
import { OfferingsGrid, RelatedServices, ServicePageMeta } from "@/components/marketing/service-page";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { getService } from "@/config/services";
import { pageMetadata } from "@/lib/seo/metadata";

const service = getService("property-management");
const description =
  "NRI rental management in Tamil Nadu: tenant coordination, rent tracking, maintenance, inspections and move-in/move-out, while you live abroad.";

export const metadata = pageMetadata({ title: "Property & Rental Management for NRIs", description, path: routes.propertyManagement });

export default function PropertyManagementPage() {
  return (
    <>
      <ServicePageMeta service={service} description={description} />
      <PageHero
        eyebrow="Property Management"
        title="Rent out your property without managing it from abroad."
        lead="A local team to coordinate with your tenant, track rent, arrange maintenance and inspect the property — while you stay informed and in control of decisions."
        breadcrumb={{ name: service.name, path: service.href }}
        actions={
          <>
            <ButtonLink href={routes.getStarted} size="lg" arrow track="service_cta_clicked" trackProps={{ service: service.slug, location: "hero" }}>
              Get Started
            </ButtonLink>
            <ButtonLink href={routes.propertyCare} size="lg" variant="secondary">
              Property care
            </ButtonLink>
          </>
        }
      />

      <Section tone="surface" labelledBy="pm-flow">
        <SectionHeader
          id="pm-flow"
          align="center"
          eyebrow="How it fits together"
          title="From tenant to report, one continuous record."
        />
        <div className="mt-12">
          <FlowChain steps={["Property", "Tenant", "Rental", "Maintenance", "Inspection", "Report"]} label="Property management workflow" />
        </div>
      </Section>

      <Section labelledBy="pm-offerings">
        <SectionHeader id="pm-offerings" eyebrow="What's included" title="Everything a rental needs, locally." />
        <div className="mt-12">
          <OfferingsGrid offerings={service.offerings} />
        </div>
        <ScopeNote className="mt-8">
          Rental agreements, registration and any legal or tax matters are handled by appropriately qualified professionals. We
          coordinate with them on your behalf when you ask us to.
        </ScopeNote>
      </Section>

      <Section className="pt-0 sm:pt-0 lg:pt-0">
        <RelatedServices current={service.slug} />
      </Section>

      <CtaBand location="property_management" />
    </>
  );
}
