import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * A person or team, shown as an icon in a circle. Previews never use names or
 * photos of people: roles only ("Local assistance team", "Service partner").
 */
export function PreviewAvatar({ icon: Icon, tone = "neutral" }: { icon: LucideIcon; tone?: "neutral" | "brand" }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        tone === "brand" ? "bg-brand text-white" : "bg-subtle text-ink-muted",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.75} />
    </span>
  );
}
