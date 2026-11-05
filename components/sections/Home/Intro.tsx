"use client";

import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import styles from "./Intro.module.css";
import { JAR_OUTLINE, JAR_OUTLINE_BODY_START } from "@/lib/jar-outline";
import { LINE_STROKE_WIDTH } from "@/lib/wobbly";
import {
  INTRO_BREAK,
  INTRO_DOME,
  INTRO_DRAW,
  INTRO_FILL,
  INTRO_FILL_STEPS,
  INTRO_FOAM,
  INTRO_FOAM_WAVES,
  INTRO_HANDOFF,
  INTRO_INK_FPS,
  INTRO_JAR_BLEND_S,
  INTRO_LINE_FPS,
  INTRO_MORPH_STAGGER,
  INTRO_SETTLE,
  INTRO_SHORT,
  INTRO_SMALL_SCALE,
  slowMs,
} from "@/lib/motion";

type Pt = [number, number];

/** jar.png's proportions (the jar art fills its wrapper's width). */
const JAR_ASPECT = 2257 / 1600;
/** Points along the jar's line once resampled (brief: ~400). */
const N = 400;

// ---------- polyline helpers (all in viewport px) ----------

function lengths(pts: Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return out;
}

function pointAt(pts: Pt[], cum: number[], s: number): Pt {
  if (s <= 0) return pts[0];
  if (s >= cum[cum.length - 1]) return pts[pts.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < s) lo = mid;
    else hi = mid;
  }
  const f = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
}

/** n evenly spaced points along a polyline (by arc length). */
function resample(pts: Pt[], n: number): Pt[] {
  const cum = lengths(pts);
  const L = cum[cum.length - 1];
  return Array.from({ length: n }, (_, i) => pointAt(pts, cum, (L * i) / (n - 1)));
}

const f1 = (v: number) => v.toFixed(1);
const polyD = (pts: Pt[]) => (pts.length < 2 ? "" : `M${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join("L")}`);

/** The stretch of a polyline between arc lengths s0 and s1, as path data. */
function slice(pts: Pt[], cum: number[], s0: number, s1: number): string {
  if (s1 - s0 < 0.5) return "";
  const a = pointAt(pts, cum, s0);
  let d = `M${f1(a[0])},${f1(a[1])}`;
  for (let i = 0; i < pts.length; i++) if (cum[i] > s0 && cum[i] < s1) d += `L${f1(pts[i][0])},${f1(pts[i][1])}`;
  const b = pointAt(pts, cum, s1);
  return `${d}L${f1(b[0])},${f1(b[1])}`;
}

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/** Deterministic random numbers (mulberry32), so every visit draws the same
 * frames. */
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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const progress = (t: number, [a, b]: [number, number]) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** One foam bubble: an open arc of a circle, facing away from the jar. */
type Foam = { x: number; y: number; ax: number; ay: number; r: number; dir: number; sweep: number; wave: number; row: number };
/** One floating bubble: a small circle that drifts up, then pops. */
type Bubble = { x: number; y: number; r: number; born: number; life: number; phase: number };
/** Everything the stop-motion layer shows on one frame. */
type InkFrame = { ink: string; dome: string; foam: string; bubbles: string };

/**
 * The intro (docs/rebrand/intro-brief.md), drawn over a blank home page on
 * first load, with lines generated in code from the traced jar
 * (lib/jar-outline.ts):
 *
 * full — a small jar draws in the middle of the screen; black ink fills it
 *   one step at a time, domes over the rim and bubbles over as line-drawn
 *   foam with little bubbles popping (all stop motion); the foam flattens
 *   back into the jar's line and the ink drains; then the line breaks at the
 *   bottom — the left half is pulled out like thread onto the sidebar's
 *   divider, the right half stretches into the real jar's outline — and the
 *   real divider and jar swap in on the same frame.
 * short — the small jar draws, then goes straight into the divider and jar.
 *
 * Everything is worked out before the first frame; each frame only writes
 * path data to the SVG (no React state). Click or any key skips to the end.
 * `onReveal` fires at the swap (Home shows the real page and lets the items
 * fall); `onDone` right after.
 */
export default function Intro({
  variant,
  onReveal,
  onDone,
}: {
  variant: "full" | "short";
  onReveal: () => void;
  onDone: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const outlineRef = useRef<SVGPathElement>(null);
  const leftRef = useRef<SVGPathElement>(null);
  const rightRef = useRef<SVGPathElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const domeRef = useRef<SVGPathElement>(null);
  const foamRef = useRef<SVGPathElement>(null);
  const bubblesRef = useRef<SVGPathElement>(null);
  const clipBodyRef = useRef<SVGPathElement>(null);
  const clipRimRef = useRef<SVGPathElement>(null);
  const clipNeckRef = useRef<SVGPathElement>(null);
  const callbacks = useRef({ onReveal, onDone });
  useEffect(() => {
    callbacks.current = { onReveal, onDone };
  });

  useEffect(() => {
    const svg = svgRef.current;
    const outline = outlineRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    const ink = inkRef.current;
    const dome = domeRef.current;
    const foam = foamRef.current;
    const bubbles = bubblesRef.current;
    const clipBody = clipBodyRef.current;
    const clipRim = clipRimRef.current;
    const clipNeck = clipNeckRef.current;
    const jarEl = document.querySelector("[data-intro-jar]");
    const dividerPath = document.querySelector<SVGPathElement>("[data-intro-divider] path");
    let finished = false;
    // The swap: the real page is committed to the DOM (flushSync) in the
    // same task as the intro starts going, so they change on the same frame:
    // the real divider appears under its exact copy, and the jar's drawing
    // blends in as the traced line fades (INTRO_JAR_BLEND_S).
    let doneTimer = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      flushSync(() => callbacks.current.onReveal());
      if (svg) {
        svg.style.transition = `opacity ${slowMs(INTRO_JAR_BLEND_S * 1000)}ms linear`;
        svg.style.opacity = "0";
      }
      doneTimer = window.setTimeout(() => callbacks.current.onDone(), slowMs(INTRO_JAR_BLEND_S * 1000));
    };
    if (!svg || !outline || !left || !right || !ink || !dome || !foam || !bubbles || !clipBody || !clipRim || !clipNeck || !jarEl) {
      finish();
      return;
    }

    const setupStart = performance.now();
    // ---- the jar's line, resampled, in fractions of the jar art's box ----
    const artPts: Pt[] = JAR_OUTLINE.map(([x, y]) => [x * 1600, y * 2257]);
    const artCum = lengths(artPts);
    const bodyFrac = artCum[JAR_OUTLINE_BODY_START] / artCum[artCum.length - 1];
    const frac: Pt[] = resample(artPts, N).map(([x, y]) => [x / 1600, y / 2257]);
    const bodyStart = Math.round(bodyFrac * (N - 1));
    // Bounding box (to centre the small jar) and the bottom centre (where the
    // line breaks): the base point nearest the middle.
    const xs = frac.map((p) => p[0]);
    const ys = frac.map((p) => p[1]);
    const bx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const by = (Math.min(...ys) + Math.max(...ys)) / 2;
    const maxY = Math.max(...ys);
    let split = -1;
    for (let i = bodyStart; i < N; i++) {
      if (frac[i][1] < maxY - 0.06) continue;
      if (split < 0 || Math.abs(frac[i][0] - bx) < Math.abs(frac[split][0] - bx)) split = i;
    }
    if (split < 0) split = Math.round((bodyStart + N) / 2);

    // ---- the real jar (target) and the small one (start), in px ----
    const J = jarEl.getBoundingClientRect();
    const w = J.width;
    const h = w * JAR_ASPECT;
    const real: Pt[] = frac.map(([x, y]) => [J.left + x * w, J.top + y * h]);
    const ws = w * INTRO_SMALL_SCALE;
    const hs = h * INTRO_SMALL_SCALE;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const small: Pt[] = frac.map(([x, y]) => [cx + (x - bx) * ws, cy + (y - by) * hs]);
    const cSmall = lengths(small);
    const LS = cSmall[N - 1];

    // ---- the divider, measured off the real page (bottom to top) ----
    let divider: Pt[] | null = null;
    if (dividerPath) {
      const box = dividerPath.getBoundingClientRect();
      const ctm = dividerPath.getScreenCTM();
      if (ctm && box.height > 40) {
        const L = dividerPath.getTotalLength();
        const m = 160;
        divider = Array.from({ length: m }, (_, i) => {
          const p = dividerPath.getPointAtLength((L * i) / (m - 1));
          const q = new DOMPoint(p.x, p.y).matrixTransform(ctm);
          return [q.x, q.y] as Pt;
        });
        if (divider[0][1] < divider[m - 1][1]) divider.reverse();
      }
    }

    // ---- the break ----
    // Left: the rim and left half, consumed from the far end (the rim's
    // start) as the tip at the bottom centre is pulled down, left, and up
    // the divider. The thread stretches from its own length to the
    // divider's, so it ends exactly on it.
    let thread: Pt[] = [];
    let cThread: number[] = [];
    let LH = 0;
    let LR = 0;
    let LD = 0;
    // Right: the right half, from the neck's end down to the bottom centre,
    // stretched point for point onto the whole real jar, from the neck's end
    // round to the rim's start (the free end sweeps up last).
    let rightFrom: Pt[];
    if (divider) {
      const leftHalf = small.slice(0, split + 1);
      const tip = small[split];
      const F = divider[0];
      const reach = Math.max(60, (tip[0] - F[0]) * 0.35);
      const route = bezier(tip, [tip[0] - reach * 0.4, tip[1] + hs * 0.6], [F[0] + reach, F[1] + 40], F, 60);
      thread = [...leftHalf, ...route.slice(1), ...divider.slice(1)];
      cThread = lengths(thread);
      LH = lengths(leftHalf)[leftHalf.length - 1];
      LD = lengths(divider)[divider.length - 1];
      LR = cThread[cThread.length - 1] - LH;
      rightFrom = resample(small.slice(split).reverse(), N);
    } else {
      // No divider on screen (phones): the whole small jar becomes the jar.
      rightFrom = small.slice().reverse();
    }
    const rightTo = real.slice().reverse();

    const drawLeft = (p: number) => {
      if (!divider) {
        left.setAttribute("d", "");
        return;
      }
      const s1 = LH + p * LR;
      const s0 = s1 - (LH + (LD - LH) * p);
      left.setAttribute("d", slice(thread, cThread, s0, s1));
    };
    // The right strand reaches the jar in two overlapping moves: it first
    // travels and stretches onto the real jar's right half (each point
    // a little after the one before, neck first), then its free end runs on
    // round the base, up the left wall and round the rim — the line sliding
    // along the real outline — until every point sits on its own spot.
    const trackAt = (u: number): Pt => {
      const i = Math.max(0, Math.min(N - 1, u));
      const a = Math.floor(i);
      const b = Math.min(N - 1, a + 1);
      const f = i - a;
      return [rightTo[a][0] + (rightTo[b][0] - rightTo[a][0]) * f, rightTo[a][1] + (rightTo[b][1] - rightTo[a][1]) * f];
    };
    // Where each point lands on the real jar after the first move.
    const halfSpan = divider ? N - 1 - split : N - 1;
    const u0 = rightFrom.map((_, i) => (i / (N - 1)) * halfSpan);
    const morphPts: Pt[] = rightFrom.map((p) => [p[0], p[1]]);
    const drawRight = (p: number) => {
      const slide = easeInOut(progress(p, [0.4, 1]));
      for (let i = 0; i < N; i++) {
        const lag = INTRO_MORPH_STAGGER * (i / (N - 1));
        const m = easeInOut(clamp01((progress(p, [0, 0.6]) - lag) / (1 - lag)));
        const onTrack = trackAt(u0[i]);
        const slid = trackAt(u0[i] + (i - u0[i]) * slide);
        morphPts[i] = [
          rightFrom[i][0] + (onTrack[0] - rightFrom[i][0]) * m + (slid[0] - onTrack[0]),
          rightFrom[i][1] + (onTrack[1] - rightFrom[i][1]) * m + (slid[1] - onTrack[1]),
        ];
      }
      right.setAttribute("d", polyD(morphPts));
    };

    // ---- the ink, dome, foam and bubbles: every stop-motion frame ----
    const inkFrames = new Map<number, InkFrame>();
    if (variant === "full") {
      const rim = small.slice(0, bodyStart + 1);
      const body = small.slice(bodyStart);
      clipRim.setAttribute("d", `${polyD(rim)}Z`);
      clipBody.setAttribute("d", `${polyD(body)}Z`);
      const rimL = rim.reduce((a, p) => (p[0] < a[0] ? p : a));
      const rimR = rim.reduce((a, p) => (p[0] > a[0] ? p : a));
      const rimTop = Math.min(...rim.map((p) => p[1]));
      const rimMid = (rimL[1] + rimR[1]) / 2;
      // The neck, between the rim's ends and the walls' tops.
      clipNeck.setAttribute("d", `${polyD([rimL, rimR, small[N - 1], small[bodyStart]])}Z`);
      const bottom = Math.max(...small.map((p) => p[1]));
      const full = rimTop - 1;
      const x0 = Math.min(...small.map((p) => p[0])) - 4;
      const x1 = Math.max(...small.map((p) => p[0])) + 4;
      // The outside of each wall (top to bottom), for the foam to roll down.
      const leftWall = body.filter((p) => p[0] < cx && p[1] < bottom - hs * 0.06);
      const rightWall = body.filter((p) => p[0] > cx && p[1] < bottom - hs * 0.06).reverse();
      const r0 = Math.max(4, hs * 0.06);

      // The foam, like soap suds: wide, shallow, open arcs (cloud tops)
      // piled on the rim, and waves of them down each side, each wave reaching
      // further down and standing further out, with gaps.
      const foamList: Foam[] = [];
      const rand = rng(7);
      for (let row = 0; row < 3; row++) {
        const span = (rimR[0] - rimL[0]) * (1.1 - row * 0.3);
        const n = Math.max(2, Math.round(span / (r0 * 1.5)));
        for (let i = 0; i < n; i++) {
          if (rand() < 0.2) continue;
          const x = cx - span / 2 + (span * (i + 0.5)) / n + (rand() - 0.5) * r0 * 0.6;
          // Stacked over the dome, each row narrower, like a pile of suds.
          const y = rimTop - hs * 0.025 - row * r0 * 0.7 - (rand() - 0.3) * r0 * 0.3;
          foamList.push({
            x,
            y,
            ax: x,
            ay: rimTop + row * 0.5,
            r: r0 * (0.8 + rand() * 0.45),
            dir: -Math.PI / 2,
            sweep: Math.PI * (0.55 + rand() * 0.3),
            wave: row,
            row,
          });
        }
      }
      for (const [wall, side] of [
        [leftWall, -1],
        [rightWall, 1],
      ] as const) {
        const path: Pt[] = [side < 0 ? rimL : rimR, ...wall];
        const cum = lengths(path);
        const L = cum[cum.length - 1];
        for (let wave = 0; wave < INTRO_FOAM_WAVES; wave++) {
          const reach = L * (0.3 + (0.6 * (wave + 1)) / INTRO_FOAM_WAVES);
          const out = r0 * (0.3 + wave * 0.35);
          for (let s = rand() * r0; s < reach; s += r0 * (1.3 + rand() * 0.5)) {
            if (rand() < 0.25) continue;
            const p = pointAt(path, cum, s);
            const p2 = pointAt(path, cum, s + 2);
            // Outward normal of the wall here.
            const tx = p2[0] - p[0];
            const ty = p2[1] - p[1];
            const tl = Math.hypot(tx, ty) || 1;
            let nx = -ty / tl;
            let ny = tx / tl;
            if (nx * side < 0) {
              nx = -nx;
              ny = -ny;
            }
            foamList.push({
              x: p[0] + nx * out,
              y: p[1] + ny * out,
              ax: p[0],
              ay: p[1],
              r: r0 * (0.7 + rand() * 0.5),
              dir: Math.atan2(ny - 1.3, nx),
              sweep: Math.PI * (0.5 + rand() * 0.35),
              wave: wave + 1,
              row: wave,
            });
          }
        }
      }
      // Bubbles: born around the top and sides during the foam, each living a
      // few frames.
      const bubbleList: Bubble[] = [];
      const fFoam0 = Math.floor(INTRO_FOAM[0] * INTRO_INK_FPS);
      const fFoam1 = Math.ceil(INTRO_FOAM[1] * INTRO_INK_FPS);
      for (let i = 0; i < 9; i++) {
        const sideX = rand() < 0.5 ? rimL[0] - rand() * ws * 0.35 : rimR[0] + rand() * ws * 0.35;
        bubbleList.push({
          x: rand() < 0.3 ? cx + (rand() - 0.5) * ws * 0.6 : sideX,
          y: rimTop - rand() * hs * 0.15 + rand() * hs * 0.3,
          r: 1.5 + rand() * 3.5,
          born: fFoam0 + Math.floor(rand() * (fFoam1 - fFoam0)),
          life: 3 + Math.floor(rand() * 4),
          phase: rand() * 6,
        });
      }

      const fStart = Math.floor(INTRO_FILL[0] * INTRO_INK_FPS);
      const fEnd = Math.ceil(INTRO_SETTLE[1] * INTRO_INK_FPS);
      const waveTimes = Array.from(
        { length: INTRO_FOAM_WAVES + 1 },
        (_, i) => INTRO_FOAM[0] + ((INTRO_FOAM[1] - INTRO_FOAM[0]) * i) / (INTRO_FOAM_WAVES + 1),
      );
      for (let f = fStart; f <= fEnd; f++) {
        const t = f / INTRO_INK_FPS;
        const r = rng(1000 + f);
        // The ink level, in steps: up while filling, down while settling.
        const steps =
          t < INTRO_SETTLE[0]
            ? Math.ceil(progress(t, INTRO_FILL) * INTRO_FILL_STEPS)
            : Math.round((1 - progress(t, INTRO_SETTLE)) * INTRO_FILL_STEPS);
        let inkD = "";
        if (steps > 0) {
          const level = bottom - (steps / INTRO_FILL_STEPS) * (bottom - full);
          const a1 = r() * 6;
          const a2 = r() * 6;
          const tilt = (r() - 0.5) * hs * 0.04;
          const amp = hs * 0.012;
          const pts: Pt[] = [];
          for (let x = x0; x <= x1; x += 3) {
            const u = (x - cx) / (ws / 2);
            pts.push([x, level + tilt * u + amp * (Math.sin(u * 5 + a1) * 0.6 + Math.sin(u * 11 + a2) * 0.4)]);
          }
          inkD = `${polyD(pts)}L${f1(x1)},${f1(bottom + 4)}L${f1(x0)},${f1(bottom + 4)}Z`;
        }
        // The dome: bulges up over the rim, wobbling, while the jar is full.
        let domeD = "";
        const settle = progress(t, INTRO_SETTLE);
        const dh = (steps === INTRO_FILL_STEPS ? easeOut(progress(t, INTRO_DOME)) : 0) * hs * 0.07 * (1 + (r() - 0.5) * 0.2);
        if (dh > 0.5) {
          const top = rimTop - dh * 1.33;
          const k = (rimR[0] - rimL[0]) * 0.08;
          domeD = `M${f1(rimL[0])},${f1(rimMid)}C${f1(rimL[0] + k)},${f1(top)} ${f1(rimR[0] - k)},${f1(top)} ${f1(rimR[0])},${f1(rimMid)}Z`;
        }
        // The foam: every bubble of each wave that has arrived, its arc
        // redrawn a little differently each frame (the boil); while settling,
        // the rows go flat and sink into the jar's line, outermost first.
        let foamD = "";
        for (const b of foamList) {
          if (t < waveTimes[b.wave]) continue;
          const flat = clamp01(settle * 1.6 - b.row * 0.15);
          if (flat >= 1) continue;
          const rx = b.r * (1 + (r() - 0.5) * 0.16);
          const ry = rx * 0.72 * (1 - flat);
          const sweep = b.sweep * (r() < 0.15 ? 0.65 : 1);
          const a0 = b.dir - sweep / 2;
          const a1 = b.dir + sweep / 2;
          // Settling, each arc slides onto the wall it stood off.
          const ox = b.x + (b.ax - b.x) * flat + (r() - 0.5) * 0.8;
          const oy = b.y + (b.ay - b.y) * flat + (r() - 0.5) * 0.8;
          foamD += `M${f1(ox + rx * Math.cos(a0))},${f1(oy + ry * Math.sin(a0))}A${f1(rx)},${f1(Math.max(0.01, ry))} 0 ${sweep > Math.PI ? 1 : 0} 1 ${f1(ox + rx * Math.cos(a1))},${f1(oy + ry * Math.sin(a1))}`;
        }
        // Bubbles drift up with a wobble; gone the frame after their last.
        let bubD = "";
        for (const b of bubbleList) {
          const age = f - b.born;
          if (age < 0 || age >= b.life || t >= INTRO_SETTLE[0] + 0.1) continue;
          const x = b.x + Math.sin(b.phase + age * 1.7) * 1.5;
          const y = b.y - age * hs * 0.025;
          bubD += `M${f1(x - b.r)},${f1(y)}a${f1(b.r)},${f1(b.r)} 0 1 0 ${f1(2 * b.r)},0a${f1(b.r)},${f1(b.r)} 0 1 0 ${f1(-2 * b.r)},0`;
        }
        inkFrames.set(f, { ink: inkD, dome: domeD, foam: foamD, bubbles: bubD });
      }
    }

    const slow = slowMs(1000) / 1000;
    const drawWin = variant === "full" ? INTRO_DRAW : INTRO_SHORT.draw;
    const breakWin = variant === "full" ? INTRO_BREAK : INTRO_SHORT.break;
    const swapAt = variant === "full" ? INTRO_HANDOFF[0] : INTRO_SHORT.handoff;
    let shownInk = -1;
    let raf = 0;
    const t0 = performance.now();

    // Draws the intro as it is `raw` seconds in; true once it's time to swap.
    const render = (raw: number) => {
      const t = Math.floor(raw * INTRO_LINE_FPS) / INTRO_LINE_FPS;

      if (t < breakWin[0]) {
        outline.setAttribute("d", slice(small, cSmall, 0, easeOut(progress(t, drawWin)) * LS));
      } else {
        outline.setAttribute("d", "");
        const p = progress(t, breakWin);
        drawLeft(easeInOut(p));
        drawRight(p);
      }

      if (variant === "full") {
        const f = Math.floor(raw * INTRO_INK_FPS);
        if (f !== shownInk) {
          shownInk = f;
          const k = inkFrames.get(f);
          ink.setAttribute("d", k?.ink ?? "");
          dome.setAttribute("d", k?.dome ?? "");
          foam.setAttribute("d", k?.foam ?? "");
          bubbles.setAttribute("d", k?.bubbles ?? "");
        }
      }

      return t >= swapAt;
    };

    const frame = (now: number) => {
      if (finished) return;
      if (render((now - t0) / 1000 / slow)) {
        // The last pose is the target itself: check it, then swap.
        drawLeft(1);
        drawRight(1);
        if (process.env.NODE_ENV !== "production") {
          let off = 0;
          for (let i = 0; i < N; i++) off = Math.max(off, Math.hypot(morphPts[i][0] - rightTo[i][0], morphPts[i][1] - rightTo[i][1]));
          if (off > 0.5) console.warn(`intro: the jar line ends ${off.toFixed(2)}px off the real jar`);
          if (divider) {
            const end = pointAt(thread, cThread, LH + LR - LD);
            const top = divider[divider.length - 1];
            const off2 = Math.hypot(end[0] - divider[0][0], end[1] - divider[0][1]);
            if (off2 > 0.5) console.warn(`intro: the divider line starts ${off2.toFixed(2)}px off (top ${top[1].toFixed(0)})`);
          }
        }
        finish();
      } else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Dev only: window.__introAt(seconds) freezes the intro on that moment,
    // for checking its frames one by one; __introSetupMs is how long the
    // set-up above took.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __introSetupMs?: number }).__introSetupMs = performance.now() - setupStart;
      (window as unknown as { __introAt?: (s: number) => void }).__introAt = (s: number) => {
        cancelAnimationFrame(raf);
        shownInk = -1;
        render(s);
      };
    }

    // Click or any key skips to the end.
    const skip = () => finish();
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(doneTimer);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [variant]);

  return (
    <svg ref={svgRef} className={styles.intro} aria-hidden="true">
      <defs>
        <clipPath id="intro-jar-inside">
          <path ref={clipRimRef} />
          <path ref={clipBodyRef} />
          <path ref={clipNeckRef} />
        </clipPath>
      </defs>
      <path ref={inkRef} className={styles.ink} clipPath="url(#intro-jar-inside)" />
      <path ref={domeRef} className={styles.ink} />
      <path ref={foamRef} className={styles.line} strokeWidth={LINE_STROKE_WIDTH} />
      <path ref={bubblesRef} className={styles.line} strokeWidth={LINE_STROKE_WIDTH} />
      <path ref={outlineRef} className={styles.line} strokeWidth={LINE_STROKE_WIDTH} />
      <path ref={leftRef} className={styles.line} strokeWidth={LINE_STROKE_WIDTH} />
      <path ref={rightRef} className={styles.line} strokeWidth={LINE_STROKE_WIDTH} />
    </svg>
  );
}
