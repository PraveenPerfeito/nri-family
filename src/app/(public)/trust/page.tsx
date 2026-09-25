import { Camera, ClipboardList, Eye, FileLock2, KeyRound, Scale, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { FlowChain } from "@/components/marketing/flow";
import { PageHero } from "@/components/marketing/page-hero";
import { ServiceRecordPreview } from "@/components/preview/service-previews";
import { ScopeNote } from "@/components/marketing/scope-note";
import { TrustRecord } from "@/components/trust/trust-record";
import { VisibilityLevels } from "@/components/trust/visibility";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { serviceRecordFlow } from "@/data/marketing";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Trust & Security",
  description:
    "How we protect your privacy: private by default, role-based access, audit trails, secure documents, visibility controls and service evidence.",
  path: routes.trust,
});

type Pillar = { id: string; icon: LucideIcon; title: string; summary: string; points: string[] };

const pillars: Pillar[] = [
  {
    id: "privacy",
    icon: Eye,
    title: "Privacy",
    summary: "Private information stays private.",
    points: [
      "Your contact details, property addresses, documents and family information are never shown publicly.",
      "We collect only what we need to deliver the service you asked for.",
      "We do not sell your personal information.",
    ],
  },
  {
    id: "access",
    icon: KeyRound,
    title: "Access control",
    summary: "Different roles get different access.",
    points: [
      "Staff, vendors and professional partners see only the information needed for their task.",
      "A vendor fixing a tap does not see your documents or other properties.",
      "Family members you invite will see only what you choose to share.",
    ],
  },
  {
    id: "audit",
    icon: ClipboardList,
    title: "Audit trail",
    summary: "Important activity can be tracked.",
    points: [
      "Key actions — assignments, approvals, visibility changes, document access — are designed to be recorded with who did what and when.",
      "You can ask what happened on any request, and get a factual answer.",
    ],
  },
  {
    id: "documents",
    icon: FileLock2,
    title: "Document security",
    summary: "Documents belong inside protected customer areas.",
    points: [
      "Documents are meant to live in your private workspace, not in chat threads or personal email.",
      "Originals stay with you or wherever you decide. We work with copies unless you instruct otherwise.",
    ],
  },
  {
    id: "visibility",
    icon: Scale,
    title: "Property visibility",
    summary: "You control whether a property is private, verified-network or public.",
    points: ["Every property starts private.", "Nothing is shared or published without your explicit choice.", "You can change it at any time."],
  },
  {
    id: "evidence",
    icon: Camera,
    title: "Service evidence",
    summary: "Photos, videos, reports and invoices.",
    points: [
      "Evidence is captured during the work, not after.",
      "Every completed job comes with a record you can review and keep.",
    ],
  },
  {
    id: "oversight",
    icon: UserCog,
    title: "Human oversight",
    summary: "Important actions require review and your approval.",
    points: [
      "Costs beyond an agreed scope always need your approval.",
      "Sensitive actions such as sharing a property or releasing documents are reviewed by a person, not automated.",
    ],
  },
];

export default function TrustPage() {
  return (
    <>
      <PageHero
        eyebrow="Trust & Security"
        title="Private by design. Transparent by default."
        lead="Trust is the whole product. Here is how we protect your information, control who sees what, and make sure you can check what was done."
        breadcrumb={{ name: "Trust & Security", path: routes.trust }}
        actions={
          <ButtonLink href={routes.privacy} size="lg" variant="secondary">
            Read our privacy policy
          </ButtonLink>
        }
        aside={<ServiceRecordPreview />}
      />

      <Section labelledBy="pillars-title">
        <SectionHeader id="pillars-title" eyebrow="Our principles" title="Seven commitments that shape the platform." />
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
          {pillars.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-brand-muted hover:text-ink"
            >
              {p.title}
            </a>
          ))}
        </nav>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {pillars.map((p) => (
            <article key={p.id} id={p.id} className="reveal scroll-mt-24 rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
              <div className="flex items-center gap-3">
                <IconTile icon={p.icon} />
                <h2 className="text-xl font-semibold text-ink">{p.title}</h2>
              </div>
              <p className="mt-4 text-base font-medium text-ink">{p.summary}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted marker:text-brand-muted">
                {p.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="surface" labelledBy="visibility-title">
        <SectionHeader
          id="visibility-title"
          eyebrow="Property visibility"
          title="Three levels. Private is always the default."
        />
        <div className="mt-12">
          <VisibilityLevels />
        </div>
      </Section>

      <Section labelledBy="record-title">
        <SectionHeader
          id="record-title"
          eyebrow="Service evidence"
          title="Every service answers six questions."
          lead="Who, what, when, where, proof and cost — recorded for every request."
        />
        <div className="mt-12">
          <TrustRecord />
        </div>
        <div className="mt-12">
          <FlowChain steps={serviceRecordFlow} label="Service record lifecycle" />
        </div>
      </Section>

      <Section tone="surface" labelledBy="honesty-title">
        <SectionHeader id="honesty-title" eyebrow="Straight answers" title="What we don't claim." />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <ScopeNote title="No certifications we haven't earned">
            We do not claim security certifications or compliance attestations that we do not hold. As the platform grows, we will
            publish any independent assessments here, with dates and scope.
          </ScopeNote>
          <ScopeNote title="Some of this is still being built">
            The private online workspace, document vault and listing controls are in development. Until they launch, we apply these
            principles through our team&apos;s processes and communicate with you directly.
          </ScopeNote>
        </div>
      </Section>

      <CtaBand location="trust" title="Questions about privacy or security?" body="Ask us anything about how your information is handled. We'll give you a straight answer." cta="Contact us" href={routes.contact} secondary={{ label: "Get Started", href: routes.getStarted }} />
    </>
  );
}
