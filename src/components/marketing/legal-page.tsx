import type { ReactNode } from "react";
import { FileWarning } from "lucide-react";
import { PageHero } from "./page-hero";

/** Shared layout for policy pages, with readable prose styles. */
export function LegalPage({
  title,
  path,
  breadcrumb,
  updated,
  children,
}: {
  title: string;
  path: string;
  breadcrumb: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero title={title} lead={<p className="text-base">Last updated: {updated}</p>} breadcrumb={{ name: breadcrumb, path }} />
      <div className="container-page py-14 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <aside className="mb-10 flex gap-3 rounded-card border border-attention/20 bg-attention-soft p-5 text-sm" aria-label="Draft notice">
            <FileWarning aria-hidden className="mt-0.5 size-5 shrink-0 text-attention" />
            <p className="leading-relaxed text-ink-muted">
              <strong className="text-ink">Draft for pre-launch review.</strong> This page describes how the website works today. It
              will be reviewed by qualified legal counsel and updated with our registered company details before general launch.
            </p>
          </aside>
          <div className="legal-prose space-y-5 text-[0.9375rem] leading-relaxed text-ink-muted [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1.5 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
