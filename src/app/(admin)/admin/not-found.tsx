import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";

/** A missing record inside the console (an unknown or malformed id). */
export default function AdminNotFound() {
  return (
    <EmptyState
      heading="h1"
      icon={SearchX}
      title="We couldn't find that record"
      body="It may never have existed, or the link may be incomplete."
      action={{ href: adminRoutes.dashboard, label: "Back to dashboard" }}
    />
  );
}
