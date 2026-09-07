/**
 * Photos for the Extras case study page's own collage (components/case-
 * studies/ExtrasCaseStudy.tsx) — same shape as lib/etc.ts's EtcPhoto (src/
 * caption/intrinsic width+height) plus a `category`, reused so the collage
 * can lay these out with the same natural-aspect-ratio box technique
 * Playground's own collage view uses (see components/sections/Playground/
 * justifiedLayout.ts) instead of a second, parallel implementation.
 */

/** Extras' own 3-category system — separate from lib/projects.ts's
 * ProjectCategory (work/personal/hackathon), since Extras isn't a Project
 * and its categories don't line up with those. Same "one color per
 * category, reused everywhere that category appears" idea as
 * PROJECT_CATEGORY_COLOR though, via EXTRAS_CATEGORY_COLOR below. */
export type ExtrasCategory = "graphic-design" | "designathon" | "other";

export interface ExtrasPhoto {
  src: string;
  caption: string;
  /** Intrinsic pixel size — drives the gallery's own natural-aspect-ratio
   * box, same as EtcPhoto's own width/height. */
  width: number;
  height: number;
  category: ExtrasCategory;
}

/** Drives both the sidebar's category-filter buttons (ExtrasCaseStudy.tsx)
 * and, were a color-coded dot ever added per photo, that dot too — same
 * "one color, one place" idea as lib/projects.ts's PROJECT_CATEGORY_COLOR.
 * designathon reuses the site's existing --c-red (this site's own
 * "hackathon"=red convention); graphic-design reuses --c-blue (closest
 * existing analogue, "personal"=blue); other gets the site's third color,
 * --c-magenta, rather than reusing red or blue a second time. Order here is
 * the actual display order requested (graphic design, designathon, other),
 * independent of color assignment. */
export const EXTRAS_CATEGORIES: { id: ExtrasCategory; label: string; color: string }[] = [
  { id: "graphic-design", label: "graphic design", color: "var(--c-blue)" },
  { id: "designathon", label: "designathon", color: "var(--c-red)" },
  { id: "other", label: "other", color: "var(--c-magenta)" },
];

// Order matters here, not just content: the collage (ExtrasCaseStudy.tsx)
// packs photos into 2 masonry columns via computeJustifiedLayout.
// 1. After Hours lands in column 1 (left) at the top.
// 2. Rust lands in column 2 (right) at the top.
// 3. Relish lands in column 1 under After Hours.
// 4. Nina lands in column 2 underneath Rust.
// 5. IISE lands in column 1 underneath Relish.
export const EXTRAS_PHOTOS: ExtrasPhoto[] = [
  {
    src: "/images/projects/extras/After Hours.png",
    caption: "After Hours Poster @ UWCS Club",
    width: 2488,
    height: 3208,
    category: "graphic-design",
  },
  {
    src: "/images/projects/extras/rust.png",
    caption: "Rust Poster @ UWCS Club",
    width: 2488,
    height: 3208,
    category: "graphic-design",
  },
  {
    src: "/images/projects/extras/relish.png",
    caption: "Relish @ Figma Make-a-thon 2026 (Waterloo)",
    width: 3348,
    height: 2324,
    category: "designathon",
  },
  {
    src: "/images/projects/extras/nina.png",
    caption: "Nina Café & Fleurs",
    width: 1440,
    height: 3707,
    category: "other",
  },
  {
    src: "/images/projects/extras/iise.png",
    caption: "IISE Conference 2026 Logo",
    width: 976,
    height: 766,
    category: "other",
  },
];
