import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/**
 * Placeholder mark (final brand not selected): a roofline over a circle —
 * someone looking after the home. When a logo file is set in
 * `siteConfig.brand.logo`, <Logo> uses it instead. Also update src/app/icon.svg
 * and src/app/opengraph-image.tsx when the brand is final.
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

/**
 * Brand lock-up from `siteConfig.brand`. `compact`: below 410px only the mark is
 * shown (the name cannot fit beside the header actions); the name stays
 * available to screen readers as the link's name.
 */
export function Logo({ tone = "light", compact, className }: { tone?: "light" | "night"; compact?: boolean; className?: string }) {
  const { brand } = siteConfig;
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      {brand.logo ? (
        // A configured logo file replaces the placeholder mark.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo} alt="" className="h-8 w-auto" />
      ) : (
        <LogoMark className="size-8 text-brand" inverted={tone === "night"} />
      )}
      <span className={cn("flex flex-col leading-none whitespace-nowrap", compact && "max-[409px]:sr-only")}>
        <span className={cn("text-[0.9375rem] font-semibold tracking-tight sm:text-base", tone === "night" ? "text-white" : "text-ink")}>
          {brand.name}
        </span>
        <span className={cn("mt-1 text-[0.5625rem] font-semibold tracking-[0.18em] uppercase", tone === "night" ? "text-night-muted" : "text-ink-subtle")}>
          {brand.descriptor}
        </span>
      </span>
    </Link>
  );
}
