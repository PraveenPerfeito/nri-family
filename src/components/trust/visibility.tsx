import { Globe2, Lock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropertyVisibility } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

export const visibilityLevels: Record<PropertyVisibility, { label: string; short: string; description: string; icon: LucideIcon }> = {
  private: {
    label: "Private",
    short: "Only you and authorised staff",
    description: "Only you and the staff you authorise can see the property. This is the default for everything.",
    icon: Lock,
  },
  "verified-network": {
    label: "Verified Network",
    short: "Selected verified buyers or partners",
    description: "Shared only with buyers, tenants or partners who have been verified. Your contact details stay hidden.",
    icon: Users,
  },
  public: {
    label: "Public",
    short: "Only when you choose to publish",
    description: "Listed publicly, and only when you explicitly choose to. Enquiries still come through the platform, not to you directly.",
    icon: Globe2,
  },
};

const order: PropertyVisibility[] = ["private", "verified-network", "public"];

export function VisibilityBadge({ visibility }: { visibility: PropertyVisibility }) {
  const level = visibilityLevels[visibility];
  const Icon = level.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        visibility === "private" && "border-line bg-subtle text-ink",
        visibility === "verified-network" && "border-brand-muted/60 bg-brand-soft text-brand-strong",
        visibility === "public" && "border-info/15 bg-info-soft text-info",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {level.label}
    </span>
  );
}

/** Three visibility levels as a progressive scale — private is always the starting point. */
export function VisibilityLevels({ tone = "light" }: { tone?: "light" | "night" }) {
  const night = tone === "night";
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {order.map((key, i) => {
        const level = visibilityLevels[key];
        const Icon = level.icon;
        return (
          <li
            key={key}
            className={cn(
              "reveal relative rounded-card border p-6",
              night ? "border-night-line bg-night-raised" : "border-line bg-surface shadow-card",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-control",
                  night ? "bg-night text-brand-muted ring-1 ring-night-line" : "bg-brand-soft text-brand",
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className={cn("text-xs font-medium", night ? "text-night-muted" : "text-ink-subtle")}>
                Level {i + 1}
                {key === "private" ? " · Default" : ""}
              </span>
            </div>
            <h3 className={cn("mt-5 text-lg font-semibold", night ? "text-white" : "text-ink")}>{level.label}</h3>
            <p className={cn("mt-1 text-sm font-medium", night ? "text-brand-muted" : "text-brand")}>{level.short}</p>
            <p className={cn("mt-3 text-sm leading-relaxed", night ? "text-night-muted" : "text-ink-muted")}>{level.description}</p>
          </li>
        );
      })}
    </ol>
  );
}
