import { AlertCircle, Camera, CheckCircle2, ClipboardCheck, Lightbulb, Video } from "lucide-react";
import { healthPreview as d } from "@/data/previews";
import { cn } from "@/lib/utils/cn";
import { FloatingCard, PreviewDivider, PreviewHeader, PreviewMetric, PreviewRow, PreviewSection, PreviewStatus, ProductPreviewShell } from "..";

function ScoreRing({ score }: { score: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex size-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-subtle)" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-ink tabular-nums">{score}</span>
    </span>
  );
}

/** Property Care: someone physically checked the property, and here is the evidence. */
export function PropertyCarePreview() {
  const { photos, videos, recommendations } = d.evidence;
  return (
    <ProductPreviewShell
      label="Illustrative example: property health"
      summary={`Illustrative property health report with sample data. ${d.property}: property health score ${d.score} out of 100, ${d.condition.toLowerCase()}. Building, water, electricity and security are good; the garden needs attention. Evidence: ${photos} photos, ${videos} video and ${recommendations} recommendation. Last visit ${d.lastVisit}; next review ${d.nextReview}.`}
      floating={
        <FloatingCard className="top-[calc(100%-1rem)] -left-12 w-60">
          <p className="text-label flex items-center gap-1.5 text-ink-subtle">
            <Camera className="size-3 text-brand" strokeWidth={2.25} />
            From the last visit
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex aspect-square items-center justify-center rounded-md border border-line-subtle bg-[linear-gradient(135deg,var(--color-subtle),var(--color-canvas))]">
                {i === 2 ? <span className="text-[0.6875rem] font-semibold text-ink-muted">+{photos - 2}</span> : <Camera className="size-3 text-ink-subtle/60" />}
              </span>
            ))}
          </div>
        </FloatingCard>
      }
    >
      <PreviewHeader icon={ClipboardCheck} title="Property health" kind="illustrative" />

      <PreviewSection>
        <div className="flex items-center gap-4">
          <ScoreRing score={d.score} />
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-ink">{d.property}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
              Property health score
              <PreviewStatus tone="good">{d.condition}</PreviewStatus>
            </p>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-line-subtle rounded-control border border-line-subtle">
          {d.areas.map(({ area, ok }) => (
            <li key={area} className={cn("flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]", !ok && "bg-attention-soft/50")}>
              <span className="text-label text-ink">{area}</span>
              <span className={cn("flex items-center gap-1.5 text-xs font-medium", ok ? "text-good" : "text-attention")}>
                {ok ? <CheckCircle2 className="size-3.5" strokeWidth={2} /> : <AlertCircle className="size-3.5" strokeWidth={2} />}
                {ok ? "Good" : "Attention"}
              </span>
            </li>
          ))}
        </ul>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection label="Evidence">
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
          <PreviewMetric label="Photos" value={<span className="flex items-center gap-1.5"><Camera className="size-3.5 text-ink-subtle" />{photos}</span>} />
          <PreviewMetric label="Video" value={<span className="flex items-center gap-1.5"><Video className="size-3.5 text-ink-subtle" />{videos}</span>} />
          <PreviewMetric label="Recommendation" value={<span className="flex items-center gap-1.5"><Lightbulb className="size-3.5 text-attention" />{recommendations}</span>} />
        </div>
        <div className="mt-2 divide-y divide-line-subtle">
          <PreviewRow label="Last visit" value={d.lastVisit} />
          <PreviewRow label="Next review" value={d.nextReview} />
        </div>
      </PreviewSection>
    </ProductPreviewShell>
  );
}
