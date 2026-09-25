/** Status colours used across previews. Always paired with a word or icon, never colour alone. */
export type PreviewTone = "good" | "attention" | "info" | "neutral" | "brand";

/** A row in an activity list. `next` = happening now; `pending` = not started. */
export type PreviewActivityItem = { label: string; meta?: string; state: "done" | "next" | "pending" | "attention" };

/** A step in a vertical timeline. */
export type PreviewStep = { label: string; meta?: string; state: "done" | "current" | "upcoming" };

export const toneText: Record<PreviewTone, string> = {
  good: "text-good",
  attention: "text-attention",
  info: "text-info",
  neutral: "text-ink-muted",
  brand: "text-brand",
};

export const toneDot: Record<PreviewTone, string> = {
  good: "bg-good",
  attention: "bg-attention-bright",
  info: "bg-info",
  neutral: "bg-line-strong",
  brand: "bg-brand",
};
