import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** A key–value line, e.g. "Property · Coimbatore, Tamil Nadu". Stack several inside a `divide-y` list. */
export function PreviewRow({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-[0.8125rem]">
      <span className="flex items-center gap-2 text-ink-subtle">
        {Icon ? <Icon className="size-3.5 shrink-0" strokeWidth={1.75} /> : null}
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium text-ink">{value}</span>
    </div>
  );
}
