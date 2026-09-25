import { LogoMark } from "@/components/layout/logo";
import { familyOfficePreview as d } from "@/data/previews";
import { cn } from "@/lib/utils/cn";
import { PreviewActivity, PreviewDivider, PreviewHeader, PreviewSection, PreviewStatus, ProductPreviewShell } from "..";

/** For NRIs: the whole family office at a glance — every property, request and renewal in one place. */
export function NriDashboardPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: my family office"
      summary={`Concept preview with sample data: a family office in ${d.region} with 3 properties, 2 open requests and 1 document renewal. Property health: ${d.health
        .map((p) => `${p.name} ${p.score}, ${p.label.toLowerCase()}`)
        .join("; ")}. Recent activity: property inspection, maintenance completed, document renewal due. Upcoming: ${d.upcoming.map((u) => `${u.label.toLowerCase()} on ${u.date}`).join(" and ")}.`}
    >
      <PreviewHeader mark={<LogoMark className="size-6 shrink-0 text-brand" />} title="My Family Office" meta={d.region} />

      <PreviewSection>
        <div className="animate-activity grid grid-cols-3 gap-2">
          {d.stats.map((s) => (
            <div key={s.label} className="rounded-control bg-canvas px-3 py-3">
              <p className={cn("text-2xl leading-none font-semibold tracking-tight tabular-nums", s.attention ? "text-attention" : "text-ink")}>{s.value}</p>
              <p className="mt-1.5 text-[0.6875rem] leading-tight text-ink-subtle">{s.label}</p>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection label="Property health">
        <ul className="space-y-3">
          {d.health.map((p) => (
            <li key={p.name}>
              <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
                <span className="truncate font-medium text-ink">{p.name}</span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <PreviewStatus tone={p.tone}>{p.label}</PreviewStatus>
                  <span className="w-6 text-right text-sm font-semibold text-ink tabular-nums">{p.score}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-subtle">
                <div className={cn("animate-progress h-full origin-left rounded-full", p.tone === "good" ? "bg-brand" : "bg-attention-bright")} style={{ width: `${p.score}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </PreviewSection>

      <PreviewDivider />
      <div className="grid sm:grid-cols-2">
        <PreviewSection label="Recent activity">
          <PreviewActivity items={d.activity} />
        </PreviewSection>
        <PreviewSection label="Upcoming" className="max-sm:border-t max-sm:border-line-subtle sm:border-l sm:border-line-subtle">
          <ul className="space-y-2.5">
            {d.upcoming.map((u) => (
              <li key={u.label} className="flex items-center gap-3 text-[0.8125rem]">
                <span className="w-12 shrink-0 rounded-md bg-subtle px-1.5 py-1 text-center text-[0.6875rem] font-semibold text-ink-muted tabular-nums">{u.date}</span>
                <span className="text-ink">{u.label}</span>
              </li>
            ))}
          </ul>
        </PreviewSection>
      </div>
    </ProductPreviewShell>
  );
}
