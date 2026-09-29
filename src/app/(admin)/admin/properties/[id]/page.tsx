import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminActivityList, RequestTable } from "@/components/admin/lists";
import { Breadcrumbs } from "@/components/admin/ui";
import { DetailList, EmptyState, PageHeader, Panel, PropertyStatusBadge } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { getAdminProperty, teamNames } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { labelOf, ownershipTypes, propertyTypes } from "@/lib/portal/domain";
import { formatDate } from "@/lib/portal/format";
import { countryName } from "@/lib/portal/places";
import { isUuid } from "@/lib/portal/validation";

export const metadata: Metadata = { title: "Property" };

export default async function AdminPropertyPage(props: PageProps<"/admin/properties/[id]">) {
  const { id } = await props.params;
  const admin = await requireAdmin(isUuid(id) ? adminRoutes.property(id) : adminRoutes.properties);
  const [detail, names] = await Promise.all([getAdminProperty(admin, id), teamNames(admin)]);
  if (!detail) notFound();
  const { property, overview, owner, requests, requestTotal, activity } = detail;
  const tz = admin.profile.timezone;
  const address = [property.address_line_1, property.address_line_2].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: adminRoutes.dashboard },
            { label: "Properties", href: adminRoutes.properties },
            { label: property.name },
          ]}
        />
        <PageHeader
          eyebrow={labelOf(propertyTypes, property.property_type)}
          title={property.name}
          description={[property.city, property.district, property.state].filter(Boolean).join(", ")}
          actions={<PropertyStatusBadge status={property.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Property details" labelledBy="property-details">
          <DetailList
            items={[
              { label: "Type", value: labelOf(propertyTypes, property.property_type) },
              { label: "Address", value: address || "Not given" },
              { label: "City", value: property.city },
              { label: "District", value: property.district ?? "Not given" },
              { label: "State", value: property.state },
              { label: "PIN code", value: property.postal_code ?? "Not given" },
              { label: "Country", value: property.country },
              { label: "Ownership", value: labelOf(ownershipTypes, property.ownership_type, "Not given") },
              { label: "Added", value: formatDate(property.created_at, tz) },
              { label: "Last updated", value: formatDate(property.updated_at, tz) },
              { label: "Owner's notes", value: property.notes ? <span className="font-normal whitespace-pre-line">{property.notes}</span> : <span className="font-normal text-ink-subtle">None</span> },
            ]}
          />
          <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-ink-subtle">The owner manages these details in their workspace. Ownership can&apos;t be changed here.</p>
        </Panel>

        <Panel
          title="Owner"
          labelledBy="owner"
          action={
            <Link href={adminRoutes.customer(property.owner_id)} className="text-sm font-medium text-brand hover:text-brand-strong">
              Open
            </Link>
          }
        >
          {owner ? (
            <DetailList
              narrow
              items={[
                { label: "Name", value: owner.full_name },
                { label: "Email", value: owner.email ? <a href={`mailto:${owner.email}`} className="break-all text-brand hover:text-brand-strong">{owner.email}</a> : "Not given" },
                { label: "Phone", value: owner.phone ? <a href={`tel:${owner.phone.replace(/[^\d+]/g, "")}`} className="text-brand hover:text-brand-strong">{owner.phone}</a> : "Not given" },
                { label: "Lives in", value: owner.country ? countryName(owner.country) : "Not set" },
              ]}
            />
          ) : (
            <p className="text-sm text-ink-muted">{overview.owner_name}</p>
          )}
        </Panel>
      </div>

      <section aria-labelledby="property-requests" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="property-requests" className="text-label text-ink">
            Requests for this property
          </h2>
          {requestTotal > requests.length ? (
            <Link href={`${adminRoutes.requests}?property=${property.id}`} className="text-sm font-medium text-brand hover:text-brand-strong">
              All {requestTotal} requests
            </Link>
          ) : null}
        </div>
        {requests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No requests yet" body="No service requests have been made for this property." compact />
        ) : (
          <RequestTable rows={requests} timezone={tz} caption="Requests for this property" context="property" />
        )}
      </section>

      <Panel title="Recent activity" labelledBy="property-activity">
        {activity.length === 0 ? <p className="text-sm text-ink-muted">No activity recorded yet.</p> : <AdminActivityList rows={activity} timezone={tz} teamNames={names} compact />}
      </Panel>
    </div>
  );
}
