import { JAR_OUTLINE, JAR_OUTLINE_BODY_START } from "@/lib/jar-outline";

/**
 * The jar as ONE continuous rough line (intro brief v4): the home jar's
 * outline on the resting page, and the line the intro traces — the same
 * points, so the line that draws the jar is the jar that stays.
 *
 * Built from the traced silhouette (lib/jar-outline.ts) as one closed route:
 * from the left wall at mid-height up the left wall and the neck, round the
 * rim (its front edge, then back over the top), across the lid's lower edge,
 * down the right wall, back along the base and up the left wall to where it
 * started. Then roughened by hand-ish wobble (a fixed seed, so it's the same
 * jar every time), about JAR_LINE_ROUGH of the jar's width either side.
 *
 * Points are in the jar art's box: x in 0..JAR_ART_W, y in 0..JAR_ART_H.
 */

type Pt = [number, number];

export const JAR_ART_W = 1600;
export const JAR_ART_H = 2257;
/** How far the line wanders off the traced silhouette, as a fraction of the
 * jar's width (at most about ±2px on a laptop, mostly about 1px). */
const JAR_LINE_ROUGH = 0.0055;
/** Where the line starts and ends: this far down the left wall. */
const JAR_LINE_START_Y = 0.55;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lengths(pts: Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return out;
}

function resample(pts: Pt[], n: number): Pt[] {
  const cum = lengths(pts);
  const L = cum[cum.length - 1];
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (L * k) / (n - 1);
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
  }
  return out;
}

/** Wobbles a polyline off true, like a hand: each point pushed along the
 * line's normal by seeded lumps — random heights at irregularly spaced knots
 * (about `wavelength` apart, give or take half), eased between, so no two
 * lumps match. `amp` is the most it strays, in the points' units. Shared with
 * the intro, which roughens its spiral and strands the same way. */
export function roughen(pts: Pt[], amp: number, seed: number, wavelength: number): Pt[] {
  const r = rng(seed);
  const cum = lengths(pts);
  const L = cum[cum.length - 1];
  const knots: { s: number; v: number }[] = [{ s: 0, v: (r() - 0.5) * 0.6 }];
  while (knots[knots.length - 1].s < L) {
    const v = (r() * 2 - 1) * (r() < 0.25 ? 1 : 0.55);
    knots.push({ s: knots[knots.length - 1].s + wavelength * (0.5 + r()), v });
  }
  let k = 0;
  return pts.map((p, i) => {
    while (k < knots.length - 2 && knots[k + 1].s < cum[i]) k++;
    const f = (cum[i] - knots[k].s) / (knots[k + 1].s - knots[k].s);
    const e = (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, f)))) / 2;
    const off = amp * (knots[k].v + (knots[k + 1].v - knots[k].v) * e);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    return [p[0] + (-ty / tl) * off, p[1] + (tx / tl) * off];
  });
}

function build(): Pt[] {
  const O: Pt[] = JAR_OUTLINE.map(([x, y]) => [x * JAR_ART_W, y * JAR_ART_H]);
  const n = O.length;
  const bodyStart = JAR_OUTLINE_BODY_START;
  // The left wall's point at the starting height.
  const ty = JAR_LINE_START_Y * JAR_ART_H;
  let ci = bodyStart;
  for (let i = bodyStart; i < n; i++) {
    if (O[i][0] > JAR_ART_W / 2) break;
    if (Math.abs(O[i][1] - ty) < Math.abs(O[ci][1] - ty)) ci = i;
  }
  // Up the left wall into the rim loop, round it, ending at the rim's left.
  const upAndRim = O.slice(0, ci + 1).reverse();
  // Back down the short stroke to the neck's left, then the lid's lower edge
  // across to the neck's right, sagging a little like the drawing's.
  let neck = bodyStart;
  while (neck < ci && O[neck][1] < O[0][1] + 0.07 * JAR_ART_H) neck++;
  upAndRim.push(O[neck]);
  const a = O[neck];
  const b = O[n - 1];
  const sag = Math.max(a[1], b[1]) + 0.015 * JAR_ART_H;
  const lid: Pt[] = [];
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const u = 1 - t;
    const mid: Pt = [(a[0] + b[0]) / 2, sag];
    lid.push([u * u * a[0] + 2 * u * t * mid[0] + t * t * b[0], u * u * a[1] + 2 * u * t * mid[1] + t * t * b[1]]);
  }
  // Down the right wall, along the base, up the left wall to the start.
  const downAndBack = O.slice(ci).reverse();
  const route = resample([...upAndRim, ...lid, ...downAndBack.slice(1)], 700);
  return roughen(route, JAR_LINE_ROUGH * JAR_ART_W, 11, 0.16 * JAR_ART_W);
}

/** The one-line jar, in the jar art's box (see above). */
export const JAR_LINE: Pt[] = build();

/** The one-line jar as SVG path data in the jar art's box. */
export const JAR_LINE_D = `M${JAR_LINE.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}`;
