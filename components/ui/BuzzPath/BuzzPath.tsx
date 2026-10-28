"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./BuzzPath.module.css";
import { BUZZ_FPS, slowTransition } from "@/lib/motion";

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
   * it on (pathLength 0 → 1) and off again over `drawDuration` seconds. */
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
 * reduced motion and while the tab is hidden.
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

  return (
    <svg
      className={`${styles.buzz} ${hidden ? styles.held : ""} ${className ?? ""}`}
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
          <motion.path
            d={d}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reveal ? false : undefined}
            // Opacity rides along with the reveal so a zero-length path's
            // round cap doesn't leave a dot behind.
            animate={reveal ? { pathLength: isDrawn ? 1 : 0, opacity: isDrawn ? 1 : 0 } : undefined}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    pathLength: slowTransition({ duration: drawDuration, ease: "easeOut" as const }),
                    opacity: slowTransition({ duration: 0.01, delay: isDrawn ? 0 : drawDuration }),
                  }
            }
          />
        </g>
      ))}
    </svg>
  );
}
