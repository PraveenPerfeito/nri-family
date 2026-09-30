import { FileText, PlayCircle } from "lucide-react";
import { evidenceFileRoutes } from "@/config/routes";
import type { AdminEvidence } from "@/lib/admin/data";
import { isFinalStatus } from "@/lib/admin/domain";
import { evidenceKindLabels } from "@/lib/field-ops/domain";
import { FIELD_TIMEZONE } from "@/lib/field-ops/schedule";
import type { RequestStatus } from "@/lib/portal/domain";
import { formatDateTime } from "@/lib/portal/format";
import { EvidenceReviewBadge, EvidenceStageBadge, VisibilityBadge } from "../ui";
import { EvidenceActions } from "./evidence-actions";
import { FeedbackRegion } from "./feedback";
import { EvidenceUploadForm } from "./evidence-upload";

/*
 * Evidence on the admin request page, grouped by where it is in review:
 * waiting for review, approved (still internal), shared with the customer,
 * and rejected (kept for the record, never shown to the customer). Files
 * open through the console's own evidence route, which checks admin rights
 * and redirects to a short-lived signed link.
 */

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function EvidenceMedia({ href, item }: { href: string; item: AdminEvidence }) {
  if (item.kind === "PHOTO") {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-control focus-visible:shadow-focus focus-visible:outline-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- private files behind short-lived signed links must not go through the image optimiser, which would cache them */}
        <img src={href} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-control border border-line bg-subtle object-cover" />
        <span className="sr-only">Open full size: {item.title} (opens in a new tab)</span>
      </a>
    );
  }
  if (item.kind === "VIDEO") {
    return (
      <div className="space-y-1">
        <video controls preload="metadata" src={href} aria-label={`Video: ${item.title}`} className="aspect-video w-full rounded-control border border-line bg-night" />
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-strong">
          <PlayCircle aria-hidden className="size-3.5" />
          Open video<span className="sr-only">: {item.title} (opens in a new tab)</span>
        </a>
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-control border border-line bg-subtle text-sm font-medium text-brand hover:text-brand-strong focus-visible:shadow-focus focus-visible:outline-none"
    >
      <FileText aria-hidden className="size-6" strokeWidth={1.75} />
      Open PDF<span className="sr-only">: {item.title} (opens in a new tab)</span>
    </a>
  );
}

function EvidenceItem({
  requestId,
  item,
  open,
  customerName,
  names,
  timezone,
}: {
  requestId: string;
  item: AdminEvidence;
  open: boolean;
  customerName: string;
  names: Map<string, string>;
  timezone: string | null;
}) {
  const person = (id: string | null | undefined) => (id ? (names.get(id) ?? "a former team member") : "a former team member");
  const record = item.internal;
  return (
    <li className="grid gap-4 rounded-card border border-line bg-surface p-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <EvidenceMedia href={evidenceFileRoutes.admin(requestId, item.id)} item={item} />
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold break-words text-ink">{item.title}</p>
        <div className="flex flex-wrap gap-1.5">
          <EvidenceStageBadge stage={item.stage} />
          <EvidenceReviewBadge status={item.review_status} />
          <VisibilityBadge internal={item.visibility === "INTERNAL"} />
        </div>
        {item.description ? <p className="text-sm break-words whitespace-pre-line text-ink-muted">{item.description}</p> : null}
        <p className="text-xs text-ink-subtle">
          {evidenceKindLabels[item.kind]} · {formatBytes(item.size_bytes)}
          {item.captured_at ? ` · taken ${formatDateTime(item.captured_at, FIELD_TIMEZONE)} India time` : ""}
          {` · added by ${person(record?.uploaded_by)}, ${formatDateTime(item.created_at, timezone)}`}
        </p>
        {record?.reviewed_at ? (
          <p className="text-xs text-ink-subtle">
            {item.review_status === "REJECTED" ? "Rejected" : "Approved"} by {person(record.reviewed_by)}, {formatDateTime(record.reviewed_at, timezone)}
            {item.published_at ? ` · shared ${formatDateTime(item.published_at, timezone)} by ${person(record.published_by)}` : ""}
          </p>
        ) : null}
        {item.review_status === "REJECTED" && record?.review_note ? (
          <p className="rounded-control border border-attention/20 bg-attention-soft/50 px-3 py-2 text-sm break-words whitespace-pre-line text-ink">
            <span className="font-medium">Reason (internal):</span> {record.review_note}
          </p>
        ) : null}
        {open ? <EvidenceActions requestId={requestId} evidence={item} customerName={customerName} /> : null}
      </div>
    </li>
  );
}

export function EvidencePanel({
  requestId,
  requestStatus,
  evidence,
  customerName,
  names,
  timezone,
}: {
  requestId: string;
  requestStatus: RequestStatus;
  evidence: AdminEvidence[];
  customerName: string;
  names: Map<string, string>;
  timezone: string | null;
}) {
  const open = !isFinalStatus(requestStatus);
  const groups = [
    { key: "pending", title: "Waiting for review", items: evidence.filter((e) => e.review_status === "PENDING_REVIEW") },
    { key: "approved", title: "Approved, not shared yet", items: evidence.filter((e) => e.review_status === "APPROVED" && e.visibility === "INTERNAL") },
    { key: "shared", title: "Shared with the customer", items: evidence.filter((e) => e.visibility === "CUSTOMER_VISIBLE") },
  ].filter((g) => g.items.length > 0);
  const rejected = evidence.filter((e) => e.review_status === "REJECTED");
  const item = (e: AdminEvidence) => <EvidenceItem key={e.id} requestId={requestId} item={e} open={open} customerName={customerName} names={names} timezone={timezone} />;

  return (
    <FeedbackRegion>
      <div className="space-y-6">
        <p className="text-sm text-ink-muted">
          Evidence is internal until you approve it and then choose to share it with the customer. Rejected evidence stays on record for the team.
        </p>

        {open ? (
          <section aria-labelledby="add-evidence" className="rounded-card border border-line bg-subtle/40 p-4">
            <h3 id="add-evidence" className="text-sm font-semibold text-ink">
              Add evidence
            </h3>
            <div className="mt-3">
              <EvidenceUploadForm requestId={requestId} />
            </div>
          </section>
        ) : (
          <p className="text-sm text-ink-muted">This request is closed, so evidence can no longer be added or reviewed.</p>
        )}

        {groups.length === 0 && rejected.length === 0 ? <p className="text-sm text-ink-muted">No evidence yet.</p> : null}
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`evidence-${group.key}`}>
            <h3 id={`evidence-${group.key}`} className="text-sm font-semibold text-ink">
              {group.title} <span className="font-normal text-ink-subtle">({group.items.length})</span>
            </h3>
            <ul className="mt-3 space-y-3">{group.items.map(item)}</ul>
          </section>
        ))}
        {rejected.length > 0 ? (
          <details className="rounded-control border border-line">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-ink select-none hover:bg-subtle/60">Rejected ({rejected.length}), internal only</summary>
            <ul className="space-y-3 border-t border-line-subtle p-3">{rejected.map(item)}</ul>
          </details>
        ) : null}

      </div>
    </FeedbackRegion>
  );
}
