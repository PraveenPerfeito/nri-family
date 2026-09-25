import { Camera, ClipboardCheck, Lightbulb, Video } from "lucide-react";
import { DemoLabel, StatusBadge } from "@/components/ui/badge";
import { demoInspectionReport as report } from "@/data/demo";

/** Example property health report — clearly marked as a demo. */
export function InspectionReport() {
  return (
    <figure aria-labelledby="report-caption" className="min-w-0">
      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas px-5 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-ink uppercase">
            <ClipboardCheck aria-hidden className="size-4 text-brand" />
            Property health report
          </p>
          <DemoLabel>Example report</DemoLabel>
        </div>

        <div className="p-5 sm:p-6">
          <dl className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <dt className="text-xs text-ink-subtle">Property</dt>
              <dd className="mt-0.5 text-lg font-semibold text-ink">{report.property}</dd>
            </div>
            <div className="text-right">
              <dt className="text-xs text-ink-subtle">Overall</dt>
              <dd className="mt-1">
                <StatusBadge status={report.overall} size="md" />
              </dd>
            </div>
          </dl>

          <table className="mt-6 w-full text-sm">
            <caption className="sr-only">Condition by area</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-subtle">
                <th scope="col" className="pb-2 font-medium">
                  Area
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Condition
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.area} className="border-b border-line last:border-0">
                  <th scope="row" className="py-3 text-left font-medium text-ink">
                    {row.area}
                    {row.note ? <span className="block text-xs font-normal text-ink-subtle">{row.note}</span> : null}
                  </th>
                  <td className="py-3 text-right">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-control bg-subtle px-3 py-2.5 text-sm text-ink">
              <Camera aria-hidden className="size-4 text-ink-subtle" />
              <span>
                <span className="font-semibold tabular-nums">{report.photos}</span> photos
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-control bg-subtle px-3 py-2.5 text-sm text-ink">
              <Video aria-hidden className="size-4 text-ink-subtle" />
              <span>
                <span className="font-semibold tabular-nums">{report.videos}</span> video
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-control border border-attention/20 bg-attention-soft px-4 py-3 text-sm">
            <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-attention" />
            <p>
              <span className="font-semibold text-ink">Recommendation: </span>
              <span className="text-ink-muted">{report.recommendation}</span>
            </p>
          </div>
        </div>
      </div>
      <figcaption id="report-caption" className="mt-3 text-center text-xs text-ink-subtle">
        Example of the report you receive after an inspection. Sample property and findings.
      </figcaption>
    </figure>
  );
}
