// Hand-drawn path generators (brief Part 4.1). Every shape is a seeded
// wobble: the same seed always gives the same drawing, a different seed a
// slightly different one — which is what BuzzPath (components/ui/BuzzPath)
// cycles through to make a line "buzz". `amplitude` scales the wobble:
// 1 is each shape's normal hand-drawn look, smaller is calmer.
//
// `variant` (0, 1, 2…) is for buzzing: every variant of one seed is the
// SAME drawing, and variants 1+ add only a tiny "retrace" deviation on top
// (traceJitter, a fraction of a pixel) — like tracing over the same line
// again by hand, not drawing a new one.

const OVAL_RX = 58;
const OVAL_RY = 13;
const CENTER_X = 57;
const CENTER_Y = 12;

const WOBBLE_AMOUNT_1 = 1.4;
const WOBBLE_FREQ_1 = 3.3;
const WOBBLE_AMOUNT_2 = 0.6;
const WOBBLE_FREQ_2 = 5.7;

const SEAM_ANGLE_DEG = 150;
const OVERLAP_SWEEP_DEG = 385;
const SEAM_DRIFT_PX = 2.6;
const STEPS = 160;

/** Stroke width for the rebrand's code-drawn lines (divider, hover
 * circles), in px — matches the jar drawing's own ink line as rendered at
 * the 1536×696 laptop size (measured ~0.5-0.75px). */
export const LINE_STROKE_WIDTH = 0.6;

export const STROKE_COLOR = "currentColor";
export const STROKE_WIDTH = 0.75;
export const VIEW_BOX = "-12 -10 138 40";

function hash(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function wobble(angleDeg: number, phaseShift: number, freq1: number, freq2: number, amplitude = 1): number {
  const rad = (angleDeg * Math.PI) / 180;
  return (
    amplitude *
    (WOBBLE_AMOUNT_1 * Math.sin(rad * freq1 + phaseShift) +
      WOBBLE_AMOUNT_2 * Math.sin(rad * freq2 + phaseShift * 1.7 + 1.3))
  );
}

/** How far (in the shape's own units — px for lines and rectangles) a
 * buzz variant may stray from variant 0. Ovals/pills are drawn in a ~140
 * unit box shown about 100px wide, so theirs is a little bigger in units
 * for the same on-screen size. */
const TRACE_JITTER_PX = 0.3;
const TRACE_JITTER_OVAL_UNITS = 0.45;

/** The per-variant retrace deviation at position `t` (0..1) along a shape:
 * zero for variant 0, otherwise a slow, smooth wobble of at most `max`. */
function traceJitter(seed: number, variant: number, t: number, max: number): number {
  if (variant === 0) return 0;
  const a = hash(seed, 700 + variant * 2) * Math.PI * 2;
  const b = hash(seed, 701 + variant * 2) * Math.PI * 2;
  return max * (0.6 * Math.sin(t * Math.PI * 2 * 2 + a) + 0.4 * Math.sin(t * Math.PI * 2 * 5 + b));
}

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

export function buildWobblyOvalPath(seed = 0, amplitude = 1, variant = 0): string {
  const seamAngle = SEAM_ANGLE_DEG + (hash(seed, 1) - 0.5) * 20;
  const overlapSweep = OVERLAP_SWEEP_DEG + (hash(seed, 2) - 0.5) * 16;
  const drift = SEAM_DRIFT_PX * (0.8 + hash(seed, 3) * 0.5);
  const phaseA = hash(seed, 4) * Math.PI * 2;
  const phaseB = hash(seed, 5) * Math.PI * 2;
  const freq1 = WOBBLE_FREQ_1 + (hash(seed, 6) - 0.5) * 0.6;
  const freq2 = WOBBLE_FREQ_2 + (hash(seed, 7) - 0.5) * 0.6;
  const rx = OVAL_RX + (hash(seed, 8) - 0.5) * 4;
  const ry = OVAL_RY + (hash(seed, 9) - 0.5) * 2;

  const points: [number, number][] = [];

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const angleDeg = seamAngle + overlapSweep * t;
    const rad = (angleDeg * Math.PI) / 180;
    const d = drift * t;
    const jitter = traceJitter(seed, variant, t, TRACE_JITTER_OVAL_UNITS);
    const rCurrentX = rx + wobble(angleDeg, phaseA, freq1, freq2, amplitude) + d + jitter;
    const rCurrentY = ry + wobble(angleDeg, phaseB, freq1, freq2, amplitude) + d * (ry / rx) + jitter * (ry / rx);
    const x = CENTER_X + rCurrentX * Math.cos(rad);
    const y = CENTER_Y + rCurrentY * Math.sin(rad);
    points.push([x, y]);
  }

  return smoothPathFromPoints(points);
}

const SQUIRCLE_HALF = 60;
const SQUIRCLE_CENTER = 64;
const SQUIRCLE_EXPONENT = 4;
const SQUIRCLE_SEAM_ANGLE_DEG = 150;
const SQUIRCLE_OVERLAP_SWEEP_DEG = 385;
const SQUIRCLE_SEAM_DRIFT_PX = 2.2;
const SQUIRCLE_STEPS = 200;

export const PILL_STROKE_COLOR = "currentColor";
export const PILL_STROKE_WIDTH = 1;
export const PILL_VIEW_BOX = "-14 -14 156 156";

function superellipseUnit(theta: number, n: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
  return [x, y];
}

export function buildWobblyPillPath(seed = 0, amplitude = 1, variant = 0): string {
  const seamAngle = SQUIRCLE_SEAM_ANGLE_DEG + (hash(seed, 201) - 0.5) * 20;
  const overlapSweep = SQUIRCLE_OVERLAP_SWEEP_DEG + (hash(seed, 202) - 0.5) * 16;
  const drift = SQUIRCLE_SEAM_DRIFT_PX * (0.8 + hash(seed, 203) * 0.5);
  const phaseA = hash(seed, 204) * Math.PI * 2;
  const freq1 = WOBBLE_FREQ_1 + (hash(seed, 206) - 0.5) * 0.6;
  const freq2 = WOBBLE_FREQ_2 + (hash(seed, 207) - 0.5) * 0.6;
  const rBase = SQUIRCLE_HALF + (hash(seed, 208) - 0.5) * 4;

  const points: [number, number][] = [];

  for (let i = 0; i <= SQUIRCLE_STEPS; i++) {
    const t = i / SQUIRCLE_STEPS;
    const angleDeg = seamAngle + overlapSweep * t;
    const rad = (angleDeg * Math.PI) / 180;
    const d = drift * t;
    const rCurrent =
      rBase + wobble(angleDeg, phaseA, freq1, freq2, amplitude) + d + traceJitter(seed, variant, t, TRACE_JITTER_OVAL_UNITS);
    const [ux, uy] = superellipseUnit(rad, SQUIRCLE_EXPONENT);
    const x = SQUIRCLE_CENTER + ux * rCurrent;
    const y = SQUIRCLE_CENTER + uy * rCurrent;
    points.push([x, y]);
  }

  return smoothPathFromPoints(points);
}

// ---------- lines ----------

/** Wavelengths (in px of line length) of the line wobble's two sine
 * components — long and gentle, so a line reads as hand-ruled, not
 * squiggled. Varied a little per seed. */
const LINE_WAVELENGTH_1 = 260;
const LINE_WAVELENGTH_2 = 95;
/** One sample point per this many px of line length. */
const LINE_SAMPLE_PX = 6;

/** A hand-ruled straight line from `from` to `to`, wobbling up to about
 * `amplitude` px either side of true. Both ends sit exactly on `from`/`to`
 * (the wobble fades out over the first/last few percent) so lines meet
 * whatever they're drawn to. For the divider and underlines. */
export function buildWobblyLinePath(
  seed: number,
  from: [number, number],
  to: [number, number],
  amplitude = 1,
  variant = 0,
): string {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0);
  // Unit normal: the direction the wobble pushes the line.
  const nx = -(y1 - y0) / length;
  const ny = (x1 - x0) / length;
  const phaseA = hash(seed, 401) * Math.PI * 2;
  const phaseB = hash(seed, 402) * Math.PI * 2;
  const wave1 = LINE_WAVELENGTH_1 * (0.85 + hash(seed, 403) * 0.3);
  const wave2 = LINE_WAVELENGTH_2 * (0.85 + hash(seed, 404) * 0.3);
  const steps = Math.max(2, Math.ceil(length / LINE_SAMPLE_PX));

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = t * length;
    const taper = Math.min(1, t / 0.04, (1 - t) / 0.04);
    const offset =
      amplitude *
      taper *
        (0.7 * Math.sin((s / wave1) * Math.PI * 2 + phaseA) + 0.3 * Math.sin((s / wave2) * Math.PI * 2 + phaseB)) +
      taper * traceJitter(seed, variant, t, TRACE_JITTER_PX);
    points.push([x0 + (x1 - x0) * t + nx * offset, y0 + (y1 - y0) * t + ny * offset]);
  }
  return smoothPathFromPoints(points);
}

// ---------- rounded rectangles ----------

/** How far past its start the rectangle's stroke carries on, as a fraction
 * of the perimeter — the pen loop's overshoot (brief Part 3.1). */
const RECT_OVERSHOOT = 0.05;
/** Outward drift reached by the end of the overshoot, px, so the tail
 * doesn't sit exactly on top of the start. */
const RECT_OVERSHOOT_DRIFT_PX = 2;
const RECT_SAMPLE_PX = 5;

/** Point and outward normal at distance `s` along a rounded rectangle's
 * perimeter, starting at the top-left corner's end of the top edge and
 * going clockwise. */
function roundedRectPoint(s: number, w: number, h: number, r: number): { p: [number, number]; n: [number, number] } {
  const straightW = w - 2 * r;
  const straightH = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  const segments: [number, (u: number) => { p: [number, number]; n: [number, number] }][] = [
    [straightW, (u) => ({ p: [r + u, 0], n: [0, -1] })],
    [arc, (u) => corner(w - r, r, -Math.PI / 2 + u / r)],
    [straightH, (u) => ({ p: [w, r + u], n: [1, 0] })],
    [arc, (u) => corner(w - r, h - r, u / r)],
    [straightW, (u) => ({ p: [w - r - u, h], n: [0, 1] })],
    [arc, (u) => corner(r, h - r, Math.PI / 2 + u / r)],
    [straightH, (u) => ({ p: [0, h - r - u], n: [-1, 0] })],
    [arc, (u) => corner(r, r, Math.PI + u / r)],
  ];
  let remaining = s;
  for (const [len, at] of segments) {
    if (remaining <= len) return at(remaining);
    remaining -= len;
  }
  return segments[0][1](0);

  function corner(cx: number, cy: number, a: number): { p: [number, number]; n: [number, number] } {
    return { p: [cx + r * Math.cos(a), cy + r * Math.sin(a)], n: [Math.cos(a), Math.sin(a)] };
  }
}

/** A hand-drawn rounded rectangle, `width` × `height` (in the path's own
 * units, origin top-left), corner `radius`. Drawn as one stroke starting at
 * the top left and going clockwise, carrying on a little past the start like
 * a real pen loop. For the outline around projects (brief Part 3.1). */
export function buildWobblyRectPath(
  seed: number,
  width: number,
  height: number,
  radius: number,
  amplitude = 1,
  variant = 0,
): string {
  const r = Math.min(radius, width / 2, height / 2);
  const perimeter = 2 * (width - 2 * r) + 2 * (height - 2 * r) + 2 * Math.PI * r;
  const total = perimeter * (1 + RECT_OVERSHOOT);
  const phaseA = hash(seed, 501) * Math.PI * 2;
  const phaseB = hash(seed, 502) * Math.PI * 2;
  const steps = Math.ceil(total / RECT_SAMPLE_PX);

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * total;
    const { p, n } = roundedRectPoint(s % perimeter, width, height, r);
    const t = s / perimeter;
    const drift = Math.max(0, t - 1) / RECT_OVERSHOOT * RECT_OVERSHOOT_DRIFT_PX;
    const offset =
      amplitude * (1.2 * Math.sin(t * Math.PI * 2 * 3 + phaseA) + 0.5 * Math.sin(t * Math.PI * 2 * 7 + phaseB)) +
      drift +
      traceJitter(seed, variant, t, TRACE_JITTER_PX);
    points.push([p[0] + n[0] * offset, p[1] + n[1] * offset]);
  }
  return smoothPathFromPoints(points);
}

// ---------- squiggly underline ----------

/** Box the squiggle is drawn in (stretch it over the text with
 * preserveAspectRatio="none" and a non-scaling stroke). */
export const SQUIGGLE_VIEW_BOX = "0 0 100 12";
/** How far each crest swings from the middle line (in the box's own units,
 * 12 tall). */
const SQUIGGLE_AMPLITUDE = 3.2;
const SQUIGGLE_STEPS = 64;

/** A hand-drawn squiggly underline: a gentle sine wave of `waves` full
 * waves across SQUIGGLE_VIEW_BOX, its height varied a little along the way
 * (seeded) so it looks drawn by hand rather than plotted. Scale `waves`
 * with the underlined text's length so the wave size stays even. */
export function buildSquigglePath(seed = 0, waves = 3): string {
  const phase = hash(seed, 1500) * Math.PI * 2;
  const wobblePhase = hash(seed, 1501) * Math.PI * 2;
  const points: [number, number][] = [];
  for (let i = 0; i <= SQUIGGLE_STEPS; i++) {
    const t = i / SQUIGGLE_STEPS;
    // Slight drift in wave height along the line, and a hair of tilt.
    const amp = SQUIGGLE_AMPLITUDE * (0.8 + 0.25 * Math.sin(t * Math.PI * 2 + wobblePhase));
    const y = 6 + amp * Math.sin(t * Math.PI * 2 * waves + phase) + (t - 0.5) * (hash(seed, 1502) - 0.5) * 2;
    points.push([1 + t * 98, y]);
  }
  return smoothPathFromPoints(points);
}
