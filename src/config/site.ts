/**
 * ─── Public site settings: edit these values here ────────────────────────────
 *
 * Everything in this block is public (it appears on the website), so it lives
 * in code rather than in hosting environment variables. Only secrets (the
 * optional lead webhook settings, see src/lib/leads/delivery.ts) belong in
 * Vercel's Environment Variables. Empty strings mean "not set" and are not rendered —
 * we never invent legal entity names, addresses or phone numbers.
 */
const settings = {
  /** BRANDING IS NOT CONFIRMED — neutral working name until the brand is chosen. */
  brandName: "NRI Family Office",
  /**
   * Final canonical origin, e.g. "https://www.example.com", once a domain is
   * decided. Leave empty on Vercel: the production domain is detected
   * automatically (the custom domain once added, else *.vercel.app).
   */
  productionUrl: "",
  /** Public contact channels, shown in the footer and on /contact. */
  contactEmail: "praveenperfeitoo@gmail.com",
  /** Display format with country code; the WhatsApp link is derived from the digits. */
  contactWhatsapp: "+91 96001 90022",
  /** Inbox that receives website enquiries (see src/lib/leads/delivery.ts). */
  leadsEmail: "praveenperfeitoo@gmail.com",
  /**
   * Sender for enquiry emails sent through Resend (used once RESEND_API_KEY is
   * set in Vercel). Leave empty to use Resend's shared sender until a domain
   * is verified in Resend, e.g. "Enquiries <enquiries@your-domain.com>".
   */
  leadsEmailFrom: "",
  /** Legal entity details. Leave empty until they are finalised. */
  companyLegalName: "",
  companyAddress: "",
  /**
   * Pre-launch: keep search engines out while the brand is unconfirmed.
   * Set to true at launch (then commit + push to redeploy).
   */
  allowSearchIndexing: false,
};

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Canonical origin, in priority order: the configured production URL, then
 * Vercel's production domain (VERCEL_PROJECT_PRODUCTION_URL, provided at build
 * and runtime without a protocol — previews also use it, so their canonical
 * URLs point at production), then localhost for local development.
 * Only server code reads this (no client component imports siteConfig).
 */
export function resolveSiteUrl(configured: string | undefined, vercelProductionDomain: string | undefined): string {
  const explicit = optional(configured);
  const vercel = optional(vercelProductionDomain);
  const url = explicit ?? (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

/**
 * wa.me chat link from an international number such as "+91 96001 90022",
 * optionally with a pre-typed message. Opens the WhatsApp app on phones and
 * WhatsApp Web / Desktop on computers.
 */
export function whatsappLink(internationalNumber: string, text?: string): string {
  const digits = internationalNumber.replace(/\D/g, "").replace(/^00/, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

const whatsapp = optional(settings.contactWhatsapp);

export const siteConfig = {
  /** Placeholder brand name until branding is confirmed. */
  name: settings.brandName,
  /** Shown under the name in the logo lock-up. */
  descriptor: "Tamil Nadu",
  tagline: "Your trusted team in Tamil Nadu.",
  promise: "You live abroad. We take care of what you own here.",
  description:
    "Property care, inspections, maintenance, documentation assistance and local support for NRIs — managed transparently from one secure platform.",
  url: resolveSiteUrl(settings.productionUrl, process.env.VERCEL_PROJECT_PRODUCTION_URL),
  locale: "en_IN",
  region: "Tamil Nadu, India",
  /** Public contact channels. Shown only when set. */
  contact: {
    email: optional(settings.contactEmail),
    whatsapp,
    /** Opens a chat with a pre-typed greeting, so replies show they came from the website. */
    whatsappUrl: whatsapp ? whatsappLink(whatsapp, `Hi, I found you on the ${settings.brandName} website and would like some help.`) : undefined,
  },
  /** Where website enquiries are emailed. */
  leadsEmail: optional(settings.leadsEmail),
  /** Sender for Resend-delivered enquiry emails; undefined means Resend's shared sender. */
  leadsEmailFrom: optional(settings.leadsEmailFrom),
  /** Legal entity details. Shown only when set. */
  company: {
    legalName: optional(settings.companyLegalName),
    registeredAddress: optional(settings.companyAddress),
  },
  allowSearchIndexing: settings.allowSearchIndexing,
  copyrightYear: 2026,
};

/** Homepage / default document title, e.g. "NRI Family Office — Your trusted team in Tamil Nadu". */
export const homeTitle = `${siteConfig.name} — Your trusted team in Tamil Nadu`;

export type SiteConfig = typeof siteConfig;

export function absoluteUrl(path = "/"): string {
  if (path === "/" || path === "") return siteConfig.url;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
