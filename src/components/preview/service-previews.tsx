import {
  Camera,
  ClipboardCheck,
  FileText,
  FolderLock,
  Handshake,
  HeartHandshake,
  KeyRound,
  Lightbulb,
  ListChecks,
  Lock,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { DemoLabel } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  FloatingCard,
  PreviewActivity,
  PreviewDivider,
  PreviewHeader,
  PreviewMetric,
  PreviewProgress,
  PreviewSection,
  PreviewStatus,
  PreviewTimeline,
  PreviewTitle,
  ProductPreviewShell,
} from "./preview";

/*
 * One concept preview per page hero. Together they show the same fictional
 * family office from different angles — the same properties as the homepage —
 * so each service reads as one part of a single platform.
 */

/* ── Property Care: property health ─────────────────────────────────────── */

const areas = [
  { area: "Building", good: true },
  { area: "Water", good: true },
  { area: "Electricity", good: true },
  { area: "Security", good: true },
  { area: "Garden", good: false },
];

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-subtle)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="text-sm font-semibold text-ink tabular-nums">{score}</span>
    </span>
  );
}

export function PropertyHealthPreview() {
  return (
    <ProductPreviewShell
      label="Illustrative example: property health report"
      summary="Example of the report you receive after an inspection, with sample data. Chennai House, inspected today at 11:40: overall condition 92 out of 100, good. Building, water, electricity and security are good; the garden needs attention. The latest inspection has 18 photos, 1 video and 1 recommendation: schedule garden maintenance."
      floating={
        <FloatingCard className="top-[calc(100%-1rem)] -left-12 w-60">
          <p className="text-label flex items-center gap-1.5 text-ink-subtle">
            <Camera className="size-3 text-brand" strokeWidth={2.25} />
            From today&apos;s visit
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex aspect-square items-center justify-center rounded-md border border-line-subtle bg-[linear-gradient(135deg,var(--color-subtle),var(--color-canvas))]">
                {i === 2 ? <span className="text-[0.6875rem] font-semibold text-ink-muted">+15</span> : <Camera className="size-3 text-ink-subtle/60" />}
              </span>
            ))}
          </div>
        </FloatingCard>
      }
    >
      <PreviewHeader icon={ClipboardCheck} title="Property health" kind="illustrative" />
      <PreviewSection>
        <PreviewTitle
          title="Chennai House"
          meta="Inspected today · 11:40"
          aside={
            <span className="flex items-center gap-3">
              <span className="text-right">
                <span className="block text-[0.6875rem] text-ink-subtle">Overall condition</span>
                <PreviewStatus tone="good">Good</PreviewStatus>
              </span>
              <ScoreRing score={92} />
            </span>
          }
        />
        <ul className="mt-4 grid grid-cols-2 gap-1.5">
          {areas.map(({ area, good }) => (
            <li key={area} className={cn("flex items-center justify-between rounded-md border px-2.5 py-2 text-xs", good ? "border-line-subtle" : "border-attention/25 bg-attention-soft/60", area === "Garden" && "col-span-2")}>
              <span className="font-medium text-ink">{area}</span>
              <PreviewStatus tone={good ? "good" : "attention"}>{good ? "Good" : "Attention"}</PreviewStatus>
            </li>
          ))}
        </ul>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection label="Latest inspection">
        <div className="grid grid-cols-3 gap-2">
          <PreviewMetric label="Photos" value={<span className="flex items-center gap-1.5"><Camera className="size-3.5 text-ink-subtle" />18</span>} />
          <PreviewMetric label="Video" value={<span className="flex items-center gap-1.5"><Video className="size-3.5 text-ink-subtle" />1</span>} />
          <PreviewMetric label="Recommendation" value={<span className="flex items-center gap-1.5"><Lightbulb className="size-3.5 text-attention" />1</span>} />
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-control bg-attention-soft px-3 py-2 text-xs text-ink">
          <Lightbulb className="mt-px size-3.5 shrink-0 text-attention" />
          <span>
            <span className="font-semibold">Recommendation:</span> Schedule garden maintenance
          </span>
        </p>
      </PreviewSection>
    </ProductPreviewShell>
  );
}

/* ── Property Management: rental management ─────────────────────────────── */

export function RentalPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: rental management"
      summary="Concept preview with sample data. Coimbatore Apartment is occupied with an active lease. Monthly rent of ₹32,000 received. Next inspection on 12 October 2026. Open request: AC maintenance, assigned to a verified local technician. Recent activity: September rent recorded, plumbing issue resolved, inspection scheduled. Property health 88, under review."
      floating={
        <>
          <FloatingCard className="bottom-[calc(100%-0.5rem)] -right-6 w-52">
            <p className="text-label flex items-center gap-1.5 text-good">
              <span className="size-1.5 rounded-full bg-good" />
              Rent received
            </p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink tabular-nums">₹32,000</p>
            <p className="text-[0.6875rem] text-ink-subtle">September · Coimbatore Apartment</p>
          </FloatingCard>
          <FloatingCard late className="top-[calc(100%-1rem)] -left-10 w-44">
            <p className="text-label text-ink-subtle">Property health</p>
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight text-ink tabular-nums">88</span>
              <PreviewStatus tone="attention">Review</PreviewStatus>
            </p>
          </FloatingCard>
        </>
      }
    >
      <PreviewHeader icon={KeyRound} title="Rental management" />
      <PreviewSection>
        <PreviewTitle title="Coimbatore Apartment" meta="3 bedrooms · Rented" aside={<PreviewStatus tone="good" pill>Occupied</PreviewStatus>} />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <PreviewMetric label="Tenant" value="Active lease" />
          <PreviewMetric label="Monthly rent" value="₹32,000" detail="✓ Received" />
          <PreviewMetric label="Next inspection" value="12 Oct" detail="2026" />
        </div>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection label="Open request" aside={<PreviewStatus tone="info" pill>Assigned</PreviewStatus>}>
        <p className="text-sm font-semibold tracking-tight text-ink">AC maintenance</p>
        <p className="mt-0.5 text-xs text-ink-subtle">Verified local technician · Visit Thursday</p>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection label="Recent activity">
        <PreviewActivity
          items={[
            { label: "September rent recorded", meta: "1 Sep", state: "done" },
            { label: "Plumbing issue resolved", meta: "Tue", state: "done" },
            { label: "Inspection scheduled", meta: "12 Oct", state: "pending" },
          ]}
        />
      </PreviewSection>
    </ProductPreviewShell>
  );
}

/* ── Property Transactions: transaction tracking ────────────────────────── */

const transactionSteps: { label: string; state: "done" | "current" | "upcoming" }[] = [
  { label: "Property details", state: "done" },
  { label: "Document collection", state: "done" },
  { label: "Professional review", state: "done" },
  { label: "Listing prepared", state: "done" },
  { label: "Enquiries", state: "current" },
  { label: "Site visits", state: "upcoming" },
  { label: "Transaction coordination", state: "upcoming" },
];

export function TransactionPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: transaction tracking"
      summary="Concept preview with sample data. Selling an independent residence in Chennai: 4 of 7 steps done — property details, document collection, professional review and listing prepared. Current step: enquiries. Still to come: site visits and transaction coordination. Visibility: verified network, controlled by the owner. 3 enquiries from verified buyers, received through the platform."
      floating={
        <FloatingCard className="top-[calc(100%-1rem)] -right-8 w-56">
          <p className="text-label text-ink-subtle">Enquiries</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink tabular-nums">3</p>
          <p className="text-[0.6875rem] text-ink-subtle">From verified buyers, through the platform</p>
        </FloatingCard>
      }
    >
      <PreviewHeader icon={Handshake} title="Transaction tracking" />
      <PreviewSection>
        <PreviewTitle title="Independent Residence" meta="Chennai · 2,400 sq.ft" aside={<span className="text-label rounded-full bg-night px-2.5 py-1 text-white">Selling</span>} />
        <div className="mt-4">
          <PreviewProgress value={4} max={7} label="Progress" detail="4 of 7 steps" />
        </div>
        <div className="mt-4">
          <PreviewTimeline steps={transactionSteps.map((s) => ({ ...s, meta: s.state === "current" ? "In progress" : undefined }))} />
        </div>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-subtle">Visibility</span>
          <span className="flex items-center gap-2">
            <span className="text-label inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-brand-strong">
              <Users className="size-3" strokeWidth={2.25} />
              Verified network
            </span>
          </span>
        </div>
        <p className="mt-1.5 text-right text-[0.6875rem] text-ink-subtle">Owner controlled</p>
      </PreviewSection>
    </ProductPreviewShell>
  );
}

/* ── Document Assistance: document workspace ────────────────────────────── */

const documents: { name: string; status: string; tone: "good" | "attention" | "info" }[] = [
  { name: "Sale deed (copy)", status: "Stored", tone: "good" },
  { name: "Property tax receipt", status: "Current", tone: "good" },
  { name: "Encumbrance certificate", status: "Review required", tone: "attention" },
  { name: "Home insurance", status: "Renews 18 Nov", tone: "info" },
];

export function DocumentsPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: document workspace"
      summary="Concept preview with sample data. Property documents for Chennai House: 12 documents. Sale deed copy stored; property tax receipt current; encumbrance certificate needs review; home insurance renews on 18 November. Upcoming: property tax due in 24 days. Access: private, the owner and authorised team only."
      floating={
        <FloatingCard className="bottom-[calc(100%-0.5rem)] -right-6 w-48">
          <p className="text-label text-ink-subtle">Upcoming</p>
          <p className="mt-1.5 text-sm font-semibold text-ink">Property tax</p>
          <p className="text-[0.6875rem] text-attention">Due in 24 days</p>
        </FloatingCard>
      }
    >
      <PreviewHeader icon={FolderLock} title="Document workspace" />
      <PreviewSection>
        <PreviewTitle eyebrow="Chennai House" title="Property documents" aside={<span className="rounded-md bg-subtle px-2 py-1 text-xs font-medium text-ink-muted tabular-nums">12 documents</span>} />
        <ul className="mt-4 divide-y divide-line-subtle rounded-control border border-line-subtle">
          {documents.map((d) => (
            <li key={d.name} className="flex items-center gap-3 px-3 py-2.5 text-[0.8125rem]">
              <FileText className="size-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{d.name}</span>
              <PreviewStatus tone={d.tone}>{d.status}</PreviewStatus>
            </li>
          ))}
        </ul>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection className="flex items-center justify-between gap-3">
        <span>
          <span className="text-label block text-ink-subtle">Access</span>
          <span className="mt-1 block text-xs text-ink-muted">Owner and authorised team</span>
        </span>
        <span className="text-label inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-ink">
          <Lock className="size-3 text-brand" strokeWidth={2.25} />
          Private
        </span>
      </PreviewSection>
    </ProductPreviewShell>
  );
}

/* ── Family Assistance: local assistance ────────────────────────────────── */

export function LocalAssistancePreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: local assistance"
      summary="Concept preview with sample data. Active request in Chennai: a home maintenance visit, scheduled for 28 September and assigned to a local coordinator. Activity: request received, coordinator assigned, visit on 28 September, then photos and a completion update."
    >
      <PreviewHeader icon={HeartHandshake} title="Local assistance" />
      <PreviewSection>
        <PreviewTitle eyebrow="Active request · Chennai" title="Home maintenance visit" aside={<PreviewStatus tone="info" pill>Scheduled</PreviewStatus>} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <PreviewMetric label="Date" value="28 Sep · 10:00" />
          <PreviewMetric label="Assigned" value="Local coordinator" />
        </div>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection label="Activity">
        <PreviewActivity
          items={[
            { label: "Request received", meta: "Today", state: "done" },
            { label: "Coordinator assigned", meta: "Today", state: "done" },
            { label: "Visit", meta: "28 Sep", state: "next" },
            { label: "Photos and completion update", state: "pending" },
          ]}
        />
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection className="flex items-center gap-3 bg-canvas/60">
        <Camera className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
        <p className="text-xs text-ink-muted">After the visit you receive photos and a short completion update.</p>
      </PreviewSection>
    </ProductPreviewShell>
  );
}

/* ── For NRIs: the whole family office ──────────────────────────────────── */

export function FamilyOfficePreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: my family office"
      summary="Concept preview with sample data: 3 properties, 2 open requests and 1 approval. Chennai House and Chengalpattu Land are in good condition; Coimbatore Apartment needs review. Recent activity: inspection completed, maintenance completed, approval required."
    >
      <div className="flex items-center justify-between gap-3 border-b border-line-subtle bg-canvas/60 px-4 py-3 sm:px-5">
        <span className="flex items-center gap-2.5">
          <LogoMark className="size-6 text-brand" />
          <span className="text-label text-ink">My Family Office</span>
        </span>
        <DemoLabel kind="concept" />
      </div>
      <PreviewSection>
        <div className="animate-activity grid grid-cols-3 gap-2">
          {[
            { value: "03", label: "Properties" },
            { value: "02", label: "Open requests" },
            { value: "01", label: "Approval", attention: true },
          ].map((s) => (
            <div key={s.label} className="rounded-control bg-canvas px-3 py-3">
              <p className={cn("text-2xl leading-none font-semibold tracking-tight tabular-nums", s.attention ? "text-attention" : "text-ink")}>{s.value}</p>
              <p className="mt-1.5 text-[0.6875rem] text-ink-subtle">{s.label}</p>
            </div>
          ))}
        </div>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection label="Properties">
        <ul className="divide-y divide-line-subtle">
          {[
            { name: "Chennai House", tone: "good" as const, label: "Good" },
            { name: "Chengalpattu Land", tone: "good" as const, label: "Good" },
            { name: "Coimbatore Apartment", tone: "attention" as const, label: "Review" },
          ].map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem] first:pt-0 last:pb-0">
              <span className="font-medium text-ink">{p.name}</span>
              <PreviewStatus tone={p.tone}>{p.label}</PreviewStatus>
            </li>
          ))}
        </ul>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection label="Recent activity">
        <PreviewActivity
          items={[
            { label: "Inspection completed", meta: "09:40", state: "done" },
            { label: "Maintenance completed", meta: "Tue", state: "done" },
            { label: "Approval required", meta: "Now", state: "attention" },
          ]}
        />
      </PreviewSection>
    </ProductPreviewShell>
  );
}

/* ── How it works: one request, step by step ────────────────────────────── */

export function RequestWorkflowPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: request workflow"
      summary="Concept preview with sample data. A property inspection request for Chennai House: requested at 09:42, assigned at 10:15, inspected at 11:40, report shared at 12:20. Current step: waiting for the owner's approval. Then: completed."
      floating={
        <FloatingCard className="top-[calc(100%-1rem)] -right-8 w-56">
          <p className="text-label flex items-center gap-1.5 text-attention">
            <span className="size-1.5 rounded-full bg-attention-bright" />
            Your approval
          </p>
          <p className="mt-1.5 text-sm font-semibold text-ink">Quote ready to review</p>
          <p className="text-[0.6875rem] text-ink-subtle">Nothing proceeds before this</p>
        </FloatingCard>
      }
    >
      <PreviewHeader icon={ListChecks} title="Your request" />
      <PreviewSection>
        <PreviewTitle eyebrow="Chennai House" title="Property inspection" aside={<PreviewStatus tone="brand" pill>In progress</PreviewStatus>} />
        <div className="mt-5">
          <PreviewTimeline
            steps={[
              { label: "Requested", meta: "09:42", state: "done" },
              { label: "Assigned", meta: "10:15", state: "done" },
              { label: "Inspected", meta: "11:40", state: "done" },
              { label: "Report shared", meta: "12:20", state: "done" },
              { label: "Approval", meta: "Now", state: "current" },
              { label: "Completed", state: "upcoming" },
            ]}
          />
        </div>
      </PreviewSection>
    </ProductPreviewShell>
  );
}

/* ── Trust: a complete service record ───────────────────────────────────── */

const record = [
  { key: "Who", value: "Local coordinator" },
  { key: "What", value: "Property inspection" },
  { key: "When", value: "25 Sep · 11:40" },
  { key: "Where", value: "Chennai" },
  { key: "Proof", value: "18 photos · 1 video" },
  { key: "Cost", value: "Approved by owner" },
];

export function ServiceRecordPreview() {
  return (
    <ProductPreviewShell
      label="Illustrative example: service record"
      summary="Illustrative service record with sample data. Who: a local coordinator. What: a property inspection. When: 25 September at 11:40. Where: Chennai. Proof: 18 photos and 1 video. Cost: approved by the owner. The record is complete."
    >
      <PreviewHeader icon={ShieldCheck} title="Service record" kind="illustrative" />
      <PreviewSection>
        <PreviewTitle eyebrow="Chennai House" title="Property inspection" aside={<PreviewStatus tone="good" pill>Closed</PreviewStatus>} />
        <dl className="mt-4 divide-y divide-line-subtle rounded-control border border-line-subtle">
          {record.map((r) => (
            <div key={r.key} className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 px-3 py-2.5">
              <dt className="text-label text-brand">{r.key}</dt>
              <dd className="text-[0.8125rem] font-medium text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      </PreviewSection>
      <PreviewDivider />
      <PreviewSection className="flex items-center justify-between gap-3 bg-canvas/60">
        <PreviewStatus tone="good">Complete record</PreviewStatus>
        <span className="text-[0.6875rem] text-ink-subtle">6 of 6 answered</span>
      </PreviewSection>
    </ProductPreviewShell>
  );
}
