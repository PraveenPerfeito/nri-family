import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The application window every page-hero preview lives in: a quiet back plate
 * for depth, the window itself, and optional floating cards (desktop only).
 *
 * Previews are mock-ups of the future platform, not working software: the
 * window is exposed to assistive technology as one image with a
 * plain-language `summary`, nothing inside it is focusable, and floating
 * cards are decorative.
 */
export function ProductPreviewShell({
  label,
  summary,
  floating,
  children,
  className,
}: {
  /** Accessible name of the figure, e.g. "Concept preview: property management". */
  label: string;
  /** Plain-language description of everything the preview shows. */
  summary: string;
  floating?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure aria-label={label} className={cn("relative mx-auto w-full max-w-lg lg:mr-0", className)}>
      <div aria-hidden className="absolute inset-x-6 -bottom-3 top-6 rounded-panel border border-line bg-surface/60" />
      <div role="img" aria-label={summary} className="animate-preview-in relative overflow-hidden rounded-panel border border-line bg-surface shadow-float">
        {children}
      </div>
      {floating}
    </figure>
  );
}

/**
 * A small card floating at the edge of the window (from `lg` up). Position it
 * with `top-[calc(100%-1rem)]` (below the window) or `bottom-[calc(100%-0.5rem)]`
 * (above it) so it only overlaps the window's edge, never its content.
 */
export function FloatingCard({ className, late, children }: { className?: string; late?: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute hidden rounded-card border border-line bg-surface p-3.5 shadow-float lg:block",
        late ? "animate-float-in-late" : "animate-float-in",
        className,
      )}
    >
      {children}
    </div>
  );
}
