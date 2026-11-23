// Pages that aren't finished yet: each shows the hand-drawn "under
// construction" barricade (components/ui/UnderConstruction) instead of its
// content, which stays in the repo untouched. Take a page out of here once
// it's done. (2026-11-23: About, Play and every case study.)
export const UNDER_CONSTRUCTION = {
  about: true,
  // The Play page and its category pages.
  play: true,
  // Case studies, by slug (app/[slug]/page.tsx).
  caseStudies: new Set(["cybersea", "spotify", "skinsprout", "extras"]),
};

/** Whether this path shows the barricade (so the taskbar and the big footer
 * stay off it: it fills the window on its own). */
export function isUnderConstructionPath(pathname: string): boolean {
  if (UNDER_CONSTRUCTION.about && (pathname === "/about" || pathname.startsWith("/about/"))) return true;
  if (UNDER_CONSTRUCTION.play && (pathname === "/playground" || pathname.startsWith("/playground/"))) return true;
  return UNDER_CONSTRUCTION.caseStudies.has(pathname.replace(/^\//, "").split("/")[0]);
}
