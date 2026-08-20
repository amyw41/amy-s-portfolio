export type JarItemCategory = "project" | "favourite";
export type JarItemShape = "blob" | "box";

export interface JarItemDef {
  id: string;
  src: string;
  category: JarItemCategory;
  /** Multiplier on BASE_SIZE (see useJarPhysics) controlling how large this
   * item's alpha bounding box renders, at the 480px reference container
   * width. Sizing is driven entirely by the alpha bbox (see alpha-bbox.ts)
   * — never by the source file's own pixel dimensions. */
  sizeScale: number;
  /** Still drives the div's border-radius (see JarItem.tsx) — the physics
   * hitbox itself is a rectangle matching the alpha bbox's own aspect ratio
   * for every item now, regardless of this field (see useJarPhysics). */
  shape: JarItemShape;
  /** Matter.js body properties — my own judgment calls translating "what
   * this object is" into physical character (e.g. the plush is soft & light
   * so it jostles a lot and barely bounces; the water bottle is the
   * heaviest so it moves the least and thuds when it lands). The collision
   * hitbox itself is NOT per-item — see the global BODY_SCALE constant.
   * frictionAir is nudged up on the lightest (lowest-density) items so a
   * tumble bleeds off its spin naturally instead of relying solely on the
   * global MAX_ANGULAR clamp. */
  density: number;
  friction: number;
  restitution: number;
  frictionAir: number;
  /** Locks the body's rotational inertia to Infinity (see createBodyForItem
   * in useJarPhysics) so the item translates and collides normally but never
   * spins — ported from the old Jar.js reference's own `lockRotation` flag
   * on handcream/kitty-mirror/bottle/kitty-plush/laneige, extended to the 3
   * "project" items (cybersea/skinsprout/spotify) since their rectangular
   * card art reads as visibly wrong when tumbling, unlike the more organic
   * favourite items. */
  lockRotation?: boolean;
}

/**
 * 14 items from public/images/items/ — digi.png is intentionally excluded
 * (see jar-layout.ts's PLACEMENT_ORDER, which only accounts for 14). Never
 * source jar items from public/images/projects/; those are 3:2 crops for
 * the project cards, not the tighter cut-outs used here.
 */
export const JAR_ITEMS: JarItemDef[] = [
  { id: "cybersea", src: "/images/items/cybersea.png", category: "project", sizeScale: 1.0, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.1, frictionAir: 0.012, lockRotation: true },
  { id: "skinsprout", src: "/images/items/skinsprout.png", category: "project", sizeScale: 1.0, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.1, frictionAir: 0.012, lockRotation: true },
  { id: "spotify", src: "/images/items/spotify.png", category: "project", sizeScale: 1.0, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.1, frictionAir: 0.012, lockRotation: true },

  // sizeScale for the 11 items below is reverse-engineered from the old
  // Jar.js reference (see the comment block above JAR_ITEMS) rather than
  // authored freehand — that build gave every item the same nominal
  // `size: 187` (a uniform box, fit via object-contain on each PNG's own
  // untrimmed aspect ratio), so items with more baked-in transparent
  // padding rendered smaller on screen than items cropped tight to their
  // content, even though the code never said so explicitly. Recreating
  // that here meant measuring, per item, alpha-trimmed-bbox-longest-edge /
  // raw-file-longest-edge (same technique as alpha-bbox.ts, run offline
  // against the actual PNGs in public/images/items/) as a proxy for "how
  // much of the old 187 box was actually visible content", then scaling
  // those ratios so their mean lines up with this file's previous mean
  // sizeScale (~1.09) — preserving the overall jar scale already tuned
  // this session (BASE_SIZE=130) while reproducing the *relative* sizing
  // the old design had between items.
  { id: "ballet", src: "/images/items/ballet.png", category: "favourite", sizeScale: 0.91, shape: "blob", density: 0.0005, friction: 0.5, restitution: 0.15, frictionAir: 0.03 },
  { id: "bingsu", src: "/images/items/bingsu.png", category: "favourite", sizeScale: 0.95, shape: "blob", density: 0.0009, friction: 0.4, restitution: 0.2, frictionAir: 0.015 },
  { id: "bottle", src: "/images/items/bottle.png", category: "favourite", sizeScale: 0.87, shape: "blob", density: 0.002, friction: 0.35, restitution: 0.15, frictionAir: 0.008, lockRotation: true },
  { id: "chips", src: "/images/items/chips.png", category: "favourite", sizeScale: 1.22, shape: "blob", density: 0.0004, friction: 0.5, restitution: 0.2, frictionAir: 0.035 },
  { id: "handcream", src: "/images/items/handcream.png", category: "favourite", sizeScale: 1.23, shape: "blob", density: 0.0007, friction: 0.4, restitution: 0.25, frictionAir: 0.022, lockRotation: true },
  { id: "hufflepuff", src: "/images/items/hufflepuff.png", category: "favourite", sizeScale: 0.95, shape: "blob", density: 0.0003, friction: 0.7, restitution: 0.1, frictionAir: 0.045 },
  { id: "kitty-mirror", src: "/images/items/kitty-mirror.png", category: "favourite", sizeScale: 1.23, shape: "blob", density: 0.001, friction: 0.3, restitution: 0.35, frictionAir: 0.01, lockRotation: true },
  { id: "kitty-plush", src: "/images/items/kitty-plush.png", category: "favourite", sizeScale: 1.08, shape: "blob", density: 0.0006, friction: 0.6, restitution: 0.15, frictionAir: 0.03, lockRotation: true },
  { id: "laneige", src: "/images/items/laneige.png", category: "favourite", sizeScale: 1.07, shape: "blob", density: 0.0007, friction: 0.4, restitution: 0.25, frictionAir: 0.022, lockRotation: true },
  { id: "pineapple", src: "/images/items/pineapple.png", category: "favourite", sizeScale: 1.16, shape: "blob", density: 0.0016, friction: 0.25, restitution: 0.3, frictionAir: 0.008 },
  { id: "skullpanda", src: "/images/items/skullpanda.png", category: "favourite", sizeScale: 1.34, shape: "blob", density: 0.0006, friction: 0.6, restitution: 0.15, frictionAir: 0.03 },
];
