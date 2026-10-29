"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./ModeToggle.module.css";
import type { HomeMode } from "./Sidebar";
import { content } from "@/lib/content";
import { MODE_KNOB_SPRING } from "@/lib/motion";
import { buildWobblyRectPath, LINE_STROKE_WIDTH } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;

// jar = red, work = blue (the site's two category colours, lib/tokens.css).
const MODES: { mode: HomeMode; color: string }[] = [
  { mode: "jar", color: "var(--c-red)" },
  { mode: "work", color: "var(--c-blue)" },
];

// Geometry, in px (the SVGs are drawn 1:1). Each label gets an equal-width
// segment; the knob sits inside the track with KNOB_INSET all round.
const SEGMENT_W = 60;
const TRACK_H = 32;
const KNOB_INSET = 3;
const TRACK_W = SEGMENT_W * MODES.length;
const KNOB_W = SEGMENT_W - KNOB_INSET * 2;
const KNOB_H = TRACK_H - KNOB_INSET * 2;
/** Low wobble: slightly imperfect pen lines, like the jar's ink — not wavy. */
const PEN_AMPLITUDE = 0.25;

/**
 * The jar / work switch, top right of the stage: a segmented toggle drawn
 * by hand — one pill track holding both labels, and a pill knob filled with
 * the active mode's colour that slides behind the active label (spring) as
 * its colour crossfades. Reduced motion: the knob just jumps.
 */
export default function ModeToggle({ mode, onChange }: { mode: HomeMode; onChange: (mode: HomeMode) => void }) {
  const reduced = useReducedMotion();
  const track = useMemo(() => buildWobblyRectPath(60, TRACK_W - 1, TRACK_H - 1, (TRACK_H - 1) / 2, PEN_AMPLITUDE), []);
  const knob = useMemo(() => buildWobblyRectPath(61, KNOB_W, KNOB_H, KNOB_H / 2, PEN_AMPLITUDE), []);
  const activeIndex = MODES.findIndex((m) => m.mode === mode);
  const transition = reduced ? { duration: 0 } : MODE_KNOB_SPRING;

  return (
    <div className={styles.toggle} role="group" aria-label={copy.label} style={{ width: TRACK_W, height: TRACK_H }}>
      <svg
        className={styles.track}
        width={TRACK_W}
        height={TRACK_H}
        viewBox={`-0.5 -0.5 ${TRACK_W} ${TRACK_H}`}
        fill="none"
        aria-hidden="true"
      >
        <path d={track} stroke="#000" strokeWidth={LINE_STROKE_WIDTH} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <motion.div
        className={styles.knob}
        style={{ left: KNOB_INSET, top: KNOB_INSET, width: KNOB_W, height: KNOB_H }}
        initial={false}
        animate={{ x: activeIndex * SEGMENT_W }}
        transition={transition}
        aria-hidden="true"
      >
        {/* One fill per colour, crossfading as the knob slides. */}
        {MODES.map(({ mode: m, color }) => (
          <motion.svg
            key={m}
            className={styles.knobFill}
            width={KNOB_W}
            height={KNOB_H}
            viewBox={`0 0 ${KNOB_W} ${KNOB_H}`}
            initial={false}
            animate={{ opacity: m === mode ? 1 : 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
          >
            <path d={knob} fill={color} stroke={color} strokeWidth={LINE_STROKE_WIDTH} strokeLinejoin="round" />
          </motion.svg>
        ))}
      </motion.div>

      {MODES.map(({ mode: m }) => (
        <button
          key={m}
          type="button"
          className={`${styles.button} ${m === mode ? styles.active : ""}`}
          style={{ width: SEGMENT_W }}
          aria-pressed={m === mode}
          onClick={() => onChange(m)}
        >
          {copy[m]}
        </button>
      ))}
    </div>
  );
}
