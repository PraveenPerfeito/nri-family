import Link from "next/link";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";

/** Minimal light footer. Brand, company and contact details all come from siteConfig. */
export function Footer() {
  const { brand, contact, company } = siteConfig;
  const owner = company.legalName ?? brand.name;

  return (
    <footer className="border-t border-line bg-canvas text-ink-muted" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="container-page pt-16 pb-10 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-6 text-[0.9375rem] font-medium text-ink">{brand.tagline}</p>
            <p className="mt-1.5 text-sm leading-relaxed">{brand.promise}</p>
            {contact.email || (contact.whatsapp && contact.whatsappUrl) || contact.phone ? (
              <ul className="mt-6 space-y-1.5 text-sm">
                {contact.email ? (
                  <li>
                    <a className="text-ink underline-offset-4 hover:underline" href={`mailto:${contact.email}`}>
                      {contact.email}
                    </a>
                  </li>
                ) : null}
                {contact.whatsapp && contact.whatsappUrl ? (
                  <li>
                    WhatsApp{" "}
                    <a className="text-ink underline-offset-4 hover:underline" href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">
                      {contact.whatsapp}
                    </a>
                  </li>
                ) : null}
                {contact.phone ? (
                  <li>
                    <a className="text-ink underline-offset-4 hover:underline" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                      {contact.phone}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {footerNav.map((group) => (
              <nav key={group.title} aria-label={`Footer — ${group.title}`}>
                <h3 className="text-label text-ink">{group.title}</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item.href}`}>
                      <Link href={item.href} className="transition-colors duration-150 hover:text-ink">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line-subtle pt-6 text-xs text-ink-subtle md:flex-row md:items-start md:justify-between md:gap-10">
          <p className="shrink-0">
            © {siteConfig.copyrightYear} {owner}
          </p>
          <p className="max-w-xl md:text-right">
            We coordinate local services and qualified professionals. We do not provide legal, tax, medical or other regulated
            professional services.
          </p>
        </div>
        {company.registeredAddress ? <p className="mt-3 text-xs text-ink-subtle">{company.registeredAddress}</p> : null}
      </div>
    </footer>
  );
}
