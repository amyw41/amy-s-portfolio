// Generates the hand-sketched oval outline used as a hover decoration on
// the hero's nav buttons (see ScribbleOval in index.tsx). Pulled out into
// its own module because it's a small parametrized generator, not markup:
// given the constants below, `buildWobblyOvalPath()` returns an SVG path
// `d` string tracing a single open, hand-sketched-looking ellipse outline.
//
// The brief this was built against, in short: a wide oval (not a circle),
// drawn as one continuous open stroke with a slight organic wobble in both
// radii (sine-based, not literal randomness, so the result is deterministic
// — see "Why deterministic" below) so it doesn't read as a clean geometric
// ellipse. The path sweeps past a full 360° (see OVERLAP_SWEEP_DEG) so the
// end overshoots back over the beginning, and that overshoot is placed on
// the lower-left of the oval (see SEAM_ANGLE_DEG) rather than centered or
// at the top. In that overlap region the two passes should run close and
// nearly parallel — a thin "lens" where the lines almost touch — rather
// than crossing at an obvious angle.
//
// Getting that lens to actually look like two close, parallel lines (and
// not either an invisible near-perfect overlap, or an obvious sharp X)
// turned out to need more than wobble alone: a periodic sine wobble with a
// non-integer frequency does make the two passes diverge slightly, but how
// much is at the mercy of wherever the wobble's phase happens to land after
// a full revolution — sometimes it's there, sometimes it's imperceptible.
// SEAM_DRIFT_PX makes the separation deliberate and controllable instead:
// it's a tiny amount the oval's radius grows by, spread across the ENTIRE
// sweep (not just the overlap), so for most of the loop it's far too
// gradual to notice, but by the time the path comes back around to the
// same angular position a second time, that accumulated growth is exactly
// what keeps the two passes a small, consistent distance apart — a lens,
// not a blur or a blank overlap. Read as "the hand drifted outward very
// slightly over one full loop," which is a perfectly natural thing for a
// real hand-drawn spiral to do.
//
// Why deterministic (no Math.random()): this path is computed once at
// module load and reused for all three nav buttons. Math.random() would
// make the shape different on every render, including differently on the
// server vs. the client — a hydration mismatch. Everything here is a pure
// function of the angle, so the shape is fixed but still looks organic.
//
// ---- configurable parameters (base values — see `seed` below for the
// per-instance variation) ----
const OVAL_RX = 58; // horizontal radius (px, in the path's own coordinate space)
const OVAL_RY = 13; // vertical radius — kept well under RX for a wide oval, not a circle
const CENTER_X = 57;
const CENTER_Y = 12;

// Organic wobble: sum of two sine waves at different (non-integer, so they
// don't resonate with the 360°/720° revolution and repeat exactly) cycle
// counts per revolution, so the jitter doesn't look like a single regular
// ripple. Amounts are in px, small relative to OVAL_RX/RY on purpose —
// this should read as a very slightly unsteady hand, not a jagged line.
const WOBBLE_AMOUNT_1 = 1.4;
const WOBBLE_FREQ_1 = 3.3; // wobble cycles per 360° sweep
const WOBBLE_AMOUNT_2 = 0.6;
const WOBBLE_FREQ_2 = 5.7;

const SEAM_ANGLE_DEG = 150; // 0°=right, 90°=bottom, 180°=left → 150° = lower-left
const OVERLAP_SWEEP_DEG = 385; // total sweep; the 25° past 360 is the overshoot
const SEAM_DRIFT_PX = 2.6; // total radius growth across the whole sweep — see comment above
const STEPS = 160; // sample resolution; higher = smoother curve

export const STROKE_COLOR = "currentColor"; // follows the button's own text color
export const STROKE_WIDTH = 0.75;
export const VIEW_BOX = "-12 -10 138 40";

// Deterministic pseudo-random in [0, 1) from two integers — the standard
// "sine hash" trick (no Math.random(), so the same seed always produces
// the exact same path: no hydration mismatch between server and client,
// and no flicker on re-render).
function hash(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function wobble(angleDeg: number, phaseShift: number, freq1: number, freq2: number): number {
  const rad = (angleDeg * Math.PI) / 180;
  return (
    WOBBLE_AMOUNT_1 * Math.sin(rad * freq1 + phaseShift) +
    WOBBLE_AMOUNT_2 * Math.sin(rad * freq2 + phaseShift * 1.7 + 1.3)
  );
}

// Smooths a dense point sample into a curve using quadratic beziers through
// successive midpoints — a standard trick for turning a polyline into a
// smooth freehand-looking line without visible facets. Shared by both the
// oval (below) and the circle variant (see buildWobblyCirclePath further
// down) — same smoothing technique, just fed a different point sequence.
function smoothPathFromPoints(points: [number, number][]): string {
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d += ` Q${x0.toFixed(2)},${y0.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
  }
  const [lastX, lastY] = points[points.length - 1];
  d += ` L${lastX.toFixed(2)},${lastY.toFixed(2)}`;
  return d;
}

// `seed` gives every instance (each nav button, in each place this is
// used) its own fixed-but-different variant — a different seam position,
// wobble phase, drift amount, and slight size, so no two ovals trace an
// identical line, while staying fully deterministic per seed (same seed
// always renders the same shape).
export function buildWobblyOvalPath(seed = 0): string {
  const seamAngle = SEAM_ANGLE_DEG + (hash(seed, 1) - 0.5) * 20; // ±10°
  const overlapSweep = OVERLAP_SWEEP_DEG + (hash(seed, 2) - 0.5) * 16; // ±8°
  const drift = SEAM_DRIFT_PX * (0.8 + hash(seed, 3) * 0.5); // 0.8x–1.3x
  const phaseA = hash(seed, 4) * Math.PI * 2;
  const phaseB = hash(seed, 5) * Math.PI * 2;
  const freq1 = WOBBLE_FREQ_1 + (hash(seed, 6) - 0.5) * 0.6; // slight cycle-count jitter
  const freq2 = WOBBLE_FREQ_2 + (hash(seed, 7) - 0.5) * 0.6;
  const rx = OVAL_RX + (hash(seed, 8) - 0.5) * 4; // ±2px
  const ry = OVAL_RY + (hash(seed, 9) - 0.5) * 2; // ±1px

  const points: [number, number][] = [];

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const angleDeg = seamAngle + overlapSweep * t;
    const rad = (angleDeg * Math.PI) / 180;
    const d = drift * t;
    const rCurrentX = rx + wobble(angleDeg, phaseA, freq1, freq2) + d;
    const rCurrentY = ry + wobble(angleDeg, phaseB, freq1, freq2) + d * (ry / rx);
    const x = CENTER_X + rCurrentX * Math.cos(rad);
    const y = CENTER_Y + rCurrentY * Math.sin(rad);
    points.push([x, y]);
  }

  return smoothPathFromPoints(points);
}

// ---- circle variant: same hand-sketched-spiral technique as the oval
// above (shared hash/wobble/smoothing), reused for Playground's plate hover
// (see PlateCircle.tsx) instead of a brand new shape generator — a true
// circle (rx===ry) rather than a wide oval, since it wraps a round plate
// rather than a short line of text. Own base constants below (seam angle/
// sweep/drift/radius) rather than reusing the oval's OVAL_RX etc., since
// those are tuned for a ~4.5:1 wide-oval aspect that has no equivalent
// here — but the wobble amount/frequency constants above (WOBBLE_AMOUNT_1/
// 2, WOBBLE_FREQ_1/2) carry over unchanged, since they're already tuned to
// read as "a slightly unsteady hand" independent of the traced shape's
// aspect ratio. ----

const CIRCLE_RADIUS = 54;
const CIRCLE_CENTER = 64;
const CIRCLE_SEAM_ANGLE_DEG = 150; // same lower-left placement as the oval
const CIRCLE_OVERLAP_SWEEP_DEG = 385;
const CIRCLE_SEAM_DRIFT_PX = 2.6;
const CIRCLE_STEPS = 160;

export const CIRCLE_STROKE_COLOR = "currentColor";
// Paired with vectorEffect="non-scaling-stroke" on the <path> (see
// PlateCircle.tsx) — PlateCircle renders at very different real pixel sizes
// (the full poster's PLATE_SIZE vs. CategoryDetail's smaller hub), and
// non-scaling-stroke keeps this a constant ~1px hand-drawn line regardless,
// rather than needing a different STROKE_WIDTH tuned per size the way the
// oval above (used at only two closely-sized places) doesn't have to.
export const CIRCLE_STROKE_WIDTH = 1;
// Local coordinate space is 0..128 (CIRCLE_CENTER=64, CIRCLE_RADIUS=54); the
// margin here covers the largest plausible reach — radius + both wobble
// amounts + max drift ≈ 54 + 2 + 3.4 ≈ 59.4 past center, so 14px of margin
// keeps every seed's peak wobble safely inside the viewBox with room to
// spare, same "margin on every side, overflow:visible as a second net"
// approach as the oval's own VIEW_BOX.
export const CIRCLE_VIEW_BOX = "-14 -14 156 156";

export function buildWobblyCirclePath(seed = 0): string {
  const seamAngle = CIRCLE_SEAM_ANGLE_DEG + (hash(seed, 101) - 0.5) * 20;
  const overlapSweep = CIRCLE_OVERLAP_SWEEP_DEG + (hash(seed, 102) - 0.5) * 16;
  const drift = CIRCLE_SEAM_DRIFT_PX * (0.8 + hash(seed, 103) * 0.5);
  const phaseA = hash(seed, 104) * Math.PI * 2;
  const phaseB = hash(seed, 105) * Math.PI * 2;
  const freq1 = WOBBLE_FREQ_1 + (hash(seed, 106) - 0.5) * 0.6;
  const freq2 = WOBBLE_FREQ_2 + (hash(seed, 107) - 0.5) * 0.6;
  const r = CIRCLE_RADIUS + (hash(seed, 108) - 0.5) * 4;

  const points: [number, number][] = [];

  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    const t = i / CIRCLE_STEPS;
    const angleDeg = seamAngle + overlapSweep * t;
    const rad = (angleDeg * Math.PI) / 180;
    const d = drift * t;
    // Single radius (not separate X/Y like the oval's rx/ry) — wobbled
    // identically in both axes so the traced shape stays a true circle
    // rather than drifting toward an ellipse.
    const rCurrent = r + wobble(angleDeg, phaseA, freq1, freq2) + d;
    const x = CIRCLE_CENTER + rCurrent * Math.cos(rad);
    const y = CIRCLE_CENTER + rCurrent * Math.sin(rad);
    points.push([x, y]);
  }

  return smoothPathFromPoints(points);
}

// ---- pill variant: for a Back button (arrow + word), NOT another oval —
// the oval above is deliberately squashed by whatever aspect ratio the
// element it's stretched over has (preserveAspectRatio="none", same as the
// circle above being stretched over a square plate), which reads fine on
// "playground"/"about"-style single-word nav labels (already close to the
// oval's own ~3.45:1 design ratio) but falls apart on "← Back": the box is
// proportionally much wider and shorter, and an ELLIPSE stretched that hard
// stops looking like a ring at all — its curvature flattens out almost
// everywhere except right at the two tips, reading as a faint flat line
// rather than something wrapping the text. A superellipse ("squircle": a
// circle-like curve raised to a higher power, SQUIRCLE_EXPONENT below) has
// mostly-flat sides and rounded corners even in its own base (undistorted)
// form — stretching THAT non-uniformly just widens/flattens a rounded
// rectangle, which still reads clearly as "a ring around this text" at any
// aspect ratio, instead of degenerating the way a true ellipse does. ----

const SQUIRCLE_HALF = 60; // half-size (both axes, pre-stretch) — center at SQUIRCLE_CENTER
const SQUIRCLE_CENTER = 64;
const SQUIRCLE_EXPONENT = 4; // higher = flatter sides / squarer corners; 2 would just be a circle
const SQUIRCLE_SEAM_ANGLE_DEG = 150; // same lower-left seam placement as the oval/circle
const SQUIRCLE_OVERLAP_SWEEP_DEG = 385;
const SQUIRCLE_SEAM_DRIFT_PX = 2.2;
const SQUIRCLE_STEPS = 200; // more than the circle's 160 — flatter sides show facets sooner at a coarser sample

export const PILL_STROKE_COLOR = "currentColor";
// Was 1.5 at first — paired with vectorEffect="non-scaling-stroke" on the
// <path> (same technique as the circle variant) so this renders at a
// constant thickness no matter how small the Back button's own font-size
// is, rather than the oval's thin stroke becoming near-invisible once
// squashed down to a ~20px-tall box. But once that near-invisibility was
// fixed (both this constant-thickness trick AND the pill shape itself, not
// an ellipse squashed flat), 1.5 read as noticeably heavier/chunkier than
// the site's own thin nav-oval convention — dialed back to 1, close to the
// oval's own base 0.75 (just slightly bolder, since this is still a
// non-scaling absolute px width rather than one that shrinks with a small
// button the way the oval's own scaling stroke would), so the two now read
// as the same weight of hand-drawn line.
export const PILL_STROKE_WIDTH = 1;
// Local coordinate space is 0..128 (SQUIRCLE_CENTER=64, SQUIRCLE_HALF=60);
// margin covers the largest plausible reach the same way CIRCLE_VIEW_BOX's
// own comment explains.
export const PILL_VIEW_BOX = "-14 -14 156 156";

// theta in radians -> the unit superellipse's own (x, y) direction, i.e.
// |x|^n + |y|^n = 1 solved parametrically — NOT a unit circle's cos/sin,
// which is what actually gives this its flat-sided, rounded-corner shape.
function superellipseUnit(theta: number, n: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
  return [x, y];
}

export function buildWobblyPillPath(seed = 0): string {
  const seamAngle = SQUIRCLE_SEAM_ANGLE_DEG + (hash(seed, 201) - 0.5) * 20;
  const overlapSweep = SQUIRCLE_OVERLAP_SWEEP_DEG + (hash(seed, 202) - 0.5) * 16;
  const drift = SQUIRCLE_SEAM_DRIFT_PX * (0.8 + hash(seed, 203) * 0.5);
  const phaseA = hash(seed, 204) * Math.PI * 2;
  const phaseB = hash(seed, 205) * Math.PI * 2;
  const freq1 = WOBBLE_FREQ_1 + (hash(seed, 206) - 0.5) * 0.6;
  const freq2 = WOBBLE_FREQ_2 + (hash(seed, 207) - 0.5) * 0.6;
  const rBase = SQUIRCLE_HALF + (hash(seed, 208) - 0.5) * 4;

  const points: [number, number][] = [];

  for (let i = 0; i <= SQUIRCLE_STEPS; i++) {
    const t = i / SQUIRCLE_STEPS;
    const angleDeg = seamAngle + overlapSweep * t;
    const rad = (angleDeg * Math.PI) / 180;
    const d = drift * t;
    const rCurrent = rBase + wobble(angleDeg, phaseA, freq1, freq2) + d;
    const [ux, uy] = superellipseUnit(rad, SQUIRCLE_EXPONENT);
    const x = SQUIRCLE_CENTER + ux * rCurrent;
    const y = SQUIRCLE_CENTER + uy * rCurrent;
    points.push([x, y]);
  }

  return smoothPathFromPoints(points);
}
