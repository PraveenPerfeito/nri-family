"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/config/navigation";
import { routes } from "@/config/routes";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { isActivePath } from "./nav-links";

/**
 * Mobile navigation built on the native <dialog> element: focus is trapped,
 * Escape closes it and the page behind is inert. Focus is returned to the
 * menu button explicitly, because Safari does not focus buttons on click and
 * so has nothing to restore to on its own.
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Set when a link is chosen, so focus is not pulled back to the header after navigating.
  const navigatingRef = useRef(false);
  const pathname = usePathname();

  // Close after navigation.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  function open() {
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }
  function onLinkClick() {
    navigatingRef.current = true;
    close();
  }
  function onDialogClose() {
    if (!navigatingRef.current) triggerRef.current?.focus();
    navigatingRef.current = false;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-controls="mobile-menu"
        className="inline-flex size-10 items-center justify-center rounded-control text-ink hover:bg-subtle lg:hidden"
      >
        <Menu aria-hidden className="size-5" />
        <span className="sr-only">Open menu</span>
      </button>

      <dialog
        id="mobile-menu"
        ref={dialogRef}
        aria-label="Site menu"
        onClose={onDialogClose}
        onClick={(e) => {
          // Clicking the backdrop (the dialog element itself) closes the menu.
          if (e.target === dialogRef.current) close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-sm bg-surface p-0 text-ink shadow-raised backdrop:bg-night/40 backdrop:backdrop-blur-[2px] lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              onClick={close}
              className="inline-flex size-10 items-center justify-center rounded-control hover:bg-subtle"
            >
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-2 py-3">
            <ul className="flex flex-col">
              {[{ label: "Home", href: routes.home } as NavItem, ...items].map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onLinkClick}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center rounded-control px-3 text-base font-medium",
                        active ? "bg-brand-soft text-brand-strong" : "text-ink hover:bg-subtle",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex flex-col gap-2 border-t border-line p-4">
            <Link
              href={routes.getStarted}
              onClick={onLinkClick}
              data-track="cta_clicked"
              data-track-label="get_started"
              data-track-location="mobile_menu"
              className={buttonClasses({ size: "lg", className: "w-full" })}
            >
              Get Started
            </Link>
            <Link
              href={routes.login}
              onClick={onLinkClick}
              data-track="login_clicked"
              data-track-location="mobile_menu"
              className={buttonClasses({ variant: "secondary", size: "lg", className: "w-full" })}
            >
              Login
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
