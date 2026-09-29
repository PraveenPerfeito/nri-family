import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ClipboardList } from "lucide-react";
import { AdminActivityList, PropertyTable, RequestTable } from "@/components/admin/lists";
import { Breadcrumbs } from "@/components/admin/ui";
import { DetailList, EmptyState, PageHeader, Panel, StatCard } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { getAdminCustomer, teamNames } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { formatDate, formatTime, zoneOf } from "@/lib/portal/format";
import { countryName } from "@/lib/portal/places";
import { isUuid } from "@/lib/portal/validation";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const admin = await requireAdmin(isUuid(id) ? adminRoutes.customer(id) : adminRoutes.customers);
  const [detail, names] = await Promise.all([getAdminCustomer(admin, id), teamNames(admin)]);
  if (!detail) notFound();
  const { customer, properties, requests, requestTotal, activity } = detail;
  const tz = admin.profile.timezone;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: adminRoutes.dashboard },
            { label: "Customers", href: adminRoutes.customers },
            { label: customer.full_name },
          ]}
        />
        <PageHeader
          eyebrow="Customer"
          title={customer.full_name}
          description={`Customer since ${formatDate(customer.created_at, tz)}${customer.country ? ` · lives in ${countryName(customer.country)}` : ""}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Contact details" labelledBy="contact">
          <DetailList
            items={[
              { label: "Email", value: customer.email ? <a href={`mailto:${customer.email}`} className="break-all text-brand hover:text-brand-strong">{customer.email}</a> : "Not given" },
              { label: "Phone", value: customer.phone ? <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="text-brand hover:text-brand-strong">{customer.phone}</a> : "Not given" },
              { label: "Lives in", value: customer.country ? countryName(customer.country) : "Not set" },
              { label: "Time zone", value: customer.timezone ? `${customer.timezone} (now ${formatTime(new Date(), customer.timezone)})` : `Not set (dates shown in ${zoneOf(null)})` },
              { label: "Customer since", value: formatDate(customer.created_at, tz) },
            ]}
          />
          <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-ink-subtle">Customers edit these details themselves in their workspace. The team can&apos;t change them here.</p>
        </Panel>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <StatCard label="Properties" value={customer.property_count} />
          <StatCard label="Open requests" value={customer.open_request_count} href={`${adminRoutes.requests}?customer=${customer.id}&status=open`} tone="attention" />
          <StatCard label="All requests" value={customer.request_count} href={`${adminRoutes.requests}?customer=${customer.id}`} />
        </div>
      </div>

      <section aria-labelledby="customer-properties" className="space-y-3">
        <h2 id="customer-properties" className="text-label text-ink">
          Properties
        </h2>
        {properties.length === 0 ? (
          <EmptyState icon={Building2} title="No properties yet" body="This customer hasn't added a property to their workspace." compact />
        ) : (
          <PropertyTable rows={properties} timezone={tz} showOwner={false} />
        )}
      </section>

      <section aria-labelledby="customer-requests" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="customer-requests" className="text-label text-ink">
            Latest requests
          </h2>
          {requestTotal > requests.length ? (
            <Link href={`${adminRoutes.requests}?customer=${customer.id}`} className="text-sm font-medium text-brand hover:text-brand-strong">
              All {requestTotal} requests
            </Link>
          ) : null}
        </div>
        {requests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No requests yet" body="This customer hasn't submitted a service request." compact />
        ) : (
          <RequestTable rows={requests} timezone={tz} caption="This customer's requests" context="customer" />
        )}
      </section>

      <Panel
        title="Recent activity"
        labelledBy="customer-activity"
        action={
          <Link href={`${adminRoutes.activity}?customer=${customer.id}`} className="text-sm font-medium text-brand hover:text-brand-strong">
            Full history
          </Link>
        }
      >
        {activity.length === 0 ? <p className="text-sm text-ink-muted">No activity recorded yet.</p> : <AdminActivityList rows={activity} timezone={tz} teamNames={names} compact />}
      </Panel>
    </div>
  );
}
