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

  // Smooth the polyline into a curve using quadratic beziers through
  // successive midpoints — a standard trick for turning a dense point
  // sample into a smooth freehand-looking line without visible facets.
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
