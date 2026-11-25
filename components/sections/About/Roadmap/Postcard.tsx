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

/**
 * Amy's photo as a print (a thin white border, softly rounded), taped to
 * the page: a strip of masking tape at the top holds it, and clicking it pushes it so it swings from the tape
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
        aria-label="Amy's photo, taped on (click to give it a swing)"
      >
        <span className={styles.stampFace}>
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
