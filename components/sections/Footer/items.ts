export interface FooterItemDef {
  id: string;
  src: string;
  alt: string;
  /** Percentage coordinates (of the panel's own box) for the item's
   * center point. Percentage, not px, so the arrangement holds together
   * while the panel scales with the viewport. */
  left: number;
  top: number;
  /** Degrees, positive = clockwise. Fixed per item (not randomised at
   * runtime) so the pile is stable across reloads instead of reshuffling
   * every time the page loads. bottle/rabbit lie on their side (90°),
   * matching how they actually rest in the jar (see items.manifest.ts) —
   * everything else is a smaller freehand tilt for the "chaotic" look. */
  rotate: number;
  /** Everything below is this item's own geometry, in px, at this file's
   * ITEM_SCALE (see that constant's own comment) — clipW/clipH is the
   * outer (visible) box, matching the jar's own alpha-bbox-derived
   * on-screen footprint (see useJarPhysics.ts's RenderInfo/computeRenderInfo
   * and JarItem.tsx's .clip); imgW/imgH/imgLeft/imgTop position the FULL
   * source file behind that clip at the same scale, so the same fraction
   * of transparent padding gets cropped away here as in the jar. Together
   * these reproduce the jar's exact per-item proportions rather than a
   * freehand guess per item (which is what this file had before) — every
   * number below came from actually alpha-scanning the PNG in
   * public/images/items/ against items.manifest.ts's own sizeScale/
   * cropRegion, the same way useJarPhysics.ts's computeRenderInfo does,
   * then scaling the whole roster by one shared ITEM_SCALE. */
  clipW: number;
  clipH: number;
  imgW: number;
  imgH: number;
  imgLeft: number;
  imgTop: number;
}

/**
 * Every number in FOOTER_ITEMS below is BASE_SIZE(160, useJarPhysics.ts) ×
 * this item's own sizeScale (items.manifest.ts) × ITEM_SCALE — i.e. exactly
 * the jar's own itemDisplayScale formula, just evaluated at a fixed
 * "container width" (ITEM_SCALE stands in for the jar's `s = width /
 * REFERENCE_WIDTH`) instead of the jar's own live, responsive one. Same
 * formula, same relative sizes between items as the jar — just a different
 * (fixed, footer-appropriate) scale applied to it, since the footer panel
 * and the jar are two differently-sized boxes, not the same element. 0.8
 * (was 0.62 at first pass — read too sparse/empty against the panel; "make
 * overlap, not just correct relative sizes) was picked by eye once real
 * geometry was in.
 */
const ITEM_SCALE = 1.2;

/**
 * Items from public/images/items/, the same 10 actually in the jar's own
 * roster (see items.manifest.ts) minus the 3 project cards (cybersea/
 * skinsprout/spotify) — those are covered by the Projects section already,
 * not repeated here.
 *
 * Left-to-right order and layering both per brief:
 * pineapple, rabbit, cam, kitty-mirror, hirono, skullpanda, bottle, chips,
 * ballet each get their own horizontal slot in that order; laneige has no
 * slot of its own — it sits spatially above the cam/kitty-mirror pair
 * (overlapping their x-range, higher up the panel) rather than beside them.
 *
 * z-order (FOOTER_ITEMS' own array order = initial back-to-front stacking,
 * same convention as Footer/index.tsx's `order` state) satisfies every
 * layering constraint from the brief:
 * - laneige below everything → placed first (backmost)
 * - chips < ballet < bottle (chips under bottle; ballet under bottle, over
 *   chips)
 * - bottle < bear-hirono < skullpanda (skullpanda - hirono - bottle, front
 *   to back)
 * - pineapple, cam < kitty-mirror < rabbit (rabbit on top of pineapple, cam,
 *   and kitty-mirror; kitty-mirror on top of cam)
 * Clicking an item re-derives its own z-index from its position in
 * Footer/index.tsx's `order` state, same as before — this array order is
 * only the starting point, same as the old file.
 */
export const FOOTER_ITEMS: FooterItemDef[] = [
  {
    id: "laneige",
    src: "/images/items/laneige.png",
    alt: "Laneige lip sleeping mask",
    left: 70,
    top: 50,
    rotate: 6,
    clipW: 156.2,
    clipH: 65.7,
    imgW: 212.6,
    imgH: 203.3,
    imgLeft: -29.5,
    imgTop: -64.8,
  },
  {
    id: "chips",
    src: "/images/items/chips.png",
    alt: "Bag of chips",
    left: 85,
    top: 80,
    rotate: -12,
    clipW: 142.6,
    clipH: 169.0,
    imgW: 196.9,
    imgH: 203.2,
    imgLeft: -26.7,
    imgTop: -16.8,
  },
  {
    id: "ballet",
    src: "/images/items/ballet.png",
    // Re-measured against the replacement asset (the old ballet.png was the
    // wrong shoes entirely, swapped out directly on disk) — bbox geometry
    // here is specific to one file's own alpha content, so a new file needs
    // its own numbers, not just a new src path.
    alt: "Ballet shoes",
    left: 93,
    top: 70,
    rotate: -18,
    clipW: 120.4,
    clipH: 156.2,
    imgW: 121.2,
    imgH: 156.6,
    imgLeft: -0.6,
    imgTop: 0.0,
  },
  {
    id: "bottle",
    src: "/images/items/bottle.png",
    alt: "Water bottle",
    left: 81,
    top: 68,
    rotate: -20,
    clipW: 161.7,
    clipH: 179.2,
    imgW: 297.7,
    imgH: 300.4,
    imgLeft: -69.6,
    imgTop: -60.2,
  },
  {
    id: "bear-hirono",
    src: "/images/items/bear-hirono.png",
    alt: "Hirono bear figure",
    left: 69,
    top: 82,
    rotate: 20,
    clipW: 91.3,
    clipH: 172.8,
    imgW: 91.7,
    imgH: 173.6,
    imgLeft: -0.4,
    imgTop: -0.3,
  },
  {
    id: "skullpanda",
    src: "/images/items/skullpanda.png",
    alt: "Skullpanda figure",
    left: 76,
    top: 40,
    rotate: -8,
    clipW: 125.6,
    clipH: 171.5,
    imgW: 175.3,
    imgH: 187.0,
    imgLeft: -23.8,
    imgTop: -9.1,
  },
  {
    id: "pineapple",
    src: "/images/items/pineapple.png",
    alt: "Pineapple-shaped can",
    left: 30,
    top: 84,
    rotate: -20,
    clipW: 83.9,
    clipH: 148.5,
    imgW: 176.1,
    imgH: 187.8,
    imgLeft: -47.5,
    imgTop: -18.3,
  },
  {
    id: "cam",
    src: "/images/items/cam.png",
    alt: "Camera with beaded strap",
    left: 40,
    top: 56,
    rotate: -6,
    clipW: 128.0,
    clipH: 69.2,
    imgW: 156.2,
    imgH: 125.5,
    imgLeft: -21.0,
    imgTop: -2.2,
  },
  {
    id: "kitty-mirror",
    src: "/images/items/kitty-mirror.png",
    alt: "Hello Kitty compact mirror",
    left: 54,
    top: 82,
    rotate: 9,
    clipW: 130.0,
    clipH: 157.4,
    imgW: 133.1,
    imgH: 157.7,
    imgLeft: -2.5,
    imgTop: -0.3,
  },
  {
    id: "rabbit",
    src: "/images/items/rabbit.png",
    alt: "White Rabbit candy",
    left: 39,
    top: 84,
    rotate: 70,
    clipW: 82.5,
    clipH: 192.0,
    imgW: 83.0,
    imgH: 192.5,
    imgLeft: -0.2,
    imgTop: -0.3,
  },
];
