import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PreviewBadge } from "./preview-badge";

/** Window title bar: a small icon tile (or custom mark), the module name, and the sample-data badge. */
export function PreviewHeader({
  icon: Icon,
  mark,
  title,
  shortTitle,
  meta,
  kind = "concept",
}: {
  icon?: LucideIcon;
  /** Replaces the icon tile, e.g. the brand mark on the family-office overview. */
  mark?: ReactNode;
  title: string;
  /** Shorter title for phones, where the full one would truncate beside the badge. */
  shortTitle?: string;
  /** Short context after the title, e.g. "Tamil Nadu". */
  meta?: string;
  kind?: "concept" | "illustrative";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-subtle bg-canvas/60 px-4 py-3 sm:px-5">
      <span className="flex min-w-0 items-center gap-2.5">
        {mark ??
          (Icon ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-white">
              <Icon className="size-3.5" strokeWidth={2} />
            </span>
          ) : null)}
        <span className="text-label truncate text-ink max-sm:text-[0.625rem] max-sm:tracking-[0.06em]">
          {shortTitle ? (
            <>
              <span className="sm:hidden">{shortTitle}</span>
              <span className="max-sm:hidden">{title}</span>
            </>
          ) : (
            title
          )}
        </span>
        {meta ? <span className="hidden truncate text-xs text-ink-subtle sm:inline">{meta}</span> : null}
      </span>
      <PreviewBadge kind={kind} />
    </div>
  );
}
