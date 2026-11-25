"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import type { MouseEvent } from "react";
import styles from "./Roadmap.module.css";
import {
  ROADMAP_SWING_DAMPING,
  ROADMAP_SWING_KICK,
  ROADMAP_SWING_STIFFNESS,
} from "@/lib/motion";

// Its resting tilt, in degrees.
const REST_DEG = -4;

// The stamp's paper, drawn in a STAMP_W × STAMP_H box: a rectangle with
// half-round perforation bites along every edge, HOLE_R across, evenly
// spaced so each side ends on a solid corner. The frame line sits FRAME_IN
// inside the edge.
const STAMP_W = 260;
const STAMP_H = 330;
const HOLE_R = 6.5;
const FRAME_IN = 14;

function edge(from: [number, number], to: [number, number], holes: number): string {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const step = len / holes;
  let d = "";
  for (let i = 0; i < holes; i++) {
    const c = step * (i + 0.5);
    const a = [x0 + ux * (c - HOLE_R), y0 + uy * (c - HOLE_R)];
    const b = [x0 + ux * (c + HOLE_R), y0 + uy * (c + HOLE_R)];
    // Clockwise outline: sweep 0 bites inward.
    d += ` L${a[0].toFixed(2)},${a[1].toFixed(2)} A${HOLE_R},${HOLE_R} 0 0 0 ${b[0].toFixed(2)},${b[1].toFixed(2)}`;
  }
  return d + ` L${x1},${y1}`;
}

const STAMP_PATH =
  `M0,0` +
  edge([0, 0], [STAMP_W, 0], 10) +
  edge([STAMP_W, 0], [STAMP_W, STAMP_H], 13) +
  edge([STAMP_W, STAMP_H], [0, STAMP_H], 10) +
  edge([0, STAMP_H], [0, 0], 13) +
  " Z";

/**
 * Amy's photo as a postage stamp (perforated edges, a thin frame line
 * inside), taped to the page: a strip of masking tape at the top holds it, and clicking it pushes it so it swings from the tape
 * on a loose spring and settles back at its tilt. A click on its right half
 * pushes it one way, its left half the other; clicking mid-swing pushes it
 * again from where it is. Reduced motion: it doesn't swing.
 */
export default function Postcard() {
  const reduced = useReducedMotion();
  const rotate = useMotionValue(REST_DEG);

  const swing = (e: MouseEvent<HTMLButtonElement>) => {
    if (reduced) return;
    const box = e.currentTarget.getBoundingClientRect();
    // Keyboard clicks have no position: push it the usual way.
    const fromRight = e.detail === 0 ? 1 : e.clientX > box.left + box.width / 2 ? 1 : -1;
    animate(rotate, REST_DEG, {
      type: "spring",
      velocity: rotate.getVelocity() + ROADMAP_SWING_KICK * -fromRight,
      stiffness: ROADMAP_SWING_STIFFNESS,
      damping: ROADMAP_SWING_DAMPING,
      restDelta: 0.01,
    });
  };

  return (
    <div className={styles.postcardWrap}>
      <motion.button
        type="button"
        className={styles.postcard}
        style={{ rotate }}
        onClick={swing}
        aria-label="Amy's photo, taped on like a stamp (click to give it a swing)"
      >
        <span className={styles.stampFace}>
        <svg className={styles.stampSvg} viewBox={`0 0 ${STAMP_W} ${STAMP_H}`} aria-hidden="true">
          <path className={styles.stampPaper} d={STAMP_PATH} />
          <rect
            className={styles.stampFrame}
            x={FRAME_IN}
            y={FRAME_IN}
            width={STAMP_W - FRAME_IN * 2}
            height={STAMP_H - FRAME_IN * 2}
            rx={6}
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className={styles.postcardPhoto}>
          {/* The photo cropped out of its drawn frame (me-framed.webp). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/etc/me-framed.webp" alt="Amy at a bus stop in Hong Kong" draggable={false} />
        </span>
        </span>
      </motion.button>
      <span className={styles.tape} aria-hidden="true" />
    </div>
  );
}
