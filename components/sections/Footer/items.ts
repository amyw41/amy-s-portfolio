export interface FooterItemDef {
  id: string;
  src: string;
  alt: string;
  /** Percentage coordinates (of the panel's own box) for the item's
   * center point. Percentage, not px, so the loose-triangle arrangement
   * holds together while the panel scales with the viewport. */
  left: number;
  top: number;
  /** CSS width (a clamp() string, not a bare px number) so each item scales
   * with the viewport the same way the panel itself does. */
  width: string;
  /** Degrees, positive = clockwise. Fixed per item rather than randomised
   * at runtime so the "loose pile" look is stable across reloads instead
   * of reshuffling every time the page loads. */
  rotate: number;
}

/**
 * Items from public/images/items/, arranged into a loose right triangle
 * whose hypotenuse runs down the left side of the footer: denser/lower on
 * the left, thinning out toward the upper right. Ordered left to right,
 * bottom to top, matching that visual read.
 *
 * The design brief called for two more items here — "hello kitty plush"
 * and "hufflepuff" — but neither PNG exists in public/images/items/ (per
 * items.manifest.ts's own comment, both were already removed from the Hero
 * jar roster for the same reason: "their PNGs are gone from the folder").
 * Dropped rather than invented or substituted; add entries here once real
 * art exists for them.
 */
export const FOOTER_ITEMS: FooterItemDef[] = [
  { id: "pineapple", src: "/images/items/pineapple.png", alt: "Pineapple-shaped can", left: 8, top: 84, width: "clamp(70px, 9.5vw, 130px)", rotate: -9 },
  { id: "laneige", src: "/images/items/laneige.png", alt: "Laneige lip sleeping mask", left: 22, top: 67, width: "clamp(56px, 7.5vw, 100px)", rotate: 14 },
  { id: "ballet", src: "/images/items/ballet.png", alt: "Ballet flats", left: 37, top: 52, width: "clamp(64px, 8.5vw, 115px)", rotate: -16 },
  { id: "bottle", src: "/images/items/bottle.png", alt: "Water bottle", left: 54, top: 44, width: "clamp(50px, 7vw, 95px)", rotate: 8 },
  { id: "chips", src: "/images/items/chips.png", alt: "Bag of chips", left: 77, top: 24, width: "clamp(58px, 8vw, 105px)", rotate: -11 },
];
