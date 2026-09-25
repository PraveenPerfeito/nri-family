import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { footerNav, primaryNav } from "@/config/navigation";
import { indexableRoutes, nonIndexedRoutes, routes } from "@/config/routes";
import { services } from "@/config/services";
import { absoluteUrl, siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo/metadata";

const APP = join(process.cwd(), "src", "app");

/** Resolve a route to its page file inside any route group. */
function pageFileFor(route: string): string | undefined {
  const segment = route === "/" ? "" : route.slice(1);
  return ["(public)", "(auth)", ""]
    .map((group) => join(APP, group, segment, "page.tsx"))
    .find((file) => existsSync(file));
}

describe("routes", () => {
  it.each(Object.values(routes))("%s has a page", (route) => {
    expect(pageFileFor(route)).toBeDefined();
  });

  it("every navigation, footer and service link points at a known route", () => {
    const known = new Set<string>(Object.values(routes));
    const links = [...primaryNav, ...footerNav.flatMap((g) => g.items)].map((i) => i.href).concat(services.map((s) => s.href));
    for (const href of links) expect(known.has(href), href).toBe(true);
  });

  it("every public route is either in the sitemap or explicitly not indexed", () => {
    const listed = new Set<string>([...indexableRoutes.map((r) => r.path), ...nonIndexedRoutes]);
    for (const route of Object.values(routes)) expect(listed.has(route), route).toBe(true);
  });

  it("the sitemap has no duplicates", () => {
    const paths = indexableRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("does not ship pages for future layers yet", () => {
    for (const future of ["portal", "admin", "vendor", "partners"]) {
      expect(existsSync(join(APP, future)), future).toBe(false);
    }
  });
});

describe("pageMetadata", () => {
  it("builds canonical, Open Graph and Twitter metadata", () => {
    const meta = pageMetadata({ title: "Trust & Security", description: "d".repeat(80), path: routes.trust });
    expect(meta.alternates?.canonical).toBe(absoluteUrl("/trust"));
    expect(meta.openGraph).toMatchObject({ url: absoluteUrl("/trust"), title: `Trust & Security | ${siteConfig.name}` });
    expect(JSON.stringify(meta.openGraph)).toContain("/opengraph-image");
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
    expect(meta.robots).toBeUndefined();
  });

  it("marks noIndex pages", () => {
    const meta = pageMetadata({ title: "Sign In", description: "d".repeat(80), path: routes.login, noIndex: true });
    expect(meta.robots).toMatchObject({ index: false });
  });

  it("uses an absolute title on the homepage", () => {
    expect(pageMetadata({ description: "d", path: "/" }).title).toEqual({ absolute: expect.stringContaining(siteConfig.name) });
  });
});

describe("absoluteUrl", () => {
  it("joins paths without double slashes", () => {
    expect(absoluteUrl("/")).toBe(siteConfig.url);
    expect(absoluteUrl("/faq")).toBe(`${siteConfig.url}/faq`);
    expect(absoluteUrl("faq")).toBe(`${siteConfig.url}/faq`);
  });
});
