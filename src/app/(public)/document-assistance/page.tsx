import { Bell, FileCheck2, FolderLock } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { ScopeNote } from "@/components/marketing/scope-note";
import { OfferingsGrid, RelatedServices, ServicePageMeta } from "@/components/marketing/service-page";
import { AvailabilityBadge, DemoLabel } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { getService } from "@/config/services";
import { pageMetadata } from "@/lib/seo/metadata";

const service = getService("document-assistance");
const description =
  "Document assistance for NRIs in Tamil Nadu. Organise property records, coordinate document collection, get renewal reminders and connect with qualified professionals.";

export const metadata = pageMetadata({ title: "Document Assistance for NRIs", description, path: routes.documentAssistance });

const sampleRecords = [
  { name: "Property tax receipt", status: "Up to date", icon: FileCheck2 },
  { name: "Rental agreement", status: "Renewal due in 45 days", icon: Bell },
  { name: "Sale deed (copy)", status: "Original held by owner", icon: FolderLock },
];

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
          <figure className="rounded-panel border border-line bg-surface p-5 shadow-raised sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-[0.16em] text-ink uppercase">Document tracker</p>
              <DemoLabel />
            </div>
            <ul className="mt-5 divide-y divide-line">
              {sampleRecords.map(({ name, status, icon: Icon }) => (
                <li key={name} className="flex items-center gap-3 py-3.5">
                  <Icon aria-hidden className="size-5 shrink-0 text-brand" strokeWidth={1.75} />
                  <span className="flex-1 text-sm font-medium text-ink">{name}</span>
                  <span className="text-right text-xs text-ink-subtle">{status}</span>
                </li>
              ))}
            </ul>
            <figcaption className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
              <AvailabilityBadge availability="coming" /> The online document vault is part of the upcoming private workspace.
            </figcaption>
          </figure>
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
