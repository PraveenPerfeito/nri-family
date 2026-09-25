import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/card";
import type { ServiceCategory } from "@/config/services";
import { serviceIcons } from "./service-icons";

export function ServiceCard({ service, location }: { service: ServiceCategory; location: string }) {
  const Icon = serviceIcons[service.slug];
  return (
    <li className="reveal flex flex-col rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
      <div className="flex items-center gap-3">
        <IconTile icon={Icon} />
        <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">{service.summary}</p>
      <ul className="mt-5 grid gap-2 text-sm text-ink">
        {service.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
            {h}
          </li>
        ))}
      </ul>
      {service.scopeNote ? <p className="mt-5 text-xs leading-relaxed text-ink-subtle">{service.scopeNote}</p> : null}
      <div className="mt-auto pt-6">
        <ButtonLink
          href={service.href}
          variant="ghost"
          track="service_cta_clicked"
          trackProps={{ service: service.slug, location }}
        >
          {service.cta}
        </ButtonLink>
      </div>
    </li>
  );
}
