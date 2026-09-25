import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { resolveSiteUrl, siteConfig, whatsappLink } from "@/config/site";

/*
 * Deployment behaviour. Public settings live in src/config/site.ts (no hosting
 * environment variables needed); the only runtime input is Vercel's own
 * VERCEL_PROJECT_PRODUCTION_URL.
 */

describe("resolveSiteUrl", () => {
  it("prefers the configured production URL and strips trailing slashes", () => {
    expect(resolveSiteUrl("https://example.org/", "nri-family.vercel.app")).toBe("https://example.org");
  });

  it("falls back to Vercel's production domain, adding https://", () => {
    expect(resolveSiteUrl("", "nri-family.vercel.app")).toBe("https://nri-family.vercel.app");
  });

  it("uses localhost when neither is set", () => {
    expect(resolveSiteUrl("", undefined)).toBe("http://localhost:3000");
    expect(resolveSiteUrl("  ", "  ")).toBe("http://localhost:3000");
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link from a display number", () => {
    expect(whatsappLink("+91 96001 90022")).toBe("https://wa.me/919600190022");
  });

  it("is what the site links to", () => {
    expect(siteConfig.contact.whatsappUrl).toBe(siteConfig.contact.whatsapp ? whatsappLink(siteConfig.contact.whatsapp) : undefined);
  });
});

describe("search indexing switch", () => {
  it("sends X-Robots-Tag: noindex on every route exactly when indexing is not allowed", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const catchAll = rules.find((rule) => rule.source === "/:path*");
    const hasNoIndex = catchAll?.headers.some((h) => h.key === "X-Robots-Tag" && h.value.includes("noindex")) ?? false;
    expect(hasNoIndex).toBe(!siteConfig.allowSearchIndexing);
  });
});
