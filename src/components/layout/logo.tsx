import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/**
 * Placeholder mark (branding not confirmed): a roofline over a circle —
 * someone looking after the home. Replace together with src/app/icon.svg
 * and src/app/opengraph-image.tsx once the brand is final.
 * `inverted` draws a light tile with brand-coloured strokes for dark surfaces.
 */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  const stroke = inverted ? "var(--color-brand)" : "#fff";
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className ?? "size-8"}>
      <rect width="32" height="32" rx="9" fill={inverted ? "#fff" : "currentColor"} />
      <path d="M8 14.5 16 8l8 6.5" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="19.5" r="3.6" fill="none" stroke={stroke} strokeWidth="2.2" />
    </svg>
  );
}

/** `compact`: show only the mark below 410px, where the name cannot fit on one line beside the header actions. */
export function Logo({ tone = "light", compact, className }: { tone?: "light" | "night"; compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label={`${siteConfig.name} ${siteConfig.descriptor} — home`}>
      <LogoMark className="size-8 text-brand" inverted={tone === "night"} />
      <span className={cn("flex flex-col leading-none whitespace-nowrap", compact && "max-[409px]:hidden")}>
        <span className={cn("text-[0.9375rem] font-semibold tracking-tight sm:text-[1.0625rem]", tone === "night" ? "text-white" : "text-ink")}>
          {siteConfig.name}
        </span>
        <span className={cn("mt-1 text-[0.625rem] font-medium tracking-[0.16em] uppercase", tone === "night" ? "text-night-muted" : "text-ink-subtle")}>
          {siteConfig.descriptor}
        </span>
      </span>
    </Link>
  );
}
