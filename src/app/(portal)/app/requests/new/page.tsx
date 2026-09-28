import { RequestForm } from "@/components/portal/requests/request-form";
import { PageHeader } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";
import { createRequestAction } from "@/lib/portal/actions/requests";
import { listPropertyChoices } from "@/lib/portal/data";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Request a service" };

export default async function NewRequestPage(props: PageProps<"/app/requests/new">) {
  const viewer = await requireCustomer(portalRoutes.newRequest);
  const { property } = await props.searchParams;
  const properties = await listPropertyChoices(viewer);
  // Pre-select only a property this customer actually owns.
  const initialPropertyId = typeof property === "string" && properties.some((p) => p.id === property) ? property : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: portalRoutes.requests, label: "Service requests" }}
        eyebrow="New request"
        title="Request a service"
        description="Tell us what you need. Our team reviews every request, and nothing is charged without your approval."
      />
      <div className="rounded-card border border-line bg-surface p-5 sm:p-8">
        <RequestForm action={createRequestAction} properties={properties} initialPropertyId={initialPropertyId} />
      </div>
    </div>
  );
}
