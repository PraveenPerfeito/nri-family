import type { Metadata } from "next";
import { absoluteUrl, homeTitle, siteConfig } from "@/config/site";

type PageMetadataInput = {
  /** Page title without the brand suffix. Omit on the homepage. */
  title?: string;
  description: string;
  path: string;
  /** Set for pages that should not appear in search results. */
  noIndex?: boolean;
};

/**
 * Build consistent per-page metadata: unique title, description, canonical
 * URL, Open Graph and Twitter/X cards. The OG image comes from
 * `app/opengraph-image.tsx` and is inherited by every route.
 */
export function pageMetadata({ title, description, path, noIndex }: PageMetadataInput): Metadata {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : homeTitle;
  const url = absoluteUrl(path);
  // A page-level openGraph object replaces the inherited one, so the
  // generated image from app/opengraph-image.tsx is referenced explicitly.
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: `${siteConfig.name} — ${siteConfig.tagline}` };

  return {
    title: title ? title : { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: fullTitle,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
