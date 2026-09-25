import Link from "next/link";
import { UserRound } from "lucide-react";
import { primaryNav } from "@/config/navigation";
import { routes } from "@/config/routes";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo compact />

        <nav aria-label="Primary" className="hidden lg:block">
          <NavLinks items={primaryNav} />
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ButtonLink
            href={routes.login}
            variant="quiet"
            className="max-sm:hidden"
            track="login_clicked"
            trackProps={{ location: "header" }}
          >
            Login
          </ButtonLink>
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
            href={routes.getStarted}
            className="max-sm:px-3"
            track="cta_clicked"
            trackProps={{ label: "get_started", location: "header" }}
          >
            Get Started
          </ButtonLink>
          <MobileMenu items={primaryNav} />
        </div>
      </div>
    </header>
  );
}
