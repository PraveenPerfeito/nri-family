import { Plus } from "lucide-react";
import type { FaqItem } from "@/data/faq";

/** Accessible accordion built on native <details>/<summary>: keyboard and screen-reader friendly with no JS. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group" data-track="faq_opened" data-track-question={item.question}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left text-base font-medium text-ink sm:px-6 [&::-webkit-details-marker]:hidden">
            <h3 className="text-base font-medium">{item.question}</h3>
            <Plus aria-hidden className="size-5 shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-45" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted sm:px-6">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
