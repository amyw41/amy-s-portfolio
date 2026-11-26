// The placeholder map for "Amy's life map", traced from Amy's sketch
// (2026-11-25): the island and the route winding across it, on a scrap of
// paper. All from lib/wobbly.ts, so it's in
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

// Traced from Amy's sketch (2026-11-25), point for point (her Procreate
// sketch's paper mapped onto this box): a main island with a left lobe
// (Calgary) and an inlet down its east side, the bay's shore running east
// and rising to the north-east, a south-east lobe, and a wiggly south coast;
// plus a separate hooked island at the top right.
const COAST: Pt[] = [
  [66, 130], [91, 88], [128, 63], [184, 47], [236, 42], [259, 59], [242, 93],
  [211, 139], [203, 198], [215, 248], [257, 282], [329, 296], [406, 282],
  [468, 255], [522, 260], [547, 292], [559, 323], [600, 316], [671, 274],
  [743, 231], [820, 201], [828, 248], [820, 316], [840, 400], [847, 468],
  [820, 527], [754, 544], [687, 522], [633, 501], [580, 498], [526, 476],
  [480, 493], [427, 535], [360, 569], [273, 572], [186, 559], [120, 535],
  [100, 485], [116, 425], [91, 375], [66, 316], [58, 248], [71, 189],
];
const ISLE: Pt[] = [
  [687, 117], [696, 71], [737, 42], [805, 32], [874, 49], [919, 83], [936, 120],
  [909, 130], [867, 110], [816, 105], [774, 122], [758, 164], [745, 206],
  [712, 218], [683, 194], [675, 155],
];

/** One piece of the drawing: an outline (`ink`, its line weight in px). */
export type MapShape = { d: string; ink?: number; fill?: string; dash?: string };

/** A small hand-drawn circle round (x, y): the sketch's little stops along
 * the route. */
function ring(seed: number, x: number, y: number, r: number): string {
  const k = r * 0.55;
  return buildWobblyCurvePath(seed, [
    [[x, y - r], [x + k, y - r], [x + r, y - k], [x + r, y]],
    [[x + r, y], [x + r, y + k], [x + k, y + r], [x, y + r]],
    [[x, y + r], [x - k, y + r], [x - r, y + k], [x - r, y]],
    [[x - r, y], [x - r, y - k], [x - k, y - r], [x, y - r]],
  ], 0.2);
}
// The two little circles on the route in the sketch (not pins).
const RING_A: Pt = [278, 329];
const RING_C: Pt = [474, 392];

export const MAP_SHAPES: MapShape[] = [
  { d: buildWobblyCurvePath(501, blob(COAST, 0.9), 0.8), ink: LINE_STROKE_WIDTH },
  { d: buildWobblyCurvePath(502, blob(ISLE, 0.9), 0.6), ink: LINE_STROKE_WIDTH },
  { d: ring(503, RING_A[0], RING_A[1], 9), ink: LINE_STROKE_WIDTH, fill: "#fff" },
  { d: ring(504, RING_C[0], RING_C[1], 9), ink: LINE_STROKE_WIDTH, fill: "#fff" },
];

// ---------- the route ----------

// The route winds across the island as in the sketch, through these
// waypoints (traced from it), stopping at each stop (lib/roadmap.ts) on the
// way. Each entry is a point, or the id of a stop (its pin's spot).
const WAYPOINTS: (Pt | string)[] = [
  "calgary",
  [128, 223], [141, 282], [199, 312], RING_A, [240, 375], [257, 407],
  [360, 410], [315, 451], [249, 468],
  "waterloo",
  [278, 532], [391, 510], [439, 442], RING_C, [588, 371], [675, 387], [696, 434],
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
