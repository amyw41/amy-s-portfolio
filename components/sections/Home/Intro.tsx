"use client";

import { useEffect, useRef } from "react";
import styles from "./Intro.module.css";
import { JAR_OUTLINE, JAR_OUTLINE_BODY_START } from "@/lib/jar-outline";
import {
  INTRO_DRAW,
  INTRO_FILL,
  INTRO_HANDOFF,
  INTRO_PULL,
  INTRO_SHORT,
  INTRO_SPILL,
  INTRO_SPLIT,
  slowMs,
} from "@/lib/motion";

type Pt = [number, number];

/** The intro's line weight, px: the jar drawing's own ink at laptop size. */
const LINE_WIDTH = 1;
/** jar.png's proportions (the jar art fills its wrapper's width). */
const JAR_ASPECT = 2257 / 1600;

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

/** The stretch of a polyline between arc lengths s0 and s1, as path data. */
function slice(pts: Pt[], cum: number[], s0: number, s1: number): string {
  if (s1 - s0 < 0.5) return "";
  const a = pointAt(pts, cum, s0);
  let d = `M${a[0].toFixed(1)},${a[1].toFixed(1)}`;
  for (let i = 0; i < pts.length; i++) if (cum[i] > s0 && cum[i] < s1) d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  const b = pointAt(pts, cum, s1);
  return `${d}L${b[0].toFixed(1)},${b[1].toFixed(1)}`;
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

/** A hand-ruled vertical line, wobbling a little either side (like the
 * divider's own). */
function wobblyVertical(x: number, y0: number, y1: number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const taper = Math.min(1, t / 0.05, (1 - t) / 0.05);
    out.push([x + taper * (0.9 * Math.sin(t * 9.1 + 0.6) + 0.4 * Math.sin(t * 23 + 1.9)), y0 + (y1 - y0) * t]);
  }
  return out;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const progress = (t: number, [a, b]: [number, number]) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The intro (brief Part 4.2), drawn over the home page on first load with
 * lines generated in code from the traced jar (lib/jar-outline.ts), placed
 * on the real jar and divider:
 *
 * full — the jar's line draws; liquid rises inside it; two strands spill
 *   over the edges; the right strand's tip pulls the whole line out like
 *   thread (the jar unravelling from the far end) down, under the jar and up
 *   the divider; at the divider's foot the line splits — one branch stays
 *   on the divider, the other grows back into the stage and redraws the
 *   jar — and both hand over to the real divider and jar.
 * short — the jar and the divider just draw, then hand over.
 *
 * The path data is written straight to the SVG each frame (no React state).
 * Click or any key skips to the end. `onReveal` fires as the hand-over
 * starts (Home fades the real page in, then lets the items fall); `onDone`
 * when the intro is gone.
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
  const lineRef = useRef<SVGPathElement>(null);
  const branchRef = useRef<SVGPathElement>(null);
  const liquidRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGPathElement>(null);
  const callbacks = useRef({ onReveal, onDone });
  useEffect(() => {
    callbacks.current = { onReveal, onDone };
  });

  useEffect(() => {
    const svg = svgRef.current;
    const line = lineRef.current;
    const branch = branchRef.current;
    const liquid = liquidRef.current;
    const clip = clipRef.current;
    const jarEl = document.querySelector("[data-intro-jar]");
    const dividerEl = document.querySelector("[data-intro-divider]");
    let revealed = false;
    let finished = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      callbacks.current.onReveal();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      reveal();
      callbacks.current.onDone();
    };
    if (!svg || !line || !branch || !liquid || !clip || !jarEl) {
      finish();
      return;
    }

    // ---- geometry, measured off the real page ----
    const J = jarEl.getBoundingClientRect();
    const w = J.width;
    const h = w * JAR_ASPECT;
    const O: Pt[] = JAR_OUTLINE.map(([fx, fy]) => [J.left + fx * w, J.top + fy * h]);
    const D = dividerEl?.getBoundingClientRect();
    const hasDivider = !!D && D.height > 40;
    const dx = D ? D.left + 0.5 : J.left - 40;
    const dTop = D?.top ?? J.top;
    const dBot = D?.bottom ?? J.top + h;

    // The two strands spilling over the rim's left end and the neck's right.
    const o0 = O[0];
    const oN = O[O.length - 1];
    const SL = bezier(o0, [o0[0] - 0.05 * w, o0[1] + 0.02 * h], [o0[0] - 0.09 * w, o0[1] + 0.14 * h], [o0[0] - 0.06 * w, o0[1] + 0.3 * h], 40);
    const SR = bezier(oN, [oN[0] + 0.06 * w, oN[1] - 0.01 * h], [oN[0] + 0.1 * w, oN[1] + 0.12 * h], [oN[0] + 0.07 * w, oN[1] + 0.28 * h], 40);
    // The whole drawn line, left strand tip to right strand tip.
    const P: Pt[] = [...SL.slice().reverse(), ...O.slice(1), ...SR.slice(1)];
    const lenSL = lengths(SL).at(-1)!;
    const lenSR = lengths(SR).at(-1)!;
    const LP = lengths(P).at(-1)!;
    const sO0 = lenSL;
    const sO1 = LP - lenSR;
    // Where the needle goes: from the right strand's tip down, under the jar
    // and across to the divider's foot (the fork), then up the divider.
    const tip = SR[SR.length - 1];
    const F: Pt = [dx, dBot - 0.04 * (dBot - dTop)];
    const T1 = bezier(tip, [tip[0] + 0.05 * w, J.top + 1.08 * h], [dx + 0.4 * (J.left - dx), J.top + 1.12 * h], F, 60);
    const T2 = wobblyVertical(dx, F[1], dTop, 80);
    const lenT1 = lengths(T1).at(-1)!;
    const LT = lenT1 + lengths(T2).at(-1)!;
    const Full: Pt[] = [...P, ...T1.slice(1), ...T2.slice(1)];
    const cFull = lengths(Full);
    // The branch from the fork back into the stage, redrawing the jar.
    const C = bezier(F, [F[0] + 0.25 * (o0[0] - F[0]), F[1] - 0.15 * h], [o0[0] - 0.2 * w, o0[1] + 0.3 * h], o0, 50);
    const B: Pt[] = [...C, ...O.slice(1)];
    const cB = lengths(B);
    const LB = cB.at(-1)!;
    const cO = lengths(O);
    const LO = cO.at(-1)!;
    // Short version: the divider drawn top to bottom.
    const Dv = wobblyVertical(dx, dTop, dBot, 80);
    const cDv = lengths(Dv);
    const LDv = cDv.at(-1)!;

    // The liquid only shows inside the jar's body.
    const body = O.slice(JAR_OUTLINE_BODY_START);
    clip.setAttribute("d", `M${body.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")}Z`);
    const liquidTop = J.top + 0.3 * h;
    const liquidBottom = J.top + h;
    const liquidAt = (y: number, phase: number) => {
      let d = `M${J.left - 10},${liquidBottom + 10}L${J.left - 10},${y}`;
      for (let x = J.left - 10; x <= J.left + w + 10; x += 8) d += `L${x},${(y + 2.5 * Math.sin(x / 26 + phase)).toFixed(1)}`;
      return `${d}L${J.left + w + 10},${liquidBottom + 10}Z`;
    };

    const slow = slowMs(1000) / 1000;
    const end = variant === "full" ? INTRO_HANDOFF[1] : INTRO_SHORT.handoff[1];
    const handoff = variant === "full" ? INTRO_HANDOFF : INTRO_SHORT.handoff;
    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      if (finished) return;
      const t = (now - t0) / 1000 / slow;

      if (variant === "full") {
        // The main line: the jar drawing, then the strands spilling, then
        // the thread pulled through (the jar consumed from the far end).
        let s0: number;
        let s1: number;
        if (t < INTRO_SPILL[0]) {
          s0 = sO0;
          s1 = sO0 + easeOut(progress(t, INTRO_DRAW)) * (sO1 - sO0);
        } else if (t < INTRO_PULL[0]) {
          const s = easeOut(progress(t, INTRO_SPILL));
          s0 = sO0 - s * lenSL;
          s1 = sO1 + s * lenSR;
        } else {
          const q = easeInOut(progress(t, INTRO_PULL));
          // At the split the stretch under the jar is drawn back in too,
          // leaving just the line on the divider.
          const b = easeInOut(progress(t, INTRO_SPLIT));
          s0 = q * LP + b * lenT1;
          s1 = LP + q * LT;
        }
        line.setAttribute("d", slice(Full, cFull, s0, s1));
        branch.setAttribute("d", slice(B, cB, 0, easeInOut(progress(t, INTRO_SPLIT)) * LB));
        // Liquid rises, then drains away as the jar unravels.
        const level = easeOut(progress(t, INTRO_FILL));
        liquid.setAttribute("d", level > 0 ? liquidAt(liquidBottom - level * (liquidBottom - liquidTop), t * 3) : "");
        liquid.style.opacity = String(1 - progress(t, [INTRO_PULL[0], INTRO_PULL[0] + 0.5]));
      } else {
        const p = easeOut(progress(t, INTRO_SHORT.draw));
        line.setAttribute("d", hasDivider ? slice(Dv, cDv, 0, p * LDv) : "");
        branch.setAttribute("d", slice(O, cO, 0, p * LO));
      }

      // Hand over to the real jar and divider.
      if (t >= handoff[0]) reveal();
      svg.style.opacity = String(1 - progress(t, handoff));
      if (t >= end) finish();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Click or any key skips to the end.
    const skip = () => finish();
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [variant]);

  return (
    <svg ref={svgRef} className={styles.intro} aria-hidden="true">
      <defs>
        <clipPath id="intro-jar-inside">
          <path ref={clipRef} />
        </clipPath>
      </defs>
      <path ref={liquidRef} className={styles.liquid} clipPath="url(#intro-jar-inside)" />
      <path ref={lineRef} className={styles.line} strokeWidth={LINE_WIDTH} />
      <path ref={branchRef} className={styles.line} strokeWidth={LINE_WIDTH} />
    </svg>
  );
}
