import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PropertyStatusBadge } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { describeAdminActivity } from "@/lib/admin/activity";
import type { CustomerRow, FeedRow, InboxRow, PropertyRow, TeamRow } from "@/lib/admin/data";
import type { TeamRole } from "@/lib/admin/domain";
import { labelOf, propertyTypes, requestCategories } from "@/lib/portal/domain";
import { formatDate, formatDateTime } from "@/lib/portal/format";
import { countryName } from "@/lib/portal/places";
import { ActiveBadge, AdminStatusBadge, CardLink, CountCell, ResponsiveTable, RoleBadge, VisibilityBadge, td, th } from "./ui";

/*
 * Admin lists. Each is a table from `md` and a stack of cards below, fed by
 * one server-side query (no per-row lookups). Times are shown in the
 * admin's own time zone.
 */

const categoryLabel = (value: string) => labelOf(requestCategories, value);

function Urgent() {
  return (
    <Badge tone="attention">
      <AlertTriangle aria-hidden className="size-3" strokeWidth={2.25} />
      Urgent
    </Badge>
  );
}

function Assignee({ name }: { name: string | null }) {
  return name ? <span className="text-ink">{name}</span> : <span className="text-ink-subtle">Unassigned</span>;
}

/** Which record the list belongs to: all requests, one customer's, or one property's. */
type RequestContext = "all" | "customer" | "property";

const contextHeading: Record<RequestContext, string> = { all: "Customer and property", customer: "Property", property: "Customer" };

function RequestWho({ row, context }: { row: InboxRow; context: RequestContext }) {
  const place = row.property_name ? `${row.property_name}${row.property_city ? `, ${row.property_city}` : ""}` : "No property";
  return (
    <>
      {context !== "customer" ? <span className="block break-words text-ink">{row.customer_name}</span> : null}
      {context !== "property" ? <span className={context === "customer" ? "block break-words text-ink" : "block text-xs break-words text-ink-muted"}>{place}</span> : null}
    </>
  );
}

export function RequestTable({ rows, timezone, caption = "Service requests", context = "all" }: { rows: InboxRow[]; timezone: string | null; caption?: string; context?: RequestContext }) {
  return (
    <ResponsiveTable
      caption={caption}
      head={
        <tr>
          <th scope="col" className={`${th} w-[35%]`}>
            Request
          </th>
          <th scope="col" className={`${th} w-[26%]`}>
            {contextHeading[context]}
          </th>
          <th scope="col" className={`${th} w-[21%]`}>
            Status
          </th>
          <th scope="col" className={`${th} w-[18%]`}>
            Assigned to
          </th>
        </tr>
      }
      rows={rows.map((r) => (
        <tr key={r.id} className="hover:bg-subtle/40">
          <td className={td}>
            <Link href={adminRoutes.request(r.id)} className="font-medium text-ink hover:text-brand">
              <span className="block text-xs font-semibold text-ink-subtle tabular-nums">{r.request_number}</span>
              <span className="mt-0.5 block break-words">{r.title}</span>
            </Link>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {categoryLabel(r.category)} · <time dateTime={r.created_at}>{formatDate(r.created_at, timezone)}</time>
            </span>
          </td>
          <td className={td}>
            <RequestWho row={r} context={context} />
          </td>
          <td className={td}>
            <div className="flex flex-col items-start gap-1.5">
              <AdminStatusBadge status={r.status} />
              {r.priority === "URGENT" ? <Urgent /> : <span className="text-xs text-ink-subtle">Normal priority</span>}
            </div>
          </td>
          <td className={td}>
            <Assignee name={r.assignee_name} />
          </td>
        </tr>
      ))}
      cards={rows.map((r) => (
        <CardLink key={r.id} href={adminRoutes.request(r.id)}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink-subtle tabular-nums">{r.request_number}</span>
            <AdminStatusBadge status={r.status} />
          </div>
          <p className="mt-1.5 font-medium break-words text-ink">{r.title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {categoryLabel(r.category)} · <time dateTime={r.created_at}>{formatDate(r.created_at, timezone)}</time>
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {context !== "customer" ? (
              <div className="min-w-0">
                <dt className="text-ink-subtle">Customer</dt>
                <dd className="break-words text-ink">{r.customer_name}</dd>
              </div>
            ) : null}
            {context !== "property" ? (
              <div className="min-w-0">
                <dt className="text-ink-subtle">Property</dt>
                <dd className="break-words text-ink">{r.property_name ?? "None"}</dd>
              </div>
            ) : null}
            <div className="min-w-0">
              <dt className="text-ink-subtle">Assigned to</dt>
              <dd className="break-words">
                <Assignee name={r.assignee_name} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-ink-subtle">Priority</dt>
              <dd>{r.priority === "URGENT" ? <Urgent /> : <span className="text-ink">Normal</span>}</dd>
            </div>
          </dl>
        </CardLink>
      ))}
    />
  );
}

export function CustomerTable({ rows, timezone }: { rows: CustomerRow[]; timezone: string | null }) {
  return (
    <ResponsiveTable
      caption="Customers"
      head={
        <tr>
          <th scope="col" className={`${th} w-[34%]`}>
            Customer
          </th>
          <th scope="col" className={`${th} w-[22%]`}>
            Lives in
          </th>
          <th scope="col" className={`${th} w-[12%]`}>
            Properties
          </th>
          <th scope="col" className={`${th} w-[16%]`}>
            Open requests
          </th>
          <th scope="col" className={`${th} w-[16%]`}>
            Joined
          </th>
        </tr>
      }
      rows={rows.map((c) => (
        <tr key={c.id} className="hover:bg-subtle/40">
          <td className={td}>
            <Link href={adminRoutes.customer(c.id)} className="block font-medium break-words text-ink hover:text-brand">
              {c.full_name}
            </Link>
            <span className="block text-xs break-all text-ink-muted">{c.email ?? "No email"}</span>
          </td>
          <td className={td}>
            <span className="block text-ink">{c.country ? countryName(c.country) : "Not set"}</span>
            <span className="block text-xs break-words text-ink-muted">{c.timezone ?? "No time zone"}</span>
          </td>
          <td className={td}>
            <CountCell value={c.property_count} label="properties" />
          </td>
          <td className={td}>
            <CountCell value={c.open_request_count} of={c.request_count} label={`open of ${c.request_count} requests`} />
          </td>
          <td className={`${td} whitespace-nowrap text-ink-muted`}>
            <time dateTime={c.created_at}>{formatDate(c.created_at, timezone)}</time>
          </td>
        </tr>
      ))}
      cards={rows.map((c) => (
        <CardLink key={c.id} href={adminRoutes.customer(c.id)}>
          <p className="font-medium break-words text-ink">{c.full_name}</p>
          <p className="text-xs break-all text-ink-muted">{c.email ?? "No email"}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-ink-subtle">Lives in</dt>
              <dd className="text-ink">{c.country ? countryName(c.country) : "Not set"}</dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Joined</dt>
              <dd className="text-ink">{formatDate(c.created_at, timezone)}</dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Properties</dt>
              <dd className="text-ink tabular-nums">{c.property_count}</dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Open requests</dt>
              <dd className="text-ink tabular-nums">
                {c.open_request_count} of {c.request_count}
              </dd>
            </div>
          </dl>
        </CardLink>
      ))}
    />
  );
}

export function PropertyTable({ rows, timezone, showOwner = true }: { rows: PropertyRow[]; timezone: string | null; showOwner?: boolean }) {
  return (
    <ResponsiveTable
      caption="Properties"
      head={
        <tr>
          <th scope="col" className={`${th} w-[30%]`}>
            Property
          </th>
          {showOwner ? (
            <th scope="col" className={`${th} w-[20%]`}>
              Owner
            </th>
          ) : null}
          <th scope="col" className={`${th} w-[20%]`}>
            Location
          </th>
          <th scope="col" className={`${th} w-[14%]`}>
            Status
          </th>
          <th scope="col" className={`${th} w-[16%]`}>
            Requests
          </th>
        </tr>
      }
      rows={rows.map((p) => (
        <tr key={p.id} className="hover:bg-subtle/40">
          <td className={td}>
            <Link href={adminRoutes.property(p.id)} className="block font-medium break-words text-ink hover:text-brand">
              {p.name}
            </Link>
            <span className="block text-xs text-ink-muted">
              {labelOf(propertyTypes, p.property_type)} · added {formatDate(p.created_at, timezone)}
            </span>
          </td>
          {showOwner ? (
            <td className={`${td} break-words`}>
              <Link href={adminRoutes.customer(p.owner_id)} className="text-ink hover:text-brand">
                {p.owner_name}
              </Link>
            </td>
          ) : null}
          <td className={td}>
            <span className="block text-ink">{p.city}</span>
            <span className="block text-xs text-ink-muted">{[p.district, p.state].filter(Boolean).join(", ")}</span>
          </td>
          <td className={td}>
            <PropertyStatusBadge status={p.status} />
          </td>
          <td className={td}>
            <CountCell value={p.open_request_count} of={p.request_count} label={`open of ${p.request_count} requests`} />
            <span aria-hidden className="block text-xs text-ink-subtle">
              open / total
            </span>
          </td>
        </tr>
      ))}
      cards={rows.map((p) => (
        <CardLink key={p.id} href={adminRoutes.property(p.id)}>
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 font-medium break-words text-ink">{p.name}</p>
            <PropertyStatusBadge status={p.status} />
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {labelOf(propertyTypes, p.property_type)} · {[p.city, p.district].filter(Boolean).join(", ")}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {showOwner ? (
              <div className="min-w-0">
                <dt className="text-ink-subtle">Owner</dt>
                <dd className="break-words text-ink">{p.owner_name}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-ink-subtle">Open requests</dt>
              <dd className="text-ink tabular-nums">
                {p.open_request_count} of {p.request_count}
              </dd>
            </div>
          </dl>
        </CardLink>
      ))}
    />
  );
}

export function TeamTable({ rows, timezone }: { rows: TeamRow[]; timezone: string | null }) {
  return (
    <ResponsiveTable
      caption="Team members"
      head={
        <tr>
          <th scope="col" className={`${th} w-[34%]`}>
            Name
          </th>
          <th scope="col" className={`${th} w-[14%]`}>
            Role
          </th>
          <th scope="col" className={`${th} w-[14%]`}>
            Status
          </th>
          <th scope="col" className={`${th} w-[20%]`}>
            Assigned requests
          </th>
          <th scope="col" className={`${th} w-[18%]`}>
            On the team since
          </th>
        </tr>
      }
      rows={rows.map((m) => (
        <tr key={m.profile_id}>
          <td className={td}>
            <span className="block font-medium break-words text-ink">{m.full_name}</span>
            <span className="block text-xs break-all text-ink-muted">{m.email ?? "No email"}</span>
          </td>
          <td className={td}>
            <RoleBadge role={m.role as TeamRole} />
          </td>
          <td className={td}>
            <ActiveBadge active={m.is_active} />
          </td>
          <td className={td}>
            <Link href={`${adminRoutes.requests}?assignee=${m.profile_id}&status=open`} className="text-ink hover:text-brand">
              <CountCell value={m.open_assigned_count} of={m.total_assigned_count} label={`open of ${m.total_assigned_count} assigned requests`} />
            </Link>
            <span aria-hidden className="block text-xs text-ink-subtle">
              open / total
            </span>
          </td>
          <td className={`${td} whitespace-nowrap text-ink-muted`}>{formatDate(m.joined_at, timezone)}</td>
        </tr>
      ))}
      cards={rows.map((m) => (
        <li key={m.profile_id} className="rounded-card border border-line bg-surface px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 font-medium break-words text-ink">{m.full_name}</p>
            <ActiveBadge active={m.is_active} />
          </div>
          <p className="text-xs break-all text-ink-muted">{m.email ?? "No email"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <RoleBadge role={m.role as TeamRole} />
            <Link href={`${adminRoutes.requests}?assignee=${m.profile_id}&status=open`} className="font-medium text-brand">
              {m.open_assigned_count} open of {m.total_assigned_count} assigned
            </Link>
          </div>
        </li>
      ))}
    />
  );
}

/** The audit trail: who did what, when, and who can see it. */
export function AdminActivityList({ rows, timezone, teamNames, compact }: { rows: FeedRow[]; timezone: string | null; teamNames?: Map<string, string>; compact?: boolean }) {
  return (
    <ol className="divide-y divide-line-subtle">
      {rows.map((row) => {
        const line = describeAdminActivity(row, teamNames);
        return (
          <li key={row.id} className={compact ? "py-2.5 first:pt-0 last:pb-0" : "py-3.5 first:pt-0 last:pb-0"}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {line.href ? (
                <Link href={line.href} className="text-sm font-medium text-ink hover:text-brand">
                  {line.title}
                </Link>
              ) : (
                <span className="text-sm font-medium text-ink">{line.title}</span>
              )}
              <VisibilityBadge internal={line.internal} />
            </div>
            {line.detail ? <p className="mt-0.5 text-sm break-words text-ink-muted">{line.detail}</p> : null}
            <p className="mt-0.5 text-xs text-ink-subtle">
              {line.actor} · <time dateTime={row.created_at}>{formatDateTime(row.created_at, timezone)}</time>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
