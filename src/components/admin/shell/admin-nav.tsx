"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Activity, Building2, ClipboardList, LayoutDashboard, Menu, UserRoundCog, Users, X, type LucideIcon } from "lucide-react";
import { adminRoutes } from "@/config/routes";
import { cn } from "@/lib/utils/cn";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const items: Item[] = [
  { href: adminRoutes.dashboard, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: adminRoutes.requests, label: "Requests", icon: ClipboardList },
  { href: adminRoutes.customers, label: "Customers", icon: Users },
  { href: adminRoutes.properties, label: "Properties", icon: Building2 },
  { href: adminRoutes.team, label: "Team", icon: UserRoundCog },
  { href: adminRoutes.activity, label: "Activity", icon: Activity },
];

const isActive = (pathname: string, item: Item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

/** Desktop sidebar navigation. */
export function AdminSidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="space-y-1">
        {items.map((item) => {
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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Phone and tablet navigation in a native <dialog>: focus is trapped, Escape
 * closes it, and focus returns to the menu button.
 */
export function AdminMobileMenu({ footer }: { footer: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigatingRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls="admin-menu"
        className="inline-flex size-10 items-center justify-center rounded-control text-ink hover:bg-subtle lg:hidden"
      >
        <Menu aria-hidden className="size-5" />
        <span className="sr-only">Open admin menu</span>
      </button>
      <dialog
        id="admin-menu"
        ref={dialogRef}
        aria-label="Admin menu"
        onClose={() => {
          if (!navigatingRef.current) triggerRef.current?.focus();
          navigatingRef.current = false;
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-xs bg-surface p-0 text-ink shadow-raised backdrop:bg-night/40 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Admin console</span>
            <button type="button" onClick={close} className="inline-flex size-10 items-center justify-center rounded-control hover:bg-subtle">
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close menu</span>
            </button>
          </div>
          <nav aria-label="Admin" className="flex-1 overflow-y-auto px-2 py-3">
            <ul>
              {items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        navigatingRef.current = true;
                        close();
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-control px-3 text-base font-medium",
                        active ? "bg-brand-soft text-brand-strong" : "text-ink hover:bg-subtle",
                      )}
                    >
                      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-line p-4">{footer}</div>
        </div>
      </dialog>
    </>
  );
}
