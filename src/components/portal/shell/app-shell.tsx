import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, LogOut, Plus } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { SkipLink } from "@/components/layout/skip-link";
import { ButtonLink } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { signOutAction } from "@/lib/portal/actions/auth";
import { initials } from "@/lib/portal/format";
import { MobileTabBar, SidebarNav } from "./portal-nav";

/**
 * The private workspace frame: header with notifications and profile, a
 * sidebar on desktop and a bottom tab bar on phones. Same visual language as
 * the public site, a little denser.
 */
export function AppShell({ fullName, unread, children }: { fullName: string; unread: number; children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={portalRoutes.dashboard} className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-8 shrink-0 text-brand" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-[0.9375rem] font-semibold tracking-tight text-ink">{siteConfig.brand.name}</span>
              <span className="mt-1 text-[0.5625rem] font-semibold tracking-[0.18em] text-ink-subtle uppercase">Private workspace</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ButtonLink href={portalRoutes.newRequest} className="max-sm:hidden">
              <Plus aria-hidden className="size-4" />
              Request a service
            </ButtonLink>
            <Link
              href={portalRoutes.notifications}
              className="relative inline-flex size-10 items-center justify-center rounded-control text-ink-muted hover:bg-subtle hover:text-ink"
            >
              <Bell aria-hidden className="size-5" />
              <span className="sr-only">{unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}</span>
              {unread > 0 ? <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-brand ring-2 ring-canvas" /> : null}
            </Link>
            <Link
              href={portalRoutes.profile}
              className="inline-flex size-9 items-center justify-center rounded-full bg-night text-xs font-semibold text-white hover:bg-ink"
              title="Your profile"
            >
              <span aria-hidden>{initials(fullName)}</span>
              <span className="sr-only">Your profile</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 border-r border-line-subtle bg-canvas px-3 py-5 lg:block">
          <div className="flex h-full flex-col">
            <div className="flex-1">
              <SidebarNav unread={unread} />
            </div>
            <form action={signOutAction} className="pt-1">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
              >
                <LogOut aria-hidden className="size-4 text-ink-subtle" strokeWidth={1.75} />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-28 focus:outline-none sm:px-6 sm:pt-8 lg:px-10 lg:pb-16">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <MobileTabBar />
    </>
  );
}
