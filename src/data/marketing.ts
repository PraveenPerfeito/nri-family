import type { Availability } from "@/types/domain";

export const serviceRecordFlow = ["Request", "Assigned", "Inspected", "Approved", "Completed", "Proof", "Invoice"];

/**
 * What exists today versus what the platform is building towards.
 * Update this as capabilities launch — the site reads from it everywhere.
 */
export const roadmap: { label: string; availability: Availability }[] = [
  { label: "Property and land inspections", availability: "available" },
  { label: "Maintenance and repair coordination", availability: "available" },
  { label: "Rental and tenant coordination", availability: "available" },
  { label: "Sale, purchase and rental coordination", availability: "available" },
  { label: "Document organisation and reminders", availability: "available" },
  { label: "Family assistance coordination", availability: "available" },
  { label: "Private online workspace", availability: "coming" },
  { label: "Online approvals, reports and invoices", availability: "coming" },
  { label: "Secure document vault", availability: "coming" },
  { label: "Listings with visibility controls", availability: "coming" },
  { label: "Family member access with permissions", availability: "coming" },
  { label: "Verified buyer and partner network", availability: "coming" },
];

/** Home "How it works" journey (UI V2): six stages, each with a small visual. */
export const journeyStages = [
  { key: "account", title: "Create your account", body: "Tell us about yourself and what you need help with." },
  { key: "property", title: "Add your property", body: "Add your property or request, and securely share the relevant details." },
  { key: "request", title: "Request a service", body: "An inspection, a repair, a document task or help for family." },
  { key: "local", title: "Local execution", body: "We coordinate locally: our operations team assigns the right person or partner." },
  { key: "approval", title: "Approval", body: "You approve when needed. Quotes and important actions come to you first." },
  { key: "proof", title: "Proof and report", body: "Receive proof and updates: photos, videos, reports and invoices." },
] as const;
