"use client";

import styles from "./ScrollCue.module.css";
import type { HomeMode } from "./Sidebar";
import { content } from "@/lib/content";
import { SCROLL_CUE_BOB_PX, SCROLL_CUE_BOB_S, SCROLL_CUE_FADE_S } from "@/lib/motion";
import { buildWobblyLinePath } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;

// The chevron, drawn 1:1 in a CHEVRON_W × CHEVRON_H box: two hand-ruled
// strokes meeting at the point, low wobble like the jar's ink.
const CHEVRON_W = 16;
const CHEVRON_H = 9;
const CHEVRON_STROKE = 1;
const PEN_AMPLITUDE = 0.25;
const CHEVRON_DOWN = [
  buildWobblyLinePath(110, [1, 1], [CHEVRON_W / 2, CHEVRON_H - 1], PEN_AMPLITUDE),
  buildWobblyLinePath(111, [CHEVRON_W / 2, CHEVRON_H - 1], [CHEVRON_W - 1, 1], PEN_AMPLITUDE),
];

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      className={styles.chevron}
      width={CHEVRON_W}
      height={CHEVRON_H}
      viewBox={`0 0 ${CHEVRON_W} ${CHEVRON_H}`}
      fill="none"
      aria-hidden="true"
    >
      {/* Flipped for the up cue. */}
      <g transform={up ? `matrix(1 0 0 -1 0 ${CHEVRON_H})` : undefined}>
        {CHEVRON_DOWN.map((d, i) => (
          <path key={i} d={d} stroke="currentColor" strokeWidth={CHEVRON_STROKE} strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
}

/**
 * The hint that you can scroll between modes, now there's no toggle: on
 * the jar, "scroll" over a down chevron at the bottom of the stage. It bobs
 * gently and is also a button (tap or keyboard) that switches. On the
 * desktop layout it fades away once it's been used, and the work grid has
 * no hint (any scroll flips back). On mobile, where the page scrolls
 * normally, the cues are the switch and stay: "work" on the jar, and an up
 * chevron over "jar" at the top of the grid.
 */
export default function ScrollCue({
  mode,
  used,
  onActivate,
}: {
  mode: HomeMode;
  /** Which directions have been used (switched to that mode) already. */
  used: Record<HomeMode, boolean>;
  onActivate: (next: HomeMode) => void;
}) {
  const vars = {
    "--cue-fade": `${SCROLL_CUE_FADE_S}s`,
    "--cue-bob-s": `${SCROLL_CUE_BOB_S}s`,
    "--cue-bob-px": `${SCROLL_CUE_BOB_PX}px`,
  } as React.CSSProperties;
  const cue = (to: HomeMode) => {
    const down = to === "work";
    const shown = mode !== to;
    return (
      <button
        key={to}
        type="button"
        className={`${styles.cue} ${down ? styles.down : styles.up} ${shown ? "" : styles.hidden} ${used[to] ? styles.used : ""}`}
        style={vars}
        aria-label={down ? copy.toWorkLabel : copy.toJarLabel}
        tabIndex={shown ? 0 : -1}
        onClick={() => onActivate(to)}
      >
        {/* On mobile the page scrolls normally, so the down cue is a tap
         * target: it names where it goes ("work") instead of "scroll". */}
        <span className={down ? styles.desktopOnly : undefined}>{down ? copy.toWork : copy.toJar}</span>
        {down && <span className={styles.mobileOnly}>{copy.work}</span>}
        <Chevron up={!down} />
      </button>
    );
  };
  return (
    <>
      {cue("work")}
      {cue("jar")}
    </>
  );
}
