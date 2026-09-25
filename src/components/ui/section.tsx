import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SectionTone = "canvas" | "surface" | "night" | "subtle";

const toneClasses: Record<SectionTone, string> = {
  canvas: "bg-canvas",
  surface: "bg-surface border-y border-line",
  subtle: "bg-subtle",
  night: "on-night bg-night text-night-text",
};

export function Section({
  id,
  tone = "canvas",
  className,
  children,
  labelledBy,
}: {
  id?: string;
  tone?: SectionTone;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("py-16 sm:py-20 lg:py-24", toneClasses[tone], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "night" }) {
  return (
    <p className={cn("text-xs font-semibold tracking-[0.14em] uppercase", tone === "night" ? "text-brand-muted" : "text-brand")}>
      {children}
    </p>
  );
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "light",
  as: Heading = "h2",
  className,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "night";
  as?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <Heading
        id={id}
        className={cn(
          "text-display mt-3",
          Heading === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-[2.75rem]",
          tone === "night" ? "text-white" : "text-ink",
        )}
      >
        {title}
      </Heading>
      {lead ? (
        <div className={cn("mt-5 text-base sm:text-lg leading-relaxed", tone === "night" ? "text-night-muted" : "text-ink-muted")}>
          {lead}
        </div>
      ) : null}
      {children}
    </div>
  );
}
