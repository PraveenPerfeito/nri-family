import { MessageCircle, ShieldCheck, UserCheck } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { ScopeNote } from "@/components/marketing/scope-note";
import { OfferingsGrid, RelatedServices, ServicePageMeta } from "@/components/marketing/service-page";
import { ButtonLink } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { getService } from "@/config/services";
import { pageMetadata } from "@/lib/seo/metadata";

const service = getService("family-assistance");
const description =
  "Family assistance for NRIs in Tamil Nadu. Local coordination for parents and family — home help, errands, appointment logistics and emergency coordination.";

export const metadata = pageMetadata({ title: "Family Assistance for NRIs", description, path: routes.familyAssistance });

const principles = [
  { icon: UserCheck, title: "With consent", body: "We work with your family's agreement and respect their independence and privacy." },
  { icon: MessageCircle, title: "You stay informed", body: "You receive updates after each visit or task, so nothing happens without your knowledge." },
  { icon: ShieldCheck, title: "The right provider", body: "We coordinate appropriate, qualified providers rather than attempting specialist work ourselves." },
];

export default function FamilyAssistancePage() {
  return (
    <>
      <ServicePageMeta service={service} description={description} />
      <PageHero
        eyebrow="Family Assistance"
        title="Local coordination for the people and homes that matter to you."
        lead="When you can't be there in person, a dependable local team can help your family with practical tasks — and keep you informed."
        breadcrumb={{ name: service.name, path: service.href }}
        actions={
          <ButtonLink href={routes.getStarted} size="lg" arrow track="service_cta_clicked" trackProps={{ service: service.slug, location: "hero" }}>
            Tell Us What You Need
          </ButtonLink>
        }
      />

      <Section labelledBy="fa-offerings">
        <SectionHeader id="fa-offerings" eyebrow="How we can help" title="Practical help, coordinated with care." />
        <div className="mt-12">
          <OfferingsGrid offerings={service.offerings} />
        </div>
        <ScopeNote className="mt-8" title="What we are — and are not">
          {service.scopeNote}
        </ScopeNote>
      </Section>

      <Section tone="surface" labelledBy="fa-principles">
        <SectionHeader id="fa-principles" eyebrow="Our approach" title="Respectful, transparent, and never a replacement for professionals." />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {principles.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} compact className="reveal">
              {p.body}
            </FeatureCard>
          ))}
        </ul>
      </Section>

      <Section>
        <RelatedServices current={service.slug} />
      </Section>

      <CtaBand location="family_assistance" cta="Tell Us What You Need" />
    </>
  );
}
