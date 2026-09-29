import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { AdminActivityList, RequestTable } from "@/components/admin/lists";
import { AdminStatusBadge } from "@/components/admin/ui";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/portal/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { adminRoutes } from "@/config/routes";
import { ATTENTION_LIMIT, getAdminDashboard, teamNames } from "@/lib/admin/data";
import { adminStatusLabels } from "@/lib/admin/domain";
import { requireAdmin } from "@/lib/admin/session";
import type { RequestStatus } from "@/lib/portal/domain";
import { formatDate } from "@/lib/portal/format";

export const metadata: Metadata = { title: "Dashboard" };

const statusCards: { status: RequestStatus; hint: string }[] = [
  { status: "SUBMITTED", hint: "Not looked at yet" },
  { status: "UNDER_REVIEW", hint: "Being reviewed" },
  { status: "ASSIGNED", hint: "Someone is responsible" },
  { status: "IN_PROGRESS", hint: "Work has started" },
  { status: "WAITING_FOR_CUSTOMER", hint: "Paused for a reply" },
  { status: "COMPLETED", hint: "Done" },
];

export default async function AdminDashboardPage() {
  const admin = await requireAdmin(adminRoutes.dashboard);
  const [data, names] = await Promise.all([getAdminDashboard(admin), teamNames(admin)]);
  const tz = admin.profile.timezone;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin console"
        title="Operations dashboard"
        description={`${data.openTotal} open ${data.openTotal === 1 ? "request" : "requests"}, ${data.unassignedCount} without an assignee.`}
        actions={<ButtonLink href={adminRoutes.requests}>Open the request inbox</ButtonLink>}
      />

      <section aria-labelledby="by-status">
        <h2 id="by-status" className="sr-only">
          Requests by status
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {statusCards.map(({ status, hint }) => (
            <StatCard
              key={status}
              label={adminStatusLabels[status]}
              value={data.byStatus[status]}
              hint={hint}
              href={`${adminRoutes.requests}?status=${status}`}
              tone={status === "SUBMITTED" ? "attention" : "default"}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title="Needs attention"
          labelledBy="attention"
          action={
            <Link href={`${adminRoutes.requests}?status=SUBMITTED&sort=oldest`} className="text-sm font-medium text-brand hover:text-brand-strong">
              All new requests
            </Link>
          }
          bodyClassName="px-0 py-0"
        >
          {data.attention.length === 0 ? (
            <EmptyState compact icon={CheckCircle2} title="Nothing waiting" body="No new requests and no urgent open work right now." />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {data.attention.map((r) => (
                <li key={r.id}>
                  <Link href={adminRoutes.request(r.id)} className="block px-5 py-3 hover:bg-subtle/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-ink-subtle tabular-nums">{r.request_number}</span>
                      <AdminStatusBadge status={r.status} />
                      {r.priority === "URGENT" ? <Badge tone="attention">Urgent</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm font-medium break-words text-ink">{r.title}</p>
                    <p className="mt-0.5 text-xs break-words text-ink-muted">
                      {r.customer_name} · submitted {formatDate(r.created_at, tz)}
                      {r.assignee_name ? ` · ${r.assignee_name}` : " · unassigned"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.attentionTotal > data.attention.length ? (
            <p className="border-t border-line-subtle px-5 py-3 text-xs text-ink-muted">
              Showing the {ATTENTION_LIMIT} that have waited longest, of {data.attentionTotal}.
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Recent activity"
          labelledBy="recent-activity"
          action={
            <Link href={adminRoutes.activity} className="text-sm font-medium text-brand hover:text-brand-strong">
              Audit trail
            </Link>
          }
        >
          {data.activity.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing has happened yet.</p>
          ) : (
            <AdminActivityList rows={data.activity} timezone={tz} teamNames={names} compact />
          )}
        </Panel>
      </div>

      <section aria-labelledby="recent-requests" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="recent-requests" className="text-label text-ink">
            Latest requests
          </h2>
          <Link href={adminRoutes.requests} className="text-sm font-medium text-brand hover:text-brand-strong">
            View all
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No requests yet" body="When a customer submits a service request, it appears here and in the inbox." />
        ) : (
          <RequestTable rows={data.recent} timezone={tz} caption="Latest requests" />
        )}
      </section>

      <section aria-labelledby="context" className="grid gap-3 sm:grid-cols-2">
        <h2 id="context" className="sr-only">
          Customers and properties
        </h2>
        <Link href={adminRoutes.customers} className="flex items-center gap-4 rounded-card border border-line bg-surface px-5 py-4 hover:border-line-strong">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Users className="size-5" strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-2xl font-semibold tracking-tight text-ink tabular-nums">{data.customerCount}</span>
            <span className="text-sm text-ink-muted">{data.customerCount === 1 ? "customer" : "customers"}</span>
          </span>
        </Link>
        <Link href={adminRoutes.properties} className="flex items-center gap-4 rounded-card border border-line bg-surface px-5 py-4 hover:border-line-strong">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Building2 className="size-5" strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-2xl font-semibold tracking-tight text-ink tabular-nums">{data.propertyCount}</span>
            <span className="text-sm text-ink-muted">{data.propertyCount === 1 ? "property" : "properties"}</span>
          </span>
        </Link>
      </section>
    </div>
  );
}
