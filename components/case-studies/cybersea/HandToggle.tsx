"use client";

import type { CSSProperties } from "react";
import { buildWobblyCurvePath, buildWobblyRectPath, LINE_STROKE_WIDTH } from "@/lib/wobbly";
import { MESH_TOGGLE_MS } from "@/lib/motion";
import styles from "./MeshDemo.module.css";

/**
 * A hand-drawn on/off switch for CyberSea's 3D demo (Amy's sketch,
 * 2026-11-25): a wobbly pill in the site's 0.6px pen, a little hand-drawn
 * knob that slides from one end to the other, and the state written in the
 * annotation hand at the other end. White, for the dark demo.
 */

const W = 72;
const H = 28;
const KNOB_R = 7;

/** Moves every "x,y" point of a path by (dx, dy). */
function shift(d: string, dx: number, dy: number): string {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${(+x + dx).toFixed(2)},${(+y + dy).toFixed(2)}`);
}

const PILL = shift(buildWobblyRectPath(241, W - 2, H - 2, (H - 2) / 2, 0.35), 1, 1);
const KNOB = (() => {
  const r = KNOB_R;
  const k = r * 0.55;
  return buildWobblyCurvePath(242, [
    [[0, -r], [k, -r], [r, -k], [r, 0]],
    [[r, 0], [r, k], [k, r], [0, r]],
    [[0, r], [-k, r], [-r, k], [-r, 0]],
    [[-r, 0], [-r, -k], [-k, -r], [0, -r]],
  ], 0.25);
})();

export default function HandToggle({
  label,
  on,
  onText = "on",
  offText = "off",
  onChange,
}: {
  label: string;
  on: boolean;
  onText?: string;
  offText?: string;
  onChange: (on: boolean) => void;
}) {
  // The knob sits at the left end when off, the right end when on.
  const knobX = on ? W - H / 2 : H / 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.handToggle}
      style={{ "--toggle-ms": `${MESH_TOGGLE_MS}ms` } as CSSProperties}
      onClick={() => onChange(!on)}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true" overflow="visible">
        <path d={PILL} stroke="currentColor" strokeWidth={LINE_STROKE_WIDTH} vectorEffect="non-scaling-stroke" />
        <g className={styles.handKnob} style={{ transform: `translate(${knobX}px, ${H / 2}px)` }}>
          <path
            d={KNOB}
            stroke="currentColor"
            strokeWidth={LINE_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            fill={on ? "currentColor" : "none"}
          />
        </g>
      </svg>
      <span className={styles.handToggleText} style={{ [on ? "left" : "right"]: 10 }}>
        {on ? onText : offText}
      </span>
    </button>
  );
}
