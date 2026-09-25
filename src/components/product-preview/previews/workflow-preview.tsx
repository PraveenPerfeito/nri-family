import { ListChecks } from "lucide-react";
import { workflowPreview as d } from "@/data/previews";
import { FloatingCard, PreviewDivider, PreviewHeader, PreviewSection, PreviewStages, PreviewStatus, PreviewTimeline, PreviewTitle, ProductPreviewShell } from "..";

/** How it works: one request moving through the same stages the page describes. */
export function WorkflowPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: request workflow"
      summary={`Concept preview with sample data. A ${d.request.toLowerCase()} request for ${d.property}, at stage ${d.currentStage + 1} of ${d.stages.length}: ${d.stages[d.currentStage].toLowerCase()}. Request received at 09:42, local team assigned at 10:15, property visited at 11:40; the report is being prepared now. Still to come: customer approval and work completed.`}
      floating={
        <FloatingCard className="top-[calc(100%-1rem)] -right-8 w-60">
          <p className="text-label flex items-center gap-1.5 text-attention">
            <span className="size-1.5 rounded-full bg-attention-bright" />
            Your approval is next
          </p>
          <p className="mt-1.5 text-[0.6875rem] text-ink-subtle">Nothing proceeds before you approve.</p>
        </FloatingCard>
      }
    >
      <PreviewHeader icon={ListChecks} title="Your request" />

      <PreviewSection>
        <PreviewTitle eyebrow={d.property} title={d.request} aside={<PreviewStatus tone="brand" pill pulse>In progress</PreviewStatus>} />
        <div className="mt-4">
          <PreviewStages stages={d.stages} current={d.currentStage} />
        </div>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection>
        <PreviewTimeline steps={d.steps} />
      </PreviewSection>
    </ProductPreviewShell>
  );
}
