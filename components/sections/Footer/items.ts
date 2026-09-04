export interface FooterItemDef {
  id: string;
  src: string;
  /** Centre point as a percentage of the panel's own box, so the
   * arrangement holds together as the panel scales. */
  left: number;
  top: number;
  /** Degrees, positive = clockwise. Fixed per item rather than randomised,
   * so the pile is stable across reloads. */
  rotate: number;
  /** Two-layer crop, same technique as the jar's JarItem.tsx: clipW/clipH is
   * the visible box (the artwork's alpha bounding box), and imgW/imgH/
   * imgLeft/imgTop place the full source file behind it so the artwork lands
   * inside that box. All six are px at ITEM_SCALE.
   *
   * imgW/imgH/imgLeft/imgTop describe the source file, so re-cropping a file
   * invalidates them and they have to be re-derived. */
  clipW: number;
  clipH: number;
  imgW: number;
  imgH: number;
  imgLeft: number;
  imgTop: number;
}

/** Stands in for the jar's live `s = width / REFERENCE_WIDTH`, so the footer
 * reuses the jar's sizing formula at a fixed, footer-appropriate scale and
 * keeps the same relative sizes between items. */
const ITEM_SCALE = 2;

/**
 * Array order is the initial back-to-front stacking (Footer/index.tsx's
 * `order` state takes over once an item is clicked). The order below encodes
 * the layering the design calls for:
 * - laneige behind everything
 * - chips < ballet < bottle
 * - bottle < bear-hirono < skullpanda
 * - pineapple, cam < kitty-mirror < rabbit
 *
 * The three project tiles have no layering rule and sit alone at the far
 * left, so they are simply placed last.
 *
 * No per-item `alt`: these are decorative and the whole item is aria-hidden
 * in FooterItem.tsx.
 */
export const FOOTER_ITEMS: FooterItemDef[] = [
  {
    id: "laneige",
    src: "/images/items/laneige.webp",
    left: 59,
    top: 52,
    rotate: 6,
    clipW: 156.2,
    clipH: 65.7,
    imgW: 170.9,
    imgH: 72.4,
    imgLeft: 2.9,
    imgTop: 6.3,
  },
  {
    id: "chips",
    src: "/images/items/chips.webp",
    left: 89,
    top: 80,
    rotate: -12,
    clipW: 185.4,
    clipH: 219.7,
    imgW: 206.9,
    imgH: 244.7,
    imgLeft: 4.2,
    imgTop: 2.5,
  },
  {
    id: "ballet",
    src: "/images/items/ballet.webp",
    left: 95,
    top: 35,
    rotate: 70,
    clipW: 120.4,
    clipH: 156.2,
    imgW: 160.2,
    imgH: 196.0,
    imgLeft: 0.2,
    imgTop: 0.0,
  },

  {
    id: "skullpanda",
    src: "/images/items/skullpanda.webp",
    left: 68,
    top: 35,
    rotate: -20,
    clipW: 125.6,
    clipH: 171.5,
    imgW: 139.8,
    imgH: 190.0,
    imgLeft: 2.8,
    imgTop: 0.8,
  },

  {
    id: "cam",
    src: "/images/items/cam.webp",
    left: 40,
    top: 52,
    rotate: -10,
    clipW: 128.0,
    clipH: 69.2,
    imgW: 163.7,
    imgH: 131.9,
    imgLeft: -21.0,
    imgTop: 0.2,
  },
  {
    id: "kitty-mirror",
    src: "/images/items/kitty-mirror.webp",
    left: 50,
    top: 80,
    rotate: 9,
    clipW: 130.0,
    clipH: 157.4,
    imgW: 149.6,
    imgH: 177.4,
    imgLeft: 0.4,
    imgTop: 0.0,
  },
  {
    id: "bottle",
    src: "/images/items/bottle.webp",
    left: 75,
    top: 60,
    rotate: -20,
    clipW: 161.7,
    clipH: 179.2,
    imgW: 188.5,
    imgH: 208.6,
    imgLeft: 11.7,
    imgTop: 10.2,
  },
  {
    id: "bear-hirono",
    src: "/images/items/bear-hirono.webp",
    left: 65,
    top: 82,
    rotate: 30,
    clipW: 91.3,
    clipH: 172.8,
    imgW: 121.3,
    imgH: 192.7,
    imgLeft: 0.0,
    imgTop: 0.1,
  },
  {
    id: "cybersea",
    src: "/images/items/cybersea.webp",
    left: 20,
    top: 60,
    rotate: 10,
    clipW: 115.2,
    clipH: 85.0,
    imgW: 135.2,
    imgH: 105.0,
    imgLeft: 0.0,
    imgTop: 0.0,
  },
  {
    id: "pineapple",
    src: "/images/items/pineapple.webp",
    left: 20,
    top: 90,
    rotate: -20,
    clipW: 83.9,
    clipH: 148.5,
    imgW: 88.8,
    imgH: 156.6,
    imgLeft: 2.7,
    imgTop: 0.9,
  },
  {
    id: "rabbit",
    src: "/images/items/rabbit.webp",
    left: 33,
    top: 88,
    rotate: 70,
    clipW: 82.5,
    clipH: 192.0,
    imgW: 82.5,
    imgH: 192.0,
    imgLeft: 0.0,
    imgTop: 0.0,
  },
  {
    id: "skinsprout",
    src: "/images/items/skinsprout.webp",
    left: 3,
    top: 88,
    rotate: 4,
    clipW: 115.2,
    clipH: 85.0,
    imgW: 135.2,
    imgH: 105.0,
    imgLeft: 0.0,
    imgTop: 0.0,
  },
  {
    id: "spotify",
    src: "/images/items/spotify.webp",
    left: 2,
    top: 52,
    rotate: -10,
    clipW: 115.2,
    clipH: 85.0,
    imgW: 135.2,
    imgH: 105.0,
    imgLeft: 0.0,
    imgTop: 0.0,
  },
];
