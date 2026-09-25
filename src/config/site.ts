/**
 * Site identity. Brand and company details live here so they can be
 * finalised without touching components.
 *
 * BRANDING IS NOT CONFIRMED. The site uses the neutral working name
 * "NRI Family Office" until the final brand is chosen. To rebrand, set
 * NEXT_PUBLIC_BRAND_NAME (and NEXT_PUBLIC_SITE_URL) — no code changes needed.
 *
 * Values that are not yet confirmed are left `undefined` and are simply not
 * rendered — we never invent legal entity names, addresses or phone numbers.
 */
function readSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // No production domain is decided yet; set NEXT_PUBLIC_SITE_URL before launch.
  const url = raw && raw.length > 0 ? raw : "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const siteConfig = {
  /** Placeholder brand name until branding is confirmed. */
  name: optional(process.env.NEXT_PUBLIC_BRAND_NAME) ?? "NRI Family Office",
  /** Shown under the name in the logo lock-up. */
  descriptor: "Tamil Nadu",
  tagline: "Your trusted team in Tamil Nadu.",
  promise: "You live abroad. We take care of what you own here.",
  description:
    "Property care, inspections, maintenance, documentation assistance and local support for NRIs — managed transparently from one secure platform.",
  url: readSiteUrl(),
  locale: "en_IN",
  region: "Tamil Nadu, India",
  /** Public contact channels. Shown only when configured. */
  contact: {
    email: optional(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    whatsapp: optional(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP),
  },
  /** Legal entity details. Shown only when configured. */
  company: {
    legalName: optional(process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME),
    registeredAddress: optional(process.env.NEXT_PUBLIC_COMPANY_ADDRESS),
  },
  copyrightYear: 2026,
} as const;

/** Homepage / default document title, e.g. "NRI Family Office — Your trusted team in Tamil Nadu". */
export const homeTitle = `${siteConfig.name} — Your trusted team in Tamil Nadu`;

export type SiteConfig = typeof siteConfig;

export function absoluteUrl(path = "/"): string {
  if (path === "/" || path === "") return siteConfig.url;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
