"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./ModeToggle.module.css";
import type { HomeMode } from "./Sidebar";
import { content } from "@/lib/content";
import { MODE_HOVER_DRAW_S, MODE_UNDERLINE_DRAW_S, slowTransition } from "@/lib/motion";
import { buildSquigglePath, LINE_STROKE_WIDTH, SQUIGGLE_VIEW_BOX } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;

// jar = red, work = blue (the site's two category colours, lib/tokens.css).
const MODES: { mode: HomeMode; color: string; seed: number }[] = [
  { mode: "jar", color: "var(--c-red)", seed: 40 },
  { mode: "work", color: "var(--c-blue)", seed: 41 },
];

/** Full waves of underline per letter of label. */
const SQUIGGLE_WAVES_PER_LETTER = 0.7;

/** Opacity of the squiggle previewed while hovering an unselected button. */
const HOVER_PREVIEW_OPACITY = 0.35;

/** One label. Selected, it's underlined with a hand-drawn squiggle in its
 * colour, drawn on when it becomes selected (and un-drawn when it stops
 * being). Hovering (or keyboard-focusing) an unselected one previews its
 * squiggle faintly and darkens the label from grey to black. */
function ModeButton({
  label,
  color,
  seed,
  selected,
  onSelect,
}: {
  label: string;
  color: string;
  seed: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const reduced = useReducedMotion();
  // Wave count follows the label's length, so the waves are the same size
  // under "jar" and "work".
  const squiggle = useMemo(() => buildSquigglePath(seed, label.length * SQUIGGLE_WAVES_PER_LETTER), [seed, label]);
  const [hovered, setHovered] = useState(false);
  const previewing = !selected && hovered;

  const drawS = selected ? MODE_UNDERLINE_DRAW_S : MODE_HOVER_DRAW_S;
  return (
    <button
      type="button"
      className={`${styles.button} ${selected ? styles.selected : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(e) => setHovered(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setHovered(false)}
      style={{ "--mode-color": color } as CSSProperties}
    >
      {label}
      <svg className={styles.underline} viewBox={SQUIGGLE_VIEW_BOX} preserveAspectRatio="none" fill="none" aria-hidden="true">
        <motion.path
          d={squiggle}
          stroke="currentColor"
          strokeWidth={LINE_STROKE_WIDTH * 2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={{
            pathLength: selected || previewing ? 1 : 0,
            opacity: selected ? 1 : previewing ? HOVER_PREVIEW_OPACITY : 0,
          }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  pathLength: slowTransition({ duration: drawS, ease: "easeOut" as const }),
                  // Fade only once it's un-drawn, so leaving doesn't blink out.
                  opacity: slowTransition({ duration: 0.01, delay: selected || previewing ? 0 : drawS }),
                }
          }
        />
      </svg>
    </button>
  );
}

/** The jar / work switch, top right of the stage. */
export default function ModeToggle({ mode, onChange }: { mode: HomeMode; onChange: (mode: HomeMode) => void }) {
  return (
    <div className={styles.toggle} role="group" aria-label={copy.label}>
      {MODES.map(({ mode: m, color, seed }) => (
        <ModeButton
          key={m}
          label={copy[m]}
          color={color}
          seed={seed}
          selected={mode === m}
          onSelect={() => onChange(m)}
        />
      ))}
    </div>
  );
}
