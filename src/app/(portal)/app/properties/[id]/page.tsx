import { notFound } from "next/navigation";
import { ClipboardList, FileText, HeartPulse, Pencil, Plus, Trash2 } from "lucide-react";
import { ActivityFeed } from "@/components/portal/activity/activity-feed";
import { RequestList } from "@/components/portal/lists";
import { ConfirmAction } from "@/components/portal/ui/confirm-action";
import { DetailList, EmptyState, PageHeader, Panel, PropertyStatusBadge, SavedNotice } from "@/components/portal/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { deletePropertyAction } from "@/lib/portal/actions/properties";
import { getPropertyDetail } from "@/lib/portal/data";
import { labelOf, ownershipTypes, propertyTypes } from "@/lib/portal/domain";
import { formatDate } from "@/lib/portal/format";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Property" };

const savedMessages: Record<string, string> = {
  created: "Property added. You can now request a service for it.",
  updated: "Your changes have been saved.",
};

export default async function PropertyPage(props: PageProps<"/app/properties/[id]">) {
  const { id } = await props.params;
  const viewer = await requireCustomer(portalRoutes.property(id));
  const detail = await getPropertyDetail(viewer, id);
  if (!detail) notFound();
  const { saved } = await props.searchParams;
  const { property, requests, activity } = detail;
  const tz = viewer.profile.timezone;
  const district = property.district && property.district !== property.city ? property.district : null;
  const address = [property.address_line_1, property.address_line_2, property.city, district, property.state, property.postal_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: portalRoutes.properties, label: "Properties" }}
        eyebrow={labelOf(propertyTypes, property.property_type)}
        title={property.name}
        description={<PropertyStatusBadge status={property.status} />}
        actions={
          <>
            <ButtonLink href={portalRoutes.editProperty(property.id)} variant="secondary">
              <Pencil aria-hidden className="size-4" />
              Edit
            </ButtonLink>
            <ButtonLink href={`${portalRoutes.newRequest}?property=${property.id}`}>
              <Plus aria-hidden className="size-4" />
              Request a service
            </ButtonLink>
          </>
        }
      />
      <SavedNotice message={typeof saved === "string" ? savedMessages[saved] : undefined} />

      <Panel title="Overview" labelledBy="property-overview">
        <DetailList
          items={[
            { label: "Address", value: address || "—" },
            { label: "Type", value: labelOf(propertyTypes, property.property_type) },
            { label: "Ownership", value: labelOf(ownershipTypes, property.ownership_type, "Not given") },
            { label: "Notes for our team", value: property.notes ? <span className="font-normal whitespace-pre-line">{property.notes}</span> : "—" },
            { label: "Added", value: formatDate(property.created_at, tz) },
          ]}
        />
      </Panel>

      <Panel title="Service requests" labelledBy="property-requests" bodyClassName="p-0">
        {requests.length > 0 ? (
          <div className="[&>ul]:rounded-none [&>ul]:border-0">
            <RequestList requests={requests} timezone={tz} showProperty={false} />
          </div>
        ) : (
          <EmptyState
            compact
            icon={ClipboardList}
            title="No service requests for this property"
            body="Need an inspection, a repair or cleaning? Request it here and follow every step."
            action={{ href: `${portalRoutes.newRequest}?property=${property.id}`, label: "Request a service" }}
          />
        )}
      </Panel>

      <Panel title="Activity" labelledBy="property-activity">
        {activity.length > 0 ? <ActivityFeed entries={activity} timezone={tz} /> : <p className="text-sm text-ink-muted">No activity yet.</p>}
      </Panel>

      <section aria-labelledby="coming-title" className="rounded-card border border-dashed border-line-strong p-5">
        <h2 id="coming-title" className="text-label text-ink-subtle">
          Coming to the platform
        </h2>
        <ul className="mt-3 grid gap-3 text-sm text-ink-muted sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <HeartPulse aria-hidden className="size-4 text-ink-subtle" /> Property health from inspections
          </li>
          <li className="flex items-center gap-2">
            <ClipboardList aria-hidden className="size-4 text-ink-subtle" /> Inspection reports and photos
          </li>
          <li className="flex items-center gap-2">
            <FileText aria-hidden className="size-4 text-ink-subtle" /> Property documents
          </li>
        </ul>
      </section>

      {requests.length === 0 ? (
        <section aria-labelledby="remove-title" className="border-t border-line-subtle pt-6">
          <h2 id="remove-title" className="text-label text-ink">
            Remove property
          </h2>
          <p className="mt-2 mb-4 text-sm text-ink-muted">This property has no service requests, so it can be removed from your workspace.</p>
          <ConfirmAction
            action={deletePropertyAction.bind(null, property.id)}
            triggerLabel="Remove property"
            icon={<Trash2 aria-hidden className="size-4" />}
            title={`Remove ${property.name}?`}
            body="Its details will be deleted from your workspace. This can't be undone."
            confirmLabel="Remove property"
            pendingLabel="Removing…"
          />
        </section>
      ) : null}
    </div>
  );
}
