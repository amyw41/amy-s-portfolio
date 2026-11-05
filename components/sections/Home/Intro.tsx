"use client";

import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import styles from "./Intro.module.css";
import { JAR_OUTLINE, JAR_OUTLINE_BODY_START, JAR_PEN_WIDTH, JAR_STROKES } from "@/lib/jar-outline";
import { JAR_ART_H, JAR_ART_W, JAR_PEN_STROKES, JAR_WOBBLE, JAR_WOBBLE_STEP, jarPenStrokes } from "@/lib/jar-line";
import { LINE_STROKE_WIDTH } from "@/lib/wobbly";
import {
  INTRO_BLANK_S,
  INTRO_BOIL_DRAWINGS,
  INTRO_BOIL_OUT_S,
  INTRO_BOIL_PX,
  INTRO_BOIL_SOFT_PX,
  INTRO_DOME_FRAMES,
  INTRO_FADE_STEPS,
  INTRO_FILL_S,
  INTRO_FILL_STEPS,
  INTRO_FOAM_CREEP_S,
  INTRO_FOAM_WAVES,
  INTRO_FPS,
  INTRO_SPIRAL,
  INTRO_GESTURE_PX_PER_S,
  INTRO_GESTURE_SWING,
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
const JAR_INK_WIDTH = 0.00144;

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
      !realImg || !realMask || !thicken || !dot || !jarEl
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
      if (!realImg || !realMask || !thicken || !dot || !jarEl) return;
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
      // Drawn on from the bottom (or, with fromTop, from the top).
      const drawDivider = (s: number, fromTop = false) => {
        if (!divBox) return;
        const p = clamp01(s / LD);
        const top = divBox.top - 3;
        const span = divBox.height + 6;
        divClip.setAttribute("x", String(divBox.left - 10));
        divClip.setAttribute("width", String(divBox.width + 20));
        divClip.setAttribute("y", String(fromTop ? top : top + span * (1 - p)));
        divClip.setAttribute("height", String(span * p));
      };

      // ---- v8, "line": one thin line, released like a paper ribbon ----
      if (INTRO_STYLE === "line") {
        smallGroup.style.display = "none";
        const short = variant === "short";
        const fps = INTRO_FPS;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const unit = (a: Pt, b: Pt): Pt => {
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
        };

        // The jar: the original drawing, revealed by one pen going through
        // its own strokes end to end (lib/jar-line.ts). The full version
        // starts it on the right wall, level with the window's centre, where
        // the right strand comes in; the short one from the left wall.
        const toPx = ([x, y]: Pt): Pt => [J.left + (x / JAR_ART_W) * w, J.top + (y / JAR_ART_H) * h];
        const jarPen = makePen(
          (short ? JAR_PEN_STROKES : jarPenStrokes(1, (vh / 2 - J.top) / h)).map((st) => st.map((p) => toPx(p as Pt))),
        );
        const Ljar = jarPen.total;
        const land = jarPen.strokes[0][0];
        const dirJar = unit(land, jarPen.strokes[0][Math.min(3, jarPen.strokes[0].length - 1)]);

        // One line weight: the jar drawing's own, as it actually shows on
        // screen — the drawing's ink (its darkness, measured off the
        // artwork rendered at its size) spread along its strokes.
        let lineW = JAR_INK_WIDTH * w;
        try {
          const cw = Math.max(1, Math.round(w));
          const ch = Math.max(1, Math.round(h));
          const cv = document.createElement("canvas");
          cv.width = cw;
          cv.height = ch;
          const g = cv.getContext("2d", { willReadFrequently: true });
          if (g) {
            g.drawImage(art, 0, 0, cw, ch);
            const data = g.getImageData(0, 0, cw, ch).data;
            let ink = 0;
            for (let i = 0; i < data.length; i += 4) ink += (data[i + 3] / 255) * (1 - (data[i] + data[i + 1] + data[i + 2]) / 765);
            const measured = ink / Ljar;
            if (measured > 0.2 && measured < 3) lineW = measured;
          }
        } catch {
          // Can't read the artwork back: keep the estimate.
        }
        for (const el of [threadL, threadR]) {
          el.setAttribute("stroke-width", String(lineW));
          el.setAttribute("vector-effect", "non-scaling-stroke");
        }

        // The dot, at the exact centre of the window: a small uneven blob.
        const C0: Pt = [vw / 2, vh / 2];
        const blobR = rng(31);
        const blob: Pt[] = Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          const r = 1.6 + (blobR() - 0.4) * 0.9;
          return [C0[0] + r * Math.cos(a), C0[1] + r * Math.sin(a) * 0.85];
        });
        const blobD = `${polyD(blob)}Z`;

        // Amy's hand (lib/jar-line.ts): her jar strokes' own wobble, scaled
        // to the jar's size on screen. `hand` bends a path across itself by
        // that signal, read from `from` along it, fading at both ends so
        // joins stay put. It's the only roughness the line gets.
        const artPx = w / JAR_ART_W;
        const wob = JAR_WOBBLE.length ? JAR_WOBBLE : [0];
        const hand = (pts: Pt[], from: number): Pt[] => {
          const c = lengths(pts);
          const L = c[c.length - 1];
          return pts.map((p, i) => {
            const k = Math.min(1, c[i] / 40, (L - c[i]) / 40);
            const idx = from + c[i] / artPx / JAR_WOBBLE_STEP;
            const i0 = Math.floor(idx) % wob.length;
            const f = idx - Math.floor(idx);
            const off = (wob[i0] * (1 - f) + wob[(i0 + 1) % wob.length] * f) * artPx * k;
            const t = unit(pts[Math.max(0, i - 1)], pts[Math.min(pts.length - 1, i + 1)]);
            return [p[0] - t[1] * off, p[1] + t[0] * off];
          });
        };

        // The gesture, like a hand: an unevenly spaced spiral out of the dot
        // swings into one loose loop — a little elliptical, tilted about 20°,
        // its radius drifting — that doesn't quite close: it passes ~8px
        // outside its start and carries straight on, off the top, into the
        // right ribbon. (Angles grow clockwise on screen.)
        const R = Math.max(22, Math.min(40, 0.043 * vh));
        const gr = rng(47);
        const tilt = (20 * Math.PI) / 180;
        const [ex, ey] = [1.1, 0.9];
        // A slow, non-repeating drift of the radius: random heights at
        // irregular angles, eased between.
        const driftKnots: { th: number; v: number }[] = [];
        for (let th = -2; th < 30; th += 1.1 + gr() * 0.9) driftKnots.push({ th, v: (gr() * 2 - 1) * 0.07 });
        const drift = (th: number) => {
          let k = 0;
          while (k < driftKnots.length - 2 && driftKnots[k + 1].th < th) k++;
          const a = driftKnots[k];
          const b = driftKnots[k + 1];
          const e = (1 - Math.cos(Math.PI * clamp01((th - a.th) / (b.th - a.th)))) / 2;
          return a.v + (b.v - a.v) * e;
        };
        const place = (th: number, r: number): Pt => {
          const x = ex * r * Math.cos(th);
          const y = ey * r * Math.sin(th);
          return [C0[0] + x * Math.cos(tilt) - y * Math.sin(tilt), C0[1] + x * Math.sin(tilt) + y * Math.cos(tilt)];
        };
        const thEnd = Math.PI * 1.5 + Math.PI * 4; // the top, two turns in
        const thJoin = thEnd - Math.PI * 2 - 0.55; // the loop passes its start by 0.55 rad
        const thBottom = thEnd - Math.PI; // where the loop will open
        const thStart = thJoin - Math.PI * 2;
        const ph = gr() * 6;
        const lineRaw: Pt[] = [];
        let iB = 0;
        const nLine = 200;
        for (let i = 0; i <= nLine; i++) {
          const th = thStart + ((thEnd - thStart) * i) / nLine;
          let r: number;
          if (th < thJoin) {
            // The spiral: uneven spacing as it winds out.
            const u = (th - thStart) / (thJoin - thStart);
            const uu = clamp01(u + 0.07 * Math.sin(2.3 * Math.PI * u + ph));
            r = R * (0.18 + 0.82 * uu ** 0.85);
          } else {
            // The loop, swinging slightly wide at the end (passing outside
            // its start, ~8px).
            const late = clamp01((th - (thEnd - 0.9)) / 0.9);
            r = R * (1 + drift(th)) + 8 * late * late;
          }
          if (iB === 0 && th >= thBottom) iB = lineRaw.length;
          lineRaw.push(place(th, r));
        }
        const line = hand(lineRaw, 0);
        const cLine = lengths(line);
        const Lline = cLine[cLine.length - 1];
        const sB = cLine[iB];

        // The release, from the same line: the loop opens at the bottom. The
        // pen carries on off the top into the right ribbon (the loop's left
        // half trailing behind); the line before the cut — the spiral and the
        // loop's first part — leaves from the bottom, heading the way the pen
        // was going there (left), into the left ribbon. Both are on the move
        // from the same instant, at the same speed. Each floats on a soft
        // decaying wave and lands heading the way its drawing goes.
        const bodyL = line.slice(0, iB + 1);
        const headR = line[line.length - 1];
        const headL = line[iB];
        const dirR = unit(line[line.length - 3], headR);
        const dirL = unit(line[iB - 2], headL);
        const ribbon = (p0: Pt, d0: Pt, p3: Pt, d3: Pt, amp: number, from: number): Pt[] => {
          const k = 0.42 * Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
          const base = bezier(p0, [p0[0] + d0[0] * k, p0[1] + d0[1] * k], [p3[0] - d3[0] * k, p3[1] - d3[1] * k], p3, 120);
          const waved = base.map((p, i) => {
            const u = i / (base.length - 1);
            const t = unit(base[Math.max(0, i - 1)], base[Math.min(base.length - 1, i + 1)]);
            const off = amp * Math.sin(3 * Math.PI * u) * Math.sin(Math.PI * u) * (1 - 0.6 * u);
            return [p[0] - t[1] * off, p[1] + t[0] * off] as Pt;
          });
          return hand(waved, from);
        };
        const routeR = ribbon(headR, dirR, land, dirJar, -16, 400);
        const routeL: Pt[] = D0 ? ribbon(headL, dirL, D0, [0, -1], 14, 900) : [];
        const pathR = [...line, ...routeR.slice(1)];
        const pathL = D0 ? [...bodyL, ...routeL.slice(1)] : [];
        const cPathR = lengths(pathR);
        const cPathL = lengths(pathL);
        const LpR = cPathR[cPathR.length - 1];
        const LpL = pathL.length ? cPathL[cPathL.length - 1] : 0;
        const WR = Lline - sB;

        // One timeline, one velocity curve: the pen sets off from the dot at
        // gesture speed and never slows to close the loop — its speed only
        // swings with the stroke (quicker going down, slower going up, like a
        // hand) until it lands on the jar, then picks up to the pen's
        // drawing speed. The left ribbon moves the same way from the instant
        // the loop opens.
        const t0 = INTRO_SPIRAL[0];
        const DT = 1 / 240;
        const speedOn = (pts: Pt[], c: number[], s: number) => {
          const a = pointAt(pts, c, s - 2);
          const b = pointAt(pts, c, s + 2);
          return INTRO_GESTURE_PX_PER_S * (1 + INTRO_GESTURE_SWING * unit(a, b)[1]);
        };
        const run = (pts: Pt[], c: number[], s0: number, landAt: number, total: number) => {
          const s: number[] = [s0];
          const v: number[] = [];
          let cur = s0;
          let vel = speedOn(pts, c, s0);
          while (cur < total && s.length < 40000) {
            vel = cur < landAt ? speedOn(pts, c, cur) : vel + ((INTRO_PEN_PX_PER_S - vel) * DT) / 0.2;
            v.push(vel);
            cur = Math.min(total, cur + vel * DT);
            s.push(cur);
          }
          return { s, v };
        };
        const runR = run(pathR, cPathR, 0, LpR, LpR + Ljar);
        const iRelease = runR.s.findIndex((x) => x >= Lline);
        const tRelease = t0 + iRelease * DT;
        const runL = D0 ? run(pathL, cPathL, sB, LpL, LpL + LD) : { s: [0], v: [] as number[] };
        const at = (r: { s: number[] }, tau: number) => (tau <= 0 ? r.s[0] : r.s[Math.min(r.s.length - 1, Math.floor(tau / DT))]);
        const iLand = runR.s.findIndex((x) => x >= LpR);
        const tLand = t0 + iLand * DT;
        // The speed check: from the dot until the pen lands on the jar.
        const flight = runR.v.slice(0, Math.max(1, iLand));
        const vPeak = Math.max(...flight);
        const vMin = Math.min(...flight);
        // The short version (repeat visits, phones) is just the drawings: the
        // divider top to bottom and the jar along its strokes, together.
        const lineEnd = short ? INTRO_SHORT_S : Math.max(t0 + runR.s.length * DT, D0 ? tRelease + runL.s.length * DT : 0);
        const dotEnd = short ? 0 : t0;
        const drawJar = (q: number) => {
          if (q >= Ljar - 0.5) realImg.removeAttribute("mask");
          else {
            realImg.setAttribute("mask", "url(#intro-mask-real)");
            realMask.setAttribute("d", q > 0 ? penD(jarPen, q) : "");
          }
        };
        const debug = new URLSearchParams(window.location.search).get("debug") === "1";
        if (debug && !short) {
          console.info(`intro: pen speed after the dot, until it lands on the jar — min ${vMin.toFixed(0)}px/s, peak ${vPeak.toFixed(0)}px/s (${((100 * vMin) / vPeak).toFixed(0)}% of peak)`);
        }
        let lastLog = -1;

        // Smooth motion; the boil changes on the stop-motion clock.
        const renderLine = (t: number) => {
          const f = Math.floor(t * fps + 1e-6);
          dot.setAttribute("d", t < dotEnd ? blobD : "");
          threadL.setAttribute("d", "");
          threadR.setAttribute("d", "");
          if (short) {
            const p = clamp01(t / INTRO_SHORT_S);
            drawDivider(p * LD, true);
            drawJar(p * Ljar);
          } else {
            let sR = -1;
            let sL = -1;
            if (t >= t0) {
              sR = at(runR, t - t0);
              if (sR < Lline) {
                // Still drawing the loop: one line from the dot.
                threadR.setAttribute("d", slice(pathR, cPathR, 0, Math.max(1, sR)));
              } else {
                // Released: each ribbon keeps its own length until it lands,
                // then the line behind it stays.
                threadR.setAttribute("d", slice(pathR, cPathR, Math.max(sB, sR - WR), Math.min(sR, LpR)));
                if (D0) {
                  sL = at(runL, t - tRelease);
                  threadL.setAttribute("d", slice(pathL, cPathL, Math.max(0, sL - sB), Math.min(sL, LpL)));
                }
              }
            }
            drawDivider(sL >= 0 ? sL - LpL : -1);
            drawJar(sR >= 0 ? sR - LpR : -1);
            if (debug && f !== lastLog && t >= t0) {
              lastLog = f;
              const i = Math.min(runR.v.length - 1, Math.floor((t - t0) / DT));
              console.log(`intro t=${t.toFixed(3)}s pen ${runR.v[i]?.toFixed(0)}px/s`);
            }
          }
          // The boil: softer while the line loops and floats, the full
          // wobble on the jar, easing out at the end so the last drawing is
          // the page.
          const calm = short ? 1 : clamp01((t - tLand) / 0.2);
          const amount = INTRO_BOIL_SOFT_PX + (INTRO_BOIL_PX - INTRO_BOIL_SOFT_PX) * calm;
          const boil = amount * clamp01((lineEnd - t) / INTRO_BOIL_OUT_S);
          if (boil > 0.01) {
            noise.setAttribute("seed", String((f % INTRO_BOIL_DRAWINGS) + 1));
            displace.setAttribute("scale", String(2 * boil));
            boilGroup.setAttribute("filter", "url(#intro-boil)");
          } else boilGroup.removeAttribute("filter");
          return t >= lineEnd;
        };

        if (process.env.NODE_ENV !== "production") {
          const dev = window as unknown as {
            __introAt?: (s: number) => void;
            __introSetupMs?: number;
            __introEnd?: number;
            __introLineW?: number;
            __introSpeed?: { min: number; peak: number; release: number; land: number };
            __introWobble?: { rms: number; wavelength: number };
          };
          dev.__introSetupMs = performance.now() - setupStart;
          dev.__introEnd = lineEnd;
          dev.__introLineW = lineW;
          dev.__introSpeed = { min: vMin, peak: vPeak, release: tRelease, land: tLand };
          const rms = Math.sqrt(wob.reduce((p, q) => p + q * q, 0) / wob.length) * artPx;
          let crossings = 0;
          for (let i = 1; i < wob.length; i++) if ((wob[i - 1] < 0) !== (wob[i] < 0)) crossings++;
          dev.__introWobble = { rms, wavelength: ((2 * wob.length) / Math.max(1, crossings)) * JAR_WOBBLE_STEP * artPx };
          dev.__introAt = (secs: number) => {
            cancelAnimationFrame(raf);
            renderLine(secs);
          };
        }
        const slowL = slowMs(1000) / 1000;
        const tStart = performance.now();
        const lineFrame = (now: number) => {
          if (finished || cancelled) return;
          if (renderLine((now - tStart) / 1000 / slowL)) {
            finish();
            return;
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
