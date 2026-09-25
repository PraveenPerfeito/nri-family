import { EyeOff, MessageSquareLock, ShieldCheck } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { VisibilityLevels } from "@/components/trust/visibility";
import { AvailabilityBadge, DemoLabel } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { demoListings } from "@/data/demo";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Secure Property Listings for NRIs",
  description:
    "A preview of secure property listings for NRIs in Tamil Nadu: private by default, shareable with a verified network, and public only when the owner chooses.",
  path: routes.property,
});

const safeguards = [
  { icon: EyeOff, title: "No owner details on listings", body: "Listings never show the owner's name, phone number, email or exact address." },
  { icon: MessageSquareLock, title: "Enquiries through the platform", body: "Interested buyers and tenants contact us, not you. You decide who to take forward." },
  { icon: ShieldCheck, title: "Verified network", body: "Share a property only with verified buyers, tenants or partners before, or instead of, going public." },
];

export default function PropertyPage() {
  return (
    <>
      <PageHero
        eyebrow="Property"
        title="Secure property listings for NRIs."
        lead="Sell or rent a property in Tamil Nadu while keeping control over who sees it, and how enquiries reach you."
        breadcrumb={{ name: "Property", path: routes.property }}
        actions={
          <>
            <ButtonLink href={routes.getStarted} size="lg" arrow track="property_cta_clicked" trackProps={{ location: "property_hero" }}>
              List My Property
            </ButtonLink>
            <ButtonLink href={routes.propertyTransactions} size="lg" variant="secondary">
              How transactions work
            </ButtonLink>
          </>
        }
      />

      <Section labelledBy="preview-title">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeader
            id="preview-title"
            eyebrow="Preview"
            title="What a listing looks like."
            lead="These are sample listings to show the format. They are not real properties and are not available."
          />
          <div className="flex flex-wrap gap-2">
            <DemoLabel />
            <AvailabilityBadge availability="coming" />
          </div>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {demoListings.map((l) => (
            <PropertyCard key={l.id} listing={l} />
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-subtle">
          Listings marked <em>Private</em> are shown here only to illustrate the label. In the live platform, private properties are
          never visible to anyone except the owner and authorised staff.
        </p>
      </Section>

      <Section tone="surface" labelledBy="levels-title">
        <SectionHeader id="levels-title" eyebrow="Visibility" title="Your property. Your control." />
        <div className="mt-12">
          <VisibilityLevels />
        </div>
      </Section>

      <Section labelledBy="safeguards-title">
        <SectionHeader id="safeguards-title" eyebrow="Safeguards" title="Designed so your details stay yours." />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {safeguards.map((s) => (
            <FeatureCard key={s.title} icon={s.icon} title={s.title} compact className="reveal">
              {s.body}
            </FeatureCard>
          ))}
        </ul>
      </Section>

      <CtaBand
        location="property"
        title="Want to sell or rent your property?"
        body="Online listings are coming to the platform. In the meantime, our team can coordinate your sale or rental directly."
        cta="List My Property"
        track="property_cta_clicked"
      />
    </>
  );
}
