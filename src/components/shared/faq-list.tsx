import { Plus } from "lucide-react";
import type { FaqItem } from "@/data/faq";

/**
 * Accessible accordion on native <details>/<summary>: keyboard operable and
 * announced as expanded/collapsed with no JavaScript. The open/close height
 * transition is progressive enhancement (details.faq-item in globals.css).
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.question} className="faq-item group" data-track="faq_opened" data-track-question={item.question}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left sm:py-6 [&::-webkit-details-marker]:hidden">
            <h3 className="text-[1.0625rem] font-medium tracking-tight text-ink transition-colors duration-200 group-hover:text-brand-strong">
              {item.question}
            </h3>
            <span
              aria-hidden
              className="mt-px flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-subtle transition-[transform,color,background-color,border-color] duration-300 ease-[var(--ease-calm)] group-hover:border-line-strong group-hover:text-ink group-open:rotate-45 group-open:border-brand/35 group-open:bg-brand-soft group-open:text-brand"
            >
              <Plus className="size-4" />
            </span>
          </summary>
          <p className="max-w-2xl pr-10 pb-6 text-[0.9375rem] leading-relaxed text-ink-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
