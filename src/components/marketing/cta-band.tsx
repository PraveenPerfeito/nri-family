import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";
import { ContourLines } from "@/components/ui/contours";
import { routes, type AppRoute } from "@/config/routes";
import type { AnalyticsEvent } from "@/lib/analytics/events";

/** Closing call-to-action at the bottom of most pages: a full-bleed night surface. */
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
    <section className="on-night relative isolate overflow-hidden bg-night py-24 sm:py-32 lg:py-40" aria-labelledby={`cta-${location}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(56rem_30rem_at_50%_115%,rgb(15_90_79/0.5),transparent_65%)]" />
        <ContourLines origin={[700, 760]} count={8} stroke="rgb(255 255 255 / 0.05)" align="center" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-night-line to-transparent" />
      </div>
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <LogoMark className="mx-auto size-10" inverted />
          <h2 id={`cta-${location}`} className="text-display mt-8 text-[2.25rem] text-white sm:text-5xl lg:text-[3.75rem]">
            {title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-balance text-night-muted">{body}</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={href} size="lg" tone="night" arrow track={track} trackProps={{ label: cta, location }}>
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
    </section>
  );
}
