import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { FaqList } from "@/components/shared/faq-list";
import { JsonLd } from "@/components/shared/json-ld";
import { Section } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { faqs } from "@/data/faq";
import { faqJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Answers for NRIs about property care, rental management, selling property, privacy, legal services and using the platform from outside India.",
  path: routes.faq,
});

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions."
        lead="Straight answers about what we do, what we don't, and how your information is handled."
        breadcrumb={{ name: "FAQ", path: routes.faq }}
      />
      <Section labelledBy="faq-list-title">
        <h2 id="faq-list-title" className="sr-only">
          All questions
        </h2>
        <div className="mx-auto max-w-3xl">
          <FaqList items={faqs} />
        </div>
      </Section>
      <JsonLd data={faqJsonLd(faqs)} />
      <CtaBand location="faq" title="Didn't find your answer?" body="Send us your question and our team will get back to you." cta="Contact us" href={routes.contact} />
    </>
  );
}
