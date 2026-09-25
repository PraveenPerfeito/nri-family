import { Building, HandCoins, Home, KeyRound, LandPlot, ScrollText, ShoppingBag, Users } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { NriDashboardPreview } from "@/components/product-preview/previews/nri-dashboard-preview";
import { ButtonLink } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "For NRIs with Property and Family in Tamil Nadu",
  description:
    "Whether you own a house, land or a rental in Tamil Nadu, or have parents living there, get a trusted local team to look after things while you live abroad.",
  path: routes.forNris,
});

const audiences = [
  { icon: Home, title: "Property owners", body: "A house or apartment that sits empty for months and needs regular checks, cleaning and repairs.", href: routes.propertyCare },
  { icon: LandPlot, title: "Land owners", body: "A vacant plot or agricultural land where boundaries, fencing and encroachment need watching.", href: routes.propertyCare },
  { icon: KeyRound, title: "Rental property owners", body: "A tenanted property that needs a local contact for the tenant, rent tracking and upkeep.", href: routes.propertyManagement },
  { icon: Users, title: "Families with parents in Tamil Nadu", body: "Parents or relatives who could use practical help and a dependable local contact.", href: routes.familyAssistance },
  { icon: ScrollText, title: "NRIs managing inherited assets", body: "Property and papers passed down in the family that need organising, checking and a plan.", href: routes.documentAssistance },
  { icon: ShoppingBag, title: "NRIs planning to buy", body: "Looking for a home or land back home and need someone to visit, check and coordinate.", href: routes.propertyTransactions },
  { icon: HandCoins, title: "NRIs planning to sell", body: "Ready to sell but unable to be present for every visit, enquiry and document step.", href: routes.propertyTransactions },
];

const worries = [
  "I don't know what condition my house is in right now.",
  "I only hear about problems when they've become expensive.",
  "I rely on a relative or neighbour, and I don't want to keep asking.",
  "I'm not sure which documents I have, or where the originals are.",
  "Every trip home is spent chasing tasks instead of seeing family.",
];

export default function ForNrisPage() {
  return (
    <>
      <PageHero
        eyebrow="For NRIs"
        title="Your life may be abroad. Your roots are still here."
        lead="Many NRIs keep a home, a plot of land or family ties in Tamil Nadu. Looking after them from another time zone is hard. We give you a trusted local team, and a clear view of what's happening."
        breadcrumb={{ name: "For NRIs", path: routes.forNris }}
        actions={
          <ButtonLink href={routes.getStarted} size="lg" arrow track="cta_clicked" trackProps={{ label: "tell_us", location: "for_nris_hero" }}>
            Tell Us What You Need
          </ButtonLink>
        }
        aside={<NriDashboardPreview />}
      />

      <Section labelledBy="worries-title">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeader
            id="worries-title"
            eyebrow="Sound familiar?"
            title="Distance turns small things into big worries."
            lead="Everyone's situation is different. But we often hear some version of these."
          />
          <ul className="space-y-3">
            {worries.map((w) => (
              <li key={w} className="reveal rounded-card border border-line bg-surface px-5 py-4 shadow-card">
                <p className="text-display text-xl text-ink italic">&ldquo;{w}&rdquo;</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="surface" labelledBy="who-title">
        <SectionHeader
          id="who-title"
          eyebrow="Who we help"
          title="Built around your situation, not a package."
          lead="You may fit one of these, several, or none exactly. Tell us what you have and what you need."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <FeatureCard key={a.title} icon={a.icon} title={a.title} className="reveal">
              <p>{a.body}</p>
              <p className="mt-4">
                <ButtonLink href={a.href} variant="ghost">
                  Learn more
                </ButtonLink>
              </p>
            </FeatureCard>
          ))}
          <li className="reveal flex flex-col justify-center rounded-card border border-dashed border-line-strong bg-canvas p-6">
            <Building aria-hidden className="size-6 text-ink-subtle" strokeWidth={1.5} />
            <h3 className="mt-4 text-base font-semibold text-ink">Something else?</h3>
            <p className="mt-2 text-sm text-ink-muted">If it&apos;s in Tamil Nadu and you need someone local, ask us.</p>
          </li>
        </ul>
      </Section>

      <Section labelledBy="what-changes">
        <SectionHeader id="what-changes" eyebrow="What changes" title="Local execution. Remote visibility." />
        <dl className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["A local team", "One point of contact in Tamil Nadu who coordinates the right people for each task."],
            ["A clear record", "Photos, reports and invoices for every visit, so you can see what was done."],
            ["Your decisions", "Quotations and important actions come to you for approval first."],
          ].map(([t, d]) => (
            <div key={t} className="border-l-2 border-brand pl-5">
              <dt className="text-lg font-semibold text-ink">{t}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand location="for_nris" cta="Tell Us What You Need" />
    </>
  );
}
