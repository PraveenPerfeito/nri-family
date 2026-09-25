import type { ReactNode } from "react";
import { JsonLd } from "@/components/shared/json-ld";
import { ContourLines } from "@/components/ui/contours";
import { Eyebrow } from "@/components/ui/section";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { cn } from "@/lib/utils/cn";

/** Standard hero for inner pages (same quiet backdrop as the home hero). Adds BreadcrumbList structured data. */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  aside,
  breadcrumb,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  breadcrumb?: { name: string; path: string };
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden border-b border-line-subtle", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-hero-glow absolute inset-0" />
        <div className="bg-grid-fade absolute inset-0 opacity-60" />
        <ContourLines count={6} />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent" />
      </div>
      <div
        className={cn(
          "container-page grid gap-14 pt-16 pb-20 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-28",
          aside ? "lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16" : "",
        )}
      >
        <div className="max-w-3xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="text-display mt-6 text-[2.5rem] tracking-[-0.04em] text-ink sm:text-[3.25rem] lg:text-[4rem]">{title}</h1>
          {lead ? <div className="mt-6 max-w-2xl text-lg text-ink-muted sm:text-xl">{lead}</div> : null}
          {actions ? <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
      {breadcrumb ? <JsonLd data={breadcrumbJsonLd([breadcrumb])} /> : null}
    </section>
  );
}
