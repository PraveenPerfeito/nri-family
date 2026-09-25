import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * Future authenticated areas (/portal, /admin, /vendor, /partners) are
 * disallowed now so they are never crawled once they exist.
 * Existing non-indexed pages (/login, /register) are NOT disallowed: they
 * carry a noindex meta tag, which crawlers can only see if allowed to fetch.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal", "/admin", "/vendor", "/partners", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
