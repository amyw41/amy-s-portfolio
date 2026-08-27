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
// packs photos into 2 masonry columns in this exact order via
// computeJustifiedLayout — After Hours (portrait, tall) lands alone in
// column 1, then Designathon (landscape, short) and Rust (portrait) pack
// into column 2 one under the other, since Designathon leaves column 2
// shorter than column 1 at that point and Rust — same shape as After
// Hours — is what the greedy shortest-column algorithm drops in right
// underneath it. Rust *after* Designathon here is what makes that happen;
// swapping them changes which column each photo lands in.
export const EXTRAS_PHOTOS: ExtrasPhoto[] = [
  {
    src: "/images/projects/extras/After Hours.png",
    caption: "After Hours.",
    width: 2488,
    height: 3208,
    category: "graphic-design",
  },
  {
    src: "/images/projects/extras/relish.png",
    caption: "Designathon.",
    width: 3348,
    height: 2324,
    category: "designathon",
  },
  {
    src: "/images/projects/extras/rust.png",
    caption: "Rust.",
    width: 2488,
    height: 3208,
    category: "graphic-design",
  },
];
