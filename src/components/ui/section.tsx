import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SectionTone = "canvas" | "surface" | "night" | "subtle";

const toneClasses: Record<SectionTone, string> = {
  canvas: "bg-canvas",
  surface: "bg-surface border-y border-line-subtle",
  subtle: "bg-subtle",
  night: "on-night bg-night text-night-text",
};

/** Page section with the V2 rhythm: 80px on phones, 112px on tablets, 144px on desktop. */
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
    <section id={id} aria-labelledby={labelledBy} className={cn("py-20 sm:py-28 lg:py-36", toneClasses[tone], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "night" }) {
  return (
    <p className={cn("text-label flex items-center gap-2.5", tone === "night" ? "text-brand-muted" : "text-brand")}>
      <span aria-hidden className={cn("h-px w-5", tone === "night" ? "bg-brand-muted/60" : "bg-brand/50")} />
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
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center [&>p:first-child]:justify-center", className)}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <Heading
        id={id}
        className={cn(
          "text-display mt-5",
          Heading === "h1" ? "text-[2.75rem] sm:text-6xl lg:text-[4.5rem]" : "text-[2rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem]",
          tone === "night" ? "text-white" : "text-ink",
        )}
      >
        {title}
      </Heading>
      {lead ? (
        <div className={cn("mt-6 max-w-2xl text-lg sm:text-xl", align === "center" && "mx-auto", tone === "night" ? "text-night-muted" : "text-ink-muted")}>
          {lead}
        </div>
      ) : null}
      {children}
    </div>
  );
}
