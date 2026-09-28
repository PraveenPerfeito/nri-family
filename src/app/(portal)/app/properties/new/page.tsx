import { PropertyForm } from "@/components/portal/properties/property-form";
import { PageHeader } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";
import { createPropertyAction } from "@/lib/portal/actions/properties";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Add a property" };

export default async function NewPropertyPage() {
  await requireCustomer(portalRoutes.newProperty);
  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: portalRoutes.properties, label: "Properties" }}
        title="Add a property"
        description="Only the name, type and city are needed now. You can add the rest later."
      />
      <div className="rounded-card border border-line bg-surface p-5 sm:p-8">
        <PropertyForm action={createPropertyAction} submitLabel="Add property" cancelHref={portalRoutes.properties} />
      </div>
    </div>
  );
}
