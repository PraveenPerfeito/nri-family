import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { portalRoutes } from "@/config/routes";
import type { PropertySummary, RequestSummary } from "@/lib/portal/data";
import { labelOf, propertyTypes, requestCategories } from "@/lib/portal/domain";
import { formatDate } from "@/lib/portal/format";
import { PriorityBadge, PropertyStatusBadge, RequestStatusBadge } from "./ui/primitives";

/** Properties as a list of rows (cards on phones). */
export function PropertyList({ properties, timezone }: { properties: PropertySummary[]; timezone: string | null }) {
  return (
    <ul className="divide-y divide-line-subtle overflow-hidden rounded-card border border-line bg-surface">
      {properties.map((p) => (
        <li key={p.id}>
          <Link href={portalRoutes.property(p.id)} className="group flex items-center gap-4 px-4 py-4 hover:bg-canvas/70 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 font-semibold tracking-tight break-words text-ink">{p.name}</span>
                <PropertyStatusBadge status={p.status} />
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-muted">
                <span>{labelOf(propertyTypes, p.property_type)}</span>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin aria-hidden className="size-3.5 text-ink-subtle" />
                  {[p.city, p.district && p.district !== p.city ? p.district : null].filter(Boolean).join(", ")}
                </span>
              </p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-sm font-medium text-ink tabular-nums">
                {p.openRequests} open {p.openRequests === 1 ? "request" : "requests"}
              </p>
              <p className="mt-0.5 text-xs text-ink-subtle">Updated {formatDate(p.updated_at, timezone)}</p>
            </div>
            <p className="text-xs text-ink-subtle sm:hidden">{p.openRequests} open</p>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Service requests as rows. */
export function RequestList({ requests, timezone, showProperty = true }: { requests: RequestSummary[]; timezone: string | null; showProperty?: boolean }) {
  return (
    <ul className="divide-y divide-line-subtle overflow-hidden rounded-card border border-line bg-surface">
      {requests.map((r) => (
        <li key={r.id}>
          <Link href={portalRoutes.request(r.id)} className="group flex items-center gap-4 px-4 py-4 hover:bg-canvas/70 sm:px-5">
            <div className="min-w-0 flex-1">
              {/* On phones the status sits on the number line, leaving the title the full width. */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-ink-subtle tabular-nums">{r.request_number}</p>
                <span className="sm:hidden">
                  <RequestStatusBadge status={r.status} />
                </span>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 font-semibold tracking-tight break-words text-ink">{r.title}</span>
                {r.priority === "URGENT" ? <PriorityBadge priority={r.priority} /> : null}
              </p>
              <p className="mt-1 text-sm break-words text-ink-muted">
                {[labelOf(requestCategories, r.category), showProperty ? (r.property?.name ?? "No property") : null].filter(Boolean).map((part, i) => (
                  <Fragment key={i}>
                    {part}
                    {" · "}
                  </Fragment>
                ))}
                <span className="whitespace-nowrap">{formatDate(r.created_at, timezone)}</span>
              </p>
            </div>
            <div className="shrink-0 max-sm:hidden">
              <RequestStatusBadge status={r.status} />
            </div>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 max-sm:hidden" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
