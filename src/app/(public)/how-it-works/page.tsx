import { MapPin, Plane } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { FlowChain, Timeline } from "@/components/marketing/flow";
import { PageHero } from "@/components/marketing/page-hero";
import { Badge, DemoLabel } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "How It Works",
  description:
    "From request to resolution: how we handle a service request for NRIs, from registration and triage to local execution, evidence, approval, payment and report.",
  path: routes.howItWorks,
});

const journey = [
  { title: "Register", body: "Tell us who you are, where you live and how you prefer to be contacted." },
  { title: "Profile", body: "Share the basics — family members who may be involved, your time zone and any preferences." },
  { title: "Add property", body: "Add each property or plot. Details stay private to you and authorised staff." },
  { title: "Request service", body: "Describe what you need: an inspection, a repair, a document task or help for family." },
  { title: "Triage", body: "Our operations team reviews the request, asks any questions and decides what's needed." },
  { title: "Assign", body: "The right person or vetted partner is assigned, and you're told who is handling it." },
  { title: "Execute", body: "The visit or work happens locally, following a checklist for that type of job." },
  { title: "Evidence", body: "Photos, videos and findings are recorded during the work, not reconstructed afterwards." },
  { title: "Approval", body: "Anything beyond the agreed scope, or any added cost, comes to you for approval first." },
  { title: "Payment", body: "You receive an itemised invoice that matches the approved quotation." },
  { title: "Report", body: "A final report summarises what was done, what was found and any recommendations." },
];

const example = [
  { time: "Day 1 · 09:10 Dubai", title: "Request received", body: "A customer in Dubai asks for a routine inspection of their family house in Chennai, vacant since the last tenant left." },
  { time: "Day 1 · 14:30 Chennai", title: "Triaged and assigned", body: "Operations confirms access arrangements and assigns a local inspector. The customer is told who will visit, and when." },
  { time: "Day 3 · 10:00 Chennai", title: "Inspection completed", body: "The inspector checks the building, water, electricity, security and garden, taking 18 photos and a short video." },
  { time: "Day 3 · 18:45 Dubai", title: "Report shared", body: "The customer receives the report: everything is fine except an overgrown garden. A quotation for garden maintenance is attached." },
  { time: "Day 4 · 08:20 Dubai", title: "Approved", body: "The customer approves the quotation. Work is scheduled." },
  { time: "Day 6 · 16:00 Chennai", title: "Completed with proof", body: "Before-and-after photos and the invoice are shared. The request is closed." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="From request to resolution, without the distance."
        lead="A clear, repeatable process. You always know who is handling your request, what they found, and what it will cost — before anything proceeds."
        breadcrumb={{ name: "How It Works", path: routes.howItWorks }}
        actions={
          <ButtonLink href={routes.getStarted} size="lg" arrow track="cta_clicked" trackProps={{ label: "create_family_office", location: "how_hero" }}>
            Create Your Family Office
          </ButtonLink>
        }
      />

      <Section tone="surface" labelledBy="journey-overview">
        <SectionHeader id="journey-overview" align="center" eyebrow="The journey" title="Eleven steps. Nothing hidden." />
        <div className="mt-12">
          <FlowChain steps={journey.map((j) => j.title)} label="Customer journey overview" />
        </div>
      </Section>

      <Section labelledBy="journey-detail">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeader
              id="journey-detail"
              eyebrow="Step by step"
              title="What happens at each stage."
              lead="Today our team runs this process with you directly by message, email and calls. The private online workspace will bring every step into one place."
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="good">Process in use now</Badge>
              <Badge tone="info">Online workspace coming</Badge>
            </div>
          </div>
          <Timeline steps={journey} label="Detailed customer journey" />
        </div>
      </Section>

      <Section tone="surface" labelledBy="example-title">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeader
            id="example-title"
            eyebrow="An example"
            title="An NRI in Dubai, a house in Chennai."
            lead="A typical routine inspection. Names, times and findings are illustrative."
          />
          <DemoLabel className="self-start md:self-end">Illustrative example</DemoLabel>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3 text-sm font-medium text-ink">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5">
            <Plane aria-hidden className="size-4 text-brand" /> Dubai, UAE
          </span>
          <span aria-hidden className="h-px w-8 bg-line-strong" />
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5">
            <MapPin aria-hidden className="size-4 text-brand" /> Chennai, Tamil Nadu
          </span>
        </div>
        <div className="mt-10 max-w-3xl">
          <Timeline
            label="Example: Chennai property inspection for an NRI in Dubai"
            steps={example.map((e) => ({
              title: e.title,
              body: e.body,
              meta: <span className="text-xs font-medium text-ink-subtle tabular-nums">{e.time}</span>,
            }))}
          />
        </div>
      </Section>

      <CtaBand location="how_it_works" cta="Create Your Family Office" />
    </>
  );
}
