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
   * global MAX_ANGULAR clamp. Kept within a fairly tight band (0.010–0.016)
   * on request, though — frictionAir is air drag, and under gravity that's
   * the ONLY thing that makes one item's fall visibly faster or slower than
   * another's (mass/density alone doesn't change fall acceleration, same as
   * real gravity); the original spread was 0.008–0.035, over 4x top to
   * bottom, which read as items dropping at noticeably different speeds
   * rather than falling together. Relative order (lighter items still drag
   * a little more than heavier ones) is preserved, just compressed.
   *
   * restitution values were cut hard (roughly a third of their old selves)
   * after items were landing in their correct lane, then visibly bouncing
   * off the jar floor and skidding toward center on the rebound — even
   * after jar-wall's own restitution was already lowered once. Root cause:
   * Matter's resolver uses the *larger* of the two colliding bodies'
   * restitution, not an average, so a bouncy item landing on a
   * low-restitution floor still bounces at the item's own value. The old
   * top end (kitty-mirror 0.35, pineapple 0.3) is what was actually
   * driving the center-drift, not the wall. Relative character between
   * items is kept (mirror still bounces a touch more than a plush) but
   * compressed into a much narrower, much lower band. */
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
  /** Degrees, positive = clockwise. Applied as the body's spawn angle (see
   * spawnBody in useJarPhysics) — the orientation it *falls in at*, not a
   * guaranteed final rest angle. A lockRotation item stays close to this
   * the whole way down (only a small natural tilt from collisions); an
   * unlocked one tumbles normally from here and can drift further by the
   * time it settles. Omitted (or 0) falls in upright, same as before this
   * field existed. */
  rotate?: number;
  /** Restricts alpha-bbox scanning (see computeAlphaBBox in alpha-bbox.ts)
   * to a sub-rectangle of the source file, normalised 0–1. For items where
   * the alpha-trimmed content includes something that shouldn't drive
   * sizing/physics/layering — cam.png's beaded strap dangles well past the
   * camera body and was dragging the bbox (and therefore the div, which
   * clips to it) out with it. Measured by hand against the actual PNG,
   * not derived from anything else. */
  cropRegion?: { left: number; top: number; right: number; bottom: number };
}

/**
 * Items from public/images/items/, one entry per PNG actually placed in
 * the jar. handcream/hufflepuff/kitty-plush/bingsu were removed from the
 * roster (their PNGs are gone from the folder); bingsu is pending a
 * replacement image and has no entry here yet either. cam/bear-hirono/
 * rabbit are new additions. Never source jar items from
 * public/images/projects/; those are 3:2 crops for the project cards, not
 * the tighter cut-outs used here.
 */
export const JAR_ITEMS: JarItemDef[] = [
  // Sized down 0.8x, then back up slightly to 0.9x — 0.8 read too small
  // next to the resized favourites below.
  { id: "cybersea", src: "/images/items/cybersea.png", category: "project", sizeScale: 0.9, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.05, frictionAir: 0.011, lockRotation: true },
  { id: "skinsprout", src: "/images/items/skinsprout.png", category: "project", sizeScale: 0.9, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.05, frictionAir: 0.011, lockRotation: true },
  { id: "spotify", src: "/images/items/spotify.png", category: "project", sizeScale: 0.9, shape: "box", density: 0.0012, friction: 0.45, restitution: 0.05, frictionAir: 0.011, lockRotation: true },

  // sizeScale for the 7 items below is reverse-engineered from the old
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
  // the old design had between items. Re-verified directly against the
  // actual PNGs (measured alpha bbox / raw file longest edge, same formula)
  // — every value below was within 0.5% of that measurement, so this
  // reverse-engineering was accurate, not the cause of any sizing
  // complaint: it faithfully reproduces the *proportions* the old design
  // had between items.
  //
  // bottle/chips were still called out as reading too small despite that —
  // likely because each is a comparatively thin/sparse shape (a narrow
  // bottle, a lopsided bag), so matching the *same bounding-box diagonal*
  // as a chunkier item still reads as visually smaller. Bumped by hand past
  // what pure proportional reverse-engineering gives, since the eye is the
  // actual spec here.
  // Sized up 0.91 -> 1.05, then further to 1.22 — still read too small
  // relative to the rest of the roster.
  { id: "ballet", src: "/images/items/ballet.png", category: "favourite", sizeScale: 1.22, shape: "blob", density: 0.0005, friction: 0.5, restitution: 0.06, frictionAir: 0.015 },
  // Sized up 1.3x, then a further small bump to 1.4x — still read a touch
  // small. Falls in rotated 90° so it lands lying on its side rather than
  // standing upright — it's long and thin, and stood upright it was
  // reading as visually odd against the rest of the (mostly laid-down)
  // pile. Already lockRotation, so it stays close to this the whole way
  // down.
  { id: "bottle", src: "/images/items/bottle.png", category: "favourite", sizeScale: 1.4, shape: "blob", density: 0.002, friction: 0.35, restitution: 0.04, frictionAir: 0.01, lockRotation: true, rotate: 90 },
  // Falls in rotated 32° cw — was 20°, nudged steeper to better match the
  // sharper diagonal in the reference collage. Still paired against
  // pineapple's 20° ccw so the two lean away from each other. Not
  // lockRotation, so this is where it *enters* the pile, not a guaranteed
  // final rest angle (see rotate's own doc comment above).
  { id: "chips", src: "/images/items/chips.png", category: "favourite", sizeScale: 1.32, shape: "blob", density: 0.0004, friction: 0.5, restitution: 0.07, frictionAir: 0.016, rotate: 50 },
  { id: "kitty-mirror", src: "/images/items/kitty-mirror.png", category: "favourite", sizeScale: 1.23, shape: "blob", density: 0.001, friction: 0.3, restitution: 0.1, frictionAir: 0.011, lockRotation: true },
  // Sized up 1.07 -> 1.22 — read too small relative to the rest of the
  // roster. Falls in rotated 90° so it lands lying on its side rather than
  // upright — already lockRotation, so it stays close to that the whole
  // way down.
  { id: "laneige", src: "/images/items/laneige.png", category: "favourite", sizeScale: 1.22, shape: "blob", density: 0.0007, friction: 0.4, restitution: 0.08, frictionAir: 0.013, lockRotation: true, rotate: 0 },
  // Falls in rotated 20° ccw (see chips above).
  { id: "pineapple", src: "/images/items/pineapple.png", category: "favourite", sizeScale: 1.16, shape: "blob", density: 0.0016, friction: 0.25, restitution: 0.08, frictionAir: 0.01, rotate: -20 },
  // lockRotation added: skullpanda was the one item repeatedly showing up
  // in frame-by-frame recordings as still visibly moving well after
  // everything else looked done — not a translation drift, a slow
  // rotational settle (it was the one large item in this crowded corner
  // without lockRotation, so nothing stopped it from still turning a
  // little as it found its final resting angle). That last bit of
  // rotation, on a large/central item, reads as "the pile jumping" even
  // though its position barely moved. Same treatment already given to
  // bottle/laneige/kitty-mirror/cam/cybersea/skinsprout/spotify.
  { id: "skullpanda", src: "/images/items/skullpanda.png", category: "favourite", sizeScale: 1.34, shape: "blob", density: 0.0006, friction: 0.6, restitution: 0.06, frictionAir: 0.015, lockRotation: true },

  // New arrivals this round — no old-Jar.js reference value to reverse-
  // engineer a sizeScale from (see the comment block above), so these
  // started at the neutral 1.0 baseline and got hand-adjusted from there
  // once seen live.
  // Sized up 1.1x, then back down a little to 1.0x. cropRegion measured
  // against the actual PNG (996×800) — keeps the camera body (roughly
  // x:135–955, y:0–455) and excludes the beaded strap/charm hanging below
  // and to the left of it, which was inflating the alpha bbox (see
  // cropRegion's own doc comment).
  { id: "cam", src: "/images/items/cam.png", category: "favourite", sizeScale: 1.0, shape: "blob", density: 0.0012, friction: 0.4, restitution: 0.05, frictionAir: 0.012, lockRotation: true, cropRegion: { left: 0.1355, top: 0, right: 0.9588, bottom: 0.56875 } },
  // Sized up 1.5x, then back down a little to 1.35x.
  // lockRotation added: this (not skullpanda — those two were mixed up by
  // mistake for a round) was the item actually still turning slightly in
  // frame-by-frame recordings well after the rest of the pile looked done
  // — a large, centrally-placed item with nothing stopping it from still
  // finding its final angle late. Same fix, correct target this time.
  { id: "bear-hirono", src: "/images/items/bear-hirono.png", category: "favourite", sizeScale: 1.35, shape: "blob", density: 0.0006, friction: 0.5, restitution: 0.06, frictionAir: 0.015, lockRotation: true },
  // Sized up 1.5x (was 1.0). Falls in rotated 90° so it lands lying down
  // (was standing straight up, which read wrong for its long/skinny shape
  // — same fix as bottle/laneige). Wasn't lockRotation before; added it so
  // it actually stays laid down once it settles instead of being free to
  // tumble back upright.
  { id: "rabbit", src: "/images/items/rabbit.png", category: "favourite", sizeScale: 1.5, shape: "blob", density: 0.0005, friction: 0.5, restitution: 0.07, frictionAir: 0.015, lockRotation: true, rotate: 90 },
];
