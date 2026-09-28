import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/portal/properties/property-form";
import { PageHeader } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";
import { updatePropertyAction } from "@/lib/portal/actions/properties";
import { getProperty } from "@/lib/portal/data";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Edit property" };

export default async function EditPropertyPage(props: PageProps<"/app/properties/[id]/edit">) {
  const { id } = await props.params;
  const viewer = await requireCustomer(portalRoutes.editProperty(id));
  const property = await getProperty(viewer, id);
  if (!property) notFound();

  return (
    <div className="space-y-8">
      <PageHeader back={{ href: portalRoutes.property(property.id), label: property.name }} title="Edit property" />
      <div className="rounded-card border border-line bg-surface p-5 sm:p-8">
        <PropertyForm
          action={updatePropertyAction.bind(null, property.id)}
          property={property}
          submitLabel="Save changes"
          cancelHref={portalRoutes.property(property.id)}
        />
      </div>
    </div>
  );
}
