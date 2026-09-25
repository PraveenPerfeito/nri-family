import Link from "next/link";
import { CtaBand } from "@/components/marketing/cta-band";
import { DistanceStory } from "@/components/marketing/home/distance-story";
import { EcosystemRadial } from "@/components/marketing/home/ecosystem-radial";
import { EvidenceTimeline } from "@/components/marketing/home/evidence-timeline";
import { FutureOffice } from "@/components/marketing/home/future-office";
import { HomeHero, TrustStrip } from "@/components/marketing/home/hero";
import { Journey } from "@/components/marketing/home/journey";
import { PrivacyAccess } from "@/components/marketing/home/privacy-access";
import { PropertyControl } from "@/components/marketing/home/property-control";
import { ServicesShowcase } from "@/components/marketing/home/services-showcase";
import { WorkspaceDashboard } from "@/components/marketing/home/workspace-dashboard";
import { InspectionReport } from "@/components/property/inspection-report";
import { FaqList } from "@/components/shared/faq-list";
import { PrivacyPrinciples } from "@/components/trust/privacy-principles";
import { TrustRecord } from "@/components/trust/trust-record";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { faqs } from "@/data/faq";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  description:
    "NRI property management and local support in Tamil Nadu: inspections, maintenance, rentals, documents and family help, with photos, reports and approvals.",
  path: routes.home,
});

/*
 * Scroll rhythm (UI V2): hero → trust strip → problem → solution → services →
 * trust/evidence → privacy → digital family office → dashboard → property →
 * how it works → FAQ → closing CTA. Each section has its own composition.
 */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <TrustStrip />

      {/* Problem */}
      <DistanceStory />

      {/* Solution */}
      <Section tone="surface" labelledBy="solution-title">
        <SectionHeader
          id="solution-title"
          align="center"
          eyebrow="The answer"
          title="One trusted team for your Tamil Nadu life."
          lead="One local team and one place to see what is happening with everything you own and care about here."
        />
        <EcosystemRadial />
        <div className="mt-14 flex justify-center">
          <ButtonLink href={routes.howItWorks} variant="secondary" arrow track="cta_clicked" trackProps={{ label: "see_how_it_works", location: "solution" }}>
            See How It Works
          </ButtonLink>
        </div>
      </Section>

      {/* Services */}
      <Section labelledBy="services-title">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader id="services-title" eyebrow="Services" title="Everything you need, managed locally." />
          <ButtonLink href={routes.services} variant="ghost" className="shrink-0 self-start md:self-auto">
            View all services
          </ButtonLink>
        </div>
        <ServicesShowcase />
      </Section>

      {/* Trust / evidence */}
      <Section tone="subtle" labelledBy="trust-title">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16">
          <SectionHeader id="trust-title" eyebrow="Transparency" title="Distance shouldn't mean uncertainty." />
          <div className="max-w-xl lg:pb-2">
            <p className="text-lg text-ink-muted sm:text-xl">
              Every service should leave you with a clear record of what happened, who handled it and what it cost.
            </p>
          </div>
        </div>
        <div className="mt-16 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start lg:gap-8">
          <EvidenceTimeline />
          <div className="lg:mt-24">
            <InspectionReport />
          </div>
        </div>
        <div className="mt-20">
          <p className="text-label text-ink-subtle">Every record answers six questions</p>
          <div className="mt-5">
            <TrustRecord />
          </div>
        </div>
      </Section>

      {/* Privacy */}
      <Section labelledBy="privacy-title">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <SectionHeader
              id="privacy-title"
              eyebrow="Privacy"
              title="Your property information stays private."
              lead="Your property, documents and personal information belong to you. We design the platform so private information is only available to authorised people."
            />
            <div className="mt-10">
              <PrivacyPrinciples />
            </div>
            <div className="mt-10">
              <ButtonLink href={routes.trust} variant="secondary" arrow>
                Explore Trust &amp; Security
              </ButtonLink>
            </div>
          </div>
          <PrivacyAccess />
        </div>
      </Section>

      {/* Digital family office */}
      <FutureOffice />

      {/* Dashboard */}
      <Section labelledBy="workspace-title">
        <SectionHeader
          id="workspace-title"
          align="center"
          eyebrow="One trusted workspace"
          title="Your Tamil Nadu, in one private workspace."
          lead="See your properties, open requests, approvals and reports in one place. The online workspace is being built now."
        />
        <div className="mx-auto mt-16 max-w-6xl">
          <WorkspaceDashboard />
        </div>
      </Section>

      {/* Property */}
      <PropertyControl />

      {/* How it works */}
      <Section labelledBy="how-title">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            id="how-title"
            eyebrow="How it works"
            title="From request to resolution, without the distance."
            lead="A simple, visible process — so you always know what is happening and nothing proceeds without you."
          />
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <ButtonLink href={routes.getStarted} size="lg" arrow track="cta_clicked" trackProps={{ label: "create_family_office", location: "how_it_works" }}>
              Create Your Family Office
            </ButtonLink>
            <ButtonLink href={routes.howItWorks} size="lg" variant="secondary">
              See the full journey
            </ButtonLink>
          </div>
        </div>
        <Journey />
      </Section>

      {/* FAQ */}
      <Section tone="surface" labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeader id="faq-title" eyebrow="FAQ" title="Questions NRIs ask us." />
            <p className="mt-6 max-w-sm text-ink-muted">
              Something else on your mind?{" "}
              <Link href={routes.contact} className="font-medium text-brand underline-offset-4 hover:underline">
                Ask our team
              </Link>
              .
            </p>
            <div className="mt-8">
              <ButtonLink href={routes.faq} variant="ghost">
                Read all questions
              </ButtonLink>
            </div>
          </div>
          <FaqList items={faqs.slice(0, 6)} />
        </div>
      </Section>

      <CtaBand
        location="home"
        title={
          <>
            <span className="block">You live abroad.</span> <span className="block">We take care of what you own here.</span>
          </>
        }
        body="Tell us what you need help with in Tamil Nadu."
        secondary={{ label: "Explore Services", href: routes.services }}
      />
    </>
  );
}
