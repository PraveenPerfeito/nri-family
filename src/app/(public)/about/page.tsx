import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "About Us",
  description: `${siteConfig.name} is building the trusted local layer for NRIs — a digital family office for property, documents, family and local services in Tamil Nadu.`,
  path: routes.about,
});

const values = [
  { title: "Trust is earned, not claimed", body: "We won't show you fake reviews or inflated numbers. We'd rather show you how we work and let the record speak." },
  { title: "Private by default", body: "Your information belongs to you. We share it only with the people who need it, when they need it." },
  { title: "Evidence over reassurance", body: "“Don't worry, it's done” is not enough. Every job should come with proof." },
  { title: "You stay in control", body: "Important decisions and every added cost go to you for approval." },
  { title: "Know our limits", body: "Where a lawyer, doctor or other qualified professional is needed, we bring one in rather than pretending to be one." },
];

export default function AboutPage() {
  const name = siteConfig.name;
  return (
    <>
      <PageHero
        eyebrow={`About ${name}`}
        title="Building the trusted local layer for NRIs."
        lead="We believe living abroad should not mean losing visibility or control over what you own and manage in Tamil Nadu."
        breadcrumb={{ name: "About", path: routes.about }}
      />

      <Section labelledBy="mission-title">
        <h2 id="mission-title" className="sr-only">
          Vision and mission
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-panel border border-line bg-surface p-8 shadow-card sm:p-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">Vision</p>
            <p className="text-display mt-4 text-3xl text-ink sm:text-4xl">
              Build the most trusted digital family office for Tamil Nadu&apos;s NRI community.
            </p>
          </div>
          <div className="on-night rounded-panel bg-night p-8 sm:p-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-brand-muted uppercase">Mission</p>
            <p className="text-display mt-4 text-3xl text-white sm:text-4xl">
              Make local ownership, maintenance and assistance transparent, secure and simple.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="surface" labelledBy="why-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <SectionHeader id="why-title" eyebrow="Why we exist" title="Your roots stay here. So should your peace of mind." />
          <div className="space-y-5 text-base leading-relaxed text-ink-muted sm:text-lg">
            <p>
              Many NRIs stay connected to Tamil Nadu long after they move away — through a family home, a piece of land, or parents
              who still live there.
            </p>
            <p>
              For many NRIs, looking after those things depends on a relative, a neighbour or a contact of a contact. That works until
              it doesn&apos;t. Problems go unnoticed, updates are vague, and there is rarely a record of what was actually done.
            </p>
            <p>
              We are building something more dependable: a professional local team, clear processes, and a private platform where you
              can see what happened and decide what happens next.
            </p>
          </div>
        </div>
      </Section>

      <Section labelledBy="values-title">
        <SectionHeader id="values-title" eyebrow="How we work" title="Principles we hold ourselves to." />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <li key={v.title} className="reveal rounded-card border border-line bg-surface p-6 shadow-card">
              <span className="text-sm font-semibold text-brand tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-base font-semibold text-ink">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{v.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand location="about" title="Talk to us about what you need." cta="Get Started" secondary={{ label: "Contact us", href: routes.contact }} />
    </>
  );
}
