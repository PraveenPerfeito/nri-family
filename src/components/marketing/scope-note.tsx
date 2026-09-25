import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Clear statement of what we do and do not do. Used for regulated areas. */
export function ScopeNote({ title = "Scope of our role", children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <aside className={cn("flex gap-4 rounded-card border border-info/15 bg-info-soft p-5 text-sm", className)} aria-label={title}>
      <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-1 leading-relaxed text-ink-muted">{children}</div>
      </div>
    </aside>
  );
}
