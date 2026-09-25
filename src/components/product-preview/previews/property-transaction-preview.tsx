import { FileCheck2, Handshake, Lock } from "lucide-react";
import { transactionPreview as d } from "@/data/previews";
import { PreviewDivider, PreviewHeader, PreviewMetric, PreviewProgress, PreviewSection, PreviewTimeline, PreviewTitle, ProductPreviewShell } from "..";

/** Property Transactions: the owner stays in control while the local steps are coordinated. */
export function PropertyTransactionPreview() {
  const done = d.steps.filter((s) => s.state === "done").length;
  return (
    <ProductPreviewShell
      label="Concept preview: property transaction tracker"
      summary={`Concept preview with sample data. ${d.intent} an ${d.property.toLowerCase()} in ${d.location}: ${done} of ${d.steps.length} steps done — documents and professional review. Current step: listing preparation. Still to come: enquiries, site visits, offer review and closing coordination. Documents ${d.documents}. Visibility: ${d.visibility.toLowerCase()}. Last update ${d.lastUpdate}. Next step: ${d.nextStep.toLowerCase()}.`}
    >
      <PreviewHeader icon={Handshake} title="Property transaction" shortTitle="Transaction" />

      <PreviewSection>
        <PreviewTitle title={d.property} meta={d.location} aside={<span className="text-label rounded-full bg-night px-2.5 py-1 text-white">{d.intent}</span>} />
        <div className="mt-4">
          <PreviewProgress value={done} max={d.steps.length} label="Progress" detail={`${done} of ${d.steps.length} steps`} />
        </div>
        <div className="mt-4">
          <PreviewTimeline steps={d.steps} />
        </div>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection>
        <div className="grid grid-cols-2 gap-2">
          <PreviewMetric label="Documents" value={<span className="flex items-center gap-1.5"><FileCheck2 className="size-3.5 text-good" />{d.documents}</span>} />
          <PreviewMetric label="Visibility" value={<span className="flex items-center gap-1.5"><Lock className="size-3.5 text-brand" />{d.visibility}</span>} detail="Owner controlled" />
          <PreviewMetric label="Last update" value={d.lastUpdate} />
          <PreviewMetric label="Next step" value={d.nextStep} tone="brand" />
        </div>
      </PreviewSection>
    </ProductPreviewShell>
  );
}
