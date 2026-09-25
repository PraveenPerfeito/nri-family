import { FileText, HeartHandshake, House, KeyRound, Scale } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ServiceSlug } from "@/config/services";

export const serviceIcons: Record<ServiceSlug, LucideIcon> = {
  "property-care": House,
  "property-management": KeyRound,
  "property-transactions": Scale,
  "document-assistance": FileText,
  "family-assistance": HeartHandshake,
};
