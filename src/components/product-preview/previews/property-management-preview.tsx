import { KeyRound, MapPin, UserCheck, Wrench } from "lucide-react";
import { rentalPreview as d } from "@/data/previews";
import {
  FloatingCard,
  PreviewActivity,
  PreviewAvatar,
  PreviewDivider,
  PreviewHeader,
  PreviewMetric,
  PreviewRow,
  PreviewSection,
  PreviewStatus,
  PreviewTitle,
  ProductPreviewShell,
} from "..";

/**
 * Reference preview: rental management for a let property. The other previews
 * follow its structure — title bar, subject, key figures, one open item,
 * recent activity — with their own content.
 */
export function PropertyManagementPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: property management"
      summary={`Concept preview with sample data. ${d.property} in ${d.location} is ${d.status.toLowerCase()}, with an ${d.tenant.toLowerCase()}. Monthly rent ${d.rent}, ${d.rentStatus.toLowerCase()}. Next inspection ${d.nextInspection}. Open request: ${d.request.title}, assigned to a ${d.request.assignee.toLowerCase()} for ${d.request.when}. Recent activity: rent received, plumbing issue resolved, inspection scheduled. Property health ${d.health.score}, ${d.health.label.toLowerCase()}.`}
      floating={
        <>
          <FloatingCard className="bottom-[calc(100%-0.5rem)] -right-6 w-52">
            <p className="text-label flex items-center gap-1.5 text-good">
              <span className="size-1.5 rounded-full bg-good" />
              Rent received
            </p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink tabular-nums">{d.rent}</p>
            <p className="text-[0.6875rem] text-ink-subtle">September · {d.property}</p>
          </FloatingCard>
          <FloatingCard late className="top-[calc(100%-1rem)] -left-10 w-44">
            <p className="text-label text-ink-subtle">Property health</p>
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight text-ink tabular-nums">{d.health.score}</span>
              <PreviewStatus tone="attention">{d.health.label}</PreviewStatus>
            </p>
          </FloatingCard>
        </>
      }
    >
      <PreviewHeader icon={KeyRound} title="Property management" shortTitle="Rentals" />

      <PreviewSection>
        <PreviewTitle title={d.property} meta={d.detail} aside={<PreviewStatus tone="good" pill>{d.status}</PreviewStatus>} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <PreviewMetric label="Monthly rent" value={d.rent} size="lg" detail={<PreviewStatus tone="good">{d.rentStatus}</PreviewStatus>} />
          <PreviewMetric label="Next inspection" value={d.nextInspection} size="lg" detail="Scheduled" />
        </div>
        <div className="mt-2 divide-y divide-line-subtle">
          <PreviewRow icon={UserCheck} label="Tenant" value={d.tenant} />
          <PreviewRow icon={MapPin} label="Property" value={d.location} />
        </div>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection label="Open request" aside={<PreviewStatus tone="info" pill>Assigned</PreviewStatus>}>
        <div className="flex items-center gap-3">
          <PreviewAvatar icon={Wrench} />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-ink">{d.request.title}</p>
            <p className="text-xs text-ink-subtle">
              {d.request.assignee} · {d.request.when}
            </p>
          </div>
        </div>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection label="Recent activity">
        <PreviewActivity items={d.activity} />
      </PreviewSection>
    </ProductPreviewShell>
  );
}
