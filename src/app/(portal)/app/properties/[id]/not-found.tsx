import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";

/** Same answer for a missing property and someone else's, so existence is never revealed. */
export default function PropertyNotFound() {
  return (
    <EmptyState
      heading="h1"
      icon={Building2}
      title="Property not found"
      body="This property may have been removed or you may not have access to it."
      action={{ href: portalRoutes.properties, label: "Back to properties" }}
    />
  );
}
