import { InspectionReport } from "@/components/property/inspection-report";
import { CtaBand } from "@/components/marketing/cta-band";
import { FlowChain } from "@/components/marketing/flow";
import { PageHero } from "@/components/marketing/page-hero";
import { OfferingsGrid, RelatedServices, ServicePageMeta } from "@/components/marketing/service-page";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { getService } from "@/config/services";
import { pageMetadata } from "@/lib/seo/metadata";

const service = getService("property-care");
const description =
  "NRI property maintenance and inspections in Chennai and across Tamil Nadu: house and land checks, repairs, cleaning and security, with photo reports.";

export const metadata = pageMetadata({ title: "Property Care & Inspections for NRIs", description, path: routes.propertyCare });

export default function PropertyCarePage() {
  return (
    <>
      <ServicePageMeta service={service} description={description} />
      <PageHero
        eyebrow="Property Care"
        title="Know your property is looked after."
        lead="Inspections, maintenance and repairs for houses, apartments and land across Tamil Nadu — with photos, a written report and your approval before any paid work."
        breadcrumb={{ name: service.name, path: service.href }}
        actions={
          <>
            <ButtonLink href={routes.getStarted} size="lg" arrow track="service_cta_clicked" trackProps={{ service: service.slug, location: "hero" }}>
              Protect My Property
            </ButtonLink>
            <ButtonLink href={routes.contact} size="lg" variant="secondary">
              Ask a question
            </ButtonLink>
          </>
        }
        aside={<InspectionReport />}
      />

      <Section labelledBy="care-offerings">
        <SectionHeader id="care-offerings" eyebrow="What's included" title="Care for every kind of property." />
        <div className="mt-12">
          <OfferingsGrid offerings={service.offerings} />
        </div>
      </Section>

      <Section tone="surface" labelledBy="care-process">
        <SectionHeader
          id="care-process"
          align="center"
          eyebrow="Every visit"
          title="See what happened, from anywhere."
          lead="Each inspection or job produces a record you can review — who went, what they found, what it cost."
        />
        <div className="mt-12">
          <FlowChain steps={["Request", "Visit", "Report", "Quote", "Approve", "Fix", "Proof"]} label="Property care process" />
        </div>
      </Section>

      <Section>
        <RelatedServices current={service.slug} />
      </Section>

      <CtaBand location="property_care" title="Protect what you own in Tamil Nadu." cta="Protect My Property" />
    </>
  );
}
