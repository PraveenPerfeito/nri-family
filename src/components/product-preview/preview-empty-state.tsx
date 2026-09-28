import type { LucideIcon } from "lucide-react";

/**
 * The placeholder for something that hasn't happened yet, e.g. "Photos appear
 * here after the visit". Shows where evidence will land without inventing it.
 */
export function PreviewEmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-dashed border-line-strong px-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-subtle">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-medium text-ink-muted">{title}</span>
        {body ? <span className="block text-[0.6875rem] text-ink-subtle">{body}</span> : null}
      </span>
    </div>
  );
}
