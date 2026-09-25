import { AlertCircle, CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PreviewActivityItem } from "./types";

function StateIcon({ state }: { state: PreviewActivityItem["state"] }) {
  if (state === "done") return <CheckCircle2 className="size-4 shrink-0 text-good" strokeWidth={2} />;
  if (state === "attention") return <AlertCircle className="size-4 shrink-0 text-attention" strokeWidth={2} />;
  if (state === "next") return <CircleDot className="size-4 shrink-0 text-brand" strokeWidth={2} />;
  return <Circle className="size-4 shrink-0 text-ink-subtle/70" strokeWidth={1.75} />;
}

/** A short list of events. Each state has its own icon (done ✓, now ◉, to do ○, needs you !); rows fade in one by one. */
export function PreviewActivity({ items }: { items: PreviewActivityItem[] }) {
  return (
    <ul className="animate-activity space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2.5 text-[0.8125rem]">
          <span className="mt-px">
            <StateIcon state={item.state} />
          </span>
          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span className={cn(item.state === "pending" ? "text-ink-muted" : "text-ink", (item.state === "next" || item.state === "attention") && "font-medium")}>
              {item.label}
            </span>
            {item.meta ? <span className="shrink-0 text-[0.6875rem] text-ink-subtle tabular-nums">{item.meta}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
