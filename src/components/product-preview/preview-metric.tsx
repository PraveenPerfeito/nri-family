import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { toneText, type PreviewTone } from "./types";

/** A labelled value on a muted tile, e.g. "Monthly rent / ₹32,000 / ✓ Received". */
export function PreviewMetric({
  label,
  value,
  detail,
  tone,
  size = "md",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  /** Colours the value. */
  tone?: PreviewTone;
  /** `lg` for the one headline figure of a screen. */
  size?: "md" | "lg";
}) {
  return (
    <div className="min-w-0 rounded-control bg-canvas px-3 py-2.5">
      <p className="text-[0.6875rem] leading-tight text-ink-subtle">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-semibold tracking-tight tabular-nums",
          size === "lg" ? "text-xl leading-none" : "text-sm",
          tone ? toneText[tone] : "text-ink",
        )}
      >
        {value}
      </p>
      {detail ? <div className="mt-1 truncate text-[0.6875rem] text-ink-subtle">{detail}</div> : null}
    </div>
  );
}
