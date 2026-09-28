import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";

export default function PortalNotFound() {
  return (
    <EmptyState
      heading="h1"
      icon={SearchX}
      title="We couldn't find that page"
      body="It may have moved, or you may not have access to it."
      action={{ href: portalRoutes.dashboard, label: "Back to dashboard" }}
    />
  );
}
