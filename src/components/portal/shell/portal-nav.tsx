"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Building2, ClipboardList, LayoutDashboard, Settings, UserRound, type LucideIcon } from "lucide-react";
import { portalRoutes } from "@/config/routes";
import { cn } from "@/lib/utils/cn";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const primary: Item[] = [
  { href: portalRoutes.dashboard, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: portalRoutes.properties, label: "Properties", icon: Building2 },
  { href: portalRoutes.requests, label: "Requests", icon: ClipboardList },
  { href: portalRoutes.activity, label: "Activity", icon: Activity },
  { href: portalRoutes.notifications, label: "Notifications", icon: Bell },
];

const mobile: Item[] = [
  { href: portalRoutes.dashboard, label: "Home", icon: LayoutDashboard, exact: true },
  { href: portalRoutes.properties, label: "Properties", icon: Building2 },
  { href: portalRoutes.requests, label: "Requests", icon: ClipboardList },
  { href: portalRoutes.activity, label: "Activity", icon: Activity },
  { href: portalRoutes.profile, label: "Account", icon: UserRound },
];

function isActive(pathname: string, item: Item) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Desktop sidebar navigation. */
export function SidebarNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const link = (item: Item) => {
    const active = isActive(pathname, item);
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
            active ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-muted hover:bg-subtle hover:text-ink",
          )}
        >
          <Icon aria-hidden className={cn("size-4 shrink-0", active ? "text-brand" : "text-ink-subtle")} strokeWidth={1.75} />
          <span className="flex-1">{item.label}</span>
          {item.href === portalRoutes.notifications && unread > 0 ? (
            <span className="min-w-5 rounded-full bg-brand px-1.5 text-center text-[0.6875rem] font-semibold text-white tabular-nums">
              {unread > 99 ? "99+" : unread}
              <span className="sr-only"> unread</span>
            </span>
          ) : null}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Workspace" className="flex h-full flex-col">
      <ul className="space-y-1">{primary.map(link)}</ul>
      <ul className="mt-auto space-y-1 border-t border-line-subtle pt-4">
        {[{ href: portalRoutes.profile, label: "Profile", icon: UserRound }, { href: portalRoutes.settings, label: "Settings", icon: Settings }].map(link)}
      </ul>
    </nav>
  );
}

/** Phone bottom tab bar. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {mobile.map((item) => {
          const active = isActive(pathname, item) || (item.href === portalRoutes.profile && pathname.startsWith(portalRoutes.settings));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium", active ? "text-brand" : "text-ink-subtle hover:text-ink")}
              >
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
