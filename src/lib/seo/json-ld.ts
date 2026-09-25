import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * Structured data builders. Only describe what is genuinely on the page —
 * no ratings, reviews, prices or claims we cannot back up.
 */
type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    ...(siteConfig.company.legalName ? { legalName: siteConfig.company.legalName } : {}),
    url: siteConfig.url,
    logo: absoluteUrl("/icon.svg"),
    description: siteConfig.description,
    areaServed: { "@type": "State", name: "Tamil Nadu", containedInPlace: { "@type": "Country", name: "India" } },
    ...(siteConfig.contact.email || siteConfig.contact.whatsapp
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            ...(siteConfig.contact.email ? { email: siteConfig.contact.email } : {}),
            ...(siteConfig.contact.whatsapp ? { telephone: siteConfig.contact.whatsapp } : {}),
            availableLanguage: ["English", "Tamil"],
          },
        }
      : {}),
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: "en",
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };
}

export function serviceJsonLd(input: { name: string; description: string; path: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    provider: { "@id": `${siteConfig.url}/#organization` },
    areaServed: { "@type": "State", name: "Tamil Nadu" },
    audience: { "@type": "Audience", audienceType: "Non-resident Indians (NRIs)" },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Serialise safely for an inline <script> (prevents `</script>` injection). */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
