import { CheckCircle2, ShieldCheck } from "lucide-react";
import { evidencePreview as d } from "@/data/previews";
import { PreviewDivider, PreviewHeader, PreviewSection, PreviewStatus, PreviewTitle, ProductPreviewShell } from "..";

/** Trust: a complete service record — who, what, when, where, proof and cost — for one job. */
export function TrustEvidencePreview() {
  return (
    <ProductPreviewShell
      label="Illustrative example: service evidence record"
      summary={`Illustrative service record with sample data for ${d.service.toLowerCase()} at ${d.property}. ${d.record
        .map((r) => `${r.key}: ${r.value}`)
        .join(". ")}. Status: ${d.status.toLowerCase()}. Approval: ${d.approval.toLowerCase()}.`}
    >
      <PreviewHeader icon={ShieldCheck} title="Service record" kind="illustrative" />

      <PreviewSection>
        <PreviewTitle eyebrow={d.property} title={d.service} aside={<PreviewStatus tone="good" pill>{d.status}</PreviewStatus>} />
        <dl className="mt-4 divide-y divide-line-subtle rounded-control border border-line-subtle">
          {d.record.map((r) => (
            <div key={r.key} className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 px-3 py-2.5">
              <dt className="text-label text-brand">{r.key}</dt>
              <dd className="text-[0.8125rem] font-medium text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection className="flex items-center justify-between gap-3 bg-canvas/60 py-3">
        <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink">
          <CheckCircle2 className="size-4 text-good" strokeWidth={2} />
          {d.approval}
        </span>
        <span className="text-[0.6875rem] text-ink-subtle">Complete record · 6 of 6</span>
      </PreviewSection>
    </ProductPreviewShell>
  );
}
