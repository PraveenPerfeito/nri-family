import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { DocumentPreview } from "@/components/product-preview/previews/document-preview";
import { ScopeNote } from "@/components/marketing/scope-note";
import { OfferingsGrid, RelatedServices, ServicePageMeta } from "@/components/marketing/service-page";
import { AvailabilityBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { getService } from "@/config/services";
import { pageMetadata } from "@/lib/seo/metadata";

const service = getService("document-assistance");
const description =
  "Document assistance for NRIs in Tamil Nadu. Organise property records, coordinate document collection, get renewal reminders and connect with qualified professionals.";

export const metadata = pageMetadata({ title: "Document Assistance for NRIs", description, path: routes.documentAssistance });

export default function DocumentAssistancePage() {
  return (
    <>
      <ServicePageMeta service={service} description={description} />
      <PageHero
        eyebrow="Document Assistance"
        title="Important papers, organised and on time."
        lead="Keep track of the documents tied to your property and household in Tamil Nadu — what exists, where it is, and what's due next."
        breadcrumb={{ name: service.name, path: service.href }}
        actions={
          <ButtonLink href={routes.getStarted} size="lg" arrow track="service_cta_clicked" trackProps={{ service: service.slug, location: "hero" }}>
            Get Started
          </ButtonLink>
        }
        aside={
          <div>
            <DocumentPreview />
            <p className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-ink-subtle lg:justify-end lg:text-right">
              <AvailabilityBadge availability="coming" /> The online document vault is part of the upcoming private workspace.
            </p>
          </div>
        }
      />

      <Section labelledBy="doc-offerings">
        <SectionHeader id="doc-offerings" eyebrow="What's included" title="Less paperwork to worry about from abroad." />
        <div className="mt-12">
          <OfferingsGrid offerings={service.offerings} />
        </div>
        <ScopeNote className="mt-8">{service.scopeNote}</ScopeNote>
      </Section>

      <Section className="pt-0 sm:pt-0 lg:pt-0">
        <RelatedServices current={service.slug} />
      </Section>

      <CtaBand location="document_assistance" />
    </>
  );
}
