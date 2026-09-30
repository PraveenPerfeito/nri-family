import type { NextConfig } from "next";
import { siteConfig } from "./src/config/site";

const isDev = process.env.NODE_ENV !== "production";

/**
 * The Supabase origin, for evidence files (Phase 2C). Evidence is served
 * through the app's own routes, which redirect an authorised viewer to a
 * short-lived signed link on this origin.
 */
const storageOrigin = (() => {
  try {
    return siteConfig.portal.supabaseUrl ? new URL(siteConfig.portal.supabaseUrl).origin : "";
  } catch {
    return "";
  }
})();

/**
 * Content Security Policy.
 *
 * Next.js injects inline bootstrap scripts, so `script-src` allows
 * 'unsafe-inline'. A nonce-based policy (via `proxy.ts`) would force every
 * page to render dynamically. The customer portal and the admin console talk
 * to Supabase only from the server, with one exception each for evidence
 * files: both may show images and video from the Supabase origin, and the
 * admin console may upload files to it. The public site ("site") may do
 * neither. See docs/phase-1/security.md, docs/PHASE_2A.md and docs/PHASE_2C.md.
 */
function contentSecurityPolicy(area: "site" | "portal" | "admin") {
  const storage = area !== "site" && storageOrigin ? ` ${storageOrigin}` : "";
  const upload = area === "admin" && storageOrigin ? ` ${storageOrigin}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${storage}`,
    ...(storage ? [`media-src 'self' blob:${storage}`] : []),
    "font-src 'self'",
    // formsubmit.co: the browser completes the email hand-off for enquiries
    // (see src/lib/leads/browser-relay.ts). Nothing else may be contacted,
    // except the evidence uploads from the admin console.
    `connect-src 'self' https://formsubmit.co${upload}${isDev ? " ws: wss:" : ""}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // No `upgrade-insecure-requests`: every asset is same-origin and relative, and
    // HSTS already enforces HTTPS in production. The directive only broke plain-HTTP
    // previews (WebKit upgrades even localhost requests).
  ].join("; ");
}

const csp = contentSecurityPolicy("site");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

/**
 * Pre-launch switch (`allowSearchIndexing` in src/config/site.ts): while it is
 * false, every response asks search engines not to index the site. It uses a
 * response header, not a robots.txt Disallow, so crawlers can still fetch pages
 * and see the instruction. Vercel already sends this header on Preview
 * deployments; this covers Production.
 */
const noIndexHeaders = siteConfig.allowSearchIndexing ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

/** The private workspace and auth callbacks are never indexed or cached, launched or not. */
const privateHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "private, no-store" },
];

// These come after the site-wide headers, so their Content-Security-Policy replaces the site's.
const portalHeaders = [...privateHeaders, { key: "Content-Security-Policy", value: contentSecurityPolicy("portal") }];
const adminHeaders = [...privateHeaders, { key: "Content-Security-Policy", value: contentSecurityPolicy("admin") }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: [...securityHeaders, ...noIndexHeaders] },
      { source: "/app/:path*", headers: portalHeaders },
      { source: "/app", headers: portalHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
      { source: "/admin", headers: adminHeaders },
      { source: "/auth/:path*", headers: privateHeaders },
    ];
  },
  async redirects() {
    return [{ source: "/security", destination: "/trust", permanent: true }];
  },
};

export default nextConfig;
