import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { SkipLink } from "@/components/layout/skip-link";
import { adminRoutes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { signOutAction } from "@/lib/portal/actions/auth";
import { initials } from "@/lib/portal/format";
import { AdminMobileMenu, AdminSidebarNav } from "./admin-nav";

function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction} className={className}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
      >
        <LogOut aria-hidden className="size-4 text-ink-subtle" strokeWidth={1.75} />
        Sign out
      </button>
    </form>
  );
}

/**
 * The admin console frame: header, sidebar on desktop, menu dialog on
 * smaller screens. Same visual language as the customer workspace, with a
 * wider content area for tables.
 */
export function AdminShell({ fullName, children }: { fullName: string; children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={adminRoutes.dashboard} className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-8 shrink-0 text-brand" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-[0.9375rem] font-semibold tracking-tight text-ink">{siteConfig.brand.name}</span>
              <span className="mt-1 text-[0.5625rem] font-semibold tracking-[0.18em] text-ink-subtle uppercase">Admin console</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-ink-muted sm:inline">{fullName}</span>
            <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-night text-xs font-semibold text-white">
              {initials(fullName)}
            </span>
            <AdminMobileMenu footer={<SignOutButton />} />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 border-r border-line-subtle bg-canvas px-3 py-5 lg:block">
          <div className="flex h-full flex-col">
            <div className="flex-1">
              <AdminSidebarNav />
            </div>
            <SignOutButton className="pt-1" />
          </div>
        </aside>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-16 focus:outline-none sm:px-6 sm:pt-8 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </>
  );
}
