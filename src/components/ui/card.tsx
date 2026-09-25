import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "li" | "article" }) {
  return <Tag className={cn("rounded-card border border-line bg-surface p-6 shadow-card", className)}>{children}</Tag>;
}

export function IconTile({ icon: Icon, tone = "light", className }: { icon: LucideIcon; tone?: "light" | "night"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-control",
        tone === "night" ? "bg-night-raised text-brand-muted ring-1 ring-night-line" : "bg-brand-soft text-brand",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/**
 * Icon + title + description card, the most common content unit on the site.
 * `compact` switches to an icon-beside-text row on phones so grids of short
 * cards do not become a long single-column scroll.
 */
export function FeatureCard({
  icon,
  title,
  children,
  as = "li",
  compact,
  className,
  headingLevel: H = "h3",
}: {
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  as?: "div" | "li" | "article";
  compact?: boolean;
  className?: string;
  headingLevel?: "h3" | "h4";
}) {
  return (
    <Card as={as} className={cn("flex flex-col gap-4", compact && "max-sm:flex-row max-sm:items-start max-sm:p-5", className)}>
      {icon ? <IconTile icon={icon} /> : null}
      <div>
        <H className="text-base font-semibold text-ink">{title}</H>
        {children ? <div className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</div> : null}
      </div>
    </Card>
  );
}
