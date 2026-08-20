import Matter from "matter-js";

export interface JarShapePoint {
  x: number;
  y: number;
}

/**
 * Normalised (0–1) points relative to the jar image box, tracing the
 * jar's INTERIOR wall — offset slightly outward from the drawn ink line
 * (public/images/drawings/jar.png) so items can poke past the outline.
 *
 * Order: top-left mouth edge -> down the left wall -> across the bottom ->
 * up the right wall -> top-right mouth edge. This is a seed silhouette
 * (neck narrowing at the top, widening into a rounded body) — tune the
 * points by hand against the artwork using `?debug=physics`, which
 * overlays every wall segment in magenta.
 *
 * The mouth (the gap between the last point and the first) is
 * intentionally left unconnected so items can fall in.
 */
export const JAR_INTERIOR_POINTS: JarShapePoint[] = [
  // The mouth/neck here is widened well past jar.png's own drawn taper
  // (was 0.28–0.72 at the mouth, 0.2–0.8 at the flare) — jar-layout.ts's
  // TARGET_X_FRACTION spans columns from 0.22 to 0.78, and a column-pinned
  // body can never move sideways to route around a wall in its way, so any
  // column outside the clear opening would wedge against the neck forever
  // instead of ever entering. Items are already allowed to render past the
  // drawn ink line (see the comment below), so a wider invisible opening
  // here doesn't clash with that.
  //
  // First widened to 0.13/0.87, which left ~5px of nominal clearance for
  // the widest edge column (skullpanda, 0.78) — looked safe against the
  // *points* themselves, but createJarWallBodies pads each segment's own
  // length by its thickness (see computeJarWallRects), so a segment's
  // actual collision geometry extends noticeably past its nominal
  // endpoint. That ate the entire margin and then some: skullpanda wedged
  // against the padded corner of the right neck wall and never entered.
  // Widened again, generously this time, with real margin past whatever
  // the padding adds rather than a margin sized off the bare points.
  //
  // Shoulder widened once more, 0.12/0.88 -> 0.08/0.92, after bottle (lane
  // 0.8, the widest column — actually past this comment's own stated 0.22-
  // 0.78 range, which was never quite right) started wedging at the
  // shoulder and getting stuck instead of entering. Its item-side size was
  // bumped for a separate sizing fix (items.manifest.ts), which was enough
  // to close out what little clearance was actually left here — same
  // failure mode as the skullpanda case above, just triggered by a size
  // change on the item side this time instead of a margin change here.
  { x: 0.06, y: 0.06 }, // top-left mouth edge
  { x: 0.05, y: 0.14 }, // neck flaring outward
  { x: 0.08, y: 0.24 }, // shoulder, widening into body
  { x: 0.06, y: 0.38 }, // upper body, near full width
  { x: 0.05, y: 0.6 }, // body left wall
  { x: 0.06, y: 0.78 }, // lower body
  // The bottom used to round into the floor through a diagonal "curving
  // toward/up" corner point on each side (0.12/0.9 and 0.88/0.9) before
  // meeting a flattened-but-narrower floor (0.25-0.75). That diagonal was
  // itself still a slope: an item resting near either edge of the pile —
  // exactly where the outer-lane columns (pineapple at 0.2, ballet at
  // 0.78) land — sat right on top of it, and gravity pulled it down *and
  // inward* along that ramp same as the old curved-bowl floor did before
  // that first flattening pass. Squared off entirely now: the side walls
  // run straight down to the floor and the floor runs the *full* width
  // between them (0.06-0.94, not just the old 0.25-0.75 middle stretch),
  // so every column's landing spot — including both outer edges — is
  // sitting on flat ground with nothing left to slide down.
  { x: 0.06, y: 0.97 }, // bottom-left corner — straight down, no curve
  { x: 0.94, y: 0.97 }, // bottom-right corner — flat floor, full width
  { x: 0.94, y: 0.78 }, // lower body right — straight up, no curve
  { x: 0.95, y: 0.6 }, // body right wall
  { x: 0.94, y: 0.38 }, // upper body right
  { x: 0.92, y: 0.24 }, // shoulder right, narrowing to neck — widened to match the left shoulder above
  { x: 0.95, y: 0.14 }, // neck right, widened — see the left mouth edge's comment above
  { x: 0.94, y: 0.06 }, // top-right mouth edge
];

/** Wall thickness in px, at the jar's own current rendered size (pre-scale). */
export const JAR_WALL_THICKNESS = 20;

export interface JarWallRect {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

/**
 * Turns the normalised point chain into a list of segment rectangles
 * (midpoint, length, angle) in container-local px. Shared by the physics
 * wall builder and the `?debug=physics` overlay so both stay in sync.
 */
export function computeJarWallRects(
  points: JarShapePoint[],
  width: number,
  height: number,
  thickness: number,
): JarWallRect[] {
  const rects: JarWallRect[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const ax = a.x * width;
    const ay = a.y * height;
    const bx = b.x * width;
    const by = b.y * height;
    const dx = bx - ax;
    const dy = by - ay;
    // Padded by the wall thickness so adjacent segments overlap generously
    // at each joint instead of meeting edge-to-edge — an exact miter would
    // leave thin gaps at concave turns that a fast-falling body can wedge
    // into, which the solver then resolves as a violent ejection.
    const length = Math.hypot(dx, dy) + thickness;
    const angle = Math.atan2(dy, dx);
    rects.push({
      x: (ax + bx) / 2,
      y: (ay + by) / 2,
      width: length,
      height: thickness,
      angle,
    });
  }
  return rects;
}

/**
 * Builds the jar's static collision walls as a chain of thin rectangles —
 * one per segment of the point chain. This handles the concave jar
 * silhouette without needing polygon decomposition. The bottom is closed
 * because the point chain runs continuously across it; the mouth is left
 * open because the chain never connects its last point back to its first.
 */
/** Indices (into the segment list computeJarWallRects returns — one fewer
 * than the point count, segment i joins point[i] to point[i+1]) of the
 * segments that trace the jar's actual floor. Now just the single flat
 * segment connecting the bottom-left and bottom-right corners (see
 * JAR_INTERIOR_POINTS above — the bottom used to be several segments
 * approximating a curve; squaring it off left one straight floor segment).
 * Labelled apart from the side walls so useJarPhysics can tell "an item's
 * column-pinned body touched the actual floor (or the pile resting on it)"
 * apart from "it grazed a side wall while still falling" — see the
 * landedIds/collisionStart comment in useJarPhysics for why that
 * distinction matters. Ported from the old Jar.js reference's own isFloor
 * flag on its single floor rectangle. */
const FLOOR_SEGMENT_INDICES = new Set([6]);

export function createJarWallBodies(
  points: JarShapePoint[],
  width: number,
  height: number,
  thickness: number,
): Matter.Body[] {
  return computeJarWallRects(points, width, height, thickness).map((rect, i) =>
    Matter.Bodies.rectangle(rect.x, rect.y, rect.width, rect.height, {
      isStatic: true,
      angle: rect.angle,
      // Higher friction, lower restitution than before (was 0.4 / 0.15) —
      // paired with the flattened bottom above, this is what actually
      // stops an item that's touched the wall/floor from continuing to
      // creep: the old restitution kept it lightly bouncing, and each tiny
      // bounce was another chance to lose a little more ground to the
      // slope instead of just gripping where it landed.
      //
      // Dropped further, 0.05 -> 0.02, after items were still visibly
      // bouncing off the floor and skidding toward center on the rebound.
      // Matter's resolver takes the *larger* of the two colliding bodies'
      // restitution values (Pair.update, not an average) — so this wall
      // value was never the whole story; a landing item's own restitution
      // (items.manifest.ts) was winning that max() and driving the bounce
      // regardless of how low the floor's own number went. Lowered both
      // together — see items.manifest.ts for the matching item-side cut.
      friction: 0.8,
      restitution: 0.02,
      label: FLOOR_SEGMENT_INDICES.has(i) ? "jar-floor" : "jar-wall",
    }),
  );
}
