import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { routes, type AppRoute } from "@/config/routes";
import type { AnalyticsEvent } from "@/lib/analytics/events";

/** Closing call-to-action used at the bottom of most pages. */
export function CtaBand({
  title = "Tell us what you need help with.",
  body = "Share a few details about your property or request. Our team will review it and get in touch to discuss next steps.",
  cta = "Get Started",
  href = routes.getStarted,
  track = "cta_clicked",
  location,
  secondary,
}: {
  title?: ReactNode;
  body?: ReactNode;
  cta?: string;
  href?: AppRoute;
  track?: AnalyticsEvent;
  location: string;
  secondary?: { label: string; href: AppRoute };
}) {
  return (
    <section className="py-16 sm:py-20" aria-labelledby={`cta-${location}`}>
      <div className="container-page">
        <div className="on-night relative overflow-hidden rounded-panel bg-night px-6 py-12 text-center sm:px-12 sm:py-16">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(15_90_79/0.55),transparent_60%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 id={`cta-${location}`} className="text-display text-3xl text-white sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-night-muted sm:text-lg">{body}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href={href} size="lg" tone="night" track={track} trackProps={{ label: cta, location }}>
                {cta}
              </ButtonLink>
              {secondary ? (
                <ButtonLink href={secondary.href} size="lg" tone="night" variant="secondary">
                  {secondary.label}
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
