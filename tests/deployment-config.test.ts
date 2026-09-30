import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { resolveSiteUrl, siteConfig, whatsappLink } from "@/config/site";
import { sessionCookieOptions } from "@/lib/supabase/config";

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
  it("builds a wa.me link from an international number", () => {
    expect(whatsappLink("+91 96001 90022")).toBe("https://wa.me/919600190022");
    expect(whatsappLink("0044 20 7946 0000")).toBe("https://wa.me/442079460000");
  });

  it("adds a URL-encoded pre-typed message", () => {
    expect(whatsappLink("+91 96001 90022", "Hi, I need help & advice")).toBe("https://wa.me/919600190022?text=Hi%2C%20I%20need%20help%20%26%20advice");
  });

  it("the site's link opens a chat with a greeting naming the brand", () => {
    if (!siteConfig.contact.whatsapp) return;
    const url = new URL(siteConfig.contact.whatsappUrl!);
    expect(url.origin + url.pathname).toBe(whatsappLink(siteConfig.contact.whatsapp));
    expect(url.searchParams.get("text")).toContain(siteConfig.name);
  });
});

describe("private workspace headers", () => {
  it("always sends noindex and no-store for /app, /admin and /auth", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    for (const source of ["/app", "/app/:path*", "/admin", "/admin/:path*", "/auth/:path*"]) {
      const rule = rules.find((r) => r.source === source);
      expect(rule, source).toBeDefined();
      expect(rule!.headers).toEqual(expect.arrayContaining([{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }]));
    }
  });
});

describe("Content Security Policy and evidence files (Phase 2C)", () => {
  const cspFor = async (source: string) => {
    const rules = (await nextConfig.headers?.()) ?? [];
    // Later rules win, as in Next.js: the last rule for a path that sets the header.
    const matching = rules.filter((r) => r.source === "/:path*" || r.source === source);
    const values = matching.flatMap((r) => r.headers.filter((h) => h.key === "Content-Security-Policy").map((h) => h.value));
    return Object.fromEntries(values.at(-1)!.split("; ").map((d) => [d.split(" ")[0], d]));
  };
  const storage = new URL(siteConfig.portal.supabaseUrl ?? "http://unset.invalid").origin;

  it("the public site loads nothing from Supabase and uploads nothing", async () => {
    const csp = await cspFor("/services");
    expect(csp["img-src"]).not.toContain(storage);
    expect(csp["connect-src"]).not.toContain(storage);
    expect(csp["media-src"]).toBeUndefined();
  });

  it("the customer portal may show evidence images and video from Supabase, but not upload", async () => {
    for (const source of ["/app", "/app/:path*"]) {
      const csp = await cspFor(source);
      expect(csp["img-src"], source).toContain(storage);
      expect(csp["media-src"], source).toContain(storage);
      expect(csp["connect-src"], source).not.toContain(storage);
      expect(csp["frame-ancestors"], source).toBe("frame-ancestors 'none'");
    }
  });

  it("the admin console may also upload evidence to Supabase", async () => {
    for (const source of ["/admin", "/admin/:path*"]) {
      const csp = await cspFor(source);
      expect(csp["img-src"], source).toContain(storage);
      expect(csp["media-src"], source).toContain(storage);
      expect(csp["connect-src"], source).toContain(storage);
      expect(csp["object-src"], source).toBe("object-src 'none'");
    }
  });
});

describe("customer portal connection", () => {
  const { supabaseUrl, supabasePublishableKey } = siteConfig.portal;

  it("is either fully configured or off", () => {
    expect(Boolean(supabaseUrl)).toBe(Boolean(supabasePublishableKey));
  });

  it("uses HTTPS (plain HTTP only for a local development stack)", () => {
    if (!supabaseUrl) return;
    expect(supabaseUrl.startsWith("https://") || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl)).toBe(true);
  });

  it("sets session cookies HttpOnly and SameSite=Lax, and Secure on HTTPS", () => {
    expect(sessionCookieOptions).toEqual({ httpOnly: true, sameSite: "lax", secure: siteConfig.url.startsWith("https://") });
  });

  it("uses a publishable key — never a secret or service-role key", () => {
    if (!supabasePublishableKey) return;
    expect(supabasePublishableKey).toMatch(/^sb_publishable_[\w-]+$/);
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
