import Link from "next/link";
import { UserRound } from "lucide-react";
import { mobileNav, primaryNav } from "@/config/navigation";
import { routes } from "@/config/routes";
import { ButtonLink } from "@/components/ui/button";
import { HeaderScrollState } from "./header-scroll-state";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";

/** Compact, translucent sticky header; gains opacity and a soft edge on scroll. */
export function Navbar() {
  return (
    <>
      <HeaderScrollState />
      <header
        data-site-header
        data-scrolled="false"
        className="sticky top-0 z-40 border-b border-line-subtle/70 bg-canvas/70 backdrop-blur-xl"
      >
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Logo compact />

          <nav aria-label="Primary" className="hidden lg:block">
            <NavLinks items={primaryNav} />
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href={routes.login}
              aria-label="Login"
              data-track="login_clicked"
              data-track-location="header_mobile"
              className="inline-flex size-10 items-center justify-center rounded-control text-ink-muted hover:bg-subtle hover:text-ink sm:hidden"
            >
              <UserRound aria-hidden className="size-5" />
            </Link>
            <ButtonLink
              href={routes.login}
              variant="quiet"
              className="max-sm:hidden"
              track="login_clicked"
              trackProps={{ location: "header" }}
            >
              Login
            </ButtonLink>
            <ButtonLink href={routes.getStarted} className="max-sm:px-3" track="cta_clicked" trackProps={{ label: "get_started", location: "header" }}>
              Get Started
            </ButtonLink>
            <MobileMenu items={mobileNav} />
          </div>
        </div>
      </header>
    </>
  );
}
