/**
 * FICTIONAL SAMPLE DATA for illustrative UI only.
 * No real customers, addresses, phone numbers, documents or financials.
 * Anything rendered from this file must carry a <DemoLabel />.
 */
import type { HealthStatus, PropertyKind, PropertyVisibility } from "@/types/domain";

export type DemoProperty = {
  id: string;
  name: string;
  city: string;
  kind: PropertyKind;
  status: HealthStatus;
  healthScore: number;
};

export const demoProperties: DemoProperty[] = [
  { id: "p1", name: "Chennai House", city: "Chennai", kind: "independent-house", status: "good", healthScore: 92 },
  { id: "p2", name: "Chengalpattu Land", city: "Chengalpattu", kind: "residential-land", status: "good", healthScore: 96 },
  { id: "p3", name: "Coimbatore Apartment", city: "Coimbatore", kind: "apartment", status: "attention", healthScore: 88 },
];

export type DemoActivity = { id: string; label: string; state: "done" | "pending" | "scheduled"; when: string };

export const heroActivity: DemoActivity[] = [
  { id: "a1", label: "Property inspection completed", state: "done", when: "Chennai House · 2 days ago" },
  { id: "a2", label: "Maintenance completed", state: "done", when: "Coimbatore Apartment · 5 days ago" },
  { id: "a3", label: "Approval required", state: "pending", when: "Garden maintenance quote" },
];

export const workspaceActivity: DemoActivity[] = [
  { id: "w1", label: "Chennai property inspection", state: "done", when: "Report and 18 photos shared" },
  { id: "w2", label: "Plumbing repair completed", state: "done", when: "Invoice attached" },
  { id: "w3", label: "Land inspection scheduled", state: "scheduled", when: "Chengalpattu Land" },
];

export const workspaceStats = [
  { label: "Properties", value: 3 },
  { label: "Open requests", value: 2 },
  { label: "Approval required", value: 1 },
];

export type ReportRow = { area: string; status: HealthStatus; note?: string };

export const demoInspectionReport = {
  property: "Chennai House",
  overall: "good" as HealthStatus,
  rows: [
    { area: "Building", status: "good" },
    { area: "Water", status: "good" },
    { area: "Electricity", status: "good" },
    { area: "Security", status: "good" },
    { area: "Garden", status: "attention", note: "Overgrown hedge along the east wall" },
  ] satisfies ReportRow[],
  photos: 18,
  videos: 1,
  recommendation: "Schedule garden maintenance",
};

export type DemoListing = {
  id: string;
  city: string;
  title: string;
  kind: PropertyKind;
  area: string;
  detail: string;
  intent: "Sale" | "Rent";
  visibility: PropertyVisibility;
};

export const demoListings: DemoListing[] = [
  {
    id: "l1",
    city: "Chennai",
    title: "Independent House",
    kind: "independent-house",
    area: "2,400 sq.ft",
    detail: "4 bedrooms",
    intent: "Sale",
    visibility: "verified-network",
  },
  {
    id: "l2",
    city: "Coimbatore",
    title: "Apartment",
    kind: "apartment",
    area: "1,350 sq.ft",
    detail: "3 bedrooms",
    intent: "Rent",
    visibility: "public",
  },
  {
    id: "l3",
    city: "Madurai",
    title: "Residential Plot",
    kind: "residential-land",
    area: "3,000 sq.ft",
    detail: "Approved layout",
    intent: "Sale",
    visibility: "verified-network",
  },
  {
    id: "l4",
    city: "Tiruchirappalli",
    title: "Agricultural Land",
    kind: "agricultural-land",
    area: "2.5 acres",
    detail: "Road access",
    intent: "Sale",
    visibility: "private",
  },
];
