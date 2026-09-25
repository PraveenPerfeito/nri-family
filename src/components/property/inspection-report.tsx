import { Camera, ClipboardCheck, Lightbulb, Video } from "lucide-react";
import { DemoLabel, StatusBadge } from "@/components/ui/badge";
import { demoInspectionReport as report } from "@/data/demo";

/** Overall condition score as a quiet ring. */
function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-subtle)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
      />
    </svg>
  );
}

/** Sample property health report — a polished report interface, clearly marked as illustrative. */
export function InspectionReport() {
  const score = 92;
  return (
    <figure aria-labelledby="report-caption" className="min-w-0">
      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-canvas/60 px-5 py-4">
          <p className="text-label flex items-center gap-2 text-ink">
            <ClipboardCheck aria-hidden className="size-4 text-brand" />
            Property health report
          </p>
          <DemoLabel>Sample report · Illustrative data</DemoLabel>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-ink-subtle">Property</p>
              <p className="mt-0.5 text-lg font-semibold tracking-tight text-ink">{report.property}</p>
              <p className="mt-0.5 text-xs text-ink-subtle">Inspected Mon 11:40 · Chennai</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ScoreRing score={score} />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink tabular-nums">{score}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-subtle">Overall condition</p>
                <p className="mt-0.5">
                  <StatusBadge status={report.overall} size="md" />
                </p>
                <p className="sr-only">
                  Score {score} out of 100
                </p>
              </div>
            </div>
          </div>

          <table className="mt-6 w-full text-sm">
            <caption className="sr-only">Condition by area</caption>
            <thead>
              <tr className="text-left text-xs text-ink-subtle">
                <th scope="col" className="pb-2 font-medium">
                  Area
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Condition
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle border-y border-line-subtle">
              {report.rows.map((row) => (
                <tr key={row.area}>
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

          <div className="mt-5 flex items-center gap-2" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="flex aspect-[4/3] flex-1 items-center justify-center rounded-md border border-line-subtle bg-[linear-gradient(135deg,var(--color-subtle),var(--color-canvas))]">
                {i === 4 ? <span className="text-xs font-semibold text-ink-muted">+13</span> : <Camera className="size-3.5 text-ink-subtle/60" />}
              </span>
            ))}
          </div>

          <ul className="mt-4 grid grid-cols-[1fr_1fr_1.4fr] gap-2">
            {[
              { icon: Camera, value: report.photos, label: "Photos" },
              { icon: Video, value: report.videos, label: "Video" },
              { icon: Lightbulb, value: 1, label: "Recommendation" },
            ].map(({ icon: Icon, value, label }) => (
              <li key={label} className="flex min-w-0 flex-col rounded-md bg-subtle/70 px-2.5 py-2.5 sm:px-3">
                <span className="flex items-center gap-1.5 text-lg leading-tight font-semibold text-ink tabular-nums">
                  <Icon aria-hidden className="size-3.5 text-ink-subtle" />
                  {value}
                </span>{" "}
                <span className="truncate text-[0.6875rem] text-ink-muted sm:text-xs">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-start gap-3 rounded-card border border-attention/20 bg-attention-soft px-4 py-3 text-sm">
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
