import type { JarItemCategory } from "./items.manifest";

/** Matches the CircleToggle pair's own colours in Hero/index.tsx (projects
 * -> --c-red, favourites -> --c-blue) — the same category/colour pairing,
 * just needed here too since JarItem borders independently per item. */
export const CATEGORY_COLOR: Record<JarItemCategory, string> = {
  project: "var(--c-red)",
  favourite: "var(--c-blue)",
};

export interface JarItemVisualState {
  /** Overlaid with a white silhouette at var(--dim-white) opacity (see
   * JarItem.tsx) — never a plain opacity drop on the item itself, per the
   * Figma construction this reproduces. */
  dimmed: boolean;
  /** Ringed/box-shadowed in the item's own category colour (see
   * JarItem.tsx's two border techniques, chosen by item.shape). */
  bordered: boolean;
}

const NEITHER: JarItemVisualState = { dimmed: false, bordered: false };
const BOTH_ON: JarItemVisualState = { dimmed: false, bordered: true };

/**
 * Toggle truth table (see the CircleToggle pair in Hero/index.tsx):
 *   both OFF     -> everything full opacity, no borders
 *   projects ON  -> project items lit+bordered, favourites dimmed
 *   favourites ON -> favourite items lit+bordered, projects dimmed
 *   both ON      -> everything full opacity, everything bordered
 *
 * Pure function of an item's own category plus the two toggle booleans —
 * clicking an item never feeds into this (see JarItem.tsx's own doc
 * comment): only position/layer order responds to a click.
 */
export function getJarItemVisualState(
  category: JarItemCategory,
  projectsOn: boolean,
  favouritesOn: boolean,
): JarItemVisualState {
  if (!projectsOn && !favouritesOn) return NEITHER;
  if (projectsOn && favouritesOn) return BOTH_ON;
  const isProject = category === "project";
  const isOwnCategoryOn = projectsOn ? isProject : !isProject;
  return { dimmed: !isOwnCategoryOn, bordered: isOwnCategoryOn };
}
