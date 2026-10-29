"use client";

import { useId, useMemo, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./ModeToggle.module.css";
import type { HomeMode } from "./Sidebar";
import { content } from "@/lib/content";
import { MODE_FILL_DRAW_S, slowTransition } from "@/lib/motion";
import { buildScribbleFillPath, buildWobblyPillPath, LINE_STROKE_WIDTH, PILL_VIEW_BOX } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;

// jar = red, work = blue (the site's two category colours, lib/tokens.css).
const MODES: { mode: HomeMode; color: string; seed: number }[] = [
  { mode: "jar", color: "var(--c-red)", seed: 40 },
  { mode: "work", color: "var(--c-blue)", seed: 41 },
];

/** One hand-drawn pill button. Its outline is always drawn in its colour;
 * selected, it's coloured in with a pencil scribble (clipped to the pill)
 * that draws itself on, and fades back out when deselected. */
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
  const clipId = useId();
  const outline = useMemo(() => buildWobblyPillPath(seed), [seed]);
  const scribble = useMemo(() => buildScribbleFillPath(seed), [seed]);

  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={selected}
      onClick={onSelect}
      style={{ "--mode-color": color } as CSSProperties}
    >
      <svg className={styles.drawing} viewBox={PILL_VIEW_BOX} preserveAspectRatio="none" fill="none" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={outline} />
          </clipPath>
        </defs>
        <motion.path
          className={styles.scribble}
          d={scribble}
          clipPath={`url(#${clipId})`}
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={{ pathLength: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  pathLength: slowTransition({ duration: MODE_FILL_DRAW_S, ease: "easeOut" as const }),
                  // Deselected: fade out rather than un-draw backwards.
                  opacity: slowTransition({ duration: selected ? 0.01 : MODE_FILL_DRAW_S }),
                }
          }
        />
        <path
          className={styles.outline}
          d={outline}
          strokeWidth={LINE_STROKE_WIDTH * 1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={styles.label}>{label}</span>
    </button>
  );
}

/** The jar / work switch: two hand-drawn pills, top right of the stage. */
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
