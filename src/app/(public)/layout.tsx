import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SkipLink } from "@/components/layout/skip-link";
import { JsonLd } from "@/components/shared/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";

/** Layer 1 — public marketing site. Future layers get their own route groups. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
    </>
  );
}
