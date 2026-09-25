import { LayoutGrid } from "lucide-react";
import { serviceIcons } from "@/components/marketing/service-icons";
import { getService } from "@/config/services";
import { servicesOverviewPreview as d } from "@/data/previews";
import { cn } from "@/lib/utils/cn";
import { PreviewAction, PreviewDivider, PreviewHeader, PreviewSection, PreviewStatus, PreviewTitle, ProductPreviewShell } from "..";

/** Services: all five services as modules of one family office, each with its current state. */
export function ServicesOverviewPreview() {
  return (
    <ProductPreviewShell
      label="Concept preview: all services in one workspace"
      summary={`Concept preview with sample data: five services in one workspace for ${d.scope}. ${d.services
        .map((s) => `${getService(s.slug).name}: ${s.detail}, ${s.status.toLowerCase()}`)
        .join(". ")}. In total: 3 properties, 2 open requests and 1 approval.`}
    >
      <PreviewHeader icon={LayoutGrid} title="Services" />

      <PreviewSection>
        <PreviewTitle eyebrow={d.scope} title="Your services" />
        <ul className="animate-activity mt-4 divide-y divide-line-subtle rounded-control border border-line-subtle">
          {d.services.map((s) => {
            const Icon = serviceIcons[s.slug];
            return (
              <li key={s.slug} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[0.8125rem] font-medium text-ink">{getService(s.slug).name}</span>
                    <span className="sm:hidden">
                      <PreviewStatus tone={s.tone}>{s.status}</PreviewStatus>
                    </span>
                  </span>
                  <span className="block truncate text-[0.6875rem] text-ink-subtle">{s.detail}</span>
                </span>
                <span className="max-sm:hidden">
                  <PreviewStatus tone={s.tone} pulse={s.status === "Coordinating"}>
                    {s.status}
                  </PreviewStatus>
                </span>
                <span className="max-sm:hidden">
                  <PreviewAction />
                </span>
              </li>
            );
          })}
        </ul>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection>
        <div className="grid grid-cols-3 gap-2">
          {d.totals.map((t) => (
            <div key={t.label} className="rounded-control bg-canvas px-3 py-2.5">
              <p className={cn("text-xl leading-none font-semibold tracking-tight tabular-nums", t.attention ? "text-attention" : "text-ink")}>{t.value}</p>
              <p className="mt-1.5 text-[0.6875rem] leading-tight text-ink-subtle">{t.label}</p>
            </div>
          ))}
        </div>
      </PreviewSection>
    </ProductPreviewShell>
  );
}
