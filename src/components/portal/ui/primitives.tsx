import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { PropertyStatus, RequestPriority, RequestStatus } from "@/lib/portal/domain";
import { propertyStatusLabels, requestStatusLabels } from "@/lib/portal/domain";
import { cn } from "@/lib/utils/cn";

/*
 * Portal building blocks. Same tokens, type and borders as the public site,
 * a little denser. Status is always a word next to its colour.
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-line-subtle pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink">
            <ChevronLeft aria-hidden className="size-4" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-label text-brand">{eyebrow}</p> : null}
        <h1 className={cn("text-2xl font-semibold tracking-tight text-ink sm:text-[1.875rem] sm:leading-tight", eyebrow && "mt-2")}>{title}</h1>
        {description ? <div className="mt-2 max-w-2xl text-[0.9375rem] text-ink-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** A titled white panel. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
  labelledBy,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  labelledBy?: string;
}) {
  return (
    <section aria-labelledby={title ? labelledBy : undefined} className={cn("rounded-card border border-line bg-surface", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-3.5">
          <h2 id={labelledBy} className="text-label text-ink">
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone = "default" }: { label: string; value: number; hint?: string; href?: string; tone?: "default" | "attention" }) {
  const body = (
    <>
      <p className={cn("text-3xl leading-none font-semibold tracking-tight tabular-nums", tone === "attention" && value > 0 ? "text-attention" : "text-ink")}>
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-2 text-sm font-medium text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p> : null}
    </>
  );
  const classes = "block rounded-card border border-line bg-surface px-4 py-4 sm:px-5";
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  compact,
  heading: Heading = "h2",
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { href: string; label: string };
  compact?: boolean;
  /** h1 when the empty state is the whole page (not-found pages). */
  heading?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-8" : "rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-14")}>
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <Heading className="mt-4 text-base font-semibold tracking-tight text-ink">{title}</Heading>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{body}</p>
      {action ? (
        <ButtonLink href={action.href} className="mt-5" arrow>
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

/** Banner after a successful save (driven by ?saved=…), announced politely. */
export function SavedNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-control border border-good/20 bg-good-soft px-4 py-3 text-sm text-ink">
      {message}
    </p>
  );
}

const requestTones: Record<RequestStatus, "info" | "brand" | "attention" | "good" | "neutral"> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  ASSIGNED: "brand",
  IN_PROGRESS: "brand",
  WAITING_FOR_CUSTOMER: "attention",
  COMPLETED: "good",
  CANCELLED: "neutral",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge tone={requestTones[status]}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {requestStatusLabels[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return priority === "URGENT" ? <Badge tone="attention">Urgent</Badge> : <Badge>Normal</Badge>;
}

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <Badge tone={status === "ACTIVE" ? "good" : status === "UNDER_REVIEW" ? "info" : "neutral"}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {propertyStatusLabels[status]}
    </Badge>
  );
}

/** Previous / next links for paginated lists. */
export function Pagination({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const linkClasses = "inline-flex h-10 items-center gap-1 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-line-strong";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-6">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClasses} rel="prev">
          <ChevronLeft aria-hidden className="size-4" />
          Newer
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-ink-subtle">
        Page {page} of {pages}
      </p>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkClasses} rel="next">
          Older
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Term / value list for detail pages. `narrow` suits side panels: a slimmer label column. */
export function DetailList({ items, narrow }: { items: { label: string; value: ReactNode }[]; narrow?: boolean }) {
  return (
    <dl className="divide-y divide-line-subtle">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "grid grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:gap-4",
            narrow ? "sm:grid-cols-[6rem_minmax(0,1fr)]" : "sm:grid-cols-[10rem_minmax(0,1fr)]",
          )}
        >
          <dt className="text-sm text-ink-subtle">{item.label}</dt>
          <dd className="text-sm font-medium break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Loading placeholder blocks (static when reduced motion is preferred). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-control bg-subtle motion-reduce:animate-none", className)} />;
}
