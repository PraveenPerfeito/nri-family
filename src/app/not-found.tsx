import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex flex-1 items-center py-24">
        <div className="container-page max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand">404</p>
          <h1 className="text-display mt-3 text-4xl sm:text-5xl">We couldn&apos;t find that page.</h1>
          <p className="mt-5 text-lg text-ink-muted">The link may be out of date, or the page may have moved.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={routes.home} size="lg">
              Go to homepage
            </ButtonLink>
            <ButtonLink href={routes.contact} variant="secondary" size="lg">
              Contact us
            </ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
