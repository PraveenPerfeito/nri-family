import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { toneDot, toneText, type PreviewTone } from "./types";

/**
 * A status: a dot plus a word (never colour alone). `pill` adds a hairline
 * capsule; `pulse` gives the dot three slow pulses for a live status.
 */
export function PreviewStatus({ tone, children, pill, pulse }: { tone: PreviewTone; children: ReactNode; pill?: boolean; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        toneText[tone],
        pill && "rounded-full border border-current/20 bg-surface px-2 py-0.5",
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone], pulse && "animate-pulse-soft")} />
      {children}
    </span>
  );
}
