import { Building2, Plus } from "lucide-react";
import { PropertyList } from "@/components/portal/lists";
import { EmptyState, PageHeader, SavedNotice } from "@/components/portal/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { listProperties } from "@/lib/portal/data";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Properties" };

export default async function PropertiesPage(props: PageProps<"/app/properties">) {
  const viewer = await requireCustomer(portalRoutes.properties);
  const { saved } = await props.searchParams;
  const properties = await listProperties(viewer);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Properties"
        title="Your properties"
        description="Everything you own in Tamil Nadu that you'd like us to look after. Only you and the team members handling your requests can see these details."
        actions={
          properties.length > 0 ? (
            <ButtonLink href={portalRoutes.newProperty}>
              <Plus aria-hidden className="size-4" />
              Add property
            </ButtonLink>
          ) : null
        }
      />
      <SavedNotice message={saved === "deleted" ? "The property has been removed." : undefined} />
      {properties.length > 0 ? (
        <PropertyList properties={properties} timezone={viewer.profile.timezone} />
      ) : (
        <EmptyState
          icon={Building2}
          title="You haven't added a property yet"
          body="Add your first property to start managing your Tamil Nadu assets."
          action={{ href: portalRoutes.newProperty, label: "Add property" }}
        />
      )}
    </div>
  );
}
