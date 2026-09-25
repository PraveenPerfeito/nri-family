import type { ReactNode } from "react";
import type { Availability, HealthStatus } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

type BadgeTone = "neutral" | "brand" | "good" | "attention" | "info" | "night";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-subtle text-ink-muted border-line",
  brand: "bg-brand-soft text-brand-strong border-brand-muted/60",
  good: "bg-good-soft text-good border-good/15",
  attention: "bg-attention-soft text-attention border-attention/20",
  info: "bg-info-soft text-info border-info/15",
  night: "bg-night-raised text-night-muted border-night-line",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const healthLabel: Record<HealthStatus, string> = {
  good: "Good",
  attention: "Attention",
  "action-required": "Action required",
};

const healthDot: Record<HealthStatus, { light: string; night: string }> = {
  good: { light: "bg-good", night: "bg-good-bright" },
  attention: { light: "bg-attention", night: "bg-attention-bright" },
  "action-required": { light: "bg-attention", night: "bg-attention-bright" },
};

/** Status is never conveyed by colour alone — the label is always present. */
export function StatusBadge({
  status,
  tone = "light",
  size = "sm",
  className,
}: {
  status: HealthStatus;
  tone?: "light" | "night";
  size?: "sm" | "md";
  className?: string;
}) {
  const night = tone === "night";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        size === "md" ? "text-sm" : "text-xs",
        night ? "text-night-text" : status === "good" ? "text-good" : "text-attention",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", healthDot[status][night ? "night" : "light"])} />
      {healthLabel[status]}
    </span>
  );
}

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return availability === "available" ? (
    <Badge tone="good">Available now</Badge>
  ) : (
    <Badge tone="info">Coming to the platform</Badge>
  );
}

/** Marks illustrative UI so nobody mistakes a mock-up for real data. */
export function DemoLabel({ children = "Illustrative preview · sample data", tone = "light", className }: { children?: ReactNode; tone?: "light" | "night"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide uppercase",
        tone === "night" ? "border-night-line text-night-muted" : "border-line-strong text-ink-subtle",
        className,
      )}
    >
      {children}
    </span>
  );
}
