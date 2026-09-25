/**
 * FICTIONAL SAMPLE DATA for the page-hero product previews (see
 * src/components/product-preview). The same three sample properties as the
 * homepage — Chennai House, Chengalpattu Land, Coimbatore Apartment — so every
 * preview reads as another screen of one family office. No real customers,
 * people, addresses, documents or amounts. Each preview carries a DemoLabel.
 */
import type { PreviewActivityItem, PreviewStep, PreviewTone } from "@/components/product-preview/types";
import type { ServiceSlug } from "@/config/services";

/* Services overview: every service as a module of the same family office */
export const servicesOverviewPreview = {
  scope: "3 properties · Tamil Nadu",
  services: [
    { slug: "property-care", detail: "Chennai House · next visit 12 Oct", status: "Active", tone: "good" },
    { slug: "property-management", detail: "Coimbatore Apartment · rent received", status: "Active", tone: "good" },
    { slug: "property-transactions", detail: "Independent House · listing in preparation", status: "In progress", tone: "brand" },
    { slug: "document-assistance", detail: "12 documents · 1 renewal due", status: "Renewal due", tone: "attention" },
    { slug: "family-assistance", detail: "Parent support · today, 4:30 PM", status: "Coordinating", tone: "brand" },
  ] satisfies { slug: ServiceSlug; detail: string; status: string; tone: PreviewTone }[],
  totals: [
    { label: "Properties", value: "03" },
    { label: "Open requests", value: "02" },
    { label: "Approvals", value: "01", attention: true },
  ],
};

/* Property Management (reference preview) */
export const rentalPreview = {
  property: "Coimbatore Apartment",
  detail: "3 bedrooms",
  location: "Coimbatore, Tamil Nadu",
  status: "Occupied",
  tenant: "Active lease",
  rent: "₹32,000",
  rentStatus: "Received",
  nextInspection: "12 Oct",
  request: { title: "AC maintenance", assignee: "Verified local technician", when: "Thursday" },
  health: { score: 88, label: "Review" },
  activity: [
    { label: "Rent received", meta: "1 Sep", state: "done" },
    { label: "Plumbing issue resolved", meta: "Tue", state: "done" },
    { label: "Inspection scheduled", meta: "12 Oct", state: "pending" },
  ] satisfies PreviewActivityItem[],
};

/* Property Care */
export const healthPreview = {
  property: "Chennai House",
  score: 92,
  condition: "Good",
  areas: [
    { area: "Building", ok: true },
    { area: "Water", ok: true },
    { area: "Electricity", ok: true },
    { area: "Security", ok: true },
    { area: "Garden", ok: false },
  ],
  evidence: { photos: 18, videos: 1, recommendations: 1 },
  lastVisit: "18 Sep 2026",
  nextReview: "12 Oct 2026",
};

/* Property Transactions */
export const transactionPreview = {
  property: "Independent House",
  location: "Chennai",
  intent: "Selling",
  steps: [
    { label: "Documents", state: "done" },
    { label: "Professional review", state: "done" },
    { label: "Listing preparation", state: "current", meta: "In progress" },
    { label: "Enquiries", state: "upcoming" },
    { label: "Site visits", state: "upcoming" },
    { label: "Offer review", state: "upcoming" },
    { label: "Closing coordination", state: "upcoming" },
  ] satisfies PreviewStep[],
  documents: "8 / 8 ready",
  visibility: "Private",
  lastUpdate: "Today, 10:42",
  nextStep: "Enquiries",
};

/* Document Assistance */
export const documentPreview = {
  count: 12,
  lastUpdated: "24 Sep 2026",
  documents: [
    { name: "Property tax receipt", property: "Chennai House", date: "Apr 2026", status: "Current", tone: "good" },
    { name: "Rental agreement", property: "Coimbatore Apartment", date: "Renews 15 Oct", status: "Renewal due", tone: "attention" },
    { name: "Sale deed (copy)", property: "Chengalpattu Land", date: "Added Jan 2026", status: "Available", tone: "good" },
    { name: "Home insurance", property: "Chennai House", date: "Nov 2026", status: "Review due", tone: "info" },
  ] satisfies { name: string; property: string; date: string; status: string; tone: PreviewTone }[],
};

/* Family Assistance */
export const assistancePreview = {
  category: "Parent support",
  city: "Chennai",
  request: "Pharmacy pickup",
  status: "Coordinating",
  assignedTo: "Local assistance team",
  schedule: "Today · 4:30 PM",
  contact: "Family member",
  activity: [
    { label: "Request received", meta: "2:05 PM", state: "done" },
    { label: "Local team assigned", meta: "2:20 PM", state: "done" },
    { label: "Visit in progress", meta: "4:30 PM", state: "next" },
    { label: "Completion proof", state: "pending" },
  ] satisfies PreviewActivityItem[],
};

/* For NRIs: the whole family office */
export const familyOfficePreview = {
  region: "Tamil Nadu",
  stats: [
    { value: "03", label: "Properties" },
    { value: "02", label: "Open requests" },
    { value: "01", label: "Document renewal", attention: true },
  ],
  health: [
    { name: "Chennai House", score: 92, label: "Good", tone: "good" },
    { name: "Chengalpattu Land", score: 96, label: "Good", tone: "good" },
    { name: "Coimbatore Apartment", score: 88, label: "Review", tone: "attention" },
  ] satisfies { name: string; score: number; label: string; tone: PreviewTone }[],
  activity: [
    { label: "Property inspection", meta: "Mon", state: "done" },
    { label: "Maintenance completed", meta: "Tue", state: "done" },
    { label: "Document renewal", meta: "Due", state: "attention" },
  ] satisfies PreviewActivityItem[],
  upcoming: [
    { date: "12 Oct", label: "Property inspection" },
    { date: "15 Oct", label: "Rental agreement renewal" },
  ],
};

/* Trust: a complete service record */
export const evidencePreview = {
  service: "Garden maintenance",
  property: "Chennai House",
  record: [
    { key: "Who", value: "Local service partner" },
    { key: "What", value: "Garden maintenance completed" },
    { key: "When", value: "18 Sep 2026 · 11:24 AM" },
    { key: "Where", value: "Chennai House" },
    { key: "Proof", value: "18 photos · 1 video" },
    { key: "Cost", value: "₹8,500" },
  ],
  status: "Completed",
  approval: "Customer approved",
};

/* How it works: one request moving through the process */
export const workflowPreview = {
  request: "Property inspection",
  property: "Chennai House",
  stages: ["Request", "Assigned", "Inspected", "Report", "Approval", "Completed", "Proof", "Invoice"],
  currentStage: 3,
  steps: [
    { label: "Request received", meta: "09:42", state: "done" },
    { label: "Local team assigned", meta: "10:15", state: "done" },
    { label: "Property visited", meta: "11:40", state: "done" },
    { label: "Report being prepared", meta: "Now", state: "current" },
    { label: "Customer approval", state: "upcoming" },
    { label: "Work completed", state: "upcoming" },
  ] satisfies PreviewStep[],
};
