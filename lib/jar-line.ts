import { JAR_STROKES } from "@/lib/jar-outline";

/**
 * The pen's route over the ORIGINAL jar drawing (intro brief v5). The intro
 * draws the jar with one pen that goes through the drawing's own strokes
 * (JAR_STROKES: its ink walked into strokes, lib/jar-outline.ts) end to end:
 * from the left wall at mid-height up the wall, then on to whichever stroke
 * starts nearest where the pen is — round the rim and lid lines, down the
 * right wall, along the base — and back up the left wall to where it
 * started. The strokes touch at their ends, so going from one to the next is
 * a hop of a few pixels along ink that's already there. The intro reveals
 * the real artwork (jar.svg) along this route, so when it's done the jar is
 * the original drawing itself.
 *
 * Points are in the jar art's box: x in 0..JAR_ART_W, y in 0..JAR_ART_H.
 */

type Pt = [number, number];

export const JAR_ART_W = 1600;
export const JAR_ART_H = 2257;
/** Where the pen starts: this far down the left wall. */
const JAR_PEN_START_Y = 0.55;

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

/** Wobbles a polyline off true, like a hand: each point pushed along the
 * line's normal by seeded lumps — random heights at irregularly spaced knots
 * (about `wavelength` apart, give or take half), eased between, so no two
 * lumps match. `amp` is the most it strays, in the points' units. The intro
 * roughens its spiral and strands with it. */
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

/** The pen's route over the original jar, starting from the wall nearest a
 * point: `side` -1 for the left wall, 1 for the right, at height `fy` (a
 * fraction of the jar's height). In the jar art's box. */
export function jarPenStrokes(side: -1 | 1 = -1, fy = JAR_PEN_START_Y): Pt[][] {
  const strokes: Pt[][] = JAR_STROKES.map((s) => s.map(([x, y]) => [x * JAR_ART_W, y * JAR_ART_H] as Pt));
  // The start: the outermost ink point on that side at that height.
  const ty = Math.min(0.8, Math.max(0.3, fy)) * JAR_ART_H;
  let cs = 0;
  let ci = 0;
  let best = Infinity;
  strokes.forEach((st, k) =>
    st.forEach((p, i) => {
      if (Math.abs(p[1] - ty) < 0.04 * JAR_ART_H && -side * p[0] < best) {
        best = -side * p[0];
        cs = k;
        ci = i;
      }
    }),
  );
  const host = strokes[cs];
  // That stroke split in two at the start: the half heading up goes first,
  // the half heading down is where the pen comes back to at the end.
  const a = host.slice(0, ci + 1).reverse();
  const b = host.slice(ci);
  const up = a[a.length - 1][1] < b[b.length - 1][1] ? a : b;
  const down = (up === a ? b : a).slice().reverse();
  const pool = strokes.filter((_, k) => k !== cs);
  const out: Pt[][] = [up];
  let end = up[up.length - 1];
  const d = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  while (pool.length) {
    let bi = 0;
    let rev = false;
    let bd = Infinity;
    pool.forEach((st, i) => {
      const d0 = d(end, st[0]);
      const d1 = d(end, st[st.length - 1]);
      if (d0 < bd) [bd, bi, rev] = [d0, i, false];
      if (d1 < bd) [bd, bi, rev] = [d1, i, true];
    });
    let st = pool.splice(bi, 1)[0];
    if (rev) st = st.slice().reverse();
    out.push(st);
    end = st[st.length - 1];
  }
  out.push(down);
  return out;
}

/** The pen's strokes over the original jar from the left wall, in order (see
 * above). */
export const JAR_PEN_STROKES: Pt[][] = jarPenStrokes();

/**
 * Amy's hand, measured: how far her jar strokes stray from a smoothed copy
 * of themselves. Each long stroke (JAR_STROKES) is walked every
 * JAR_WOBBLE_STEP art units; at each step the offset across the stroke from
 * a heavily smoothed version (±JAR_WOBBLE_SMOOTH) is recorded. The strokes'
 * signals are joined end to end. The intro bends its loop and ribbons by this
 * same signal (scaled to the jar's size), so their wobble is hers.
 * In art units.
 */
export const JAR_WOBBLE_STEP = 8;
const JAR_WOBBLE_SMOOTH = 120;

function measureWobble(): number[] {
  const out: number[] = [];
  for (const st of JAR_STROKES) {
    const pts: Pt[] = st.map(([x, y]) => [x * JAR_ART_W, y * JAR_ART_H] as Pt);
    const cum = lengths(pts);
    const L = cum[cum.length - 1];
    if (L < JAR_WOBBLE_SMOOTH * 3) continue;
    const n = Math.floor(L / JAR_WOBBLE_STEP);
    const samples: Pt[] = [];
    let j = 0;
    for (let k = 0; k <= n; k++) {
      const s = k * JAR_WOBBLE_STEP;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
      samples.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
    }
    const w = Math.round(JAR_WOBBLE_SMOOTH / JAR_WOBBLE_STEP);
    const seg: number[] = [];
    for (let k = w; k < samples.length - w; k++) {
      let sx = 0;
      let sy = 0;
      for (let m = -w; m <= w; m++) {
        sx += samples[k + m][0];
        sy += samples[k + m][1];
      }
      sx /= 2 * w + 1;
      sy /= 2 * w + 1;
      const a = samples[k - 1];
      const b = samples[k + 1];
      const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      // Signed offset across the stroke.
      seg.push(((samples[k][0] - sx) * -(b[1] - a[1]) + (samples[k][1] - sy) * (b[0] - a[0])) / tl);
    }
    // Fade each stroke's signal in and out so the joins between strokes
    // don't step.
    const fade = Math.min(8, Math.floor(seg.length / 4));
    seg.forEach((v, k) => {
      const e = Math.min(1, k / fade, (seg.length - 1 - k) / fade);
      out.push(v * (1 - Math.cos(Math.PI * Math.max(0, e))) / 2);
    });
  }
  // Take out any lean so the signal wanders around zero.
  const mean = out.reduce((p, q) => p + q, 0) / (out.length || 1);
  return out.map((v) => v - mean);
}

export const JAR_WOBBLE: number[] = measureWobble();
