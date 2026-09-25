import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/section";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { cn } from "@/lib/utils/cn";

/** Standard hero for inner pages. Adds BreadcrumbList structured data. */
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
    <section className={cn("bg-grid relative overflow-hidden border-b border-line", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent" />
      <div
        className={cn(
          "container-page relative grid gap-12 py-16 sm:py-20 lg:py-24",
          aside ? "lg:grid-cols-[1.1fr_1fr] lg:items-center" : "",
        )}
      >
        <div className="max-w-3xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="text-display mt-4 text-4xl text-ink sm:text-5xl lg:text-[3.5rem]">{title}</h1>
          {lead ? <div className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">{lead}</div> : null}
          {actions ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
      {breadcrumb ? <JsonLd data={breadcrumbJsonLd([breadcrumb])} /> : null}
    </section>
  );
}
