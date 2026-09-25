import { ArrowRight, Check, Globe2, Lock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropertyVisibility } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

export const visibilityLevels: Record<
  PropertyVisibility,
  { label: string; short: string; description: string; icon: LucideIcon; sees: string[] }
> = {
  private: {
    label: "Private",
    short: "Only you and authorised staff",
    description: "Only you and the staff you authorise can see the property. This is the default for everything.",
    icon: Lock,
    sees: ["You, the owner", "Your authorised team"],
  },
  "verified-network": {
    label: "Verified Network",
    short: "Selected verified buyers or partners",
    description: "Shared only with buyers, tenants or partners who have been verified. Your contact details stay hidden.",
    icon: Users,
    sees: ["Approved buyers, tenants or partners"],
  },
  public: {
    label: "Public",
    short: "Only when you choose to publish",
    description: "Listed publicly, and only when you explicitly choose to. Enquiries still come through the platform, not to you directly.",
    icon: Globe2,
    sees: ["Anyone — only if you publish"],
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

/** Three visibility levels as a ladder — private is always the starting point. */
export function VisibilityLevels({ tone = "light" }: { tone?: "light" | "night" }) {
  const night = tone === "night";
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {order.map((key, i) => {
        const level = visibilityLevels[key];
        const Icon = level.icon;
        return (
          <li
            key={key}
            className={cn(
              "reveal relative rounded-card border p-6 sm:p-7",
              night ? "border-night-line bg-night-raised" : "border-line bg-surface",
              key === "private" && !night && "border-brand/35 bg-brand-soft/35",
            )}
          >
            {i < order.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 -right-[1.1rem] z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border md:flex",
                  night ? "border-night-line bg-night text-night-muted" : "border-line bg-canvas text-ink-subtle",
                )}
              >
                <ArrowRight className="size-3.5" />
              </span>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className={cn("text-label flex items-center gap-2", night ? "text-brand-muted" : "text-brand")}>
                <Icon aria-hidden className="size-3.5" strokeWidth={2} />
                Level {i + 1}
              </span>
              {key === "private" ? (
                <span className={cn("rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase", night ? "bg-night text-night-muted" : "bg-surface text-brand-strong")}>
                  Default
                </span>
              ) : null}
            </div>
            <h3 className={cn("mt-5 text-xl font-semibold tracking-tight", night ? "text-white" : "text-ink")}>{level.label}</h3>
            <p className={cn("mt-1 text-sm font-medium", night ? "text-brand-muted" : "text-brand")}>{level.short}</p>
            <ul className={cn("mt-4 space-y-1.5 text-sm", night ? "text-night-text" : "text-ink")}>
              {level.sees.map((who) => (
                <li key={who} className="flex items-start gap-2">
                  <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", night ? "text-brand-muted" : "text-brand")} strokeWidth={2} />
                  {who}
                </li>
              ))}
            </ul>
            <p className={cn("mt-4 text-sm leading-relaxed", night ? "text-night-muted" : "text-ink-muted")}>{level.description}</p>
          </li>
        );
      })}
    </ol>
  );
}
