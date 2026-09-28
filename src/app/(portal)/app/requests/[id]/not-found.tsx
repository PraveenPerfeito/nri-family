import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";

/** Same answer for a missing request and someone else's, so existence is never revealed. */
export default function RequestNotFound() {
  return (
    <EmptyState
      heading="h1"
      icon={ClipboardList}
      title="Request not found"
      body="This request may have been removed or you may not have access to it."
      action={{ href: portalRoutes.requests, label: "Back to requests" }}
    />
  );
}
