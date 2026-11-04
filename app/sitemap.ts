import type { MetadataRoute } from "next";
import { ETC_CATEGORIES } from "@/lib/etc";

const BASE = "https://amyz.wang";

// Case studies live at the site root (app/[slug]/), so those are the URLs
// listed here rather than the /projects/[slug] duplicates.
// No "extras": /extras redirects to the Play page's "little design things"
// section now (next.config.ts).
const CASE_STUDY_SLUGS = ["cybersea", "spotify", "skinsprout"];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/about",
    "/playground",
    ...CASE_STUDY_SLUGS.map((slug) => `/${slug}`),
    ...ETC_CATEGORIES.map((cat) => `/playground/${cat.slug}`),
  ];
  return paths.map((path) => ({
    url: `${BASE}${path}`,
    priority: path === "" ? 1 : 0.7,
  }));
}
