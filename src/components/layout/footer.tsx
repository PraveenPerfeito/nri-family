import Link from "next/link";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";

export function Footer() {
  const { contact, company } = siteConfig;
  const owner = company.legalName ?? siteConfig.name;

  return (
    <footer className="on-night bg-night text-night-muted" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="container-page py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_2.4fr]">
          <div className="max-w-sm">
            <Logo tone="night" />
            <p className="mt-5 text-base text-night-text">{siteConfig.tagline}</p>
            <p className="mt-2 text-sm leading-relaxed">{siteConfig.promise}</p>
            {contact.email || contact.whatsapp ? (
              <ul className="mt-6 space-y-1.5 text-sm">
                {contact.email ? (
                  <li>
                    Email:{" "}
                    <a className="text-night-text underline-offset-4 hover:underline" href={`mailto:${contact.email}`}>
                      {contact.email}
                    </a>
                  </li>
                ) : null}
                {contact.whatsapp ? <li>WhatsApp: <span className="text-night-text">{contact.whatsapp}</span></li> : null}
              </ul>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1fr_1.45fr_1fr_1fr_1fr]">
            {footerNav.map((group) => (
              <nav key={group.title} aria-label={`Footer — ${group.title}`}>
                <h3 className="text-xs font-semibold tracking-[0.14em] text-night-text uppercase">{group.title}</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item.href}`}>
                      <Link href={item.href} className="transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-night-line pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {siteConfig.copyrightYear} {owner}. All rights reserved.
          </p>
          <p className="max-w-xl sm:text-right">
            We coordinate local services and qualified professionals. We do not provide legal, tax, medical or other
            regulated professional services.
          </p>
        </div>
        {company.registeredAddress ? <p className="mt-3 text-xs">{company.registeredAddress}</p> : null}
      </div>
    </footer>
  );
}
