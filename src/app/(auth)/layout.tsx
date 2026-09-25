import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { SkipLink } from "@/components/layout/skip-link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

/**
 * Entry points for the NRI Portal (Layer 2). Kept outside the marketing
 * layout so the authenticated experience can take over this group later.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <header className="border-b border-line bg-canvas">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo compact />
          <Link href={routes.home} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" />
            Back to site
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="relative isolate flex flex-1 items-start justify-center px-4 py-12 sm:py-16">
        <div aria-hidden className="bg-grid-fade pointer-events-none absolute inset-0 -z-10" />
        {children}
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-subtle">
        © {siteConfig.copyrightYear} {siteConfig.company.legalName ?? siteConfig.name} ·{" "}
        <Link href={routes.privacy} className="hover:text-ink">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href={routes.terms} className="hover:text-ink">
          Terms
        </Link>
      </footer>
    </>
  );
}
