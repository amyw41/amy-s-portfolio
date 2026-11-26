export type ProjectCategory = "work" | "personal" | "hackathon";

export interface Project {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  /** Displayed next to the title as "<title>; <year>" (ProjectCard.tsx) —
   * not derived from anything, just each project's own year. */
  year: number;
  /** /images/projects/<slug>/cover.webp — always derived from slug (see
   * coverPath below), never authored per-entry. */
  cover: string;
  /** /images/projects/<slug>/<slug>.mp4 — same derivation. Omitted
   * entirely (not just falsy) for a project with no video, so ProjectCard
   * can tell "no video" apart from "video not loaded yet" at the type
   * level, and never renders an empty <video> for one. */
  video?: string;
  /** Shown small in the home work view's right column (with the teaser
   * extras) instead of big on the left. Set it on a project's seed below. */
  small: boolean;
  /** A light tint of the project's own colour (its case study's highlight
   * colour), behind the home card's cover so the card shows it, not grey,
   * before the image loads. */
  tint: string;
  /** Case-study gallery assets — empty until case-study pages exist.
   * TODO: populate once the case-study pages (app/[slug]/) are built. */
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
  year: number;
  /** true: a small card in the home work view's right column, above the
   * teaser extras; otherwise a big one on the left. */
  small?: boolean;
  /** See Project.tint. */
  tint: string;
  /** Only when the cover isn't at the derived cover.webp path (a new file
   * name, so browsers and Next's image cache can't keep showing an old one). */
  cover?: string;
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
    slug: "cybersea",
    title: "CyberSea",
    description: "Making Arctic trade routes readable.",
    category: "hackathon",
    hasVideo: true,
    year: 2026,
    tint: "#e7ecf3", // light blue, CyberSeaCaseStudy's HIGHLIGHT
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
    description: "Turning a Spotify Blend into a party game.",
    category: "personal",
    hasVideo: false,
    year: 2026,
    tint: "#efedf5", // light purple, SpotifyCaseStudy's HIGHLIGHT
  },
  {
    slug: "skinsprout",
    title: "SkinSprout",
    description: "Helping people learn what works on their skin.",
    category: "personal",
    hasVideo: true,
    year: 2026,
    tint: "#faf1f6", // light pink, SkinSproutCaseStudy's HIGHLIGHT
  },
  // UW Flow: hidden for now (2026-11-26, nothing written yet). Uncomment to
  // bring its card back; its cover is in public/images/projects/uwflow/.
  // {
  //   slug: "uwflow",
  //   title: "UW Flow",
  //   description: "Redesigning how Waterloo students pick courses.",
  //   category: "work",
  //   hasVideo: false,
  //   year: 2026,
  //   tint: "#e6f3ef", // light teal, the cover's own background
  //   cover: "/images/projects/uwflow/cover-green.webp",
  // },
  {
    slug: "blueprint",
    title: "Blueprint",
    description: "A volunteer CRM for UW Blueprint's nonprofits.",
    category: "work",
    hasVideo: false,
    year: 2026,
    tint: "#e4ecfd", // light Blueprint blue, the cover's own background
  },
];

/** Whether `pathname` is a case-study page (app/[slug]/): those have their
 * own frame — a rail and a footer strip — so the site's taskbar and big
 * footer stay off them. */
export function isCaseStudyPath(pathname: string): boolean {
  return PROJECT_SEEDS.some((seed) => pathname === `/${seed.slug}`);
}

export const PROJECTS: Project[] = PROJECT_SEEDS.map((seed) => ({
  slug: seed.slug,
  title: seed.title,
  description: seed.description,
  category: seed.category,
  year: seed.year,
  cover: seed.cover ?? coverPath(seed.slug),
  video: seed.hasVideo ? videoPath(seed.slug) : undefined,
  small: seed.small ?? false,
  tint: seed.tint,
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
