import type { Availability } from "@/types/domain";

export const serviceRecordFlow = ["Request", "Assigned", "Inspected", "Approved", "Completed", "Proof", "Invoice"];

/**
 * What exists today versus what the platform is building towards.
 * Update this as capabilities launch — the site reads from it everywhere.
 */
export const roadmap: { label: string; short: string; availability: Availability }[] = [
  { label: "Property and land inspections", short: "Property inspections", availability: "available" },
  { label: "Maintenance and repair coordination", short: "Maintenance", availability: "available" },
  { label: "Rental and tenant coordination", short: "Rental coordination", availability: "available" },
  { label: "Sale, purchase and rental coordination", short: "Sale and purchase", availability: "available" },
  { label: "Document organisation and reminders", short: "Document assistance", availability: "available" },
  { label: "Family assistance coordination", short: "Family assistance", availability: "available" },
  { label: "Private online workspace", short: "Private workspace", availability: "coming" },
  { label: "Online approvals, reports and invoices", short: "Approvals and reports", availability: "coming" },
  { label: "Secure document vault", short: "Document vault", availability: "coming" },
  { label: "Listings with visibility controls", short: "Listing controls", availability: "coming" },
  { label: "Family member access with permissions", short: "Family permissions", availability: "coming" },
  { label: "Verified buyer and partner network", short: "Verified network", availability: "coming" },
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
