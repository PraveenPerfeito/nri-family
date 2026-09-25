import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { JsonLd } from "@/components/shared/json-ld";
import { TrackView } from "@/components/shared/track-view";
import { services, type ServiceCategory, type ServiceOffering } from "@/config/services";
import { serviceJsonLd } from "@/lib/seo/json-ld";
import { serviceIcons } from "./service-icons";

/** Analytics + Service structured data for a service page. */
export function ServicePageMeta({ service, description }: { service: ServiceCategory; description: string }) {
  return (
    <>
      <TrackView event="service_viewed" service={service.slug} />
      <JsonLd data={serviceJsonLd({ name: service.name, description, path: service.href })} />
    </>
  );
}

export function OfferingsGrid({ offerings }: { offerings: ServiceOffering[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {offerings.map((o) => (
        <li key={o.title} className="reveal rounded-card border border-line bg-surface p-6 shadow-card">
          <h3 className="flex items-start gap-2.5 text-base font-semibold text-ink">
            <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
            {o.title}
          </h3>
          <p className="mt-2 pl-[1.875rem] text-sm leading-relaxed text-ink-muted">{o.description}</p>
        </li>
      ))}
    </ul>
  );
}

export function RelatedServices({ current }: { current: ServiceCategory["slug"] }) {
  const others = services.filter((s) => s.slug !== current);
  return (
    <nav aria-labelledby="related-services">
      <h2 id="related-services" className="text-sm font-semibold tracking-[0.14em] text-ink-subtle uppercase">
        Related services
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {others.map((s) => {
          const Icon = serviceIcons[s.slug];
          return (
            <li key={s.slug}>
              <Link
                href={s.href}
                className="group flex h-full items-center gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-brand-muted"
              >
                <Icon aria-hidden className="size-5 shrink-0 text-brand" strokeWidth={1.75} />
                <span className="flex-1 text-sm font-medium text-ink">{s.name}</span>
                <ArrowRight aria-hidden className="size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
