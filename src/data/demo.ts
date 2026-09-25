/**
 * FICTIONAL SAMPLE DATA for illustrative UI only.
 * No real customers, addresses, phone numbers, documents or financials.
 * Anything rendered from this file must carry a <DemoLabel />.
 */
import type { HealthStatus, PropertyKind, PropertyVisibility } from "@/types/domain";

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

/* ── UI V2 samples ─────────────────────────────────────────────────────────── */

export type SampleHealth = { id: string; name: string; status: HealthStatus; label: string; score: number };
export type SampleActivity = { id: string; label: string; detail: string; time: string; state: "done" | "pending" | "scheduled" };

/** Hero "command center": a concept preview of the private workspace. No personal name: a neutral demo greeting. */
export const commandCenter = {
  greeting: "Good morning",
  when: "Wednesday · 09:42 IST",
  stats: [
    { label: "Properties", value: 3, attention: false },
    { label: "Requests", value: 2, attention: false },
    { label: "Approval", value: 1, attention: true },
  ],
  health: [
    { id: "h1", name: "Chennai House", status: "good", label: "Good", score: 92 },
    { id: "h2", name: "Chengalpattu Land", status: "good", label: "Good", score: 96 },
    { id: "h3", name: "Coimbatore Apartment", status: "attention", label: "Review", score: 88 },
  ] satisfies SampleHealth[],
  /** Average property health over the last six months. */
  trend: [82, 85, 84, 88, 90, 92],
  activity: [
    { id: "a1", label: "Inspection completed", detail: "Chennai House · 18 photos", time: "09:40", state: "done" },
    { id: "a2", label: "Maintenance completed", detail: "Coimbatore Apartment", time: "Tue", state: "done" },
    { id: "a3", label: "Approval required", detail: "Garden maintenance · ₹8,500", time: "Now", state: "pending" },
  ] satisfies SampleActivity[],
  /** Approximate positions on a Tamil Nadu grid (percent of the mini map). */
  pins: [
    { name: "Chennai", x: 82, y: 20 },
    { name: "Chengalpattu", x: 72, y: 40 },
    { name: "Coimbatore", x: 18, y: 68 },
  ],
};

export const sampleApproval = {
  title: "Garden maintenance",
  property: "Chennai House",
  amount: "₹8,500",
  by: "Verified local gardener",
  lines: [
    { label: "Hedge trimming and clearing", amount: "₹6,000" },
    { label: "Green waste removal", amount: "₹2,500" },
  ],
};

/** Dashboard section: a fuller concept of the private workspace overview. */
export const workspaceOverview = {
  health: [
    { id: "h1", name: "Chennai House", status: "good", label: "Good", score: 92, detail: "Inspected today" },
    { id: "h2", name: "Chengalpattu Land", status: "good", label: "Good", score: 96, detail: "Boundary checked 14 Sep" },
    { id: "h3", name: "Coimbatore Apartment", status: "attention", label: "Review", score: 88, detail: "Tenant request open" },
  ] satisfies (SampleHealth & { detail: string })[],
  timeline: [
    { id: "t1", time: "09:40", label: "Chennai property inspection", detail: "Report and 18 photos shared", state: "done" },
    { id: "t2", time: "09:12", label: "Quote received", detail: "Garden maintenance · ₹8,500", state: "pending" },
    { id: "t3", time: "Yesterday", label: "Plumbing repair completed", detail: "Coimbatore Apartment · invoice attached", state: "done" },
    { id: "t4", time: "Mon", label: "Land inspection scheduled", detail: "Chengalpattu Land · 12 Oct", state: "scheduled" },
    { id: "t5", time: "1 Sep", label: "September rent received", detail: "Coimbatore Apartment", state: "done" },
  ] satisfies SampleActivity[],
  reports: [
    { id: "r1", label: "Inspection report", detail: "Chennai House · 18 photos, 1 video", when: "Today" },
    { id: "r2", label: "Repair invoice", detail: "Coimbatore Apartment · matches quote", when: "Tue" },
  ],
  upcoming: [
    { id: "u0", label: "Rent due", detail: "Coimbatore Apartment", when: "5 Oct" },
    { id: "u1", label: "Land inspection", detail: "Chengalpattu Land", when: "12 Oct" },
  ],
};

/** The six questions every service record answers (see TrustRecord on /trust). */
export type RecordQuestion = "Who" | "What" | "When" | "Where" | "Proof" | "Cost";

export type EvidenceStep = { time: string; title: string; detail: string; answers: RecordQuestion; state: "done" | "current" };

/** One sample service record, from request to invoice, in a single day. */
export const evidenceTimeline: EvidenceStep[] = [
  { time: "09:42", title: "Request received", detail: "Leak reported under the kitchen sink at Chennai House.", answers: "What", state: "done" },
  { time: "10:15", title: "Local team assigned", detail: "A verified plumber is scheduled. You see who is going, and when.", answers: "Who", state: "done" },
  { time: "11:40", title: "Property inspected", detail: "Cause found: a worn pipe joint. 18 photos taken on site.", answers: "Where", state: "done" },
  { time: "12:20", title: "Report and photos", detail: "Findings, photos and a quotation of ₹2,400.", answers: "Proof", state: "done" },
  { time: "13:05", title: "Approved by owner", detail: "You approve the quotation from abroad. Nothing starts before this.", answers: "Cost", state: "done" },
  { time: "16:10", title: "Work completed", detail: "Joint replaced and tested for leaks.", answers: "When", state: "done" },
  { time: "16:25", title: "Proof uploaded", detail: "Before-and-after photos and a short video.", answers: "Proof", state: "done" },
  { time: "16:30", title: "Invoice shared", detail: "Itemised, and matching the approved quotation.", answers: "Cost", state: "current" },
];

/** Great-circle distance to Chennai, rounded (computed from city coordinates). */
export const distancesToChennai = [
  { city: "Dubai", km: "2,900" },
  { city: "Singapore", km: "2,900" },
  { city: "London", km: "8,200" },
  { city: "Sydney", km: "9,100" },
  { city: "Toronto", km: "13,400" },
];
