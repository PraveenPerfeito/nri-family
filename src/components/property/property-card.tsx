import { Building2, Home, LandPlot, MessageSquareLock, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { VisibilityBadge } from "@/components/trust/visibility";
import type { DemoListing } from "@/data/demo";
import type { PropertyKind } from "@/types/domain";

const kindIcon: Record<PropertyKind, LucideIcon> = {
  "independent-house": Home,
  apartment: Building2,
  villa: Home,
  "residential-land": LandPlot,
  "agricultural-land": Sprout,
  commercial: Building2,
};

/**
 * Listing card. Deliberately shows no owner name, phone, email or exact
 * address — only city-level location. Enquiries route through the platform.
 */
export function PropertyCard({ listing }: { listing: DemoListing }) {
  const Icon = kindIcon[listing.kind];
  return (
    <li className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div aria-hidden className="bg-grid relative flex h-36 items-center justify-center border-b border-line bg-subtle">
        <Icon className="size-10 text-ink-subtle/70" strokeWidth={1.25} />
        <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-0.5 text-[0.6875rem] font-medium text-ink-muted">
          Sample listing
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
          {listing.city} · For {listing.intent.toLowerCase()}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-ink">{listing.title}</h3>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <div>
            <dt className="sr-only">Area</dt>
            <dd>{listing.area}</dd>
          </div>
          <div>
            <dt className="sr-only">Details</dt>
            <dd>{listing.detail}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
          <span>Visibility:</span>
          <VisibilityBadge visibility={listing.visibility} />
        </div>
        <div className="mt-auto pt-5">
          <p className="flex items-center gap-2 border-t border-line pt-4 text-sm font-medium text-ink">
            <MessageSquareLock aria-hidden className="size-4 text-brand" />
            Contact through platform
          </p>
        </div>
      </div>
    </li>
  );
}
