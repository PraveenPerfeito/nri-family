import {
  Building2,
  Camera,
  FileSearch,
  FileText,
  HeartHandshake,
  House,
  Landmark,
  ShieldCheck,
  Users,
  Wrench,
  Handshake,
} from "lucide-react";
import Link from "next/link";
import { CtaBand } from "@/components/marketing/cta-band";
import { FamilyOfficePreview, WorkspacePreview } from "@/components/marketing/dashboard-preview";
import { EcosystemDiagram, RoadmapLists } from "@/components/marketing/ecosystem";
import { FlowChain, Timeline } from "@/components/marketing/flow";
import { ServiceCard } from "@/components/marketing/service-card";
import { FaqList } from "@/components/shared/faq-list";
import { PrivacyPrinciples } from "@/components/trust/privacy-principles";
import { TrustRecord } from "@/components/trust/trust-record";
import { VisibilityLevels } from "@/components/trust/visibility";
import { ButtonLink } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/card";
import { Eyebrow, Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { services } from "@/config/services";
import { siteConfig } from "@/config/site";
import { faqs } from "@/data/faq";
import { howItWorksSteps, serviceRecordFlow } from "@/data/marketing";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  description:
    "NRI property management and local support in Tamil Nadu: inspections, maintenance, rentals, documents and family help, with photos, reports and approvals.",
  path: routes.home,
});

/** §61: HOW (local execution, evidence) and WHY TRUST (privacy, approval) within the first screen. */
const heroPoints = [
  { icon: Users, text: "A local team handles each request" },
  { icon: Camera, text: "Photos, reports and invoices as proof" },
  { icon: ShieldCheck, text: "Private by default. You approve costs." },
];

const problems = [
  { icon: House, title: "Property", question: "Who checks it?" },
  { icon: Wrench, title: "Maintenance", question: "Who handles it?" },
  { icon: FileSearch, title: "Documents", question: "Who follows up?" },
  { icon: Users, title: "Family", question: "Who can help locally?" },
  { icon: Handshake, title: "Property transactions", question: "Who represents your interests?" },
];

const solutions = [
  { icon: Building2, title: "Property", body: "Buy, sell, rent, inspect and maintain." },
  { icon: Landmark, title: "Assets", body: "Monitor and protect what you own." },
  { icon: FileText, title: "Documents", body: "Securely organise and track important records." },
  { icon: HeartHandshake, title: "Family", body: "Coordinate local assistance when you need it." },
  { icon: ShieldCheck, title: "Local services", body: "Request, manage and verify work from anywhere." },
];

export default function HomePage() {
  return (
    <>
      {/* 1 — Hero */}
      <section className="bg-grid relative overflow-hidden border-b border-line" aria-labelledby="hero-title">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />
        <div className="container-page relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-28">
          <div>
            <Eyebrow>For NRIs · Tamil Nadu</Eyebrow>
            <h1 id="hero-title" className="text-display mt-5 text-[2.625rem] text-ink sm:text-6xl lg:text-[4.25rem]">
              Your trusted team in Tamil&nbsp;Nadu.
            </h1>
            <p className="mt-6 text-xl font-medium text-ink sm:text-2xl">{siteConfig.promise}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              Property care, inspections, maintenance, documentation assistance and local support — managed
              transparently from one secure platform.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={routes.getStarted} size="lg" arrow track="hero_get_started_clicked" trackProps={{ location: "hero" }}>
                Get Started
              </ButtonLink>
              <ButtonLink
                href={routes.services}
                size="lg"
                variant="secondary"
                track="hero_explore_services_clicked"
                trackProps={{ location: "hero" }}
              >
                Explore Services
              </ButtonLink>
            </div>
            <p className="mt-6 text-sm text-ink-subtle">Built for NRIs with property, family and assets in Tamil Nadu.</p>
            <ul aria-label="How we work" className="mt-5 grid gap-2.5 border-t border-line pt-5 text-sm text-ink-muted">
              {heroPoints.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <Icon aria-hidden className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <FamilyOfficePreview />
        </div>
      </section>

      {/* 2 — Problem */}
      <Section labelledBy="problem-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <SectionHeader
            id="problem-title"
            eyebrow="The challenge"
            title="Thousands of miles away. Local problems don't wait."
            lead={
              <p>
                A property can need attention even when you&apos;re thousands of miles away. A small leak becomes a repair.
                A vacant plot needs inspection. A tenant needs assistance. A document needs attention. And finding
                someone you trust locally can be difficult.
              </p>
            }
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {problems.map(({ icon: Icon, title, question }, i) => (
              <li
                key={title}
                className={`reveal flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card ${i === problems.length - 1 ? "sm:col-span-2" : ""}`}
              >
                <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-subtle text-ink-muted">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="text-display mt-0.5 text-xl text-ink-muted italic">{question}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 3 — Solution */}
      <Section tone="surface" labelledBy="solution-title">
        <SectionHeader
          id="solution-title"
          eyebrow="The answer"
          title="One trusted team for your Tamil Nadu life."
          lead="One local team and one place to see what is happening with everything you own and care about here."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {solutions.map((s) => (
            <FeatureCard key={s.title} icon={s.icon} title={s.title} compact className="reveal">
              {s.body}
            </FeatureCard>
          ))}
        </ul>
        <div className="mt-10">
          <ButtonLink href={routes.howItWorks} variant="secondary" arrow track="cta_clicked" trackProps={{ label: "see_how_it_works", location: "solution" }}>
            See How It Works
          </ButtonLink>
        </div>
      </Section>

      {/* 4 — Services */}
      <Section labelledBy="services-title">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader id="services-title" eyebrow="Services" title="Everything you need, managed locally." />
          <ButtonLink href={routes.services} variant="ghost" className="shrink-0">
            View all services
          </ButtonLink>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} location="home_services" />
          ))}
          <li className="reveal flex flex-col justify-between rounded-card border border-dashed border-line-strong bg-canvas p-6 sm:p-7">
            <div>
              <h3 className="text-lg font-semibold text-ink">Not sure where to start?</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Tell us about your property or situation. We&apos;ll suggest what makes sense and what it involves.
              </p>
            </div>
            <div className="pt-6">
              <ButtonLink href={routes.getStarted} arrow track="cta_clicked" trackProps={{ label: "tell_us", location: "home_services" }}>
                Tell Us What You Need
              </ButtonLink>
            </div>
          </li>
        </ul>
      </Section>

      {/* 5 — Trust */}
      <Section tone="surface" labelledBy="trust-title">
        <SectionHeader
          id="trust-title"
          eyebrow="Transparency"
          title="Distance shouldn't mean uncertainty."
          lead="Every service should leave you with a clear record of what happened, who handled it and what it cost."
        />
        <div className="mt-12">
          <TrustRecord />
        </div>
        <div className="mt-14 rounded-panel border border-line bg-canvas px-4 py-8 sm:px-8">
          <p className="mb-6 text-center text-sm font-medium text-ink-muted">Every request follows the same visible path</p>
          <FlowChain steps={serviceRecordFlow} label="Service record lifecycle" />
        </div>
      </Section>

      {/* 6 — Privacy */}
      <Section labelledBy="privacy-title">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            id="privacy-title"
            eyebrow="Privacy"
            title="Your property information stays private."
            lead="Your property, documents and personal information belong to you. We design the platform so private information is only available to authorised people."
          />
          <ButtonLink href={routes.trust} variant="secondary" arrow className="shrink-0">
            Explore Trust &amp; Security
          </ButtonLink>
        </div>
        <div className="mt-12">
          <PrivacyPrinciples />
        </div>
      </Section>

      {/* 7 — Family office vision */}
      <Section tone="night" labelledBy="vision-title">
        <SectionHeader
          id="vision-title"
          tone="night"
          eyebrow="The bigger picture"
          title={
            <>
              More than property management.
              <span className="mt-2 block text-2xl text-brand-muted italic sm:text-3xl">
                A digital family office for your life in Tamil Nadu.
              </span>
            </>
          }
          lead="Today, you may need someone to inspect a property. Tomorrow, you may need help managing a rental, coordinating a repair, organising documents or assisting family locally. We are building one trusted place to manage all of it."
        />
        <div className="mt-12">
          <EcosystemDiagram />
        </div>
        <div className="mt-6">
          <RoadmapLists />
        </div>
      </Section>

      {/* 8 — How it works */}
      <Section tone="surface" labelledBy="how-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeader
              id="how-title"
              eyebrow="How it works"
              title="From request to resolution, without the distance."
              lead="A simple, visible process — so you always know what is happening and nothing proceeds without you."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={routes.getStarted} size="lg" arrow track="cta_clicked" trackProps={{ label: "create_family_office", location: "how_it_works" }}>
                Create Your Family Office
              </ButtonLink>
              <ButtonLink href={routes.howItWorks} size="lg" variant="secondary">
                See the full journey
              </ButtonLink>
            </div>
          </div>
          <Timeline steps={howItWorksSteps} label="How it works in five steps" />
        </div>
      </Section>

      {/* 9 — Workspace preview */}
      <Section labelledBy="workspace-title">
        <SectionHeader
          id="workspace-title"
          align="center"
          eyebrow="One trusted workspace"
          title="Your Tamil Nadu, in one private workspace."
          lead="See your properties, open requests, approvals and reports in one place. The online workspace is being built now."
        />
        <div className="mx-auto mt-12 max-w-5xl">
          <WorkspacePreview />
        </div>
      </Section>

      {/* 10 — Sell / rent */}
      <Section tone="surface" labelledBy="list-title">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            id="list-title"
            eyebrow="Selling or renting"
            title="Want to sell or rent your property?"
            lead="Manage the process from abroad while keeping control over who can see your property and how enquiries reach you."
          />
          <ButtonLink href={routes.getStarted} size="lg" arrow className="shrink-0" track="property_cta_clicked" trackProps={{ location: "home_list" }}>
            List My Property
          </ButtonLink>
        </div>
        <div className="mt-12">
          <VisibilityLevels />
        </div>
        <p className="mt-6 text-sm text-ink-subtle">
          Transactions are coordinated with qualified property and legal professionals where required.{" "}
          <Link href={routes.propertyTransactions} className="font-medium text-brand underline-offset-4 hover:underline">
            How property transactions work
          </Link>
        </p>
      </Section>

      {/* 11 — FAQ */}
      <Section labelledBy="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <SectionHeader id="faq-title" eyebrow="FAQ" title="Questions NRIs ask us." />
            <div className="mt-6">
              <ButtonLink href={routes.faq} variant="ghost">
                Read all questions
              </ButtonLink>
            </div>
          </div>
          <FaqList items={faqs.slice(0, 6)} />
        </div>
      </Section>

      <CtaBand location="home" title="You live abroad. We take care of what you own here." secondary={{ label: "Contact us", href: routes.contact }} />
    </>
  );
}
