import type { Availability } from "@/types/domain";

export const howItWorksSteps = [
  { title: "Create your account", body: "Tell us about yourself and what you need help with." },
  { title: "Add your property or request", body: "Securely share the relevant details — a property, a plot of land, or a task." },
  { title: "We coordinate locally", body: "Our operations team assigns the right person or partner for the job." },
  { title: "You approve when needed", body: "Quotations and important actions come to you for approval before anything proceeds." },
  { title: "Receive proof and updates", body: "Photos, videos, reports and invoices are shared with you, and will live in your private workspace." },
];

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
