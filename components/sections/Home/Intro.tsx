"use client";

import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import styles from "./Intro.module.css";
import { JAR_OUTLINE, JAR_OUTLINE_BODY_START, JAR_PEN_WIDTH, JAR_STROKES } from "@/lib/jar-outline";
import { JAR_ART_H, JAR_ART_W, JAR_LINE, roughen } from "@/lib/jar-line";
import { LINE_STROKE_WIDTH } from "@/lib/wobbly";
import {
  INTRO_BLANK_S,
  INTRO_BOIL_DRAWINGS,
  INTRO_BOIL_OUT_S,
  INTRO_BOIL_PX,
  INTRO_DOME_FRAMES,
  INTRO_FADE_STEPS,
  INTRO_FILL_S,
  INTRO_FILL_STEPS,
  INTRO_FOAM_CREEP_S,
  INTRO_FOAM_WAVES,
  INTRO_FPS,
  INTRO_SPIRAL,
  INTRO_SHORT_DOT_S,
  INTRO_STRAND_MIN_PX,
  INTRO_STYLE,
  INTRO_PEN_PX_PER_S,
  INTRO_SHORT_S,
  INTRO_SMALL_SCALE,
  INTRO_SPILL_S,
  INTRO_THREAD_PX,
  slowMs,
} from "@/lib/motion";

type Pt = [number, number];

/** The jar artwork (the same file the jar on the page shows) and its
 * proportions (it fills its wrapper's width). */
const JAR_SRC = "/images/drawings/jar.svg";
const JAR_ASPECT = 2257 / 1600;
/** The strands' line: the jar drawing's own ink weight at full size. */
const THREAD_WIDTH = 1.2;
/** The jar drawing's ink is about this fraction of its width wide. The small
 * jar's copy is thickened back up to the full-size weight (scaled down, its
 * ink would be a faint third of a pixel). */
const JAR_INK_WIDTH = 0.0031;

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

const f1 = (v: number) => v.toFixed(1);
const polyD = (pts: Pt[]) => (pts.length < 2 ? "" : `M${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join("L")}`);

/** The stretch of a polyline between arc lengths s0 and s1, as path data. */
function slice(pts: Pt[], cum: number[], s0: number, s1: number): string {
  if (s1 - s0 < 0.3) return "";
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

/** A pen going through a list of strokes in order (lifting between them):
 * `penD(pen, s)` is everything drawn once it has gone s px. */
type Pen = { strokes: Pt[][]; cums: number[][]; starts: number[]; total: number; prefix: string[] };
function makePen(strokes: Pt[][]): Pen {
  const cums = strokes.map(lengths);
  const starts: number[] = [];
  let acc = 0;
  for (const c of cums) {
    starts.push(acc);
    acc += c[c.length - 1];
  }
  const prefix = [""];
  strokes.forEach((s, k) => prefix.push(prefix[k] + polyD(s)));
  return { strokes, cums, starts, total: acc, prefix };
}
function penD(pen: Pen, s: number): string {
  if (s <= 0) return "";
  const n = pen.strokes.length;
  if (s >= pen.total) return pen.prefix[n];
  let k = 0;
  while (k < n - 1 && pen.starts[k + 1] <= s) k++;
  return pen.prefix[k] + slice(pen.strokes[k], pen.cums[k], 0, s - pen.starts[k]);
}

/** One foam bubble: an open arc, facing away from the jar. */
type Foam = { x: number; y: number; r: number; dir: number; sweep: number; at: number; s: number; side: number };
/** One floating bubble: a small circle that drifts up, then pops. */
type Bubble = { x: number; y: number; r: number; born: number; life: number; phase: number };
/** What the small jar's ink layer shows on one drawing. */
type InkFrame = { ink: string; dome: string; foam: string; bubbles: string };

/**
 * The intro (docs/rebrand/intro-brief.md, v2), drawn over a blank home page
 * on first load, all on one stop-motion clock (INTRO_FPS drawings a second)
 * with every line boiling:
 *
 * full — a small copy of the real jar artwork draws on in the middle of the
 *   screen; black ink fills it in steps, domes over the rim and foams over,
 *   rolling down both sides in waves, with bubbles popping; two strands of
 *   thread leave the foam tops in rainbow arcs as the small jar fades; the
 *   left strand lands at the foot of the sidebar's divider and draws it up,
 *   the right one lands at the real jar and draws it stroke by stroke. Both
 *   are drawn from the real artwork (the jar drawing revealed along its own
 *   strokes, lib/jar-outline.ts; a copy of the divider's own path), so the
 *   last drawing is the page itself and the swap shows nothing.
 * short — just the last beat: the divider and the jar draw, fast.
 *
 * All line drawing goes at one pen speed (INTRO_PEN_PX_PER_S). Everything is
 * worked out before the first drawing; each one only writes attributes (no
 * React state). Click or any key skips to the end. `onReveal` fires at the
 * swap (Home shows the real page and lets the items fall); `onDone` right
 * after.
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
  const boilGroupRef = useRef<SVGGElement>(null);
  const noiseRef = useRef<SVGFETurbulenceElement>(null);
  const displaceRef = useRef<SVGFEDisplacementMapElement>(null);
  const smallGroupRef = useRef<SVGGElement>(null);
  const smallImgRef = useRef<SVGImageElement>(null);
  const thickenRef = useRef<SVGFEMorphologyElement>(null);
  const smallMaskRef = useRef<SVGPathElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const domeRef = useRef<SVGPathElement>(null);
  const foamRef = useRef<SVGPathElement>(null);
  const bubblesRef = useRef<SVGPathElement>(null);
  const clipRimRef = useRef<SVGPathElement>(null);
  const clipBodyRef = useRef<SVGPathElement>(null);
  const clipNeckRef = useRef<SVGPathElement>(null);
  const threadLRef = useRef<SVGPathElement>(null);
  const threadRRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGPathElement>(null);
  const jarLineRef = useRef<SVGPathElement>(null);
  const divClipRef = useRef<SVGRectElement>(null);
  const divSvgRef = useRef<SVGSVGElement>(null);
  const divPathRef = useRef<SVGPathElement>(null);
  const realImgRef = useRef<SVGImageElement>(null);
  const realMaskRef = useRef<SVGPathElement>(null);
  const callbacks = useRef({ onReveal, onDone });
  useEffect(() => {
    callbacks.current = { onReveal, onDone };
  });

  useEffect(() => {
    const svg = svgRef.current;
    const boilGroup = boilGroupRef.current;
    const noise = noiseRef.current;
    const displace = displaceRef.current;
    const smallGroup = smallGroupRef.current;
    const smallImg = smallImgRef.current;
    const thicken = thickenRef.current;
    const smallMask = smallMaskRef.current;
    const ink = inkRef.current;
    const dome = domeRef.current;
    const foam = foamRef.current;
    const bubbles = bubblesRef.current;
    const clipRim = clipRimRef.current;
    const clipBody = clipBodyRef.current;
    const clipNeck = clipNeckRef.current;
    const threadL = threadLRef.current;
    const threadR = threadRRef.current;
    const dot = dotRef.current;
    const jarLine = jarLineRef.current;
    const divClip = divClipRef.current;
    const divSvg = divSvgRef.current;
    const divPath = divPathRef.current;
    const realImg = realImgRef.current;
    const realMask = realMaskRef.current;
    const jarEl = document.querySelector("[data-intro-jar]");
    const realDivider = document.querySelector<SVGPathElement>("[data-intro-divider] path");
    let finished = false;
    let cancelled = false;
    let raf = 0;
    // The swap: the real page is committed to the DOM (flushSync) and the
    // intro hidden in the same task, so they change on the same frame — and
    // since the last drawing is the page itself, nothing visibly changes.
    const finish = () => {
      if (finished) return;
      finished = true;
      flushSync(() => callbacks.current.onReveal());
      if (svg) svg.style.visibility = "hidden";
      callbacks.current.onDone();
    };
    // A click or key skips the short version only — the first full intro
    // plays through. A resize mid-intro jumps to the end.
    const skip = () => finish();
    const canSkip = variant === "short";
    if (canSkip) {
      window.addEventListener("pointerdown", skip);
      window.addEventListener("keydown", skip);
    }
    window.addEventListener("resize", skip);
    const cleanup = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("resize", skip);
    };
    if (
      !svg || !boilGroup || !noise || !displace || !smallGroup || !smallImg || !smallMask || !ink || !dome || !foam ||
      !bubbles || !clipRim || !clipBody || !clipNeck || !threadL || !threadR || !divClip || !divSvg || !divPath ||
      !realImg || !realMask || !thicken || !dot || !jarLine || !jarEl
    ) {
      finish();
      return cleanup;
    }

    // The artwork has to be loaded before the first drawing.
    const art = new Image();
    art.src = JAR_SRC;
    art
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled && !finished) start();
      });

    function start() {
      if (!svg || !boilGroup || !noise || !displace || !smallGroup || !smallImg || !smallMask || !ink || !dome || !foam) return;
      if (!bubbles || !clipRim || !clipBody || !clipNeck || !threadL || !threadR || !divClip || !divSvg || !divPath) return;
      if (!realImg || !realMask || !thicken || !dot || !jarLine || !jarEl) return;
      const setupStart = performance.now();
      // Which full version (INTRO_STYLE): the v2 story (small jar, ink,
      // foam, rainbow strands), or just the sketch (the divider and the jar
      // drawing on at the pen's speed). "line" (v3) is set up below.
      const full = variant === "full" && INTRO_STYLE === "overflow";
      const sketch = variant === "full" && INTRO_STYLE === "sketch";

      // ---- the real jar, and the small one centred on screen ----
      const J = jarEl.getBoundingClientRect();
      const w = J.width;
      const h = w * JAR_ASPECT;
      const ws = w * INTRO_SMALL_SCALE;
      const hs = h * INTRO_SMALL_SCALE;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const sx = cx - ws / 2;
      const sy = cy - hs / 2;
      const toReal = ([x, y]: Pt): Pt => [J.left + x * w, J.top + y * h];
      const toSmall = ([x, y]: Pt): Pt => [sx + x * ws, sy + y * hs];
      for (const [img, x, y, iw, ih] of [
        [realImg, J.left, J.top, w, h],
        [smallImg, sx, sy, ws, hs],
      ] as const) {
        img.setAttribute("href", JAR_SRC);
        img.setAttribute("x", String(x));
        img.setAttribute("y", String(y));
        img.setAttribute("width", String(iw));
        img.setAttribute("height", String(ih));
      }
      const penSmall = makePen(JAR_STROKES.map((s) => s.map((p) => toSmall(p as Pt))));
      const penReal = makePen(JAR_STROKES.map((s) => s.map((p) => toReal(p as Pt))));
      smallMask.setAttribute("stroke-width", String(JAR_PEN_WIDTH * ws));
      thicken.setAttribute("radius", String((JAR_INK_WIDTH * (w - ws)) / 2));
      realMask.setAttribute("stroke-width", String(JAR_PEN_WIDTH * w));

      // ---- the divider: a copy of the real one, drawn on from the bottom ----
      let LD = 0;
      let D0: Pt | null = null;
      let divBox: DOMRect | null = null;
      const realDivSvg = realDivider?.ownerSVGElement;
      if (realDivider && realDivSvg) {
        const box = realDivider.getBoundingClientRect();
        const ctm = realDivider.getScreenCTM();
        if (ctm && box.height > 40) {
          const sb = realDivSvg.getBoundingClientRect();
          divSvg.setAttribute("x", String(sb.left));
          divSvg.setAttribute("y", String(sb.top));
          divSvg.setAttribute("width", String(sb.width));
          divSvg.setAttribute("height", String(sb.height));
          divSvg.setAttribute("viewBox", realDivSvg.getAttribute("viewBox") ?? "");
          divSvg.setAttribute("preserveAspectRatio", realDivSvg.getAttribute("preserveAspectRatio") ?? "none");
          const cs = getComputedStyle(realDivider);
          divPath.setAttribute("d", realDivider.getAttribute("d") ?? "");
          divPath.setAttribute("stroke", cs.stroke);
          divPath.setAttribute("stroke-width", cs.strokeWidth);
          divPath.setAttribute("stroke-linecap", cs.strokeLinecap);
          const L = realDivider.getTotalLength();
          const m = 80;
          const pts = Array.from({ length: m }, (_, i) => {
            const p = realDivider.getPointAtLength((L * i) / (m - 1));
            const q = new DOMPoint(p.x, p.y).matrixTransform(ctm);
            return [q.x, q.y] as Pt;
          });
          LD = lengths(pts)[m - 1];
          D0 = pts[0][1] > pts[m - 1][1] ? pts[0] : pts[m - 1];
          divBox = box;
        }
      }
      const drawDivider = (s: number) => {
        if (!divBox) return;
        const p = clamp01(s / LD);
        const top = divBox.top - 3;
        const span = divBox.height + 6;
        divClip.setAttribute("x", String(divBox.left - 10));
        divClip.setAttribute("width", String(divBox.width + 20));
        divClip.setAttribute("y", String(top + span * (1 - p)));
        divClip.setAttribute("height", String(span * p));
      };

      // ---- v4, "line": one rough line becomes everything ----
      if (INTRO_STYLE === "line") {
        smallGroup.style.display = "none";
        realImg.style.display = "none";
        const short = variant === "short";
        const fps = INTRO_FPS;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // One stroke weight for every line: the divider's, never scaled.
        const lineW = realDivider ? parseFloat(getComputedStyle(realDivider).strokeWidth) || LINE_STROKE_WIDTH : LINE_STROKE_WIDTH;
        for (const el of [threadL, threadR, jarLine]) {
          el.setAttribute("stroke-width", String(lineW));
          el.setAttribute("vector-effect", "non-scaling-stroke");
        }

        // The jar: the same one-line jar the page shows (lib/jar-line.ts),
        // placed on the real jar's box. It starts on the left wall.
        const jarPx: Pt[] = JAR_LINE.map(([x, y]) => [J.left + (x / JAR_ART_W) * w, J.top + (y / JAR_ART_H) * h]);
        const cJar = lengths(jarPx);
        const Ljar = cJar[cJar.length - 1];
        const contact = jarPx[0];

        // The dot, at the exact centre of the window: a small uneven blob.
        const C0: Pt = [vw / 2, vh / 2];
        const blobR = rng(31);
        const blob: Pt[] = Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          const r = 2 + (blobR() - 0.4) * 1.1;
          return [C0[0] + r * Math.cos(a), C0[1] + r * Math.sin(a) * 0.85];
        });
        const blobD = `${polyD(blob)}Z`;

        // The spiral: drawn outward from the dot, about 2 uneven turns, each
        // a different lumpy width, the end running on a little.
        const R = Math.max(20, Math.min(40, 0.036 * vh));
        const sr = rng(47);
        const p1 = sr() * 6;
        const p2 = sr() * 6;
        const turns = 2.1;
        const spiralRaw: Pt[] = [];
        for (let i = 0; i <= 170; i++) {
          const u = i / 170;
          const th = u * turns * Math.PI * 2 + 0.4;
          const lump = 1 + 0.17 * Math.sin(2.3 * th + p1) + 0.08 * Math.sin(5.1 * th + p2);
          let r = R * u ** 0.85 * lump;
          if (u > 0.88) r *= 1 + (u - 0.88) * 1.6; // the overshoot
          spiralRaw.push([C0[0] + r * Math.cos(th), C0[1] + r * Math.sin(th) * 0.92]);
        }
        const spiral = roughen(spiralRaw, 1.6, 53, 26);
        const cSpiral = lengths(spiral);
        const Lspiral = cSpiral[cSpiral.length - 1];

        // The split: the line's two ends pull away. The centre end leads the
        // left strand (its inner half trailing), the outer end the right one.
        const mid = Math.floor(spiral.length / 2);
        const bodyL: Pt[] = short ? [C0, [C0[0] - 0.5, C0[1]]] : spiral.slice(0, mid + 1).reverse();
        const bodyR: Pt[] = short ? [C0, [C0[0] + 0.5, C0[1]]] : spiral.slice(mid);
        const headL = bodyL[bodyL.length - 1];
        const headR = bodyR[bodyR.length - 1];
        // Wobbly travel paths: left down to the divider's foot, right to the
        // jar's left wall (arriving from below, to go on up the wall).
        const routeL: Pt[] = D0
          ? roughen(
              bezier(
                headL,
                [headL[0] - 0.3 * (headL[0] - D0[0]), headL[1] + 0.15 * (D0[1] - headL[1])],
                [D0[0] + 0.35 * (headL[0] - D0[0]), D0[1] - 0.05 * (D0[1] - headL[1])],
                D0,
                80,
              ),
              4,
              61,
              120,
            )
          : [];
        const routeR: Pt[] = roughen(
          bezier(headR, [headR[0] + 50, headR[1] + 30], [contact[0] - 30, contact[1] + 45], contact, 80),
          4,
          67,
          110,
        );
        // Keep the ends exactly on their targets.
        if (routeL.length) routeL[routeL.length - 1] = D0 as Pt;
        routeR[routeR.length - 1] = contact;
        const pathL = D0 ? [...bodyL, ...routeL.slice(1)] : [];
        const pathR = [...bodyR, ...routeR.slice(1)];
        const cPathL = lengths(pathL);
        const cPathR = lengths(pathR);
        const LbL = lengths(bodyL)[bodyL.length - 1];
        const LbR = lengths(bodyR)[bodyR.length - 1];
        const LpL = pathL.length ? cPathL[cPathL.length - 1] : 0;
        const LpR = cPathR[cPathR.length - 1];
        const WL = Math.max(LbL, INTRO_STRAND_MIN_PX);
        const WR = Math.max(LbR, INTRO_STRAND_MIN_PX);

        // The clock. The strands set off with a soft ease, then go at the
        // pen's speed.
        const tSplit = short ? INTRO_SHORT_DOT_S : INTRO_SPIRAL[1];
        const travel = Math.max(D0 ? LpL - LbL + LD : 0, LpR - LbR + Ljar);
        const EASE_S = short ? 0 : 0.3;
        const v = short ? travel / Math.max(0.3, INTRO_SHORT_S - INTRO_SHORT_DOT_S) : INTRO_PEN_PX_PER_S;
        const distAt = (tau: number) => (tau <= 0 ? 0 : tau < EASE_S ? (v * tau * tau) / (2 * EASE_S) : v * (tau - EASE_S / 2));
        const lineEnd = tSplit + travel / v + EASE_S / 2;
        const dotEnd = short ? INTRO_SHORT_DOT_S : INTRO_SPIRAL[0];

        const renderLine = (t: number) => {
          const f = Math.floor(t * fps + 1e-6);
          dot.setAttribute("d", t < dotEnd ? blobD : "");
          threadL.setAttribute("d", "");
          threadR.setAttribute("d", "");
          jarLine.setAttribute("d", "");
          let s = -1;
          if (!short && t >= INTRO_SPIRAL[0] && t < tSplit) {
            const p = clamp01((t - INTRO_SPIRAL[0]) / (INTRO_SPIRAL[1] - INTRO_SPIRAL[0]));
            const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
            threadR.setAttribute("d", slice(spiral, cSpiral, 0, Math.max(1, e * Lspiral)));
          } else if (t >= tSplit) {
            s = distAt(t - tSplit);
            if (D0) {
              const hL = LbL + s;
              threadL.setAttribute("d", slice(pathL, cPathL, Math.max(0, hL - WL), Math.min(hL, LpL)));
            }
            const hR = LbR + s;
            threadR.setAttribute("d", slice(pathR, cPathR, Math.max(0, hR - WR), Math.min(hR, LpR)));
            // On the jar the line stays where it has been: that's the jar.
            const sj = hR - LpR;
            if (sj > 0) jarLine.setAttribute("d", sj >= Ljar ? polyD(jarPx) : slice(jarPx, cJar, 0, sj));
          }
          drawDivider(s >= 0 ? LbL + s - LpL : -1);
          // The boil, easing out at the end so the last drawing is the page.
          const boil = INTRO_BOIL_PX * clamp01((lineEnd - t) / INTRO_BOIL_OUT_S);
          if (boil > 0.01) {
            noise.setAttribute("seed", String((f % INTRO_BOIL_DRAWINGS) + 1));
            displace.setAttribute("scale", String(2 * boil));
            boilGroup.setAttribute("filter", "url(#intro-boil)");
          } else boilGroup.removeAttribute("filter");
          return t >= lineEnd;
        };

        if (process.env.NODE_ENV !== "production") {
          const dev = window as unknown as { __introAt?: (s: number) => void; __introSetupMs?: number; __introEnd?: number };
          dev.__introSetupMs = performance.now() - setupStart;
          dev.__introEnd = lineEnd;
          dev.__introAt = (secs: number) => {
            cancelAnimationFrame(raf);
            renderLine(secs);
          };
        }
        const slowL = slowMs(1000) / 1000;
        const tStart = performance.now();
        let lastLF = -1;
        const lineFrame = (now: number) => {
          if (finished || cancelled) return;
          const f = Math.floor(((now - tStart) / 1000 / slowL) * fps);
          if (f !== lastLF) {
            lastLF = f;
            if (renderLine(f / fps)) {
              finish();
              return;
            }
          }
          raf = requestAnimationFrame(lineFrame);
        };
        renderLine(0);
        raf = requestAnimationFrame(lineFrame);
        return;
      }

      // ---- the small jar's inside, ink, dome, foam and bubbles ----
      const O: Pt[] = JAR_OUTLINE.map((p) => toSmall(p as Pt));
      const bodyStart = JAR_OUTLINE_BODY_START;
      const rim = O.slice(0, bodyStart + 1);
      const body = O.slice(bodyStart);
      const rimL = rim.reduce((a, p) => (p[0] < a[0] ? p : a));
      const rimR = rim.reduce((a, p) => (p[0] > a[0] ? p : a));
      const rimTop = Math.min(...rim.map((p) => p[1]));
      const rimMid = (rimL[1] + rimR[1]) / 2;
      const bottom = Math.max(...O.map((p) => p[1]));
      const r0 = Math.max(4, hs * 0.06);
      const pileTop = rimTop - hs * 0.025 - 2 * r0 * 0.7 - r0 * 0.7;

      // The clock: lines take as long as they are, at the pen's speed.
      const speed = full || sketch ? INTRO_PEN_PX_PER_S : Math.max(penReal.total, LD) / INTRO_SHORT_S;
      const tDraw0 = full ? INTRO_BLANK_S : 0;
      const tFill0 = full ? tDraw0 + penSmall.total / speed : 0;
      const tSpill0 = tFill0 + (full ? INTRO_FILL_S : 0);
      // When the lines start: after the story, or after the blank page.
      const tR0 = full ? tSpill0 + INTRO_SPILL_S : sketch ? INTRO_BLANK_S : 0;
      const fadeS = (INTRO_FADE_STEPS * 2) / INTRO_FPS;

      // The two strands: rainbow halves from the foam tops, up and out, then
      // down to where each starts drawing.
      let arcL: Pt[] = [];
      let arcR: Pt[] = [];
      if (full) {
        const startL: Pt = [rimL[0] + (rimR[0] - rimL[0]) * 0.22, pileTop];
        const startR: Pt = [rimL[0] + (rimR[0] - rimL[0]) * 0.78, pileTop];
        const apexY = pileTop - Math.max(50, window.innerHeight * 0.14);
        if (D0) {
          const dx = startL[0] - D0[0];
          arcL = bezier(startL, [startL[0] - dx * 0.2, apexY], [D0[0] + dx * 0.2, apexY + 0.15 * (D0[1] - apexY)], D0, 80);
        }
        // The right one mirrors it, landing where the jar's pen starts (the
        // bottom of its right wall).
        const land = penReal.strokes[0][0];
        const dxR = land[0] - startR[0];
        arcR = bezier(startR, [startR[0] + dxR * 0.2, apexY], [land[0] - dxR * 0.2, apexY + 0.15 * (land[1] - apexY)], land, 80);
      }
      const cArcL = lengths(arcL);
      const cArcR = lengths(arcR);
      const LaL = arcL.length ? cArcL[cArcL.length - 1] : 0;
      const LaR = arcR.length ? cArcR[cArcR.length - 1] : 0;
      const thread = full ? INTRO_THREAD_PX : 0;
      const tEnd = tR0 + Math.max(LaL + Math.max(LD, thread), LaR + Math.max(penReal.total, thread)) / speed;
      const thread0 = (arc: Pt[], c: number[], La: number, s: number, el: SVGPathElement) => {
        el.setAttribute("d", La > 0 ? slice(arc, c, Math.max(0, s - thread), Math.min(s, La)) : "");
      };

      const inkFrames = new Map<number, InkFrame>();
      if (full) {
        clipRim.setAttribute("d", `${polyD(rim)}Z`);
        clipBody.setAttribute("d", `${polyD(body)}Z`);
        clipNeck.setAttribute("d", `${polyD([rimL, rimR, O[O.length - 1], O[bodyStart]])}Z`);
        const x0 = Math.min(...O.map((p) => p[0])) - 4;
        const x1 = Math.max(...O.map((p) => p[0])) + 4;
        const fullLevel = rimTop - 1;
        const foamStart = tSpill0 + INTRO_DOME_FRAMES / INTRO_FPS;
        const rand = rng(7);
        const foamList: Foam[] = [];
        // Suds piled on the rim: wide, shallow, open arcs, rows narrowing.
        for (let row = 0; row < 3; row++) {
          const span = (rimR[0] - rimL[0]) * (1.1 - row * 0.3);
          const n = Math.max(2, Math.round(span / (r0 * 1.5)));
          for (let i = 0; i < n; i++) {
            if (rand() < 0.2) continue;
            foamList.push({
              x: cx - span / 2 + (span * (i + 0.5)) / n + (rand() - 0.5) * r0 * 0.6,
              y: rimTop - hs * 0.025 - row * r0 * 0.7 - (rand() - 0.3) * r0 * 0.3,
              r: r0 * (0.8 + rand() * 0.45),
              dir: -Math.PI / 2,
              sweep: Math.PI * (0.55 + rand() * 0.3),
              at: foamStart + (row * 2) / INTRO_FPS,
              s: 0,
              side: 0,
            });
          }
        }
        // Waves down each side: each starts at the rim and creeps to the
        // bottom, standing a little further out than the last.
        const leftWall = body.filter((p) => p[0] < cx && p[1] < bottom - hs * 0.04);
        const rightWall = body.filter((p) => p[0] > cx && p[1] < bottom - hs * 0.04).reverse();
        const wallPaths: { side: number; path: Pt[]; cum: number[] }[] = [
          { side: -1, path: [rimL, ...leftWall] },
          { side: 1, path: [rimR, ...rightWall] },
        ].map((o) => ({ ...o, cum: lengths(o.path) }));
        const waveGap = (INTRO_SPILL_S - INTRO_DOME_FRAMES / INTRO_FPS - 0.15 - INTRO_FOAM_CREEP_S) / Math.max(1, INTRO_FOAM_WAVES - 1);
        for (const { side, path, cum } of wallPaths) {
          const L = cum[cum.length - 1];
          for (let wave = 0; wave < INTRO_FOAM_WAVES; wave++) {
            const out = r0 * (0.3 + wave * 0.35);
            const at = foamStart + 0.15 + wave * waveGap;
            for (let s = rand() * r0; s < L; s += r0 * (1.3 + rand() * 0.5)) {
              if (rand() < 0.25) continue;
              const p = pointAt(path, cum, s);
              const p2 = pointAt(path, cum, s + 2);
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
                r: r0 * (0.7 + rand() * 0.5),
                dir: Math.atan2(ny - 1.3, nx),
                sweep: Math.PI * (0.5 + rand() * 0.35),
                at,
                s: s / L,
                side,
              });
            }
          }
        }
        const bubbleList: Bubble[] = [];
        const fB0 = Math.floor(foamStart * INTRO_FPS);
        const fB1 = Math.ceil((tR0 + 0.2) * INTRO_FPS);
        for (let i = 0; i < 12; i++) {
          const sideX = rand() < 0.5 ? rimL[0] - rand() * ws * 0.4 : rimR[0] + rand() * ws * 0.4;
          bubbleList.push({
            x: rand() < 0.3 ? cx + (rand() - 0.5) * ws * 0.7 : sideX,
            y: pileTop + rand() * hs * 0.4,
            r: 1.5 + rand() * 3.5,
            born: fB0 + Math.floor(rand() * (fB1 - fB0)),
            life: 3 + Math.floor(rand() * 4),
            phase: rand() * 6,
          });
        }

        const fFill0 = Math.floor(tFill0 * INTRO_FPS);
        const fEnd = Math.ceil((tR0 + fadeS) * INTRO_FPS);
        for (let f = fFill0; f <= fEnd; f++) {
          const t = f / INTRO_FPS;
          const r = rng(1000 + f);
          // The level, a step every 2 drawings; its top sloshes side to side
          // (a different wave each drawing) and climbs the glass a little.
          const k = Math.min(INTRO_FILL_STEPS, Math.floor((f - fFill0) / 2) + 1);
          const level = bottom - (k / INTRO_FILL_STEPS) * (bottom - fullLevel);
          const slosh = (k % 2 ? 1 : -1) * hs * 0.035 * (1 - (0.5 * k) / INTRO_FILL_STEPS) * (0.7 + r() * 0.6);
          const a1 = r() * 6;
          const a2 = r() * 6;
          const amp = hs * 0.014;
          const pts: Pt[] = [];
          for (let x = x0; x <= x1; x += 3) {
            const u = (x - cx) / (ws / 2);
            pts.push([x, level + slosh * u + amp * (Math.sin(u * 4 + a1) * 0.6 + Math.sin(u * 9 + a2) * 0.4) - hs * 0.012 * u ** 6]);
          }
          const inkD = `${polyD(pts)}L${f1(x1)},${f1(bottom + 4)}L${f1(x0)},${f1(bottom + 4)}Z`;
          // The dome: up over a few drawings, then wobbling while it spills.
          let domeD = "";
          const df = f - Math.floor(tSpill0 * INTRO_FPS);
          if (df >= 0) {
            const dh = Math.min(1, (df + 1) / INTRO_DOME_FRAMES) * hs * 0.07 * (1 + (r() - 0.5) * 0.25);
            const top = rimTop - dh * 1.33;
            const kk = (rimR[0] - rimL[0]) * 0.08;
            domeD = `M${f1(rimL[0])},${f1(rimMid)}C${f1(rimL[0] + kk)},${f1(top)} ${f1(rimR[0] - kk)},${f1(top)} ${f1(rimR[0])},${f1(rimMid)}Z`;
          }
          let foamD = "";
          for (const b of foamList) {
            if (t < b.at) continue;
            if (b.side !== 0 && b.s > (t - b.at) / INTRO_FOAM_CREEP_S) continue;
            const rx = b.r * (1 + (r() - 0.5) * 0.16);
            const ry = rx * 0.72;
            const sweep = b.sweep * (r() < 0.15 ? 0.65 : 1);
            const a0 = b.dir - sweep / 2;
            const aa = b.dir + sweep / 2;
            const ox = b.x + (r() - 0.5) * 0.8;
            const oy = b.y + (r() - 0.5) * 0.8;
            foamD += `M${f1(ox + rx * Math.cos(a0))},${f1(oy + ry * Math.sin(a0))}A${f1(rx)},${f1(ry)} 0 0 1 ${f1(ox + rx * Math.cos(aa))},${f1(oy + ry * Math.sin(aa))}`;
          }
          let bubD = "";
          for (const b of bubbleList) {
            const age = f - b.born;
            if (age < 0 || age >= b.life) continue;
            const x = b.x + Math.sin(b.phase + age * 1.7) * 1.5;
            const y = b.y - age * hs * 0.03;
            bubD += `M${f1(x - b.r)},${f1(y)}a${f1(b.r)},${f1(b.r)} 0 1 0 ${f1(2 * b.r)},0a${f1(b.r)},${f1(b.r)} 0 1 0 ${f1(-2 * b.r)},0`;
          }
          inkFrames.set(f, { ink: inkD, dome: domeD, foam: foamD, bubbles: bubD });
        }
      } else {
        smallGroup.style.display = "none";
      }

      // ---- one drawing ----
      let shownInk = -1;
      const render = (t: number) => {
        const f = Math.floor(t * INTRO_FPS + 1e-6);
        if (full) {
          smallMask.setAttribute("d", penD(penSmall, (t - tDraw0) * speed));
          const k = inkFrames.get(f);
          if (f !== shownInk) {
            shownInk = f;
            ink.setAttribute("d", k?.ink ?? "");
            dome.setAttribute("d", k?.dome ?? "");
            foam.setAttribute("d", k?.foam ?? "");
            bubbles.setAttribute("d", k?.bubbles ?? "");
          }
          // The small jar fades out in steps while the strands leave.
          const step = t < tR0 ? 0 : Math.min(INTRO_FADE_STEPS, Math.floor((t - tR0) * INTRO_FPS / 2) + 1);
          smallGroup.style.opacity = String(1 - step / INTRO_FADE_STEPS);
        }
        const s = t < tR0 ? -1 : (t - tR0) * speed;
        thread0(arcL, cArcL, LaL, s, threadL);
        thread0(arcR, cArcR, LaR, s, threadR);
        drawDivider(s - LaL);
        const sj = s - LaR;
        if (sj >= penReal.total - 0.5) realImg.removeAttribute("mask");
        else {
          realImg.setAttribute("mask", "url(#intro-mask-real)");
          realMask.setAttribute("d", penD(penReal, sj));
        }
        // The boil: every line redrawn with a small smooth wobble, cycling
        // through INTRO_BOIL_DRAWINGS versions a drawing at a time (the
        // classic hand-drawn boil loop), easing out at the end.
        const boil = INTRO_BOIL_PX * clamp01((tEnd - t) / INTRO_BOIL_OUT_S);
        if (boil > 0.01) {
          noise.setAttribute("seed", String((f % INTRO_BOIL_DRAWINGS) + 1));
          displace.setAttribute("scale", String(2 * boil));
          boilGroup.setAttribute("filter", "url(#intro-boil)");
        } else boilGroup.removeAttribute("filter");
        return t >= tEnd;
      };

      if (process.env.NODE_ENV !== "production") {
        const dev = window as unknown as { __introAt?: (s: number) => void; __introSetupMs?: number; __introEnd?: number };
        dev.__introSetupMs = performance.now() - setupStart;
        dev.__introEnd = tEnd;
        dev.__introAt = (secs: number) => {
          cancelAnimationFrame(raf);
          shownInk = -1;
          render(secs);
        };
      }

      const slow = slowMs(1000) / 1000;
      const t0 = performance.now();
      let lastF = -1;
      const frame = (now: number) => {
        if (finished || cancelled) return;
        const f = Math.floor(((now - t0) / 1000 / slow) * INTRO_FPS);
        if (f !== lastF) {
          lastF = f;
          if (render(f / INTRO_FPS)) {
            finish();
            return;
          }
        }
        raf = requestAnimationFrame(frame);
      };
      render(0);
      raf = requestAnimationFrame(frame);
    }

    return cleanup;
  }, [variant]);

  return (
    <svg ref={svgRef} className={styles.intro} aria-hidden="true">
      <defs>
        <filter id="intro-boil" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence ref={noiseRef} type="fractalNoise" baseFrequency="0.035" numOctaves={1} seed={1} result="noise" />
          <feDisplacementMap
            ref={displaceRef}
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
            colorInterpolationFilters="sRGB"
          />
        </filter>
        <filter id="intro-thicken" x="-5%" y="-5%" width="110%" height="110%">
          <feMorphology ref={thickenRef} operator="dilate" radius={0} />
        </filter>
        <clipPath id="intro-jar-inside">
          <path ref={clipRimRef} />
          <path ref={clipBodyRef} />
          <path ref={clipNeckRef} />
        </clipPath>
        <mask id="intro-mask-small" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <path ref={smallMaskRef} className={styles.pen} />
        </mask>
        <mask id="intro-mask-real" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <path ref={realMaskRef} className={styles.pen} />
        </mask>
        <clipPath id="intro-divider-clip">
          <rect ref={divClipRef} width="0" height="0" />
        </clipPath>
      </defs>
      <g ref={boilGroupRef}>
        <g ref={smallGroupRef}>
          <g filter="url(#intro-thicken)">
            <image ref={smallImgRef} mask="url(#intro-mask-small)" preserveAspectRatio="none" />
          </g>
          <path ref={inkRef} className={styles.ink} clipPath="url(#intro-jar-inside)" />
          <path ref={domeRef} className={styles.ink} />
          <path ref={foamRef} className={styles.line} strokeWidth={LINE_STROKE_WIDTH} />
          <path ref={bubblesRef} className={styles.line} strokeWidth={LINE_STROKE_WIDTH} />
        </g>
        <path ref={dotRef} className={styles.ink} />
        <path ref={jarLineRef} className={styles.line} />
        <path ref={threadLRef} className={styles.line} strokeWidth={THREAD_WIDTH} />
        <path ref={threadRRef} className={styles.line} strokeWidth={THREAD_WIDTH} />
        <g clipPath="url(#intro-divider-clip)">
          <svg ref={divSvgRef} overflow="visible">
            <path ref={divPathRef} fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        </g>
        <image ref={realImgRef} mask="url(#intro-mask-real)" preserveAspectRatio="none" />
      </g>
    </svg>
  );
}
