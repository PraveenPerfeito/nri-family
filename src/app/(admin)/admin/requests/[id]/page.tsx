import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminActivityList } from "@/components/admin/lists";
import { AdminTimeline } from "@/components/admin/requests/admin-timeline";
import { StatusForm } from "@/components/admin/requests/status-form";
import { AdminStatusBadge, Breadcrumbs } from "@/components/admin/ui";
import { DetailList, PageHeader, Panel, PropertyStatusBadge } from "@/components/portal/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { adminRoutes } from "@/config/routes";
import { getAdminRequest, teamNames } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { labelOf, ownershipTypes, propertyTypes, requestCategories } from "@/lib/portal/domain";
import { formatDateTime, formatTime, zoneOf } from "@/lib/portal/format";
import { countryName } from "@/lib/portal/places";
import { isUuid } from "@/lib/portal/validation";

export const metadata: Metadata = { title: "Request" };

export default async function AdminRequestPage(props: PageProps<"/admin/requests/[id]">) {
  const { id } = await props.params;
  const admin = await requireAdmin(isUuid(id) ? adminRoutes.request(id) : adminRoutes.requests);
  const [detail, names] = await Promise.all([getAdminRequest(admin, id), teamNames(admin)]);
  if (!detail) notFound();
  const { request, inbox, customer, property, otherProperties, events, activity } = detail;
  const tz = admin.profile.timezone;
  const customerName = customer?.full_name ?? inbox.customer_name;
  const address = property ? [property.address_line_1, property.address_line_2].filter(Boolean).join(", ") : "";

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: adminRoutes.dashboard },
            { label: "Requests", href: adminRoutes.requests },
            { label: request.request_number },
          ]}
        />
        <PageHeader
          eyebrow={request.request_number}
          title={request.title}
          description={`${labelOf(requestCategories, request.category)} · submitted ${formatDateTime(request.created_at, tz)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge status={request.status} />
              {request.priority === "URGENT" ? <Badge tone="attention">Urgent</Badge> : <Badge>Normal priority</Badge>}
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:items-start">
        <Panel title="Request details" labelledBy="details" className="lg:col-start-1 lg:row-start-1">
          <DetailList
            items={[
              { label: "Service", value: labelOf(requestCategories, request.category) },
              { label: "Priority", value: request.priority === "URGENT" ? "Urgent" : "Normal" },
              { label: "Submitted", value: formatDateTime(request.created_at, tz) },
              { label: "Last updated", value: formatDateTime(request.updated_at, tz) },
              {
                label: "Description",
                value: request.description ? <span className="font-normal whitespace-pre-line">{request.description}</span> : <span className="font-normal text-ink-subtle">No description</span>,
              },
            ]}
          />
        </Panel>

        <div className="space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Panel title="Status" labelledBy="status">
            <div className="mb-4 flex items-center gap-2 text-sm text-ink-muted">
              Now: <AdminStatusBadge status={request.status} />
            </div>
            <StatusForm requestId={request.id} current={request.status} hasAssignee={Boolean(inbox.assignee_id)} customerName={customerName} />
          </Panel>

          <Panel
            title="Customer"
            labelledBy="customer"
            action={
              <Link href={adminRoutes.customer(request.customer_id)} className="text-sm font-medium text-brand hover:text-brand-strong">
                Open
              </Link>
            }
          >
            {customer ? (
              <DetailList
                narrow
                items={[
                  { label: "Name", value: customer.full_name },
                  { label: "Email", value: customer.email ? <a href={`mailto:${customer.email}`} className="break-all text-brand hover:text-brand-strong">{customer.email}</a> : "Not given" },
                  { label: "Phone", value: customer.phone ? <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="text-brand hover:text-brand-strong">{customer.phone}</a> : "Not given" },
                  { label: "Lives in", value: customer.country ? countryName(customer.country) : "Not set" },
                  { label: "Local time", value: `${formatTime(new Date(), customer.timezone)} (${zoneOf(customer.timezone)})` },
                ]}
              />
            ) : (
              <p className="text-sm text-ink-muted">This customer&apos;s details are unavailable.</p>
            )}
            {otherProperties.length > 0 ? (
              <div className="mt-4 border-t border-line-subtle pt-3">
                <p className="text-xs font-medium text-ink-subtle">Their properties</p>
                <ul className="mt-1.5 space-y-1">
                  {otherProperties.map((p) => (
                    <li key={p.id} className="text-sm">
                      <Link href={adminRoutes.property(p.id)} className="text-ink hover:text-brand">
                        {p.name}
                      </Link>
                      <span className="text-ink-subtle"> · {p.city}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Property"
            labelledBy="property"
            action={
              property ? (
                <Link href={adminRoutes.property(property.id)} className="text-sm font-medium text-brand hover:text-brand-strong">
                  Open
                </Link>
              ) : undefined
            }
          >
            {property ? (
              <DetailList
                narrow
                items={[
                  { label: "Name", value: property.name },
                  { label: "Type", value: labelOf(propertyTypes, property.property_type) },
                  { label: "Address", value: address || "Not given" },
                  { label: "Area", value: [property.city, property.district, property.state, property.postal_code].filter(Boolean).join(", ") },
                  { label: "Ownership", value: labelOf(ownershipTypes, property.ownership_type, "Not given") },
                  { label: "Status", value: <PropertyStatusBadge status={property.status} /> },
                ]}
              />
            ) : (
              <p className="text-sm text-ink-muted">No property is linked to this request.</p>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <Panel title="Timeline" labelledBy="timeline">
            <AdminTimeline events={events} timezone={tz} />
          </Panel>

          <Panel title="Activity on this request" labelledBy="activity">
            {activity.length === 0 ? <p className="text-sm text-ink-muted">No activity recorded yet.</p> : <AdminActivityList rows={activity} timezone={tz} teamNames={names} compact />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
