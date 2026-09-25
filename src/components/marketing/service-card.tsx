import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/card";
import type { ServiceCategory } from "@/config/services";
import { serviceIcons } from "./service-icons";

export function ServiceCard({ service, location }: { service: ServiceCategory; location: string }) {
  const Icon = serviceIcons[service.slug];
  return (
    <li className="reveal flex flex-col rounded-panel border border-line bg-surface p-6 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-raised sm:p-8">
      <div className="flex items-center gap-3">
        <IconTile icon={Icon} />
        <h3 className="text-lg font-semibold tracking-tight text-ink">{service.name}</h3>
      </div>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">{service.summary}</p>
      <ul className="mt-5 grid gap-2 border-t border-line-subtle pt-5 text-sm text-ink">
        {service.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />
            {h}
          </li>
        ))}
      </ul>
      {service.scopeNote ? <p className="mt-5 text-xs leading-relaxed text-ink-subtle">{service.scopeNote}</p> : null}
      <div className="mt-auto pt-7">
        <ButtonLink href={service.href} variant="ghost" track="service_cta_clicked" trackProps={{ service: service.slug, location }}>
          {service.cta}
        </ButtonLink>
      </div>
    </li>
  );
}
