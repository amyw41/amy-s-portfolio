"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import styles from "./BuzzPath.module.css";
import { BUZZ_ENABLED, BUZZ_FPS, slowTransition } from "@/lib/motion";

interface BuzzPathProps {
  /** The drawings to cycle through, in order — usually 3 variants of one
   * seed from lib/wobbly.ts (its `variant` argument). Build them once (e.g.
   * useMemo); they're never redrawn per frame. */
  variants: string[];
  viewBox: string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  preserveAspectRatio?: string;
  /** Pen-stroke reveal: omitted, the line is simply there. true/false draws
   * it on and off again over `drawDuration` seconds, at the same pace both
   * ways (ease-in-out, like a pen). */
  drawn?: boolean;
  drawDuration?: number;
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * A hand-drawn line that "buzzes" like a cartoon (brief Part 4.1): every
 * variant is in the SVG at once, and a CSS steps() animation shows exactly
 * one of them at a time, swapping BUZZ_FPS times a second in order
 * 1 → 2 → 3 → 1. No per-frame JS. The buzz holds on the first drawing under
 * reduced motion, while the tab is hidden, and while BUZZ_ENABLED is off.
 *
 * Stroke colour is currentColor — set `color` on the SVG (className/style).
 */
export default function BuzzPath({
  variants,
  viewBox,
  className,
  style,
  strokeWidth = 1,
  preserveAspectRatio,
  drawn,
  drawDuration = 0.35,
}: BuzzPathProps) {
  const reduced = useReducedMotion();
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );
  const reveal = drawn !== undefined;
  const isDrawn = drawn ?? true;

  // The reveal: how much of the line is drawn, 0-1. Drawn as a dash the
  // length of the line ON SCREEN: the stroke is non-scaling, so its dashes
  // are in screen px, and a stretched viewBox makes that differ from the
  // path's own length (framer's pathLength assumed they matched, so the
  // line finished drawing early and was slow to start un-drawing).
  const progress = useMotionValue(isDrawn ? 1 : 0);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  // Layout effect: painted before the first frame, so an undrawn line never
  // flashes in whole.
  useLayoutEffect(() => {
    if (!reveal) return;
    const paths = pathRefs.current;
    // Measured lazily, the first time the line is actually drawn (and again
    // after a resize): measuring is real work (sampling every path through
    // its screen transform), and every heading's oval starts undrawn, so
    // measuring them all at load stalled the page's first moments.
    let lengths: number[] | null = null;
    // Screen length of each path: sampled along it through its screen
    // transform (a non-uniform stretch has no single scale factor). 32
    // samples is plenty for these gentle curves.
    const measure = () =>
      paths.map((el) => {
        const ctm = el?.getScreenCTM();
        if (!el || !ctm) return 0;
        const total = el.getTotalLength();
        let sum = 0;
        let prev: DOMPoint | null = null;
        for (let i = 0; i <= 32; i++) {
          const q = el.getPointAtLength((total * i) / 32);
          const pt = new DOMPoint(q.x, q.y).matrixTransform(ctm);
          if (prev) sum += Math.hypot(pt.x - prev.x, pt.y - prev.y);
          prev = pt;
        }
        return sum;
      });
    const paint = (p: number) => {
      if (p > 0.001 && !lengths) lengths = measure();
      paths.forEach((el, i) => {
        if (!el) return;
        // Hidden at 0, so a zero-length dash's round cap leaves no dot.
        el.style.opacity = p > 0.001 ? "1" : "0";
        if (!lengths) return;
        const len = lengths[i] ?? 0;
        el.style.strokeDasharray = `${(p * len).toFixed(2)}px ${(len + 2).toFixed(2)}px`;
      });
    };
    paint(progress.get());
    const unsubscribe = progress.on("change", paint);
    const svg = paths[0]?.ownerSVGElement;
    // A resize makes the lengths stale: re-measured next time it's drawn.
    const resize = svg
      ? new ResizeObserver(() => {
          lengths = null;
          paint(progress.get());
        })
      : null;
    if (svg) resize?.observe(svg);
    return () => {
      unsubscribe();
      resize?.disconnect();
    };
  }, [reveal, progress]);
  useEffect(() => {
    if (!reveal) return;
    const controls = animate(
      progress,
      isDrawn ? 1 : 0,
      reduced ? { duration: 0 } : slowTransition({ duration: drawDuration, ease: "easeInOut" as const }),
    );
    return () => controls.stop();
  }, [reveal, isDrawn, reduced, drawDuration, progress]);

  return (
    <svg
      className={`${styles.buzz} ${hidden || !BUZZ_ENABLED ? styles.held : ""} ${className ?? ""}`}
      style={{ ...style, "--buzz-frames": variants.length, "--buzz-fps": BUZZ_FPS } as CSSProperties}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      fill="none"
      aria-hidden="true"
    >
      {variants.map((d, i) => (
        // Negative delays offset each frame's cycle so frame i is the one
        // showing during the i-th tick: 0 → 1 → 2 → 0.
        <g
          key={i}
          className={styles.frame}
          style={{ "--buzz-frame": (variants.length - i) % variants.length } as CSSProperties}
        >
          <path
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
            d={d}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}
