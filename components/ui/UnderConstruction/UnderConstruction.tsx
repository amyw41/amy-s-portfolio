"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BuzzPath from "@/components/ui/BuzzPath";
import { buildWobblyCurvePath, buildWobblyLinePath, buildWobblyRectPath } from "@/lib/wobbly";
import { gaegu, geist } from "@/lib/fonts";
import styles from "./UnderConstruction.module.css";

/**
 * Stands in for a page that isn't finished (app/[slug]/page.tsx's
 * lib/underConstruction.ts): a hand-drawn diamond road sign in the middle
 * of the window, Amy's star and "under construction" on it, "come back
 * soon!" under it in the annotation hand, over the real page (its first
 * screen, blurred and out of reach), and the hand-drawn ←
 * back home in the top left corner. Values: docs/rebrand/design-system.md
 * "Under construction". No animation: it's simply there.
 */

// The sign, drawn in a W × H box: a diamond road sign (a rounded square
// turned 45°) with a second line inside its edge, and a bolt at its top and
// bottom corners.
const W = 260;
const H = 260;
const C = W / 2;

/** Moves every "x,y" point of a path: turned by `deg` round (0, 0), then
 * shifted by (dx, dy). */
function movePath(d: string, deg: number, dx: number, dy: number): string {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, px, py) => {
    const x = +px;
    const y = +py;
    return `${(x * cos - y * sin + dx).toFixed(2)},${(x * sin + y * cos + dy).toFixed(2)}`;
  });
}

/** A rounded square `size` across, centred on the middle and turned 45°. */
function diamond(seed: number, size: number, radius: number, amplitude: number, variant: number): string {
  // Drawn from 0,0, so first centred on 0,0, then turned and placed.
  const square = movePath(buildWobblyRectPath(seed, size, size, radius, amplitude, variant), 0, -size / 2, -size / 2);
  return movePath(square, 45, C, C);
}

/** A small hand-drawn circle (a bolt) round (x, y). */
function bolt(seed: number, x: number, y: number): string {
  const r = 3;
  const k = r * 0.55;
  return buildWobblyCurvePath(seed, [
    [[x, y - r], [x + k, y - r], [x + r, y - k], [x + r, y]],
    [[x + r, y], [x + r, y + k], [x + k, y + r], [x, y + r]],
    [[x, y + r], [x - k, y + r], [x - r, y + k], [x - r, y]],
    [[x - r, y], [x - r, y - k], [x - k, y - r], [x, y - r]],
  ], 0.15);
}

function signPath(variant: number): string {
  return [
    diamond(221, 176, 16, 0.6, variant),
    diamond(222, 158, 10, 0.4, variant),
    bolt(223, C, 28),
    bolt(224, C, H - 28),
  ].join(" ");
}

const VARIANTS = [0, 1, 2].map(signPath);

// The back arrow: a hand-drawn ←, like the case studies' sidebar's.
const BACK = 18;
const BACK_PATHS = [
  buildWobblyLinePath(131, [BACK - 1, BACK / 2], [1.5, BACK / 2], 0.2),
  buildWobblyLinePath(132, [7, 3.5], [1.5, BACK / 2], 0.15) + " " + buildWobblyLinePath(133, [1.5, BACK / 2], [7, BACK - 3.5], 0.15),
];

export default function UnderConstruction({ children }: { children?: ReactNode }) {
  return (
    <div className={`${geist.variable} ${gaegu.variable} ${styles.page}`}>
      {/* The real page, behind: its first screen, blurred, washed over with
          white, not scrollable and out of reach (no clicks, no focus, hidden
          from screen readers). */}
      {children && (
        <div className={styles.behind} inert aria-hidden="true">
          {children}
        </div>
      )}
      {children && <div className={styles.wash} aria-hidden="true" />}

      <Link href="/" className={styles.back} aria-label="Back home">
        <svg width={BACK} height={BACK} viewBox={`0 0 ${BACK} ${BACK}`} fill="none" aria-hidden="true">
          {BACK_PATHS.map((d, i) => (
            <path key={i} d={d} stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
      </Link>

      <div className={styles.scene}>
        <div className={styles.barricade}>
          {/* The sign's white face, under its lines. */}
          <div className={styles.signFill} aria-hidden="true" />
          <BuzzPath
            className={styles.lines}
            variants={VARIANTS}
            viewBox={`0 0 ${W} ${H}`}
            strokeWidth={1.2}
          />
          {/* On the sign: Amy's star over "under construction". */}
          <div className={styles.face}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logos/black-star.png" alt="" className={styles.star} draggable={false} />
            <h1 className={styles.signText}>
              under
              <br />
              construction
            </h1>
          </div>
        </div>
        <p className={styles.label}>come back soon!</p>
      </div>
    </div>
  );
}
