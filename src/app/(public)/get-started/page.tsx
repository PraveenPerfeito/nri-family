import { CheckCircle2 } from "lucide-react";
import { GetStartedForm } from "@/components/forms/get-started-form";
import { Eyebrow } from "@/components/ui/section";
import { JsonLd } from "@/components/shared/json-ld";
import { routes } from "@/config/routes";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Get Started",
  description:
    "Tell us what you need help with in Tamil Nadu — property, land, rentals, maintenance, selling, buying, documents or family assistance.",
  path: routes.getStarted,
});

const next = [
  "We review your request and any details you shared.",
  "We contact you to understand your situation and answer questions.",
  "We suggest what makes sense, what it involves and what it costs.",
  "Nothing proceeds until you agree.",
];

export default function GetStartedPage() {
  return (
    <div className="bg-grid border-b border-line">
      <div className="container-page grid gap-12 py-14 sm:py-16 lg:grid-cols-[1fr_1.5fr] lg:gap-16 lg:py-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Eyebrow>Get Started</Eyebrow>
          <h1 className="text-display mt-4 text-4xl text-ink sm:text-5xl">Tell us what you need help with.</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            A few details help us understand your situation. It takes about two minutes, and there&apos;s no obligation.
          </p>
          <h2 className="mt-10 text-sm font-semibold text-ink">What happens next</h2>
          <ol className="mt-4 space-y-3">
            {next.map((n) => (
              <li key={n} className="flex items-start gap-3 text-sm text-ink-muted">
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                {n}
              </li>
            ))}
          </ol>
        </div>

        <section aria-label="Get started form" className="rounded-panel border border-line bg-surface p-6 shadow-raised sm:p-8">
          <GetStartedForm />
        </section>
      </div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Get Started", path: routes.getStarted }])} />
    </div>
  );
}
