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
  { x: 0.06, y: 0.06 }, // top-left mouth edge
  { x: 0.05, y: 0.14 }, // neck flaring outward
  { x: 0.12, y: 0.24 }, // shoulder, widening into body
  { x: 0.06, y: 0.38 }, // upper body, near full width
  { x: 0.05, y: 0.6 }, // body left wall
  { x: 0.06, y: 0.78 }, // lower body
  { x: 0.12, y: 0.9 }, // curving toward bottom
  // These three used to dip to y:0.98 at the centre (0.96/0.98/0.96) — a
  // shallow bowl that looked right against the art, but it's a real slope
  // under gravity: anything that lands off-centre keeps a steady pull
  // toward the middle instead of staying put, which is what was reported
  // as items "sliding to the center" after they'd already landed. Levelled
  // to a flat floor (same y across all three) so a landed item has nothing
  // left to slide down.
  { x: 0.25, y: 0.97 }, // bottom-left curve
  { x: 0.5, y: 0.97 }, // bottom centre
  { x: 0.75, y: 0.97 }, // bottom-right curve
  { x: 0.88, y: 0.9 }, // curving up right side
  { x: 0.94, y: 0.78 }, // lower body right
  { x: 0.95, y: 0.6 }, // body right wall
  { x: 0.94, y: 0.38 }, // upper body right
  { x: 0.88, y: 0.24 }, // shoulder right, narrowing to neck
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
export function createJarWallBodies(
  points: JarShapePoint[],
  width: number,
  height: number,
  thickness: number,
): Matter.Body[] {
  return computeJarWallRects(points, width, height, thickness).map((rect) =>
    Matter.Bodies.rectangle(rect.x, rect.y, rect.width, rect.height, {
      isStatic: true,
      angle: rect.angle,
      // Higher friction, lower restitution than before (was 0.4 / 0.15) —
      // paired with the flattened bottom above, this is what actually
      // stops an item that's touched the wall/floor from continuing to
      // creep: the old restitution kept it lightly bouncing, and each tiny
      // bounce was another chance to lose a little more ground to the
      // slope instead of just gripping where it landed.
      friction: 0.8,
      restitution: 0.05,
      label: "jar-wall",
    }),
  );
}
