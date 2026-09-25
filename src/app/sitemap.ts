import type { MetadataRoute } from "next";
import { indexableRoutes } from "@/config/routes";
import { absoluteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map(({ path, priority }) => ({
    url: absoluteUrl(path),
    changeFrequency: "monthly",
    priority,
  }));
}
