import { CalendarClock, HeartHandshake, UserRound, Users } from "lucide-react";
import { assistancePreview as d } from "@/data/previews";
import { PreviewActivity, PreviewAvatar, PreviewDivider, PreviewHeader, PreviewRow, PreviewSection, PreviewStatus, PreviewTitle, ProductPreviewShell } from "..";

/** Family Assistance: trusted local help for family, coordinated from abroad (practical support, not healthcare). */
export function FamilyAssistancePreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: local assistance request"
      summary={`Concept preview with sample data. ${d.category} in ${d.city}: a ${d.request.toLowerCase()}, status ${d.status.toLowerCase()}, assigned to the ${d.assignedTo.toLowerCase()}, scheduled ${d.schedule}. Activity: request received, local team assigned, visit in progress, completion proof to follow. Updates also go to a ${d.contact.toLowerCase()}.`}
    >
      <PreviewHeader icon={HeartHandshake} title="Family assistance" />

      <PreviewSection>
        <PreviewTitle eyebrow={`${d.category} · ${d.city}`} title={d.request} aside={<PreviewStatus tone="brand" pill pulse>{d.status}</PreviewStatus>} />
        <div className="mt-4 flex items-center gap-3 rounded-control bg-canvas px-3 py-3">
          <PreviewAvatar icon={Users} tone="brand" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] text-ink-subtle">Assigned to</p>
            <p className="text-sm font-semibold tracking-tight text-ink">{d.assignedTo}</p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[0.6875rem] text-ink-subtle">
              <CalendarClock className="size-3" strokeWidth={2} />
              Schedule
            </p>
            <p className="text-sm font-semibold tracking-tight text-ink tabular-nums">{d.schedule}</p>
          </div>
        </div>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection label="Recent activity">
        <PreviewActivity items={d.activity} />
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection className="bg-canvas/60 py-1.5">
        <PreviewRow icon={UserRound} label="Contact" value={`${d.contact} · kept informed`} />
      </PreviewSection>
    </ProductPreviewShell>
  );
}
