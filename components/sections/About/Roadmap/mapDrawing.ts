// The placeholder map for "Amy's roadmap": a hand-drawn island (a wobbly
// coastline and a few islets) with a little landmark at each stop, all from
// lib/wobbly.ts so it's in the site's own pen. Drawn in
// a MAP_W × MAP_H box (lib/roadmap.ts MAP_ASPECT). Amy will swap it for her
// own drawing (ROADMAP_MAP in lib/roadmap.ts); the route and the pins sit
// on top in % of the box either way.

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

function ellipse(cx: number, cy: number, rx: number, ry: number, tilt = 0): Pt[] {
  const pts: Pt[] = [];
  const t = (tilt * Math.PI) / 180;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const x = rx * Math.cos(a) * (1 + 0.08 * Math.sin(a * 3));
    const y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
  }
  return pts;
}

// The island: a loose, friendly take on Canada, clockwise from the
// north-west. A west coast with a couple of coves, a softly scalloped north
// coast, a small bay (not a big bite), a rounded east lobe, and a peninsula
// dipping south in the south-east where Waterloo sits between the lakes.
// The south border runs gently back west. It sits in the middle of the box,
// clear of the title above it.
const COAST: Pt[] = [
  [74, 168], [132, 124], [204, 132], [262, 104], [330, 118], [392, 94],
  [456, 112], [500, 132], [520, 176], [556, 198], [592, 186], [606, 146],
  [636, 112], [704, 104], [770, 86], [842, 104], [900, 142], [936, 196],
  [928, 248], [954, 300], [936, 340], [904, 362], [884, 392], [842, 420],
  [800, 462], [770, 512], [728, 534], [690, 516], [660, 488], [604, 480],
  [530, 472], [450, 478], [370, 470], [290, 478], [210, 470], [146, 458],
  [104, 428], [82, 386], [60, 352], [72, 316], [50, 280], [62, 238],
  [48, 204],
];

const COAST_PATH = buildWobblyCurvePath(501, blob(COAST, 0.9), 1);

// ---------- landmarks ----------

// Little illustrations for each stop, like an illustrated timeline: ink
// outlines with soft, flat colour under them (MAP_COLORS). Each is drawn
// about the same size (60-80 units across, so ~40-55px on a laptop), close
// to its own stop and clear of the route and labels, so every stop reads as
// one little vignette. Placeholders until Amy draws her own.
export const MAP_COLORS = {
  water: "#d9e8f3",
  mountain: "#cfdbe8",
  snow: "#ffffff",
  hat: "#ebc597",
  hatBand: "#c0704a",
  goose: "#dccbb0",
  gooseHead: "#2f2f2f",
  brick: "#ece6db",
  glass: "#c8dcec",
};

/** One piece of the drawing: an outline (`ink`, its line weight in px)
 * and/or a flat fill; `dash` dashes the outline. */
export type MapShape = { d: string; fill?: string; ink?: number; dash?: string };
/** A word written on the drawing, in the annotation hand. */
export type MapText = { x: number; y: number; text: string; size: number; rotate?: number };

// Every line is the jar's ink weight (Amy, 2026-11-25: no heavier lines).
const INK = LINE_STROKE_WIDTH;
const FINE = LINE_STROKE_WIDTH;

/** A closed shape through `pts` with straight sides (a polygon), wobbled. */
function poly(seed: number, pts: Pt[], amp = 0.3): string {
  const segs: CurveSegment[] = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return [p, [p[0] + (q[0] - p[0]) / 3, p[1] + (q[1] - p[1]) / 3], [p[0] + (2 * (q[0] - p[0])) / 3, p[1] + (2 * (q[1] - p[1])) / 3], q];
  });
  return buildWobblyCurvePath(seed, segs, amp);
}
/** A rounded rectangle (corners `r` across), wobbled. */
function roundRect(seed: number, x: number, y: number, w: number, h: number, r: number, amp = 0.2): string {
  const k = r * 0.55;
  const segs: CurveSegment[] = [
    [[x + r, y], [x + w / 3, y], [x + (2 * w) / 3, y], [x + w - r, y]],
    [[x + w - r, y], [x + w - r + k, y], [x + w, y + r - k], [x + w, y + r]],
    [[x + w, y + r], [x + w, y + h / 3], [x + w, y + (2 * h) / 3], [x + w, y + h - r]],
    [[x + w, y + h - r], [x + w, y + h - r + k], [x + w - r + k, y + h], [x + w - r, y + h]],
    [[x + w - r, y + h], [x + (2 * w) / 3, y + h], [x + w / 3, y + h], [x + r, y + h]],
    [[x + r, y + h], [x + r - k, y + h], [x, y + h - r + k], [x, y + h - r]],
    [[x, y + h - r], [x, y + (2 * h) / 3], [x, y + h / 3], [x, y + r]],
    [[x, y + r], [x, y + r - k], [x + r - k, y], [x + r, y]],
  ];
  return buildWobblyCurvePath(seed, segs, amp);
}
function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
/** Moves a drawing: every "x,y" point scaled by `k` round (ox, oy), then
 * shifted by (dx, dy). For placing a doodle drawn at one size elsewhere. */
function place(d: string, ox: number, oy: number, k: number, dx: number, dy: number): string {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, px, py) =>
    `${((+px - ox) * k + ox + dx).toFixed(2)},${((+py - oy) * k + oy + dy).toFixed(2)}`,
  );
}

// Islets offshore, so the coast doesn't float alone: one off the west
// coast, one off the east, and a few in the north (clear of the title).
const ISLETS: MapShape[] = [
  buildWobblyCurvePath(561, blob(ellipse(30, 300, 7, 22, 12)), 0.3),
  buildWobblyCurvePath(562, blob(ellipse(978, 232, 13, 11, 0)), 0.3),
  buildWobblyCurvePath(563, blob(ellipse(236, 60, 20, 8, -6)), 0.3),
  buildWobblyCurvePath(564, blob(ellipse(282, 70, 9, 5, 10)), 0.2),
  buildWobblyCurvePath(565, blob(ellipse(744, 50, 18, 7, 4)), 0.3),
].map((d) => ({ d, ink: INK }));

// Calgary: the Rockies just west of it, three peaks with rounded tops and
// snow on them.
function mountain(seed: number, apex: Pt, l: Pt, r: Pt): MapShape[] {
  const round = (apex[1] - l[1]) * -0.06;
  const al: Pt = [apex[0] - round * 1.4, apex[1] + round];
  const ar: Pt = [apex[0] + round * 1.4, apex[1] + round];
  const outline = through([l, lerp(l, al, 0.5), al, apex, ar, lerp(ar, r, 0.5), r]);
  const l1 = lerp(apex, l, 0.32);
  const r1 = lerp(apex, r, 0.32);
  const z1: Pt = [lerp(l1, r1, 0.3)[0], lerp(l1, r1, 0.3)[1] + 5];
  const z2: Pt = [lerp(l1, r1, 0.55)[0], lerp(l1, r1, 0.55)[1] - 2];
  const z3: Pt = [lerp(l1, r1, 0.78)[0], lerp(l1, r1, 0.78)[1] + 4];
  return [
    { d: buildWobblyCurvePath(seed, outline, 0.2) + " Z", fill: MAP_COLORS.mountain },
    { d: buildWobblyCurvePath(seed + 1, blob([al, l1, z1, z2, z3, r1, ar, apex], 0.6), 0.05), fill: MAP_COLORS.snow },
    { d: buildWobblyCurvePath(seed + 2, through([l1, z1, z2, z3, r1]), 0.05), ink: FINE },
    { d: buildWobblyCurvePath(seed + 3, outline, 0.2), ink: INK },
  ];
}
const MOUNTAINS: MapShape[] = [
  ...mountain(521, [116, 246], [88, 300], [146, 300]),
  ...mountain(525, [156, 208], [106, 300], [208, 300]),
  ...mountain(529, [198, 250], [172, 300], [224, 300]),
];

// Calgary: a Stampede cowboy hat, south-west of the city (drawn big, then
// placed small with the rest).
const HAT_RAW: MapShape[] = [
  {
    d: buildWobblyCurvePath(531, [
      [[160, 390], [160, 374], [165, 358], [172, 355]],
      [[172, 355], [180, 352], [186, 362], [190, 360]],
      [[190, 360], [194, 358], [201, 351], [208, 355]],
      [[208, 355], [214, 358], [220, 374], [220, 390]],
      [[220, 390], [200, 391], [180, 391], [160, 390]],
    ], 0.2),
    fill: MAP_COLORS.hat,
    ink: INK,
  },
  { d: roundRect(532, 160, 380, 60, 8, 3, 0.1), fill: MAP_COLORS.hatBand },
  {
    d: buildWobblyCurvePath(533, [
      [[130, 382], [140, 398], [160, 403], [190, 402]],
      [[190, 402], [220, 403], [240, 398], [250, 382]],
      [[250, 382], [240, 392], [220, 394], [190, 394]],
      [[190, 394], [160, 394], [140, 392], [130, 382]],
    ], 0.2),
    fill: MAP_COLORS.hat,
    ink: INK,
  },
];
const HAT = HAT_RAW.map((s) => ({ ...s, d: place(s.d, 190, 378, 0.62, -22, 14) }));

// Waterloo: the Great Lakes round it, a Canada goose on the shore, and E7.
const LAKES: MapShape[] = [
  buildWobblyCurvePath(511, blob(ellipse(584, 434, 40, 12, -5)), 0.4),
  buildWobblyCurvePath(512, blob(ellipse(664, 446, 13, 26, 18)), 0.4),
  buildWobblyCurvePath(513, blob(ellipse(740, 474, 26, 8, -20)), 0.3),
  buildWobblyCurvePath(514, blob(ellipse(774, 428, 17, 7, -6)), 0.3),
].map((d) => ({ d, fill: MAP_COLORS.water, ink: FINE }));

const GOOSE_RAW: MapShape[] = [
  // Body, tail to the left.
  { d: buildWobblyCurvePath(541, blob([[532, 446], [548, 440], [572, 440], [588, 448], [580, 462], [556, 465], [540, 458]]), 0.2), fill: MAP_COLORS.goose, ink: INK },
  // Neck up to the head, black.
  {
    d: buildWobblyCurvePath(542, [
      [[578, 446], [584, 432], [584, 420], [588, 410]],
      [[588, 410], [592, 404], [600, 404], [602, 410]],
      [[602, 410], [600, 414], [594, 414], [592, 418]],
      [[592, 418], [590, 428], [590, 438], [588, 449]],
    ], 0.12),
    fill: MAP_COLORS.gooseHead,
    ink: INK,
  },
  // White chin strap, beak, a wing line and legs.
  { d: buildWobblyCurvePath(543, blob(ellipse(594, 412, 3, 2, 20)), 0.05), fill: "#fff" },
  { d: buildWobblyCurvePath(544, through([[601, 407], [609, 409], [602, 411]]), 0.05), ink: FINE },
  { d: buildWobblyCurvePath(545, through([[546, 448], [560, 446], [574, 452]]), 0.1), ink: FINE },
  { d: buildWobblyCurvePath(546, through([[556, 464], [555, 474]]), 0.05), ink: FINE },
  { d: buildWobblyCurvePath(547, through([[566, 464], [568, 474]]), 0.05), ink: FINE },
];
// On the shore just west of the lakes.
const GOOSE = GOOSE_RAW.map((s) => ({ ...s, d: place(s.d, 570, 440, 1, -62, -20) }));

// E7, the engineering building, north-west of Waterloo: a low block with a
// roof line, a glass curtain wall with its grid, a door, and its name.
const E7: MapShape[] = [
  { d: roundRect(551, 634, 270, 74, 46, 6), fill: MAP_COLORS.brick, ink: INK },
  { d: buildWobblyCurvePath(552, through([[628, 270], [714, 269]]), 0.1), ink: INK },
  { d: roundRect(553, 641, 278, 36, 30, 4, 0.1), fill: MAP_COLORS.glass, ink: FINE },
  ...[288, 298].map((y, i) => ({ d: buildWobblyCurvePath(554 + i, through([[641, y], [677, y]]), 0.05), ink: FINE })),
  ...[653, 665].map((x, i) => ({ d: buildWobblyCurvePath(556 + i, through([[x, 278], [x, 308]]), 0.05), ink: FINE })),
  { d: roundRect(558, 686, 296, 12, 20, 4, 0.1), fill: "#fff", ink: FINE },
];

// The next stop: a paper plane flying off the east coast, a dashed trail
// behind it back towards the pin.
const PLANE: MapShape[] = [
  { d: poly(571, [[962, 94], [918, 102], [933, 109], [928, 124]], 0.1), fill: "#fff", ink: INK },
  { d: buildWobblyCurvePath(572, through([[962, 94], [933, 109]]), 0.05), ink: FINE },
  { d: buildWobblyCurvePath(573, through([[916, 116], [900, 128], [894, 146], [890, 160]]), 0.2), ink: FINE, dash: "3 4" },
];

// Everything sits SHIFT_Y lower in the box, so the island is centred
// between the title and the bottom (the stops in lib/roadmap.ts match).
const SHIFT_Y = 36;

export const MAP_TEXT: MapText[] = [{ x: 699, y: 291 + SHIFT_Y, text: "E7", size: 19 }];

/** The plain map: just the coastline. */
export const MAP_SHAPES_PLAIN: MapShape[] = [{ d: place(COAST_PATH, 0, 0, 1, 0, SHIFT_Y), ink: INK }];

/** Every piece of the illustrated placeholder map, back to front. */
export const MAP_SHAPES: MapShape[] = [
  { d: COAST_PATH, ink: INK },
  ...ISLETS,
  ...LAKES,
  ...MOUNTAINS,
  ...HAT,
  ...GOOSE,
  ...E7,
  ...PLANE,
].map((shape) => ({ ...shape, d: place(shape.d, 0, 0, 1, 0, SHIFT_Y) }));

// ---------- the route ----------

// The route wanders from stop to stop: between each pair it bows out to one
// side, then the other, like a road trip drawn by hand.
const STOP_PTS: Pt[] = ROADMAP_STOPS.map((s) => [(s.x / 100) * MAP_W, (s.y / 100) * MAP_H]);
const BOWS = [110, -70, 55, -50];

const ROUTE_SEGMENTS: CurveSegment[] = STOP_PTS.slice(0, -1).map((a, i) => {
  const b = STOP_PTS[i + 1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const bow = BOWS[i % BOWS.length];
  return [
    a,
    [a[0] + dx * 0.3 + nx * bow, a[1] + dy * 0.3 + ny * bow],
    [a[0] + dx * 0.7 - nx * bow * 0.8, a[1] + dy * 0.7 - ny * bow * 0.8],
    b,
  ];
});

export const ROUTE_PATH = buildWobblyCurvePath(551, ROUTE_SEGMENTS, 0.6);

/** How far along the route (0-1) each stop is: where the route's draw-in
 * reaches it, so its pin pops in then. Measured on the curves themselves. */
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
  let acc = 0;
  return [0, ...lengths.map((l) => (acc += l) / total)];
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
