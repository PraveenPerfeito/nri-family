import { ChevronRight } from "lucide-react";

/**
 * The quiet "open" chevron at the end of a row. Purely visual: previews are
 * not interactive, so this is never a link or button.
 */
export function PreviewAction() {
  return (
    <span aria-hidden className="shrink-0 text-ink-subtle/60">
      <ChevronRight className="size-4" strokeWidth={1.75} />
    </span>
  );
}
