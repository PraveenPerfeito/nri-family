import type { ReactNode } from "react";
import Link from "next/link";
import { Ban, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Eye, Hourglass, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { adminStatusLabels, teamRoleLabels, type TeamRole } from "@/lib/admin/domain";
import {
  evidenceReviewLabels,
  evidenceStageLabels,
  visitStatusLabels,
  type EvidenceReviewStatus,
  type EvidenceStage,
  type VisitState,
} from "@/lib/field-ops/domain";
import type { RequestStatus } from "@/lib/portal/domain";
import { cn } from "@/lib/utils/cn";

/*
 * Admin console building blocks. Same tokens as the portal, denser. Status,
 * visibility and role are always words next to their colour.
 */

const statusTones: Record<RequestStatus, "info" | "brand" | "attention" | "good" | "neutral"> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  ASSIGNED: "brand",
  IN_PROGRESS: "brand",
  WAITING_FOR_CUSTOMER: "attention",
  COMPLETED: "good",
  CANCELLED: "neutral",
};

/** Request status in the team's words (SUBMITTED reads "New"). */
export function AdminStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge tone={statusTones[status]}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {adminStatusLabels[status]}
    </Badge>
  );
}

/** Who can see a timeline entry or activity record. */
export function VisibilityBadge({ internal }: { internal: boolean }) {
  return internal ? (
    <Badge tone="attention">
      <Lock aria-hidden className="size-3" strokeWidth={2.25} />
      Internal
    </Badge>
  ) : (
    <Badge tone="info">
      <Eye aria-hidden className="size-3" strokeWidth={2.25} />
      Customer visible
    </Badge>
  );
}

const visitTones: Record<VisitState, "info" | "brand" | "good" | "neutral"> = {
  NOT_SCHEDULED: "neutral",
  SCHEDULED: "info",
  IN_PROGRESS: "brand",
  COMPLETED: "good",
  CANCELLED: "neutral",
};

/** A visit's state (distinct from the request's status: calendar icon, "Visit" in the label). */
export function VisitStatusBadge({ state }: { state: VisitState }) {
  return (
    <Badge tone={visitTones[state]}>
      <CalendarClock aria-hidden className="size-3" strokeWidth={2.25} />
      Visit: {visitStatusLabels[state].toLowerCase()}
    </Badge>
  );
}

/** Where a piece of evidence is in review. */
export function EvidenceReviewBadge({ status }: { status: EvidenceReviewStatus }) {
  const Icon = status === "APPROVED" ? CheckCircle2 : status === "REJECTED" ? Ban : Hourglass;
  return (
    <Badge tone={status === "APPROVED" ? "good" : status === "REJECTED" ? "neutral" : "attention"}>
      <Icon aria-hidden className="size-3" strokeWidth={2.25} />
      {evidenceReviewLabels[status]}
    </Badge>
  );
}

export function EvidenceStageBadge({ stage }: { stage: EvidenceStage }) {
  return <Badge>{evidenceStageLabels[stage]}</Badge>;
}

export function RoleBadge({ role }: { role: TeamRole }) {
  return <Badge tone={role === "ADMIN" ? "brand" : "neutral"}>{teamRoleLabels[role]}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="good">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      Active
    </Badge>
  ) : (
    <Badge>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      Inactive
    </Badge>
  );
}

/** "12 open of 15" style counts for tables. */
export function CountCell({ value, of, label }: { value: number; of?: number; label: string }) {
  return (
    <span className="text-sm text-ink tabular-nums">
      {value}
      {of !== undefined ? <span className="text-ink-subtle"> / {of}</span> : null}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

const filterControl =
  "block h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink hover:border-ink/30 focus:border-brand focus:outline-none focus-visible:shadow-focus";

/**
 * A list's search and filters: a plain GET form, so it works without
 * JavaScript, and every choice ends up in the URL (shareable, back-button safe).
 */
export function FilterBar({
  action,
  search,
  children,
  clearHref,
  active,
}: {
  action: string;
  search?: { name?: string; label: string; placeholder: string; value: string };
  children?: ReactNode;
  clearHref: string;
  active: boolean;
}) {
  return (
    <form role="search" action={action} method="get" className="rounded-card border border-line bg-surface p-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {search ? (
          <div className="col-span-2">
            <label htmlFor="filter-q" className="text-xs font-medium text-ink-muted">
              {search.label}
            </label>
            <input
              id="filter-q"
              type="search"
              name={search.name ?? "q"}
              defaultValue={search.value}
              placeholder={search.placeholder}
              maxLength={80}
              className={cn(filterControl, "mt-1 placeholder:text-ink-subtle/80")}
            />
          </div>
        ) : null}
        {children}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" className={buttonClasses({ variant: "secondary" })}>
          Apply
        </button>
        {active ? (
          <Link href={clearHref} className="inline-flex h-10 items-center px-3 text-sm font-medium text-brand hover:text-brand-strong">
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function FilterSelect({
  name,
  label,
  value,
  options,
  anyLabel,
  wide,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  /** Label of the "no filter" option; omit when a choice is always required. */
  anyLabel?: string;
  /** Take the whole row on phones (for a field left alone on its row). */
  wide?: boolean;
}) {
  const id = `filter-${name}`;
  return (
    <div className={wide ? "col-span-2 lg:col-span-1" : undefined}>
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className={cn(filterControl, "mt-1")}>
        {anyLabel ? <option value="">{anyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** "Showing 26–50 of 132 requests", announced after filtering. */
export function ResultSummary({ page, pageSize, total, noun }: { page: number; pageSize: number; total: number; noun: [string, string] }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <p role="status" className="text-sm text-ink-muted">
      {total === 0 ? `No ${noun[1]} match.` : `Showing ${from}–${to} of ${total} ${total === 1 ? noun[0] : noun[1]}`}
    </p>
  );
}

/** Previous / next page links for the admin lists. */
export function AdminPagination({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const linkClasses = "inline-flex h-10 items-center gap-1 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-line-strong";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClasses} rel="prev">
          <ChevronLeft aria-hidden className="size-4" />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-ink-subtle">
        Page {page} of {pages}
      </p>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkClasses} rel="next">
          Next
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Breadcrumb trail for admin detail pages. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {items.map((item, i) => (
          <li key={item.label} className="flex min-w-0 items-center gap-1">
            {i > 0 ? <ChevronRight aria-hidden className="size-3.5 shrink-0 text-ink-subtle" /> : null}
            {item.href ? (
              <Link href={item.href} className="font-medium hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Table wrapper: a real <table> from `md`, stacked cards below (never scrolls sideways). */
export function ResponsiveTable({ caption, head, rows, cards }: { caption: string; head: ReactNode; rows: ReactNode; cards: ReactNode }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface md:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-subtle/60 text-xs font-medium text-ink-muted">{head}</thead>
          <tbody className="divide-y divide-line-subtle">{rows}</tbody>
        </table>
      </div>
      <ul aria-label={caption} className="space-y-3 md:hidden">
        {cards}
      </ul>
    </>
  );
}

export const th = "px-3 py-2.5 font-medium xl:px-4";
export const td = "px-3 py-3 align-top xl:px-4";

/** A mobile card that links to the record. */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="block rounded-card border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong">
        {children}
      </Link>
    </li>
  );
}
