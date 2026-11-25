// The placeholder map for "Amy's life map", after Amy's sketch
// (2026-11-25): an island of a few lobes round a central bay, the left lobe
// cut by an inlet and a hook at the top right, a route winding across it, on
// a scrap of paper with a curled corner. All from lib/wobbly.ts, so it's in
// the site's own pen, at the jar's 0.6px. Drawn in a MAP_W × MAP_H box
// (lib/roadmap.ts MAP_ASPECT). Amy will swap it for her own drawing
// (ROADMAP_MAP in lib/roadmap.ts); the route and the pins sit on top in % of
// the box either way. (The earlier illustrated version, with landmark
// doodles, is in git at 34a5bd8.)

import { buildWobblyCurvePath, LINE_STROKE_WIDTH, type CurveSegment } from "@/lib/wobbly";
import { ROADMAP_STOPS } from "@/lib/roadmap";

export const MAP_W = 1000;
export const MAP_H = 640;

type Pt = [number, number];

/** A closed blob through `pts`, as smooth cubic segments (Catmull-Rom). */
function blob(pts: Pt[], tension = 1): CurveSegment[] {
  const n = pts.length;
  const segs: CurveSegment[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const k = tension / 6;
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k],
      [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k],
      p2,
    ]);
  }
  return segs;
}

/** An open smooth line through `pts` (Catmull-Rom, ends clamped). */
function through(pts: Pt[]): CurveSegment[] {
  const segs: CurveSegment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return segs;
}


// ---------- the island ----------

// Clockwise from the west: the left lobe (Calgary) with an inlet down its
// east side, the inner shore of the central bay (open to the north, where
// the title sits), the right arm rising to a blob at the top right with a
// hooked notch on its east side, then the wiggly south coast back west.
const COAST: Pt[] = [
  [56, 168], [96, 96], [168, 62], [222, 86], [212, 148], [236, 206],
  [300, 232], [372, 222], [436, 196], [490, 190], [522, 218], [534, 258],
  [588, 262], [656, 226], [716, 180], [748, 140], [728, 100], [722, 60],
  [780, 28], [846, 36], [896, 72], [904, 128], [862, 134], [846, 152],
  [852, 182], [890, 194], [906, 240], [892, 320], [924, 396], [902, 468],
  [858, 498], [806, 474], [764, 438], [722, 472], [682, 522], [604, 540],
  [524, 508], [458, 538], [380, 520], [300, 546], [220, 520], [152, 500],
  [102, 450], [82, 382], [104, 322], [72, 262], [84, 210],
];

const COAST_PATH = buildWobblyCurvePath(501, blob(COAST, 0.9), 1);

/** One piece of the drawing: an outline (`ink`, its line weight in px). */
export type MapShape = { d: string; ink?: number; fill?: string; dash?: string };

export const MAP_SHAPES: MapShape[] = [{ d: COAST_PATH, ink: LINE_STROKE_WIDTH }];

// ---------- the route ----------

// The route winds across the island like the sketch's: through these
// waypoints, stopping at each stop (lib/roadmap.ts) on the way. Each entry
// is a point, or the id of a stop (its pin's spot).
const WAYPOINTS: (Pt | string)[] = [
  "calgary",
  [152, 232], [118, 300], [172, 360], [138, 424], [236, 468], [340, 440],
  [392, 370], [462, 322], [532, 372],
  "waterloo",
  [680, 384], [742, 318], [800, 258], [790, 186], [818, 132],
  "next",
];

const ROUTE_PTS: Pt[] = WAYPOINTS.map((w) => {
  if (typeof w !== "string") return w;
  const stop = ROADMAP_STOPS.find((s) => s.id === w)!;
  return [(stop.x / 100) * MAP_W, (stop.y / 100) * MAP_H];
});
const ROUTE_SEGMENTS = through(ROUTE_PTS);

export const ROUTE_PATH = buildWobblyCurvePath(551, ROUTE_SEGMENTS, 0.5);

/** How far along the route (0-1) each stop is (in ROADMAP_STOPS order):
 * where the route's draw-in reaches it, so its pin pops in then. */
export const STOP_ROUTE_T: number[] = (() => {
  const lengths = ROUTE_SEGMENTS.map(([p0, c1, c2, p3]) => {
    let sum = 0;
    let prev = p0;
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      const pt: Pt = [
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
      ];
      sum += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
      prev = pt;
    }
    return sum;
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  const atIndex = (i: number) => lengths.slice(0, i).reduce((a, b) => a + b, 0) / total;
  return ROADMAP_STOPS.map((s) => atIndex(WAYPOINTS.indexOf(s.id)));
})();

// ---------- the paper ----------

// The map is drawn on a scrap of paper, like a pirate map: the map's
// MAP_W × MAP_H box sits PAPER_MARGIN in from the paper's edges. The scrap
// isn't a true rectangle: its corners sit a little off square, its edges
// bow gently in and out, and they're torn only lightly (a fine raggedness
// with a few small nicks), not jagged all round.
export const PAPER_MARGIN = 64;
export const PAPER_W = MAP_W + PAPER_MARGIN * 2;
export const PAPER_H = MAP_H + PAPER_MARGIN * 2;
const PAPER_CORNER_R = 26;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildPaperOutline(seed: number): string {
  const rand = seeded(seed);
  const w = PAPER_W;
  const h = PAPER_H;
  // Corners nudged off square (inward only, so the map stays on the paper).
  const corners: Pt[] = [
    [6 + rand() * 18, 4 + rand() * 14],
    [w - 4 - rand() * 14, 10 + rand() * 18],
    [w - 10 - rand() * 18, h - 4 - rand() * 12],
    [4 + rand() * 12, h - 8 - rand() * 18],
  ];
  const pts: Pt[] = [];
  for (let side = 0; side < 4; side++) {
    const a = corners[side];
    const b = corners[(side + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    // Inward normal (clockwise outline).
    const nx = -uy;
    const ny = ux;
    // A gentle bow: a slow wave along the side, in or out.
    const bow = (rand() - 0.5) * 18;
    const phase = rand() * Math.PI * 2;
    // One or two small nicks per side.
    const nicks = [rand() * 0.8 + 0.1, rand() * 0.8 + 0.1];
    // Rounded corners: each side stops PAPER_CORNER_R short of its ends,
    // and the corner between is a soft curve (added after the side).
    for (let t = PAPER_CORNER_R; t < len - PAPER_CORNER_R; t += 12 + rand() * 8) {
      const u = t / len;
      let depth = bow * Math.sin(Math.PI * u) + 3 * Math.sin(u * Math.PI * 3 + phase) + rand() * 3.4;
      for (const n of nicks) if (n > 0 && Math.abs(u - n) * len < 14) depth += 10 - Math.abs(u - n) * len * 0.6;
      pts.push([a[0] + ux * t + nx * depth, a[1] + uy * t + ny * depth]);
    }
    // The corner at b, round from this side's end to the next side's start.
    const c = corners[(side + 2) % 4];
    const lenNext = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const p0: Pt = [b[0] - ux * PAPER_CORNER_R, b[1] - uy * PAPER_CORNER_R];
    const p2: Pt = [b[0] + ((c[0] - b[0]) / lenNext) * PAPER_CORNER_R, b[1] + ((c[1] - b[1]) / lenNext) * PAPER_CORNER_R];
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const u = 1 - t;
      pts.push([u * u * p0[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * b[1] + t * t * p2[1]]);
    }
  }
  return "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + " Z";
}

export const PAPER_PATH = buildPaperOutline(4242);

/** The curled corner (bottom right): a second edge just inside the right
 * side, from about halfway down, sweeping into the bottom edge, as if that
 * corner of the paper is lifting. */
export const PAPER_CURL = buildWobblyCurvePath(
  4244,
  through([
    [PAPER_W - 26, PAPER_H * 0.56],
    [PAPER_W - 32, PAPER_H * 0.74],
    [PAPER_W - 42, PAPER_H * 0.88],
    [PAPER_W - 74, PAPER_H - 22],
  ]),
  0.6,
);
