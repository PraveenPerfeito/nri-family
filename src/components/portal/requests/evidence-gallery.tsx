import { FileText, PlayCircle } from "lucide-react";
import { evidenceFileRoutes } from "@/config/routes";
import { evidenceStages } from "@/lib/field-ops/domain";
import type { CustomerEvidence } from "@/lib/portal/data";
import { formatDate, formatDateTime } from "@/lib/portal/format";

/*
 * The proof of work a customer can see: only evidence the team has approved
 * and then chosen to share. Grouped Before / During / After / General. Files
 * load through the portal's own evidence route, which checks, on every
 * request, that this is the customer's own shared evidence before
 * redirecting to a short-lived signed link. No file name, storage location
 * or team member appears here.
 */

function Item({ item, timezone }: { item: CustomerEvidence; timezone: string | null }) {
  const href = evidenceFileRoutes.customer(item.request_id, item.id);
  return (
    <li className="min-w-0 space-y-2">
      {item.kind === "PHOTO" ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-control focus-visible:shadow-focus focus-visible:outline-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- private files behind short-lived signed links must not go through the image optimiser, which would cache them */}
          <img src={href} alt={item.title} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-control border border-line bg-subtle object-cover" />
          <span className="sr-only"> (opens full size in a new tab)</span>
        </a>
      ) : item.kind === "VIDEO" ? (
        <video controls preload="metadata" src={href} aria-label={item.title} className="aspect-video w-full rounded-control border border-line bg-night" />
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-control border border-line bg-subtle text-sm font-medium text-brand hover:text-brand-strong focus-visible:shadow-focus focus-visible:outline-none"
        >
          <FileText aria-hidden className="size-6" strokeWidth={1.75} />
          Open document (PDF)<span className="sr-only">: {item.title} (opens in a new tab)</span>
        </a>
      )}
      <div>
        <p className="text-sm font-medium break-words text-ink">{item.title}</p>
        {item.description ? <p className="mt-0.5 text-sm break-words whitespace-pre-line text-ink-muted">{item.description}</p> : null}
        <p className="mt-1 text-xs text-ink-subtle">
          {item.captured_at ? `Taken ${formatDateTime(item.captured_at, timezone)}` : null}
          {item.captured_at && item.published_at ? " · " : null}
          {item.published_at ? `Shared ${formatDate(item.published_at, timezone)}` : null}
        </p>
        {item.kind === "VIDEO" ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-strong">
            <PlayCircle aria-hidden className="size-3.5" />
            Open video<span className="sr-only">: {item.title} (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function EvidenceGallery({ evidence, timezone }: { evidence: CustomerEvidence[]; timezone: string | null }) {
  const groups = evidenceStages.map((stage) => ({ ...stage, items: evidence.filter((e) => e.stage === stage.value) })).filter((g) => g.items.length > 0);
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.value} aria-labelledby={`evidence-${group.value.toLowerCase()}`}>
          <h3 id={`evidence-${group.value.toLowerCase()}`} className="text-label text-ink">
            {group.label}
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <Item key={item.id} item={item} timezone={timezone} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
