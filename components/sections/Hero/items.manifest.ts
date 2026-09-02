export type JarItemCategory = "project" | "favourite";
export type JarItemShape = "blob" | "box";

export interface JarItemDef {
  id: string;
  src: string;
  category: JarItemCategory;
  /** Multiplier on BASE_SIZE (useJarPhysics) applied to the item's alpha
   * bounding box, never to the file's own pixel dimensions. */
  sizeScale: number;
  /** Drives the div's border-radius only. The physics hitbox is always a
   * rectangle matching the alpha bbox's aspect ratio. */
  shape: JarItemShape;
  /** Matter.js body character. The collision hitbox is not per-item — see
   * BODY_SCALE in useJarPhysics.
   *
   * Keep frictionAir within roughly 0.010–0.016. Under gravity, air drag is
   * the only one of these that changes how fast an item falls (mass does
   * not), so a wider spread reads as items dropping at different speeds
   * rather than falling together.
   *
   * Keep restitution low. Matter's resolver uses the larger of the two
   * colliding bodies' restitution, not an average, so a bouncy item still
   * bounces off the low-restitution jar floor and skids toward centre. */
  density: number;
  friction: number;
  restitution: number;
  frictionAir: number;
  /** Locks rotational inertia to Infinity: the item translates and collides
   * normally but never spins. */
  lockRotation?: boolean;
  /** Spawn angle in degrees, positive = clockwise. This is the orientation
   * the item falls in at, not a guaranteed resting angle — without
   * lockRotation it tumbles on from here. */
  rotate?: number;
  /** Restricts alpha-bbox scanning (computeAlphaBBox) to a sub-rectangle,
   * for artwork that shouldn't drive sizing or physics. Excluded content
   * still renders; this only keeps it out of the sizing math.
   *
   * Normalised against the source file's own dimensions, so re-cropping the
   * file invalidates it and it has to be re-derived. */
  cropRegion?: { left: number; top: number; right: number; bottom: number };
}

/**
 * One entry per file in public/images/items/. WebP, lossy on colour but
 * encoded with alphaQuality:100, so the alpha-driven sizing, physics and
 * hit-testing math is unaffected.
 *
 * Never source jar items from public/images/projects/ — those are 3:2 crops
 * for the project cards, not the tight cut-outs needed here.
 */
export const JAR_ITEMS: JarItemDef[] = [
  { id: "cybersea", src: "/images/items/cybersea.webp", category: "project", sizeScale: 0.9, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.05, frictionAir: 0.011, lockRotation: true },
  { id: "skinsprout", src: "/images/items/skinsprout.webp", category: "project", sizeScale: 0.9, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.05, frictionAir: 0.011, lockRotation: true },
  { id: "spotify", src: "/images/items/spotify.webp", category: "project", sizeScale: 0.9, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.05, frictionAir: 0.011, lockRotation: true },

  { id: "ballet", src: "/images/items/ballet.webp", category: "favourite", sizeScale: 1.22, shape: "blob", density: 0.0005, friction: 0.5, restitution: 0.06, frictionAir: 0.015, rotate: 90 },
  { id: "bottle", src: "/images/items/bottle.webp", category: "favourite", sizeScale: 1.4, shape: "blob", density: 0.002, friction: 0.35, restitution: 0.04, frictionAir: 0.01, lockRotation: true, rotate: 90 },
  { id: "chips", src: "/images/items/chips.webp", category: "favourite", sizeScale: 1.32, shape: "blob", density: 0.0004, friction: 0.5, restitution: 0.07, frictionAir: 0.016, rotate: 50 },
  { id: "kitty-mirror", src: "/images/items/kitty-mirror.webp", category: "favourite", sizeScale: 1.23, shape: "blob", density: 0.001, friction: 0.3, restitution: 0.1, frictionAir: 0.011, lockRotation: true },
  { id: "laneige", src: "/images/items/laneige.webp", category: "favourite", sizeScale: 1.22, shape: "blob", density: 0.0007, friction: 0.4, restitution: 0.08, frictionAir: 0.013, lockRotation: true, rotate: 0 },
  { id: "pineapple", src: "/images/items/pineapple.webp", category: "favourite", sizeScale: 1.16, shape: "blob", density: 0.0016, friction: 0.25, restitution: 0.08, frictionAir: 0.01, rotate: -20 },
  { id: "skullpanda", src: "/images/items/skullpanda.webp", category: "favourite", sizeScale: 1.34, shape: "blob", density: 0.0006, friction: 0.6, restitution: 0.06, frictionAir: 0.015, lockRotation: true },

  // cropRegion keeps the camera body and excludes the beaded strap, which
  // otherwise inflates the alpha bbox. Re-derived when the file was
  // alpha-trimmed from 996×800 to 981×779; it selects the same artwork.
  { id: "cam", src: "/images/items/cam.webp", category: "favourite", sizeScale: 1.0, shape: "blob", density: 0.0012, friction: 0.4, restitution: 0.05, frictionAir: 0.012, lockRotation: true, cropRegion: { left: 0.1376, top: 0, right: 0.9735, bottom: 0.5661 } },
  { id: "bear-hirono", src: "/images/items/bear-hirono.webp", category: "favourite", sizeScale: 1.35, shape: "blob", density: 0.0006, friction: 0.5, restitution: 0.06, frictionAir: 0.015, lockRotation: true },
  { id: "rabbit", src: "/images/items/rabbit.webp", category: "favourite", sizeScale: 1.5, shape: "blob", density: 0.0005, friction: 0.5, restitution: 0.07, frictionAir: 0.015, lockRotation: true, rotate: 90 },
];
