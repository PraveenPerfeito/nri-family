import type { NextConfig } from "next";
import { siteConfig } from "./src/config/site";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy for the public site.
 *
 * Next.js injects inline bootstrap scripts, so `script-src` allows
 * 'unsafe-inline'. A nonce-based policy (via `proxy.ts`) would force every
 * page to render dynamically; revisit that trade-off when authenticated
 * layers (portal/admin) are added. See docs/phase-1/security.md.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // No `upgrade-insecure-requests`: every asset is same-origin and relative, and
  // HSTS already enforces HTTPS in production. The directive only broke plain-HTTP
  // previews (WebKit upgrades even localhost requests).
].join("; ");

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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders, ...noIndexHeaders] }];
  },
  async redirects() {
    return [{ source: "/security", destination: "/trust", permanent: true }];
  },
};

export default nextConfig;
