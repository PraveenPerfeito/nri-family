import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * The customer workspace (/app) and auth callbacks (/auth) are private and
 * disallowed; future layers (/admin, /vendor, /partners, and the old /portal
 * name) are disallowed now so they are never crawled once they exist.
 * Account pages (/login, /register, password reset) are NOT disallowed: they
 * carry a noindex meta tag, which crawlers can only see if allowed to fetch.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/auth", "/portal", "/admin", "/vendor", "/partners", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
