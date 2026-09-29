"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminRoutes } from "@/config/routes";

/** Something failed while loading an admin page. No technical detail is shown (it is logged on the server). */
export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-card border border-line bg-surface px-6 py-12 text-center">
      <span aria-hidden className="mx-auto flex size-11 items-center justify-center rounded-full bg-attention-soft text-attention">
        <AlertTriangle className="size-5" strokeWidth={1.75} />
      </span>
      <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">We couldn&apos;t load this page</h1>
      <p className="mt-2 text-sm text-ink-muted">Nothing was changed. This is usually a brief connection problem, so please try again.</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={() => retry()}>
          <RotateCcw aria-hidden className="size-4" />
          Try again
        </Button>
        <Link href={adminRoutes.dashboard} className="inline-flex h-10 items-center justify-center px-4 text-sm font-medium text-brand hover:text-brand-strong">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
