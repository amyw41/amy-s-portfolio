export type ProjectCategory = "work" | "personal" | "hackathon";

export interface Project {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  /** /images/projects/<slug>/cover.webp — always derived from slug (see
   * coverPath below), never authored per-entry. */
  cover: string;
  /** /images/projects/<slug>/<slug>.mp4 — same derivation. Omitted
   * entirely (not just falsy) for a project with no video, so ProjectCard
   * can tell "no video" apart from "video not loaded yet" at the type
   * level, and never renders an empty <video> for one. */
  video?: string;
  /** Case-study gallery assets — empty until case-study pages exist.
   * TODO: populate once /projects/[slug] case-study pages are built. */
  gallery: string[];
}

function coverPath(slug: string): string {
  return `/images/projects/${slug}/cover.webp`;
}

function videoPath(slug: string): string {
  return `/images/projects/${slug}/${slug}.mp4`;
}

interface ProjectSeed {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  hasVideo: boolean;
}

/**
 * Authoring order here IS the default display order (see Projects/index.tsx
 * — filtering stable-partitions this list rather than reordering it, so
 * turning every filter back off always collapses back to exactly this
 * sequence). Add a project by adding one seed: cover/video paths derive
 * from `slug` alone (coverPath/videoPath above), nothing else to update.
 *
 * `title` is this project's own display name — the brief only specified
 * each project's slug + description, so these are my own best-guess
 * proper-cased names; edit freely, they're not derived from anything.
 */
const PROJECT_SEEDS: ProjectSeed[] = [
  {
    slug: "skinsprout",
    title: "SkinSprout",
    description: "Track your skincare history to get personalized product recommendations.",
    category: "personal",
    hasVideo: true,
  },
  {
    slug: "cybersea",
    title: "CyberSea",
    description: "Plan and understand Arctic routes with live data and interactive 3D maps.",
    category: "hackathon",
    hasVideo: true,
  },
  {
    // Was "spotify-guessr" — coverPath/videoPath derive their path from
    // this slug alone (see their own comments above), but the actual
    // asset folder on disk is public/images/projects/spotify/, not
    // .../spotify-guessr/, so every derived path 404'd (the broken
    // thumbnail). Matching the real folder name fixes it without adding
    // a special case to coverPath/videoPath.
    slug: "spotify",
    title: "Spotify Guessr",
    description: "Turn your Spotify Blend into a multiplayer guessing game.",
    category: "personal",
    hasVideo: false,
  },
];

export const PROJECTS: Project[] = PROJECT_SEEDS.map((seed) => ({
  slug: seed.slug,
  title: seed.title,
  description: seed.description,
  category: seed.category,
  cover: coverPath(seed.slug),
  video: seed.hasVideo ? videoPath(seed.slug) : undefined,
  gallery: [], // TODO: case-study gallery assets
}));

/** Matches the category filter circles in Projects/index.tsx — the same
 * colour drives both the filter's own CircleToggle and each card's category
 * dot, so they read as one system. */
export const PROJECT_CATEGORY_COLOR: Record<ProjectCategory, string> = {
  work: "var(--c-magenta)",
  personal: "var(--c-blue)",
  hackathon: "var(--c-red)",
};
